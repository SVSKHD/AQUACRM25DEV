// Preview of the invoice a sold quotation becomes. Mirrors the backend
// (AQUAKARTBACKEND src/services/quotation/quotationInvoice.js): an invoice
// line's productPrice is the LINE value (never x quantity); a quotation line is
// max(qty * price - discount, 0) + tax, and quotation-level discount/tax is
// spread over the lines so the invoice total equals the quotation total.

export type QuotationLineInput = {
  productName?: string;
  productQuantity?: number | string;
  productPrice?: number | string;
  productDiscount?: number | string;
  productTax?: number | string;
};

export type QuotationTotalsInput = {
  products?: QuotationLineInput[];
  discount?: number | string;
  tax?: number | string;
};

export type InvoicePreviewLine = {
  productName: string;
  productQuantity: number;
  lineValue: number;
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const quotationLineTotal = (product: QuotationLineInput = {}) =>
  Math.max(
    toNumber(product.productQuantity) * toNumber(product.productPrice) -
      toNumber(product.productDiscount),
    0,
  ) + toNumber(product.productTax);

export const invoiceLineValues = (quotation: QuotationTotalsInput = {}) => {
  const lines = (quotation.products || []).map(quotationLineTotal);
  const subTotal = lines.reduce((sum, value) => sum + value, 0);
  const total = roundMoney(
    Math.max(subTotal - toNumber(quotation.discount), 0) +
      toNumber(quotation.tax),
  );

  if (!lines.length) return [];
  if (subTotal <= 0) return lines.map((_, index) => (index === 0 ? total : 0));

  const scaled = lines.map((value) => roundMoney((value / subTotal) * total));
  const drift = roundMoney(
    total - scaled.reduce((sum, value) => sum + value, 0),
  );
  if (drift !== 0) {
    const largest = scaled.indexOf(Math.max(...scaled));
    scaled[largest] = roundMoney(scaled[largest] + drift);
  }
  return scaled;
};

export const invoicePreviewLines = (
  quotation: QuotationTotalsInput = {},
): InvoicePreviewLine[] => {
  const values = invoiceLineValues(quotation);
  return (quotation.products || []).map((product, index) => ({
    productName: String(product.productName || "").trim() || "Unnamed item",
    productQuantity: toNumber(product.productQuantity) || 1,
    lineValue: values[index] ?? 0,
  }));
};

const INDIAN_CONTACT = /^(?:\+91|91)?[6-9]\d{9}$/;

// The reasons the backend would refuse the invoice, so staff see them before
// pressing the button. Empty list = ready.
export const quotationInvoiceProblems = (quotation: {
  customerDetails?: { name?: string; phone?: string | number };
  products?: QuotationLineInput[];
  gst?: boolean;
  gstDetails?: { gstName?: string; gstNo?: string };
}) => {
  const problems: string[] = [];
  if (!quotation.customerDetails?.name?.trim())
    problems.push("Customer name is missing.");
  const phone = String(quotation.customerDetails?.phone ?? "").replace(
    /\s|-/g,
    "",
  );
  if (!INDIAN_CONTACT.test(phone))
    problems.push("Customer phone must be a valid 10-digit Indian number.");
  const products = quotation.products || [];
  if (!products.length) problems.push("The quotation has no products.");
  products.forEach((product, index) => {
    if (!String(product.productName || "").trim())
      problems.push(`Product ${index + 1} has no name.`);
  });
  if (quotation.gst) {
    if (!quotation.gstDetails?.gstNo?.trim())
      problems.push("GST is on but the GST number is missing.");
    if (!quotation.gstDetails?.gstName?.trim())
      problems.push("GST is on but the GST name is missing.");
  }
  return problems;
};
