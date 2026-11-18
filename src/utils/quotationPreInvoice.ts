// Quotation → pre-invoice rules and messages (mirrors the backend's
// services/offlinePayments: preInvoices.moveFromQuotation and the quotation
// payment-link source).

export type QuotationLike = {
  status?: string;
  convertedToInvoice?: unknown;
  convertedToPreInvoice?: unknown;
  convertedToPreInvoiceNo?: unknown;
  payment?: { status?: string } | null;
};

const idOf = (value: unknown): string | null => {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object") {
    const id = (value as { _id?: unknown })._id;
    if (typeof id === "string" && id) return id;
  }
  return null;
};

/** Id of the pre-invoice this quotation was moved to, if any. */
export const movedPreInvoiceId = (quotation: QuotationLike) =>
  idOf(quotation.convertedToPreInvoice);

/**
 * Pre-invoice number: `convertedToPreInvoiceNo` (backend 049c7c5+), else a
 * populated `convertedToPreInvoice`. Quotations moved before that backend
 * change have neither; the drawer then fetches the pre-invoice.
 */
export const movedPreInvoiceNo = (quotation: QuotationLike) => {
  if (
    typeof quotation.convertedToPreInvoiceNo === "string" &&
    quotation.convertedToPreInvoiceNo
  )
    return quotation.convertedToPreInvoiceNo;
  const value = quotation.convertedToPreInvoice;
  if (value && typeof value === "object") {
    const number = (value as { preInvoiceNo?: unknown }).preInvoiceNo;
    if (typeof number === "string") return number;
  }
  return "";
};

const NOT_MOVABLE_STATUSES = ["Rejected", "Expired", "Sold", "Paid"];
const NOT_PAYABLE_STATUSES = [
  "Paid",
  "Converted",
  "Sold",
  "Rejected",
  "Expired",
];

/** null when "Move to pre-invoice" is allowed, otherwise why not. */
export const quotationMoveBlockedReason = (
  quotation: QuotationLike,
): string | null => {
  if (movedPreInvoiceId(quotation)) return "Already moved to a pre-invoice.";
  if (quotation.convertedToInvoice) return "Already moved to an invoice.";
  if (quotation.payment?.status === "Paid") return "Already paid.";
  if (NOT_MOVABLE_STATUSES.includes(quotation.status || ""))
    return `A ${quotation.status} quotation can't be moved.`;
  return null;
};

/** null when a payment link can be created on the quotation itself. */
export const quotationLinkBlockedReason = (
  quotation: QuotationLike,
): string | null => {
  if (movedPreInvoiceId(quotation))
    return "Moved to a pre-invoice; create the link there.";
  if (quotation.convertedToInvoice) return "An invoice already exists.";
  if (quotation.payment?.status === "Paid") return "Already paid.";
  if (NOT_PAYABLE_STATUSES.includes(quotation.status || ""))
    return `A ${quotation.status} quotation can't be paid online.`;
  return null;
};

type ErrorLike = {
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
};

/** Message for POST /quotations/:id/pre-invoice errors. */
export const moveToPreInvoiceErrorMessage = (response: ErrorLike) => {
  switch (response.code) {
    case "QUOTATION_ALREADY_MOVED": {
      const number = relatedPreInvoiceNo(response);
      return `This quotation already has a pre-invoice${number ? ` (${number})` : ""}.`;
    }
    case "QUOTATION_ALREADY_INVOICED":
      return "This quotation already has an invoice, so it can't be moved to a pre-invoice.";
    case "QUOTATION_NOT_MOVABLE":
      return (
        response.error || "This quotation can't be moved in its current status."
      );
    case "VALIDATION_FAILED": {
      const fields = Object.values(response.details || {}).filter(
        (value): value is string => typeof value === "string",
      );
      return `Fix the quotation first: ${fields.join("; ") || "some fields are invalid"}.`;
    }
  }
  return response.error || "Couldn't move the quotation.";
};

/** Message for convert-to-invoice when the quotation was moved to a pre-invoice. */
export const convertToInvoiceErrorMessage = (response: ErrorLike) => {
  if (response.code !== "QUOTATION_MOVED_TO_PRE_INVOICE")
    return response.error || "Couldn't move the quotation to an invoice.";
  const number = relatedPreInvoiceNo(response);
  return `This quotation was moved to a pre-invoice${number ? ` (${number})` : ""}. The invoice is created from the pre-invoice once the customer pays, so it can't be moved to an invoice here.`;
};

/** Pre-invoice number in an error's details (backend 049c7c5+), if sent. */
export const relatedPreInvoiceNo = (response: ErrorLike) => {
  const number = response.details?.preInvoiceNo;
  return typeof number === "string" && number ? number : null;
};

export const relatedPreInvoiceId = (response: ErrorLike) => {
  const id = response.details?.preInvoiceId;
  return typeof id === "string" && id ? id : null;
};
