const DEFAULT_INVOICE_PDF_FILENAME = "Aquakart-Invoice.pdf";

export const sanitizeInvoiceFilePart = (value) =>
  String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");

export const getInvoicePdfFileName = (reference) => {
  const safeReference = sanitizeInvoiceFilePart(reference);
  return safeReference
    ? `Aquakart-Invoice-${safeReference}.pdf`
    : DEFAULT_INVOICE_PDF_FILENAME;
};

export default getInvoicePdfFileName;
