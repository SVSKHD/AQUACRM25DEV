// CRM entry point for the customer invoice PDF. Not vendored: this file is CRM-owned.
// It runs the same pipeline as AQUAKARTECOM/src/pages/invoice/[id].js and
// pageComponents/invoice/InvoicePage.js, so a PDF downloaded from the CRM is the
// same document the customer downloads from aquakart.co.in/invoice/:id.
import { mapInvoiceFromApi } from "./normalizeInvoice";
import { enrichInvoiceProducts } from "./matchInvoiceProducts";
import { downloadPublicInvoicePdf } from "./generatePublicInvoicePdf";
import {
  closePdfDownloadTarget,
  preparePdfDownloadTarget,
} from "./pdfDownload";

/** Raw backend invoice (or `{ data }` wrapper) → normalized public invoice with catalogue links. */
export const toCustomerInvoice = (rawInvoice, cataloguePayload) => {
  const invoice = mapInvoiceFromApi(rawInvoice);
  if (!invoice) throw new Error("Invoice data is missing or invalid");
  return enrichInvoiceProducts(invoice, cataloguePayload);
};

/**
 * Downloads the storefront invoice PDF (`Aquakart-Invoice-<invoice no>.pdf`).
 * Call it directly from a click handler: the mobile download target is opened
 * before any async work, as the storefront does.
 */
export const downloadCustomerInvoicePdf = async (
  rawInvoice,
  cataloguePayload,
) => {
  const preparedTarget = preparePdfDownloadTarget();
  try {
    return await downloadPublicInvoicePdf(
      toCustomerInvoice(rawInvoice, cataloguePayload),
      { preparedTarget },
    );
  } catch (error) {
    closePdfDownloadTarget(preparedTarget);
    throw error;
  }
};
