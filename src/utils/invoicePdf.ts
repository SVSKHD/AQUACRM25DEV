// @ts-nocheck
import {
  bankPaymentMethods,
  customerCare,
  termsAndConditions,
} from "../pages/dynamicInvoiceComponents/constants/constants";
import { GST_STATES } from "./gstReport";
import { getInvoiceStamp } from "./invoiceStamp";
import priceUtils from "./invoicePdfPriceUtils";
import {
  closePdfDownloadTarget,
  preparePdfDownloadTarget,
  savePdfDocument,
} from "./pdfDownload";

const logo = "/aquakart.png";

const BRAND = [4, 120, 87];
const BRAND_BRIGHT = [16, 185, 129];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [203, 213, 225];
const LINE_SOFT = [226, 232, 240];
const SLATE = [51, 65, 85];
const SOFT = [248, 250, 252];
const WHITE = [255, 255, 255];

const MONGO_OBJECT_ID = /^[a-f\d]{24}$/i;
const UUID =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export const isInternalInvoiceIdentifier = (value) => {
  const normalized = String(value || "").trim();
  return MONGO_OBJECT_ID.test(normalized) || UUID.test(normalized);
};

const containsInternalInvoiceIdentifier = (value) =>
  String(value || "")
    .split(/[\s/?#&=|]+/)
    .some(isInternalInvoiceIdentifier);

export const getPublicInvoiceReference = (invoice = {}) => {
  const invoiceNumber = String(invoice.invoice_no || "").trim();
  return invoiceNumber && !isInternalInvoiceIdentifier(invoiceNumber)
    ? invoiceNumber
    : "Invoice";
};

export const getPublicProductClassification = (product = {}) =>
  [product.productCategory, product.productSubcategory]
    .map((value) => String(value || "").trim())
    .filter((value) => value && !containsInternalInvoiceIdentifier(value))
    .join(" / ");

const getProductUrl = (product = {}) => {
  const directLink = product.productLink;
  if (
    (directLink?.startsWith("http://") || directLink?.startsWith("https://")) &&
    !containsInternalInvoiceIdentifier(directLink)
  ) {
    return directLink;
  }

  const reference =
    directLink?.replace(/^\/product\//, "") || product.productSlug;
  return reference && !containsInternalInvoiceIdentifier(reference)
    ? `https://aquakart.co.in/product/${encodeURIComponent(reference)}`
    : "";
};

const imageUrlToDataUrl = async (source) => {
  if (!source || typeof window === "undefined") return "";
  try {
    const response = await fetch(source);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

const safeFilePart = (value) =>
  String(value || "invoice")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "-")
    .replace(/-+/g, "-");

const formatPdfAmount = (value) => {
  const amount = Number(value) || 0;
  return `INR ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// jsPDF's built-in Helvetica only covers Latin-1; anything else prints as "?"
// (e.g. a fraction slash or curly quote in "M/S" became "M?S" in Bill To).
const PDF_CHAR_MAP = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u2032": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2033": '"',
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\u2044": "/",
  "\u2215": "/",
  "\u2022": "-",
  "\u2026": "...",
  "\u20B9": "INR ",
  "\u00A0": " ",
};

export const toPdfText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(
      /[\u00A0\u2010-\u2215\u20B9]/g,
      (char) => PDF_CHAR_MAP[char] ?? char,
    )
    // Drop whatever Latin-1 Helvetica still can't draw (zero-width chars, emoji...).
    .replace(/[^\n\x20-\x7E\u00A1-\u00FF]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const sanitizeInvoiceForPdf = (invoice = {}) => {
  const clean = (record) =>
    Object.fromEntries(
      Object.entries(record || {}).map(([key, value]) => [
        key,
        typeof value === "string" && !key.startsWith("_")
          ? toPdfText(value)
          : value,
      ]),
    );
  return {
    ...clean(invoice),
    products: Array.isArray(invoice.products)
      ? invoice.products.map(clean)
      : [],
  };
};

/**
 * Unit price for display only. productPrice is the line value in AquaCRM,
 * so unit = line / qty (never the other way round).
 */
export const getUnitPrice = (product = {}) => {
  const lineValue = Number(product.productPrice) || 0;
  const quantity = Number(product.productQuantity);
  return quantity > 0 ? lineValue / quantity : lineValue;
};

const titleCase = (value) =>
  String(value || "Not available")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const FRAME = 18;
const HEADER_HEIGHT = 84;
const CONTENT_TOP = 128;
const CONTINUED_TOP = 120;

const drawPageFrame = (doc) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.9);
  doc.roundedRect(
    FRAME,
    FRAME,
    width - FRAME * 2,
    height - FRAME * 2,
    10,
    10,
    "S",
  );
  doc.setLineWidth(0.6);
};

const drawPageHeader = (doc, invoice, continued = false, sectionLabel = "") => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const bandWidth = width - FRAME * 2;
  const right = width - FRAME - 18;
  // A quotation is not a tax invoice, so it must not be titled as one.
  const invoiceTitle = invoice.quotation
    ? "QUOTATION"
    : invoice.gst
      ? "GST TAX INVOICE"
      : "RETAIL TAX INVOICE";
  const isFirstPage = !sectionLabel && !continued && !invoice.quotation;
  const documentTitle = sectionLabel
    ? `${invoiceTitle} / ${sectionLabel}`
    : continued
      ? `${invoiceTitle} / CONTINUED`
      : invoiceTitle;

  if (invoice._pdfLogoDataUrl) {
    try {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.035 }));
      doc.addImage(
        invoice._pdfLogoDataUrl,
        "PNG",
        width / 2 - 120,
        height / 2 - 120,
        240,
        240,
      );
      doc.restoreGraphicsState();
    } catch {
      // The PDF remains valid when a browser cannot decode the logo asset.
    }
  }

  // Brand band: rounded top corners matching the page frame, square bottom.
  doc.setFillColor(...BRAND);
  doc.roundedRect(FRAME, FRAME, bandWidth, HEADER_HEIGHT, 10, 10, "F");
  doc.rect(FRAME, FRAME + 20, bandWidth, HEADER_HEIGHT - 20, "F");
  try {
    // Two faint diagonal facets behind the title: a quiet brand accent.
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.07 }));
    doc.setFillColor(...WHITE);
    const base = FRAME + HEADER_HEIGHT;
    [
      [-260, 70],
      [-186, 46],
    ].forEach(([offset, size]) => {
      const x = width - FRAME + offset;
      doc.triangle(x, base, x + size, FRAME, x + size * 2, FRAME, "F");
      doc.triangle(x, base, x + size * 2, FRAME, x + size, base, "F");
    });
    doc.restoreGraphicsState();
  } catch {
    // Decorative only.
  }
  doc.setFillColor(...BRAND_BRIGHT);
  doc.rect(FRAME, FRAME + HEADER_HEIGHT, bandWidth, 3, "F");

  if (invoice._pdfLogoDataUrl) {
    try {
      doc.setFillColor(...WHITE);
      doc.roundedRect(FRAME + 18, FRAME + 18, 48, 48, 9, 9, "F");
      doc.addImage(
        invoice._pdfLogoDataUrl,
        "PNG",
        FRAME + 24,
        FRAME + 24,
        36,
        36,
      );
    } catch {
      // Text branding below is the accessible fallback.
    }
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("AQUAKART", FRAME + 78, FRAME + 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Premium water solutions", FRAME + 78, FRAME + 53);
  doc.setFontSize(8);
  doc.text("GSTIN 36AJOPH6387A1Z2  |  aquakart.co.in", FRAME + 78, FRAME + 67);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(documentTitle, right, FRAME + 34, { align: "right" });
  if (isFirstPage) {
    const tag = "ORIGINAL FOR RECIPIENT";
    doc.setFontSize(6.3);
    const tagWidth = doc.getTextWidth(tag) + 14;
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.7);
    doc.roundedRect(right - tagWidth, FRAME + 41, tagWidth, 13, 6.5, 6.5, "S");
    doc.setLineWidth(0.6);
    doc.text(tag, right - 7, FRAME + 49.6, { align: "right" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    getPublicInvoiceReference(invoice),
    right,
    isFirstPage ? FRAME + 68 : FRAME + 52,
    { align: "right" },
  );

  drawPageFrame(doc);
};

const drawFooter = (doc) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LINE_SOFT);
  doc.line(42, height - 60, width - 42, height - 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "Computer-generated invoice. No physical signature is required.",
    42,
    height - 46,
  );
  doc.text(
    "Aquakart  |  support@aquakart.co.in  |  +91 90147 74667",
    width - 42,
    height - 46,
    { align: "right" },
  );
};

const CARD_HEAD = 22;
const PARTY_LINE = 10.5;

/** Bordered card with a tinted title strip. */
const drawCardShell = (doc, { x, y, width, height, title }) => {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, width, height, 8, 8, "FD");
  doc.setFillColor(...SOFT);
  doc.roundedRect(x + 0.5, y + 0.5, width - 1, CARD_HEAD, 7.5, 7.5, "F");
  doc.rect(x + 0.5, y + CARD_HEAD / 2, width - 1, CARD_HEAD / 2 + 0.5, "F");
  doc.setDrawColor(...LINE);
  doc.line(x, y + CARD_HEAD + 0.5, x + width, y + CARD_HEAD + 0.5);
  doc.setFillColor(...BRAND);
  doc.roundedRect(x + 12, y + 8.5, 5, 5, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text(title.toUpperCase(), x + 23, y + 14.6);
};

const getPartyCardLines = (doc, lines, width) =>
  lines.flatMap(({ text, bold }) => {
    // Measure with the font that draws the text, or long addresses wrap
    // too late and run past the card border.
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8);
    return doc
      .splitTextToSize(String(text || "Not available"), width - 26)
      .map((line) => ({ line, bold }));
  });

const getPartyCardHeight = (lineCount) =>
  Math.max(72, CARD_HEAD + 14 + lineCount * PARTY_LINE);

const drawPartyCard = (doc, { x, y, width, height, title, lines }) => {
  drawCardShell(doc, { x, y, width, height, title });
  doc.setFontSize(8);
  lines.forEach(({ line, bold }, index) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? INK : SLATE));
    doc.text(line, x + 13, y + CARD_HEAD + 14 + index * PARTY_LINE);
  });
};

const STAMP_RADIUS = 40;
/** Degrees, counter-clockwise: the slight tilt of a hand-pressed stamp. */
const STAMP_TILT = 12;

/** Rotate a stamp-local point (y down) counter-clockwise by `degrees`. */
const rotatePoint = (dx, dy, degrees) => {
  const angle = (degrees * Math.PI) / 180;
  return [
    dx * Math.cos(angle) + dy * Math.sin(angle),
    -dx * Math.sin(angle) + dy * Math.cos(angle),
  ];
};

/**
 * Text set letter by letter along a circle, read left to right either over
 * the top (letters face out) or under the bottom (letters face in).
 */
const drawStampArcText = (doc, { text, radius, top, cx, cy, gap }) => {
  const chars = [...text];
  const widths = chars.map((char) => doc.getTextWidth(char));
  const span =
    (widths.reduce((sum, w) => sum + w, 0) + gap * (chars.length - 1)) / radius;
  let cursor = -span / 2;
  chars.forEach((char, index) => {
    const charAngle = widths[index] / radius;
    const mid = cursor + charAngle / 2;
    const pointX = radius * Math.sin(mid);
    const pointY = top ? -radius * Math.cos(mid) : radius * Math.cos(mid);
    const dirX = Math.cos(mid);
    const dirY = top ? Math.sin(mid) : -Math.sin(mid);
    const [x, y] = rotatePoint(
      pointX - (dirX * widths[index]) / 2,
      pointY - (dirY * widths[index]) / 2,
      STAMP_TILT,
    );
    const angle = ((top ? -mid : mid) * 180) / Math.PI + STAMP_TILT;
    doc.text(char, cx + x, cy + y, { angle });
    cursor += charAngle + gap / radius;
  });
};

/** Round rubber-stamp seal: colour and words come from getInvoiceStamp(). */
const drawInvoiceStamp = (doc, { stamp, cx, cy }) => {
  const radius = STAMP_RADIUS;
  const bandOuter = radius - 4;
  const bandInner = radius - 14;
  const bandMid = (bandOuter + bandInner) / 2;
  const setOpacity = (opacity) => {
    try {
      doc.setGState(new doc.GState({ opacity }));
    } catch {
      // Older viewers simply draw it opaque.
    }
  };

  doc.saveGraphicsState();
  doc.setDrawColor(...stamp.rgb);
  doc.setFillColor(...stamp.rgb);
  doc.setTextColor(...stamp.rgb);

  setOpacity(0.06);
  doc.circle(cx, cy, radius, "F");
  setOpacity(0.88);

  doc.setLineWidth(1.8);
  doc.circle(cx, cy, radius, "S");
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, bandOuter, "S");
  doc.circle(cx, cy, bandInner, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  drawStampArcText(doc, {
    text: "AQUAKART",
    radius: bandMid - (7 * 0.72) / 2,
    top: true,
    cx,
    cy,
    gap: 1.6,
  });
  doc.setFontSize(5.6);
  drawStampArcText(doc, {
    text: stamp.caption,
    radius: bandMid + (5.6 * 0.72) / 2,
    top: false,
    cx,
    cy,
    gap: 0.6,
  });
  [-1, 1].forEach((side) => {
    const [x, y] = rotatePoint(side * bandMid, 0, STAMP_TILT);
    doc.circle(cx + x, cy + y, 1.6, "F");
  });

  const maxWidth = bandInner * 2 - 10;
  let size = 15;
  doc.setFontSize(size);
  while (size > 6 && doc.getTextWidth(stamp.word) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  const wordWidth = doc.getTextWidth(stamp.word);
  const [wordX, wordY] = rotatePoint(-wordWidth / 2, size * 0.36, STAMP_TILT);
  doc.text(stamp.word, cx + wordX, cy + wordY, { angle: STAMP_TILT });

  doc.setLineWidth(0.6);
  [-1, 1].forEach((side) => {
    const ruleY = side * (size * 0.5 + 3);
    const ruleHalf = Math.min(
      wordWidth / 2 + 3,
      Math.sqrt(bandInner ** 2 - ruleY ** 2) - 3,
    );
    const [x1, y1] = rotatePoint(-ruleHalf, ruleY, STAMP_TILT);
    const [x2, y2] = rotatePoint(ruleHalf, ruleY, STAMP_TILT);
    doc.line(cx + x1, cy + y1, cx + x2, cy + y2);
  });

  doc.restoreGraphicsState();
  doc.setLineWidth(0.6);
};

const ITEM_HEAD = 22;

const getItemColumns = (x, totalWidth) => {
  const spec = [
    ["no", "#", 22, "center"],
    ["product", "PRODUCT", 0, "left"],
    ["qty", "QTY", 34, "center"],
    ["unit", "UNIT PRICE", 72, "right"],
    ["taxable", "TAXABLE VALUE", 78, "right"],
    ["gst", "GST 18%", 68, "right"],
    ["amount", "AMOUNT", 80, "right"],
  ];
  const fixed = spec.reduce((sum, [, , colWidth]) => sum + colWidth, 0);
  let cursor = x;
  return spec.map(([key, label, colWidth, align]) => {
    const resolvedWidth = colWidth || totalWidth - fixed;
    const column = { key, label, x: cursor, width: resolvedWidth, align };
    cursor += resolvedWidth;
    return column;
  });
};

const drawCell = (doc, column, text, y) => {
  if (column.align === "left") {
    doc.text(text, column.x + 8, y);
  } else if (column.align === "center") {
    doc.text(text, column.x + column.width / 2, y, { align: "center" });
  } else {
    doc.text(text, column.x + column.width - 8, y, { align: "right" });
  }
};

const drawItemsHeader = (doc, y, columns) => {
  const first = columns[0];
  const last = columns[columns.length - 1];
  const x = first.x;
  const width = last.x + last.width - x;
  doc.setFillColor(...INK);
  doc.roundedRect(x, y, width, ITEM_HEAD, 6, 6, "F");
  doc.rect(x, y + ITEM_HEAD / 2, width, ITEM_HEAD / 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(...WHITE);
  columns.forEach((column) => drawCell(doc, column, column.label, y + 14));
  return y + ITEM_HEAD;
};

/** Outer border and column rules for one page's slice of the items table. */
const closeItemsSegment = (doc, top, bottom, columns) => {
  const first = columns[0];
  const last = columns[columns.length - 1];
  doc.setDrawColor(...LINE_SOFT);
  columns.slice(1).forEach((column) => {
    doc.line(column.x, top + ITEM_HEAD, column.x, bottom);
  });
  doc.setDrawColor(...LINE);
  doc.roundedRect(
    first.x,
    top,
    last.x + last.width - first.x,
    bottom - top,
    6,
    6,
    "S",
  );
};

const drawSectionHeading = (doc, { y, kicker, title, description }) => {
  const width = doc.internal.pageSize.getWidth();
  const contentWidth = width - 84;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text(kicker.toUpperCase(), 42, y);
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(title, contentWidth).slice(0, 2);
  doc.text(titleLines, 42, y + 23, { lineHeightFactor: 1.15 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const descriptionY = y + 29 + titleLines.length * 15;
  const descriptionLines = doc
    .splitTextToSize(description, contentWidth)
    .slice(0, 3);
  doc.text(descriptionLines, 42, descriptionY, { lineHeightFactor: 1.35 });

  return descriptionY + 7 + descriptionLines.length * 9;
};

const getTermCardMetrics = (doc, term, cardWidth) => {
  const titleLines = doc.splitTextToSize(term.title, cardWidth - 58);
  const descriptionLines = doc.splitTextToSize(
    term.description,
    cardWidth - 26,
  );
  const cardHeight = Math.max(
    88,
    43 + titleLines.length * 9 + descriptionLines.length * 8,
  );

  return { titleLines, descriptionLines, cardHeight };
};

const drawTermCard = (doc, { x, y, width, index, metrics }) => {
  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, width, metrics.cardHeight, 8, 8, "FD");

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x + 12, y + 11, 25, 25, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text(String(index + 1).padStart(2, "0"), x + 24.5, y + 27, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(metrics.titleLines, x + 45, y + 19, { lineHeightFactor: 1.2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);
  doc.text(metrics.descriptionLines, x + 13, y + 48, {
    lineHeightFactor: 1.35,
  });
};

const drawCustomerCareDirectory = (doc, y) => {
  const width = doc.internal.pageSize.getWidth();
  const margin = 42;
  const contentWidth = width - margin * 2;
  const gap = 9;
  const cardWidth = (contentWidth - gap * 2) / 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text("MANUFACTURER ASSISTANCE", margin, y);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Customer-care directory", margin, y + 18);
  y += 30;

  customerCare.forEach((contact, index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, cardWidth, 73, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(
      doc.splitTextToSize(contact.name, cardWidth - 20).slice(0, 2),
      x + 10,
      y + 17,
      { lineHeightFactor: 1.2 },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(...MUTED);
    doc.text(
      doc.splitTextToSize(contact.description, cardWidth - 20).slice(0, 2),
      x + 10,
      y + 38,
      { lineHeightFactor: 1.2 },
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND);
    doc.text(contact.phone, x + 10, y + 62);
  });
};

const drawTermsAndSupportPages = (doc, invoice) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = width - margin * 2;
  const gap = 12;
  const cardWidth = (contentWidth - gap) / 2;

  doc.addPage();
  drawPageHeader(doc, invoice, false, "TERMS AND SUPPORT");
  let y = drawSectionHeading(doc, {
    y: CONTENT_TOP,
    kicker: "Commercial framework",
    title: "Terms, responsibilities and service standards",
    description:
      "These terms form part of this invoice and clarify the delivery, installation, payment and after-sales responsibilities associated with the supplied products.",
  });

  for (let index = 0; index < termsAndConditions.length; index += 2) {
    const pair = termsAndConditions.slice(index, index + 2);
    const metrics = pair.map((term) =>
      getTermCardMetrics(doc, term, cardWidth),
    );
    const rowHeight = Math.max(...metrics.map((item) => item.cardHeight));

    if (y + rowHeight > height - 145) {
      drawFooter(doc);
      doc.addPage();
      drawPageHeader(doc, invoice, false, "TERMS / CONTINUED");
      y = CONTENT_TOP;
    }

    pair.forEach((term, pairIndex) => {
      drawTermCard(doc, {
        x: margin + pairIndex * (cardWidth + gap),
        y,
        width: cardWidth,
        index: index + pairIndex,
        metrics: { ...metrics[pairIndex], cardHeight: rowHeight },
      });
    });

    y += rowHeight + 10;
  }

  if (y + 190 > height - 64) {
    drawFooter(doc);
    doc.addPage();
    drawPageHeader(doc, invoice, false, "SUPPORT");
    y = CONTENT_TOP;
  }

  doc.setFillColor(...INK);
  doc.roundedRect(margin, y, contentWidth, 56, 9, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND_BRIGHT);
  doc.text("SERVICE ASSURANCE", margin + 14, y + 18);
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("Protected by Aquakart support standards", margin + 14, y + 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(174, 190, 201);
  doc.text(
    doc.splitTextToSize(
      "Retain this invoice for installation verification, warranty registration and service coordination.",
      contentWidth * 0.43,
    ),
    width - margin - 14,
    y + 23,
    { align: "right", lineHeightFactor: 1.25 },
  );

  drawCustomerCareDirectory(doc, y + 79);
  drawFooter(doc);
};

const drawBankMethodCard = (doc, { method, x, y, width, height }) => {
  const rows =
    method.type === "upi"
      ? [
          ["Google Pay", method.gpay],
          ["PhonePe", method.phonePe],
        ]
      : [
          ["Account name", method.accountName],
          ["Account number", method.accountNumber],
          ["IFSC", method.ifsc],
        ];

  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, width, height, 10, 10, "FD");
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x + 13, y + 13, 30, 30, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text(method.type === "upi" ? "UPI" : "BANK", x + 28, y + 32, {
    align: "center",
  });
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(method.name, x + 52, y + 25);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(
    method.type === "upi" ? "Digital payment" : "Bank transfer",
    x + 52,
    y + 39,
  );

  let rowY = y + 61;
  rows.forEach(([label, value]) => {
    doc.setDrawColor(...LINE);
    doc.line(x + 13, rowY - 8, x + width - 13, rowY - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 13, rowY + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(String(value), x + width - 13, rowY + 5, { align: "right" });
    rowY += 23;
  });
};

const drawPaymentInstructionsPage = (doc, invoice) => {
  const width = doc.internal.pageSize.getWidth();
  const margin = 42;
  const contentWidth = width - margin * 2;
  const gap = 12;
  const cardWidth = (contentWidth - gap) / 2;

  doc.addPage();
  drawPageHeader(doc, invoice, false, "PAYMENT");
  let y = drawSectionHeading(doc, {
    y: CONTENT_TOP,
    kicker: "Purchase-order payment",
    title: "Approved remittance details",
    description:
      "Use the invoice number as the payment reference and share the remittance confirmation with Aquakart for prompt allocation and order processing.",
  });

  drawBankMethodCard(doc, {
    method: bankPaymentMethods[0],
    x: margin,
    y,
    width: cardWidth,
    height: 144,
  });
  drawBankMethodCard(doc, {
    method: bankPaymentMethods[1],
    x: margin + cardWidth + gap,
    y,
    width: cardWidth,
    height: 144,
  });
  y += 157;
  drawBankMethodCard(doc, {
    method: bankPaymentMethods[2],
    x: margin,
    y,
    width: contentWidth,
    height: 112,
  });
  y += 132;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text("REMITTANCE PROCESS", margin, y);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("A clear three-step payment trail", margin, y + 18);
  y += 32;

  const steps = [
    [
      "01",
      "Reference",
      "Include the invoice number in the transfer narration.",
    ],
    [
      "02",
      "Confirmation",
      "Share the successful payment receipt with Aquakart.",
    ],
    [
      "03",
      "Allocation",
      "Await payment allocation and processing confirmation.",
    ],
  ];
  const stepGap = 9;
  const stepWidth = (contentWidth - stepGap * 2) / 3;
  steps.forEach(([number, title, description], index) => {
    const x = margin + index * (stepWidth + stepGap);
    doc.setFillColor(...INK);
    doc.roundedRect(x, y, stepWidth, 84, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND_BRIGHT);
    doc.text(number, x + 12, y + 18);
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text(title, x + 12, y + 35);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.setTextColor(174, 190, 201);
    doc.text(doc.splitTextToSize(description, stepWidth - 24), x + 12, y + 52, {
      lineHeightFactor: 1.25,
    });
  });
  y += 99;

  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, contentWidth, 54, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND);
  doc.text("PAYMENT VERIFICATION", margin + 13, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...INK);
  doc.text(
    doc.splitTextToSize(
      "Payment instructions are shown because this invoice is linked to a purchase order. Verify the beneficiary name, account number and IFSC before transfer.",
      contentWidth - 26,
    ),
    margin + 13,
    y + 34,
    { lineHeightFactor: 1.25 },
  );
  drawFooter(doc);
};

const addPageNumbers = (doc) => {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`PAGE ${page} OF ${pageCount}`, width / 2, height - 32, {
      align: "center",
    });
  }
};

const formatPdfNumber = (value) =>
  (Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toPaiseValue = (value) => Math.round((Number(value) || 0) * 100);

/**
 * Per-line tax split and invoice totals, shared by the PDF and the invoice
 * page. Line taxable values are summed so the table, the totals card and the
 * invoice total always agree to the paisa.
 */
export const getInvoiceTaxSummary = (invoice) => {
  const products = Array.isArray(invoice?.products) ? invoice.products : [];
  const amounts = priceUtils.getInvoiceAmounts({ ...invoice, products });
  const lineTaxes = products.map((product) =>
    priceUtils.getGSTBreakdown(product.productPrice),
  );
  const grandPaise = toPaiseValue(amounts.grandTotal);
  const taxablePaise =
    amounts.itemsTotal > 0
      ? lineTaxes.reduce((sum, tax) => sum + toPaiseValue(tax.basePrice), 0)
      : toPaiseValue(amounts.basePrice);
  const gstPaise = grandPaise - taxablePaise;
  const cgstPaise = Math.floor(gstPaise / 2);
  return {
    lineTaxes,
    totals: {
      taxable: taxablePaise / 100,
      gst: gstPaise / 100,
      cgst: cgstPaise / 100,
      sgst: (gstPaise - cgstPaise) / 100,
      grand: grandPaise / 100,
    },
  };
};

/** "Telangana (36)" from the buyer GSTIN's state code, or "". */
export const getPlaceOfSupply = (gstNo) => {
  const code = String(gstNo || "")
    .trim()
    .slice(0, 2);
  return GST_STATES[code] ? `${GST_STATES[code]} (${code})` : "";
};

/** Download the server-normalized public invoice as a searchable A4 PDF. */
export const createPublicInvoicePdfDocument = (JsPdf, rawInvoice) => {
  const invoice = sanitizeInvoiceForPdf(rawInvoice);
  const doc = new JsPdf({ unit: "pt", format: "a4", compress: true });
  doc.setCharSpace(0);
  doc.setLineWidth(0.6);
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = width - margin * 2;
  const footerTop = height - 60;
  const gap = 12;
  const { lineTaxes, totals } = getInvoiceTaxSummary(invoice);

  drawPageHeader(doc, invoice);
  let y = CONTENT_TOP;

  // Invoice facts: one bordered strip split into cells.
  const isPaid = /^paid$/i.test(String(invoice.paid_status || "").trim());
  const facts = [
    ["Invoice number", getPublicInvoiceReference(invoice), 0.34],
    ["Invoice date", formatDate(invoice.date), 0.22],
    ["Payment mode", titleCase(invoice.payment_type), 0.22],
    ["Payment status", titleCase(invoice.paid_status), 0.22],
  ];
  const factsHeight = 44;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.roundedRect(margin, y, contentWidth, factsHeight, 8, 8, "FD");
  let factX = margin;
  facts.forEach(([label, value, share], index) => {
    const cellWidth = contentWidth * share;
    if (index) {
      doc.setDrawColor(...LINE_SOFT);
      doc.line(factX, y + 9, factX, y + factsHeight - 9);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), factX + 12, y + 16);
    doc.setFont("helvetica", "bold");
    if (index === facts.length - 1) {
      const tone = isPaid
        ? { fill: [220, 252, 231], text: BRAND }
        : { fill: [254, 243, 199], text: [180, 83, 9] };
      doc.setFontSize(7.5);
      const pillWidth = doc.getTextWidth(value) + 16;
      doc.setFillColor(...tone.fill);
      doc.roundedRect(factX + 12, y + 21, pillWidth, 15, 7.5, 7.5, "F");
      doc.setTextColor(...tone.text);
      doc.text(value, factX + 20, y + 31.2);
    } else {
      doc.setTextColor(...INK);
      let size = 9;
      doc.setFontSize(size);
      while (size > 6.5 && doc.getTextWidth(value) > cellWidth - 24) {
        size -= 0.5;
        doc.setFontSize(size);
      }
      doc.text(value, factX + 12, y + 31);
    }
    factX += cellWidth;
  });
  y += factsHeight + 10;

  // Thank-you note with a brand accent bar.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const greetingLines = doc
    .splitTextToSize(
      `Thank you, ${invoice.customer_name || invoice.gst_name || "valued customer"}.`,
      contentWidth - 30,
    )
    .slice(0, 2);
  const greetingHeight = 21 + greetingLines.length * 10.5;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, contentWidth, greetingHeight, 7, 7, "FD");
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin + 7, y + 6, 3, greetingHeight - 12, 1.5, 1.5, "F");
  doc.setTextColor(...BRAND);
  doc.text(greetingLines, margin + 18, y + 13, { lineHeightFactor: 1.25 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED);
  doc.text(
    "Keep this verified invoice for warranty and Aquakart service support.",
    margin + 18,
    y + 13 + greetingLines.length * 10.5,
  );
  y += greetingHeight + 10;

  // Parties.
  const cardWidth = (contentWidth - gap) / 2;
  const placeOfSupply = getPlaceOfSupply(invoice.gst_no);
  const billLines = [
    {
      text: invoice.customer_name || "Customer name not available",
      bold: true,
    },
    invoice.customer_phone && { text: `Phone: ${invoice.customer_phone}` },
    invoice.customer_email && { text: `Email: ${invoice.customer_email}` },
    invoice.customer_address && { text: invoice.customer_address },
  ].filter(Boolean);
  const taxLines = invoice.gst
    ? [
        {
          text:
            invoice.gst_name ||
            invoice.customer_name ||
            "GST name not available",
          bold: true,
        },
        {
          text: invoice.gst_no
            ? `GSTIN: ${invoice.gst_no}`
            : "GSTIN not available",
          bold: Boolean(invoice.gst_no),
        },
        placeOfSupply && { text: `Place of supply: ${placeOfSupply}` },
        invoice.gst_phone && { text: `Phone: ${invoice.gst_phone}` },
        invoice.gst_email && { text: `Email: ${invoice.gst_email}` },
        invoice.gst_address && { text: invoice.gst_address },
      ].filter(Boolean)
    : [
        { text: "Retail invoice", bold: true },
        { text: "GST at 18% is included in the selling price." },
        { text: "Customer GST claim details were not requested." },
      ];
  const billWrapped = getPartyCardLines(doc, billLines, cardWidth);
  const taxWrapped = getPartyCardLines(doc, taxLines, cardWidth);
  // Both cards share one height so the row lines up.
  const partyHeight = getPartyCardHeight(
    Math.max(billWrapped.length, taxWrapped.length),
  );
  drawPartyCard(doc, {
    x: margin,
    y,
    width: cardWidth,
    height: partyHeight,
    title: "Billed to",
    lines: billWrapped,
  });
  drawPartyCard(doc, {
    x: margin + cardWidth + gap,
    y,
    width: cardWidth,
    height: partyHeight,
    title: invoice.gst ? "GST details" : "Tax profile",
    lines: taxWrapped,
  });
  y += partyHeight + 14;

  // Items table.
  const columns = getItemColumns(margin, contentWidth);
  const column = Object.fromEntries(columns.map((item) => [item.key, item]));
  const textWidth = column.product.width - 16;
  let segmentTop = y;
  y = drawItemsHeader(doc, y, columns);

  const startContinuationPage = () => {
    drawFooter(doc);
    doc.addPage();
    drawPageHeader(doc, invoice, true);
    y = CONTINUED_TOP;
  };
  const breakTable = () => {
    closeItemsSegment(doc, segmentTop, y, columns);
    startContinuationPage();
    segmentTop = y;
    y = drawItemsHeader(doc, y, columns);
  };

  invoice.products.forEach((product, index) => {
    const publicProductName =
      product.productName &&
      !containsInternalInvoiceIdentifier(product.productName)
        ? product.productName
        : "Product";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const nameLines = doc.splitTextToSize(publicProductName, textWidth);
    const categoryText = getPublicProductClassification(product);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    const categoryLines = categoryText
      ? doc.splitTextToSize(categoryText, textWidth)
      : [];
    doc.setFontSize(6.8);
    const serialLines =
      product.productSerialNo &&
      !containsInternalInvoiceIdentifier(product.productSerialNo)
        ? doc.splitTextToSize(`Serial: ${product.productSerialNo}`, textWidth)
        : [];
    const productUrl = getProductUrl(product);
    const rowHeight = Math.max(
      26,
      16 +
        nameLines.length * 10 +
        (categoryLines.length + serialLines.length + (productUrl ? 1 : 0)) *
          8.5,
    );
    // Keep room for the totals row under the last product.
    if (y + rowHeight + ITEM_HEAD > footerTop - 12) breakTable();

    const tax = lineTaxes[index];
    const textY = y + 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    drawCell(doc, column.no, String(index + 1), textY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(nameLines, column.product.x + 8, textY);
    let detailY = textY + nameLines.length * 10 - 1;
    if (categoryLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.6);
      doc.setTextColor(...BRAND);
      doc.text(categoryLines, column.product.x + 8, detailY);
      detailY += categoryLines.length * 8.5;
    }
    if (serialLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...MUTED);
      doc.text(serialLines, column.product.x + 8, detailY);
      detailY += serialLines.length * 8.5;
    }
    if (productUrl) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND);
      doc.textWithLink("View product online", column.product.x + 8, detailY, {
        url: productUrl,
      });
    }

    // productPrice is the line value; the unit price is derived from it.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    drawCell(doc, column.qty, String(product.productQuantity), textY);
    drawCell(doc, column.unit, formatPdfNumber(getUnitPrice(product)), textY);
    drawCell(doc, column.taxable, formatPdfNumber(tax.basePrice), textY);
    drawCell(doc, column.gst, formatPdfNumber(tax.gstValue), textY);
    doc.setFont("helvetica", "bold");
    drawCell(doc, column.amount, formatPdfNumber(product.productPrice), textY);

    y += rowHeight;
    doc.setDrawColor(...LINE_SOFT);
    doc.line(margin, y, margin + contentWidth, y);
  });

  if (!invoice.products.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "No products were attached to this invoice.",
      column.product.x + 8,
      y + 16,
    );
    y += 26;
    doc.setDrawColor(...LINE_SOFT);
    doc.line(margin, y, margin + contentWidth, y);
  }

  // Totals row.
  const totalQuantity = invoice.products.reduce(
    (sum, product) => sum + (Number(product.productQuantity) || 0),
    0,
  );
  doc.setFillColor(...SOFT);
  doc.roundedRect(
    margin + 0.5,
    y,
    contentWidth - 1,
    ITEM_HEAD - 0.5,
    5.5,
    5.5,
    "F",
  );
  doc.rect(margin + 0.5, y, contentWidth - 1, ITEM_HEAD / 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  const totalsY = y + 14;
  drawCell(doc, column.product, "Total", totalsY);
  drawCell(doc, column.qty, String(totalQuantity), totalsY);
  drawCell(doc, column.taxable, formatPdfNumber(totals.taxable), totalsY);
  drawCell(doc, column.gst, formatPdfNumber(totals.gst), totalsY);
  drawCell(doc, column.amount, formatPdfNumber(totals.grand), totalsY);
  y += ITEM_HEAD;
  closeItemsSegment(doc, segmentTop, y, columns);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(...MUTED);
  doc.text(
    "All amounts in INR. Prices are inclusive of GST.",
    margin + contentWidth,
    y + 11,
    { align: "right" },
  );
  y += 20;

  // Amount in words + tax summary.
  const summaryRows = invoice.gst
    ? [
        ["Taxable value", totals.taxable],
        ["CGST (9%)", totals.cgst],
        ["SGST (9%)", totals.sgst],
        ["Total GST (18%)", totals.gst],
      ]
    : [
        ["Taxable value", totals.taxable],
        ["GST (18%)", totals.gst],
      ];
  const TOTAL_BAND = 30;
  const summaryHeight = 14 + summaryRows.length * 15 + 4 + TOTAL_BAND;
  // Declaration/signatory block plus the stamp hanging below it.
  const closingHeight = summaryHeight + 14 + 72;
  if (y + closingHeight > footerTop - 8) startContinuationPage();

  const wordsWidth = contentWidth * 0.56;
  const summaryX = margin + wordsWidth + gap;
  const summaryWidth = contentWidth - wordsWidth - gap;

  drawCardShell(doc, {
    x: margin,
    y,
    width: wordsWidth,
    height: summaryHeight,
    title: "Amount in words",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(
    doc.splitTextToSize(
      priceUtils.numberToWords(totals.grand),
      wordsWidth - 26,
    ),
    margin + 13,
    y + CARD_HEAD + 16,
    { lineHeightFactor: 1.3 },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  const taxNote = doc.splitTextToSize(
    invoice.gst
      ? "GST included above equals CGST + SGST; these are a split, not extra charges."
      : "The selling price includes GST at 18%.",
    wordsWidth - 26,
  );
  doc.text(
    taxNote,
    margin + 13,
    y + summaryHeight - 11 - (taxNote.length - 1) * 8,
    { lineHeightFactor: 1.2 },
  );

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...LINE);
  doc.roundedRect(summaryX, y, summaryWidth, summaryHeight, 8, 8, "FD");
  let rowY = y + 18;
  summaryRows.forEach(([label, value], index) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(label, summaryX + 13, rowY);
    doc.setTextColor(...INK);
    doc.text(formatPdfAmount(value), summaryX + summaryWidth - 13, rowY, {
      align: "right",
    });
    if (index < summaryRows.length - 1) {
      doc.setDrawColor(...LINE_SOFT);
      doc.line(
        summaryX + 13,
        rowY + 5.5,
        summaryX + summaryWidth - 13,
        rowY + 5.5,
      );
    }
    rowY += 15;
  });
  const bandY = y + summaryHeight - TOTAL_BAND;
  doc.setFillColor(...BRAND);
  doc.roundedRect(summaryX, bandY, summaryWidth, TOTAL_BAND, 8, 8, "F");
  doc.rect(summaryX, bandY, summaryWidth, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8.5);
  doc.text("INVOICE TOTAL", summaryX + 13, bandY + 19);
  doc.setFontSize(11);
  doc.text(
    formatPdfAmount(totals.grand),
    summaryX + summaryWidth - 13,
    bandY + 19.5,
    { align: "right" },
  );
  y += summaryHeight + 14;

  // Declaration and signatory.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND);
  doc.text("DECLARATION", margin, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(
    doc.splitTextToSize(
      invoice.quotation
        ? "This is a quotation, not a tax invoice. Prices are inclusive of GST and subject to the terms in this document."
        : "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      wordsWidth - 10,
    ),
    margin,
    y + 19,
    { lineHeightFactor: 1.35 },
  );
  const signatureRight = summaryX + summaryWidth;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text("For AQUAKART", signatureRight, y + 8, { align: "right" });
  doc.setDrawColor(...LINE);
  doc.line(summaryX + 40, y + 40, signatureRight, y + 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...MUTED);
  doc.text("Authorised Signatory", signatureRight, y + 50, { align: "right" });

  // Seal pressed across the signature line, like a rubber stamp.
  drawInvoiceStamp(doc, {
    stamp: getInvoiceStamp(invoice),
    cx: summaryX + 78,
    cy: y + 26,
  });

  drawFooter(doc);
  drawTermsAndSupportPages(doc, invoice);
  if (invoice.po) drawPaymentInstructionsPage(doc, invoice);
  addPageNumbers(doc);

  return doc;
};

/** Download the server-normalized public invoice as a searchable A4 PDF. */
export const downloadPublicInvoicePdf = async (invoice, options = {}) => {
  const preparedTarget =
    options.preparedTarget === undefined
      ? preparePdfDownloadTarget()
      : options.preparedTarget;

  try {
    const { jsPDF: JsPdf } = await import("jspdf");
    const logoSource = typeof logo === "string" ? logo : logo?.src;
    const logoDataUrl = await imageUrlToDataUrl(logoSource);
    const doc = createPublicInvoicePdfDocument(JsPdf, {
      ...invoice,
      _pdfLogoDataUrl: logoDataUrl,
    });

    return savePdfDocument(
      doc,
      `Aquakart-Invoice-${safeFilePart(getPublicInvoiceReference(invoice))}.pdf`,
      preparedTarget,
    );
  } catch (error) {
    closePdfDownloadTarget(preparedTarget);
    throw error;
  }
};
