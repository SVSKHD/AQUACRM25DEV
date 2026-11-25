/**
 * Rubber-stamp shown on the invoice page and drawn into the invoice PDF.
 * One source so the screen and the PDF always show the same stamp.
 * Priority: quotation > paid > purchase order > payment due.
 */
export type InvoiceStampKey = "quotation" | "paid" | "po" | "due";

export interface InvoiceStamp {
  key: InvoiceStampKey;
  /** Large word in the middle of the seal. */
  word: string;
  /** Text around the bottom arc ("AQUAKART" runs around the top). */
  caption: string;
  rgb: [number, number, number];
  hex: string;
}

const STAMPS: Record<InvoiceStampKey, Omit<InvoiceStamp, "caption">> = {
  quotation: {
    key: "quotation",
    word: "QUOTATION",
    rgb: [29, 78, 216],
    hex: "#1d4ed8",
  },
  paid: { key: "paid", word: "PAID", rgb: [21, 128, 61], hex: "#15803d" },
  po: { key: "po", word: "PO", rgb: [109, 40, 217], hex: "#6d28d9" },
  due: { key: "due", word: "DUE", rgb: [194, 65, 12], hex: "#c2410c" },
};

export const isInvoicePaid = (paidStatus: unknown) =>
  /^paid$/i.test(String(paidStatus ?? "").trim());

export const getInvoiceStamp = (invoice: {
  quotation?: boolean;
  po?: boolean;
  paid_status?: string | null;
}): InvoiceStamp => {
  if (invoice.quotation) {
    return { ...STAMPS.quotation, caption: "NOT A TAX INVOICE" };
  }
  if (isInvoicePaid(invoice.paid_status)) {
    return {
      ...STAMPS.paid,
      caption: invoice.po ? "PURCHASE ORDER" : "PAYMENT RECEIVED",
    };
  }
  if (invoice.po) return { ...STAMPS.po, caption: "PURCHASE ORDER" };
  return { ...STAMPS.due, caption: "PAYMENT PENDING" };
};
