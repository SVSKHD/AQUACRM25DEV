// @ts-nocheck
import {
  bankPaymentMethods,
  customerCare,
  termsAndConditions,
} from "../pages/dynamicInvoiceComponents/constants/constants";
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
const LINE = [226, 232, 240];
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

const titleCase = (value) =>
  String(value || "Not available")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const drawPageHeader = (doc, invoice, continued = false, sectionLabel = "") => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const invoiceTitle = invoice.gst ? "GST TAX INVOICE" : "RETAIL TAX INVOICE";
  const documentTitle = sectionLabel
    ? `${invoiceTitle} / ${sectionLabel}`
    : continued
      ? `${invoiceTitle} / CONTINUED`
      : invoiceTitle;
  if (invoice._pdfLogoDataUrl) {
    try {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.045 }));
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

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, width, 92, "F");
  doc.setFillColor(...BRAND_BRIGHT);
  doc.rect(0, 88, width, 4, "F");

  if (invoice._pdfLogoDataUrl) {
    try {
      doc.setFillColor(...WHITE);
      doc.roundedRect(18, 18, 48, 48, 9, 9, "F");
      doc.addImage(invoice._pdfLogoDataUrl, "PNG", 24, 24, 36, 36);
    } catch {
      // Text branding below is the accessible fallback.
    }
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("AQUAKART", 78, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Premium water solutions", 78, 59);
  doc.text("GSTIN 36AJOPH6387A1Z2  |  aquakart.co.in", 78, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(documentTitle, width - 42, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(getPublicInvoiceReference(invoice), width - 42, 60, {
    align: "right",
  });
};

const drawFooter = (doc) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...LINE);
  doc.line(42, height - 54, width - 42, height - 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Computer-generated invoice. No physical signature is required.",
    42,
    height - 38,
  );
  doc.text(
    "Aquakart  |  support@aquakart.co.in  |  +91 90147 74667",
    width - 42,
    height - 38,
    { align: "right" },
  );
};

const drawInfoCard = (doc, { x, y, width, title, lines }) => {
  const wrappedLines = lines.flatMap((line) =>
    doc.splitTextToSize(String(line || "Not available"), width - 28),
  );
  const height = Math.max(92, 45 + wrappedLines.length * 12);

  doc.setFillColor(...SOFT);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, width, height, 9, 9, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);
  doc.text(title.toUpperCase(), x + 14, y + 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(wrappedLines, x + 14, y + 38, { lineHeightFactor: 1.35 });

  return height;
};

const drawProductHeader = (doc, y) => {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...INK);
  doc.roundedRect(42, y, width - 84, 28, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("PRODUCT", 56, y + 18);
  doc.text("QTY", width - 220, y + 18, { align: "right" });
  doc.text("UNIT PRICE", width - 125, y + 18, { align: "right" });
  doc.text("LINE TOTAL", width - 56, y + 18, { align: "right" });
  return y + 34;
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
    y: 118,
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
      y = 118;
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

  if (y + 130 > height - 60) {
    drawFooter(doc);
    doc.addPage();
    drawPageHeader(doc, invoice, false, "SUPPORT");
    y = 118;
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
    y: 118,
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
    doc.text(`PAGE ${page} OF ${pageCount}`, width / 2, height - 21, {
      align: "center",
    });
  }
};

/** Download the server-normalized public invoice as a searchable A4 PDF. */
export const createPublicInvoicePdfDocument = (JsPdf, invoice) => {
  const doc = new JsPdf({ unit: "pt", format: "a4", compress: true });
  doc.setCharSpace(0);
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = width - margin * 2;
  const amounts = priceUtils.getInvoiceAmounts(invoice);

  drawPageHeader(doc, invoice);
  let y = 116;

  const metadata = [
    ["Invoice number", getPublicInvoiceReference(invoice)],
    ["Invoice date", formatDate(invoice.date)],
    ["Payment", titleCase(invoice.payment_type)],
    ["Status", titleCase(invoice.paid_status)],
  ];
  const metaWidth = contentWidth / 4 - 7;

  metadata.forEach(([label, value], index) => {
    const x = margin + index * (metaWidth + 9.3);
    doc.setFillColor(...SOFT);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, metaWidth, 50, 8, 8, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 10, y + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const valueLines = doc.splitTextToSize(String(value), metaWidth - 20);
    doc.text(valueLines.slice(0, 2), x + 10, y + 33);
  });

  y += 66;
  const greetingLines = doc
    .splitTextToSize(
      `Thank you, ${invoice.customer_name || invoice.gst_name || "valued customer"}.`,
      contentWidth - 28,
    )
    .slice(0, 2);
  const greetingHeight = greetingLines.length > 1 ? 60 : 48;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, contentWidth, greetingHeight, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text(greetingLines, margin + 14, y + 18, { lineHeightFactor: 1.25 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Keep this verified invoice for warranty and Aquakart service support.",
    margin + 14,
    y + 20 + greetingLines.length * 11,
  );

  y += greetingHeight + 14;
  const gap = 14;
  const cardWidth = (contentWidth - gap) / 2;
  const customerLines = [
    invoice.customer_name || "Customer name not available",
    invoice.customer_phone,
    invoice.customer_email,
    invoice.customer_address,
  ].filter(Boolean);
  const gstLines = invoice.gst
    ? [
        invoice.gst_name || invoice.customer_name,
        invoice.gst_no ? `GSTIN: ${invoice.gst_no}` : "GSTIN not available",
        invoice.gst_phone,
        invoice.gst_email,
        invoice.gst_address,
      ].filter(Boolean)
    : [
        "GST at 18% is included in the selling price.",
        "Customer GST claim details were not requested.",
      ];
  const customerHeight = drawInfoCard(doc, {
    x: margin,
    y,
    width: cardWidth,
    title: "Bill to",
    lines: customerLines,
  });
  const gstHeight = drawInfoCard(doc, {
    x: margin + cardWidth + gap,
    y,
    width: cardWidth,
    title: invoice.gst ? "GST details" : "Tax profile",
    lines: gstLines,
  });

  y += Math.max(customerHeight, gstHeight) + 20;
  y = drawProductHeader(doc, y);

  const addContinuationPage = (showProductHeader = true) => {
    drawFooter(doc);
    doc.addPage();
    drawPageHeader(doc, invoice, true);
    y = showProductHeader ? drawProductHeader(doc, 112) : 112;
  };

  invoice.products.forEach((product, index) => {
    const publicProductName =
      product.productName &&
      !containsInternalInvoiceIdentifier(product.productName)
        ? product.productName
        : "Product";
    const nameLines = doc.splitTextToSize(publicProductName, 220);
    const categoryText = getPublicProductClassification(product);
    const categoryLines = categoryText
      ? doc.splitTextToSize(categoryText, 220)
      : [];
    const serialLines =
      product.productSerialNo &&
      !containsInternalInvoiceIdentifier(product.productSerialNo)
        ? doc.splitTextToSize(`Serial: ${product.productSerialNo}`, 220)
        : [];
    const productUrl = getProductUrl(product);
    const rowHeight = Math.max(
      45,
      22 +
        nameLines.length * 11 +
        categoryLines.length * 9 +
        serialLines.length * 10 +
        (productUrl ? 11 : 0),
    );
    if (y + rowHeight > height - 170) addContinuationPage();

    if (index % 2 === 1) {
      doc.setFillColor(...SOFT);
      doc.roundedRect(margin, y, contentWidth, rowHeight, 5, 5, "F");
    }

    const lineTotal = product.productPrice * product.productQuantity;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(nameLines, margin + 14, y + 17);
    let detailY = y + 17 + nameLines.length * 11;
    if (categoryLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...BRAND);
      doc.text(categoryLines, margin + 14, detailY);
      detailY += categoryLines.length * 9;
    }
    if (serialLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(serialLines, margin + 14, detailY);
      detailY += serialLines.length * 10;
    }
    if (productUrl) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.7);
      doc.setTextColor(...BRAND);
      doc.textWithLink("View product online", margin + 14, detailY, {
        url: productUrl,
      });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(String(product.productQuantity), width - 220, y + 19, {
      align: "right",
    });
    doc.text(formatPdfAmount(product.productPrice), width - 125, y + 19, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(formatPdfAmount(lineTotal), width - 56, y + 19, {
      align: "right",
    });
    y += rowHeight + 3;
  });

  if (!invoice.products.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No products were attached to this invoice.", margin + 14, y + 22);
    y += 46;
  }

  const summaryCardHeight = invoice.gst ? 166 : 146;
  if (y + summaryCardHeight + 78 > height) addContinuationPage(false);
  y += 18;

  const wordsWidth = contentWidth * 0.54;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, wordsWidth, summaryCardHeight, 10, 10, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND);
  doc.text("AMOUNT IN WORDS", margin + 15, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const words = doc.splitTextToSize(
    priceUtils.numberToWords(amounts.grandTotal),
    wordsWidth - 30,
  );
  doc.text(words, margin + 15, y + 43, { lineHeightFactor: 1.4 });
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    invoice.gst
      ? "The GST total is divided equally into CGST and SGST."
      : "The selling price includes GST at 18%.",
    margin + 15,
    y + summaryCardHeight - 21,
  );

  const summaryX = margin + wordsWidth + gap;
  const summaryWidth = contentWidth - wordsWidth - gap;
  doc.setFillColor(...INK);
  doc.roundedRect(summaryX, y, summaryWidth, summaryCardHeight, 10, 10, "F");
  const summaryRows = invoice.gst
    ? [
        ["Base price", amounts.basePrice],
        ["GST (18%)", amounts.gstValue],
        ["CGST (9%)", amounts.cgstValue],
        ["SGST (9%)", amounts.sgstValue],
      ]
    : [
        ["Base price", amounts.basePrice],
        ["GST (18%)", amounts.gstValue],
      ];
  let rowY = y + 25;
  summaryRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(label, summaryX + 14, rowY);
    doc.setTextColor(...WHITE);
    doc.text(formatPdfAmount(value), summaryX + summaryWidth - 14, rowY, {
      align: "right",
    });
    rowY += 20;
  });
  doc.setDrawColor(71, 85, 105);
  doc.line(summaryX + 14, rowY - 7, summaryX + summaryWidth - 14, rowY - 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("INVOICE TOTAL", summaryX + 14, rowY + 9);
  doc.text(
    formatPdfAmount(amounts.grandTotal),
    summaryX + summaryWidth - 14,
    rowY + 9,
    { align: "right" },
  );

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
