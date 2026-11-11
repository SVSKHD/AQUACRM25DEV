import { GST_STATES, validGSTIN } from "./gstReport";
import { parseInvoiceDate } from "../components/modular/invoices/mapInvoice";

/**
 * GSTIN helpers for the invoice form: validation (format, state code and the
 * check digit), and prefilling GST details from earlier invoices with the
 * same GSTIN. Nothing here calls the network.
 */

const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const normalizeGstin = (value: unknown) =>
  String(value ?? "")
    .replace(/\s/g, "")
    .toUpperCase();

/** The 15th character a GSTIN must end with (mod-36 checksum of the first 14). */
export const gstinCheckDigit = (first14: string) => {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = CHARSET.indexOf(first14[i]);
    if (value < 0) return "";
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
};

export type GstinInfo =
  | {
      valid: true;
      gstin: string;
      stateCode: string;
      state: string;
      pan: string;
    }
  | { valid: false; gstin: string; reason: string };

/** Explains a complete (15-character) GSTIN; incomplete input is reported as such. */
export const describeGstin = (value: unknown): GstinInfo => {
  const gstin = normalizeGstin(value);
  if (gstin.length !== 15)
    return {
      valid: false,
      gstin,
      reason: `A GSTIN has 15 characters (${gstin.length} entered).`,
    };
  if (!/^\d{2}/.test(gstin) || !GST_STATES[gstin.slice(0, 2)])
    return {
      valid: false,
      gstin,
      reason: `"${gstin.slice(0, 2)}" is not a GST state code.`,
    };
  if (!validGSTIN(gstin))
    return {
      valid: false,
      gstin,
      reason:
        "This doesn't look like a GSTIN: 2-digit state, 10-character PAN, then 3 characters ending in Z + check digit.",
    };
  if (gstinCheckDigit(gstin.slice(0, 14)) !== gstin[14])
    return {
      valid: false,
      gstin,
      reason:
        "The GSTIN's check digit doesn't match — a character is probably mistyped.",
    };
  return {
    valid: true,
    gstin,
    stateCode: gstin.slice(0, 2),
    state: GST_STATES[gstin.slice(0, 2)],
    pan: gstin.slice(2, 12),
  };
};

export const GST_DETAIL_FIELDS = [
  "gst_name",
  "gst_phone",
  "gst_email",
  "gst_address",
] as const;
export type GstDetailField = (typeof GST_DETAIL_FIELDS)[number];
export type GstDetails = Record<GstDetailField, string>;

export const GST_FIELD_LABELS: Record<GstDetailField, string> = {
  gst_name: "name",
  gst_phone: "phone",
  gst_email: "email",
  gst_address: "address",
};

export interface GstMatch {
  details: Partial<GstDetails>;
  /** The newest invoice with this GSTIN (where the details come from). */
  invoiceNo: string;
  date: string;
  /** How many earlier invoices use this GSTIN. */
  count: number;
}

type InvoiceLike = {
  id?: string;
  invoice_no?: string | null;
  date?: string | null;
  created_at?: string | null;
  gst_no?: string | null;
} & Partial<Record<GstDetailField, string | number | null>>;

const timeOf = (invoice: InvoiceLike) =>
  (
    parseInvoiceDate(invoice.date) ?? parseInvoiceDate(invoice.created_at)
  )?.getTime() ?? 0;

/**
 * GST details used with this GSTIN on earlier invoices. Each field takes the
 * newest non-empty value, so an incomplete latest invoice doesn't hide an
 * older phone or address. `excludeId` skips the invoice being edited.
 */
export const findGstDetails = (
  gstinInput: unknown,
  invoices: readonly InvoiceLike[],
  { excludeId }: { excludeId?: string } = {},
): GstMatch | null => {
  const gstin = normalizeGstin(gstinInput);
  if (gstin.length !== 15) return null;
  const matches = invoices
    .filter(
      (invoice) =>
        (!excludeId || invoice.id !== excludeId) &&
        normalizeGstin(invoice.gst_no) === gstin,
    )
    .sort((a, b) => timeOf(b) - timeOf(a));
  if (!matches.length) return null;
  const details: Partial<GstDetails> = {};
  for (const field of GST_DETAIL_FIELDS) {
    for (const invoice of matches) {
      const value = String(invoice[field] ?? "").trim();
      if (value && value !== "0") {
        details[field] = value;
        break;
      }
    }
  }
  return {
    details,
    invoiceNo: String(matches[0].invoice_no || "").trim(),
    date: String(matches[0].date || "").trim(),
    count: matches.length,
  };
};

/** Only the fields that are empty in the form and known in the match. */
export const fillEmptyGstFields = (
  form: Partial<Record<GstDetailField, unknown>>,
  match: Pick<GstMatch, "details">,
): Partial<GstDetails> => {
  const patch: Partial<GstDetails> = {};
  for (const field of GST_DETAIL_FIELDS) {
    const current = String(form[field] ?? "").trim();
    const found = match.details[field];
    if (!current && found) patch[field] = found;
  }
  return patch;
};
