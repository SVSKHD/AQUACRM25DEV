import type {
  QuickDraft,
  QuickDraftItem,
  QuickDraftProduct,
} from "../services/invoiceAI";
import type {
  CatalogProduct,
  InvoiceLine,
} from "../components/modular/invoices/invoiceFormat";

/** A draft line as staff edit it in the review card. */
export interface QuickReviewLine {
  line: number;
  rawName: string;
  quantity: number;
  quantityAssumed: boolean;
  /** Unit price as typed; "" when none was sent. */
  price: string;
  serialNo: string;
  confidence: QuickDraftItem["confidence"];
  /** Chosen catalog productId; "" = custom item (not linked). */
  choice: string;
  options: QuickDraftProduct[];
}

export interface QuickCheck {
  line?: number;
  message: string;
}

const PRICE_DRIFT_WARNING = 0.25;
const MAX_QUANTITY = 1000;

export const toReviewLines = (draft: QuickDraft): QuickReviewLine[] =>
  draft.items.map((item) => ({
    line: item.line,
    rawName: item.rawName,
    quantity: item.quantity,
    quantityAssumed: item.quantityAssumed,
    price: item.unitPrice === null ? "" : String(item.unitPrice),
    serialNo: item.serialNo,
    confidence: item.confidence,
    choice: item.match?.productId || "",
    options: [...(item.match ? [item.match] : []), ...item.alternatives],
  }));

/** Positive unit price, or null when missing / not a number. */
export const linePrice = (line: QuickReviewLine): number | null => {
  const value = Number(line.price.replace(/[^\d.]/g, ""));
  return line.price.trim() && Number.isFinite(value) && value > 0
    ? Math.round(value * 100) / 100
    : null;
};

export const chosenProduct = (line: QuickReviewLine) =>
  line.options.find((option) => option.productId === line.choice) || null;

/** Line value (quantity × unit price); invoice lines store this, not the unit price. */
export const lineValue = (line: QuickReviewLine) => {
  const price = linePrice(line);
  return price === null ? null : Math.round(price * line.quantity * 100) / 100;
};

export const reviewTotal = (lines: QuickReviewLine[]) =>
  Math.round(
    lines.reduce((sum, line) => sum + (lineValue(line) || 0), 0) * 100,
  ) / 100;

/**
 * Problems that block Create & send. `customer` is what the form will hold
 * after applying (draft value, else what is already typed).
 */
export const blockingProblems = (
  lines: QuickReviewLine[],
  customer: { name: string; phone: string },
): QuickCheck[] => {
  const problems: QuickCheck[] = [];
  if (!customer.name.trim())
    problems.push({ message: "Customer name is missing." });
  if (!/^[6-9]\d{9}$/.test(customer.phone))
    problems.push({
      message: "A 10-digit mobile number is needed to send it.",
    });
  if (!lines.length) problems.push({ message: "No products were found." });

  // Same product on two lines draws on the same stock.
  const needed = new Map<string, number>();
  for (const line of lines) {
    if (linePrice(line) === null)
      problems.push({
        line: line.line,
        message: `Price not sent for "${line.rawName}". Type the price.`,
      });
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_QUANTITY
    )
      problems.push({
        line: line.line,
        message: `Quantity for "${line.rawName}" must be 1 to ${MAX_QUANTITY}.`,
      });
    if (line.choice)
      needed.set(line.choice, (needed.get(line.choice) || 0) + line.quantity);
  }
  for (const [productId, quantity] of needed) {
    const line = lines.find((entry) => entry.choice === productId)!;
    const product = chosenProduct(line)!;
    if (product.stock === null)
      problems.push({
        line: line.line,
        message: `${product.name} has no CRM stock record. Add stock, or choose "Custom item".`,
      });
    else if (product.stock < quantity)
      problems.push({
        line: line.line,
        message: `${product.name}: only ${product.stock} in stock, ${quantity} needed.`,
      });
  }
  return problems;
};

/** Worth a look, but don't block. */
export const lineWarnings = (line: QuickReviewLine): string[] => {
  const warnings: string[] = [];
  const product = chosenProduct(line);
  const price = linePrice(line);
  if (!product)
    warnings.push("Custom item: stock and service reminders won't track it.");
  else if (
    price !== null &&
    product.catalogPrice > 0 &&
    Math.abs(price - product.catalogPrice) / product.catalogPrice >
      PRICE_DRIFT_WARNING
  )
    warnings.push(
      `Your price is more than ${PRICE_DRIFT_WARNING * 100}% away from the catalog price.`,
    );
  return warnings;
};

/** Review lines → form lines. Prefers the CRM catalog entry for slug/link. */
export const toInvoiceLines = (
  lines: QuickReviewLine[],
  catalog: CatalogProduct[],
): InvoiceLine[] =>
  lines.map((line) => {
    const product = chosenProduct(line);
    const local = product
      ? catalog.find((entry) => String(entry.id) === product.productId)
      : undefined;
    return {
      productName: product ? local?.name || product.name : line.rawName,
      productQuantity: line.quantity,
      productPrice: lineValue(line) ?? 0,
      productSerialNo: line.serialNo,
      productId: product?.productId || "",
      productSlug: product ? local?.slug || product.slug : "",
      productLink: local?.link || "",
    };
  });
