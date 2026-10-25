/*
 * Derived invoice statuses shown in the invoices table, filters and exports.
 * - Paid: normalised `paidStatus` (legacy records use mixed case / free text).
 * - Delivery: from `transport.deliveryDate` / `deliveredBy`; the date decides
 *   delivered (today or earlier) vs scheduled (future).
 * - Enriched: the customer opened the invoice link and linked an account, so the
 *   backend stored `firebaseUid` (mapped to `invoice_login_linked`). Unenriched
 *   invoices get the weekly reminder (AQUAKARTBACKEND/src/jobs/unenrichedInvoiceReminder.js).
 */

export type PaidStatus = "paid" | "partial" | "unpaid";
export type DeliveryStatus = "delivered" | "scheduled" | "assigned" | "pending";
export type EnrichmentStatus = "enriched" | "not-enriched";

export const PAID_LABELS: Record<PaidStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  delivered: "Delivered",
  scheduled: "Scheduled",
  assigned: "Assigned",
  pending: "Not delivered",
};

export const ENRICHMENT_LABELS: Record<EnrichmentStatus, string> = {
  enriched: "Enriched",
  "not-enriched": "Not enriched",
};

export const paidStatusOf = (invoice: {
  paid_status?: string | null;
}): PaidStatus => {
  const value = String(invoice.paid_status || "")
    .trim()
    .toLowerCase();
  if (
    value === "paid" ||
    value === "fully paid" ||
    value === "complete" ||
    value === "completed"
  )
    return "paid";
  if (value.startsWith("partial")) return "partial";
  return "unpaid";
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

/** Parses "YYYY-MM-DD" as a local date (not UTC) so today's deliveries count as delivered. */
const parseDeliveryDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const deliveryStatusOf = (invoice: {
  delivery_date?: string | null;
  delivered_by?: string | null;
}): DeliveryStatus => {
  const date = invoice.delivery_date
    ? parseDeliveryDate(invoice.delivery_date)
    : null;
  if (date)
    return date.getTime() < startOfToday() + 86_400_000
      ? "delivered"
      : "scheduled";
  return invoice.delivered_by?.trim() ? "assigned" : "pending";
};

export const enrichmentStatusOf = (invoice: {
  invoice_login_linked?: boolean;
}): EnrichmentStatus =>
  invoice.invoice_login_linked ? "enriched" : "not-enriched";
