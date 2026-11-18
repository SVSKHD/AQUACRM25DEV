// Customer payment links for pre-invoices and quotations
// (/v1/crm/{pre-invoices|quotations}/:id/payment-link). The CRM never handles
// money: it creates/revokes links and shows their state. The pay URL comes
// back once (only its hash is stored); it is shown in the one-time dialog and
// must never be logged, stored or sent to analytics.

export type PaymentLinkSourceKind = "pre_invoice" | "quotation";

export type PaymentLinkStatus = "active" | "revoked" | "expired" | "paid";

export type ConversionStatus =
  "none" | "in_progress" | "done" | "blocked_stock" | "failed" | "needs_review";

export type PaymentLinkState = {
  linkId: string;
  status: PaymentLinkStatus;
  source: { kind: PaymentLinkSourceKind; id: string; number: string };
  amount: number;
  currency: string;
  expiresAt: string | null;
  createdAt: string | null;
  boundToCustomer: boolean;
  reviewFlags: string[];
  paidAt: string | null;
  amountPaid: number | null;
  gatewayTransactionId: string | null;
  conversion: {
    status: ConversionStatus;
    invoiceId: string | null;
    invoiceNo: string | null;
    lastError: string | null;
  };
  /** GET only. false → the document changed after the link was made; the link no longer works. */
  matchesDocument?: boolean;
  /** Not sent by the backend yet; enables "Retry invoice" when present. */
  paidAttemptId?: string | null;
};

const LINK_STATUSES: readonly string[] = [
  "active",
  "revoked",
  "expired",
  "paid",
];
const CONVERSION_STATUSES: readonly string[] = [
  "none",
  "in_progress",
  "done",
  "blocked_stock",
  "failed",
  "needs_review",
];

const obj = (value: unknown) =>
  (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value : "");
const strOrNull = (value: unknown) =>
  typeof value === "string" && value ? value : null;
const numOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeLinkState = (raw: unknown): PaymentLinkState | null => {
  const link = obj(raw);
  if (!str(link.linkId)) return null;
  const source = obj(link.source);
  const conversion = obj(link.conversion);
  const status = str(link.status);
  const conversionStatus = str(conversion.status);
  return {
    linkId: str(link.linkId),
    status: (LINK_STATUSES.includes(status)
      ? status
      : "revoked") as PaymentLinkStatus,
    source: {
      kind: source.kind === "quotation" ? "quotation" : "pre_invoice",
      id: str(source.id),
      number: str(source.number),
    },
    amount: Number(link.amount) || 0,
    currency: str(link.currency) || "INR",
    expiresAt: strOrNull(link.expiresAt),
    createdAt: strOrNull(link.createdAt),
    boundToCustomer: link.boundToCustomer === true,
    reviewFlags: Array.isArray(link.reviewFlags)
      ? link.reviewFlags.filter(
          (flag): flag is string => typeof flag === "string",
        )
      : [],
    paidAt: strOrNull(link.paidAt),
    amountPaid: numOrNull(link.amountPaid),
    gatewayTransactionId: strOrNull(link.gatewayTransactionId),
    conversion: {
      status: (CONVERSION_STATUSES.includes(conversionStatus)
        ? conversionStatus
        : "none") as ConversionStatus,
      invoiceId: strOrNull(conversion.invoiceId),
      invoiceNo: strOrNull(conversion.invoiceNo),
      lastError: strOrNull(conversion.lastError),
    },
    ...(typeof link.matchesDocument === "boolean"
      ? { matchesDocument: link.matchesDocument }
      : {}),
    ...(strOrNull(link.paidAttemptId)
      ? { paidAttemptId: strOrNull(link.paidAttemptId) }
      : {}),
  };
};

// ---- Labels ----------------------------------------------------------------

type Tone = "neutral" | "good" | "warn" | "bad";

export const toneClass: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  bad: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
};

export const LINK_STATUS_LABELS: Record<
  PaymentLinkStatus,
  { label: string; tone: Tone }
> = {
  active: { label: "Active", tone: "good" },
  paid: { label: "Paid", tone: "good" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "neutral" },
};

/** Short text for list columns: "No link", "Active", "Outdated", … */
export const linkStatusSummary = (
  link: PaymentLinkState | null | undefined,
): { label: string; tone: Tone } => {
  if (!link) return { label: "No link", tone: "neutral" };
  if (link.status === "active" && link.matchesDocument === false)
    return { label: "Outdated", tone: "warn" };
  if (link.reviewFlags.length) return { label: "Needs review", tone: "bad" };
  return LINK_STATUS_LABELS[link.status];
};

export const CONVERSION_LABELS: Record<
  ConversionStatus,
  { label: string; tone: Tone; hint?: string }
> = {
  none: { label: "Unpaid", tone: "neutral" },
  in_progress: { label: "Creating invoice…", tone: "warn" },
  done: { label: "Invoice created", tone: "good" },
  blocked_stock: {
    label: "Paid; invoice waiting for stock",
    tone: "warn",
    hint: "Restock the items, then reconcile the payment to create the invoice.",
  },
  failed: {
    label: "Paid; invoice creation failed",
    tone: "bad",
    hint: "Reconcile the payment to retry creating the invoice.",
  },
  needs_review: {
    label: "Paid; needs manual review",
    tone: "bad",
    hint: "No invoice was created automatically. Check the payment and create the invoice by hand if it's correct.",
  },
};

/** Conversion states where a paid link still has no invoice and reconcile can help. */
export const RECONCILABLE_CONVERSIONS: readonly ConversionStatus[] = [
  "blocked_stock",
  "failed",
];

export const REVIEW_FLAG_LABELS: Record<
  string,
  { label: string; explanation: string }
> = {
  PHONE_ON_OTHER_ACCOUNT: {
    label: "Paid from another account",
    explanation:
      "The customer paid from a different Aquakart account than the one holding this phone number.",
  },
  DUPLICATE_PAYMENT: {
    label: "Charged twice",
    explanation:
      "The customer was charged twice. Arrange a refund of the extra payment in PhonePe.",
  },
  AMOUNT_CHANGED_AFTER_PAYMENT: {
    label: "Amount changed during payment",
    explanation:
      "The document was edited while the customer was paying, so no invoice was created. Review it manually.",
  },
  PAID_AFTER_REVOKE_OR_EXPIRY: {
    label: "Paid after revoke/expiry",
    explanation:
      "The payment completed after the link was revoked or had expired.",
  },
};

export const reviewFlagInfo = (flag: string) =>
  REVIEW_FLAG_LABELS[flag] || {
    label: flag,
    explanation: "Flagged by the payment system; check this payment.",
  };

// ---- Errors -------------------------------------------------------------------

const NOT_PAYABLE_REASONS: Record<string, string> = {
  ALREADY_PAID: "This document is already paid.",
  ALREADY_INVOICED: "An invoice already exists for this document.",
  ZERO_TOTAL: "The total is zero, so there is nothing to pay.",
  UNSUPPORTED_CURRENCY: "Only INR documents can be paid online.",
  MOVED_TO_PRE_INVOICE:
    "This quotation was moved to a pre-invoice; create the link there.",
  NOT_FOUND: "The document wasn't found.",
};

type ErrorLike = {
  error?: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
};

/** Plain-language message for a payment-link API error. */
export const paymentLinkErrorMessage = (response: ErrorLike): string => {
  const reason = str(response.details?.reason);
  switch (response.code) {
    case "NOT_PAYABLE":
      if (NOT_PAYABLE_REASONS[reason]) return NOT_PAYABLE_REASONS[reason];
      if (reason.startsWith("STATUS_"))
        return `A document with status "${reason
          .slice("STATUS_".length)
          .toLowerCase()
          .replace(/_/g, " ")}" can't be paid.`;
      return response.error || "This document can't be paid right now.";
    case "USE_PRE_INVOICE": {
      const number = str(response.details?.preInvoiceNo);
      return `This quotation was moved to a pre-invoice${number ? ` (${number})` : ""}. Create the payment link on the pre-invoice.`;
    }
    case "CUSTOMER_PHONE_INVALID":
      return "The customer's phone number isn't a valid Indian mobile. Fix it on the document first.";
    case "GATEWAY_DISABLED":
      return "Online payments (PhonePe) aren't set up on the server.";
    case "SOURCE_NOT_FOUND":
      return "The document wasn't found. It may have been deleted.";
  }
  if (response.status === 401 || response.status === 403)
    return (
      response.error || "You don't have permission to manage payment links."
    );
  return response.error || "Request failed";
};

/** Id of a related pre-invoice in an error (USE_PRE_INVOICE, QUOTATION_ALREADY_MOVED, …). */
export const preInvoiceIdFromError = (response: ErrorLike) =>
  strOrNull(response.details?.preInvoiceId);

// ---- Sharing ------------------------------------------------------------------

/**
 * https://wa.me/91<phone>?text=… for the customer. Returns null when the phone
 * isn't a valid Indian mobile (then only Copy is offered).
 */
export const whatsappShareUrl = ({
  phone,
  customerName,
  documentNumber,
  amount,
  url,
}: {
  phone: string;
  customerName: string;
  documentNumber: string;
  amount: string;
  url: string;
}) => {
  const digits = String(phone).replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  const greeting = customerName.trim() ? `Hi ${customerName.trim()},` : "Hi,";
  const message = `${greeting} please pay ${amount} for Aquakart ${documentNumber} here: ${url}`;
  return `https://wa.me/91${local}?text=${encodeURIComponent(message)}`;
};

/** Polling helps only while the link can still change on its own. */
export const shouldPollLink = (link: PaymentLinkState | null) =>
  Boolean(
    link &&
    (link.status === "active" ||
      link.conversion.status === "in_progress" ||
      (link.status === "paid" && link.conversion.status === "none")),
  );

/** Conversion label; a paid link whose conversion hasn't started isn't "Unpaid". */
export const conversionLabel = (link: PaymentLinkState) =>
  link.status === "paid" && link.conversion.status === "none"
    ? {
        label: "Paid; invoice pending",
        tone: "warn" as const,
        hint: undefined as string | undefined,
      }
    : CONVERSION_LABELS[link.conversion.status];
