/*
 * Easy invoice (/invoice/easy): one big text box that turns into an editable
 * invoice document. Pure helpers only; the page lives in pages/EasyInvoicePage.
 * Money rule: invoice lines store the LINE value (quantity × unit price).
 */
import { parseInvoiceBlock } from "./parseInvoiceBlock";
import { describeGstin, findGstinInText } from "./gstin";
import {
  blockingProblems,
  toInvoiceLines,
  toReviewLines,
  type QuickCheck,
  type QuickReviewLine,
} from "./quickInvoice";
import { initialInvoiceForm, type InvoiceFormValues } from "./invoicePayload";
import {
  tidyAddress,
  type CatalogProduct,
} from "../components/modular/invoices/invoiceFormat";
import type { DocumentReading, QuickDraft } from "../services/invoiceAI";

export type EasyCustomerField = "name" | "phone" | "email" | "address";
export type EasyPaidStatus = "paid" | "partial" | "unpaid";
export type EasyPaymentType = "cash" | "card" | "upi" | "bank_transfer";

export interface EasyGst {
  use: boolean;
  gstin: string;
  name: string;
  address: string;
}

export interface EasyDoc {
  customer: Record<EasyCustomerField, string>;
  paidStatus: EasyPaidStatus;
  paymentType: EasyPaymentType;
  gst: EasyGst | null;
  lines: QuickReviewLine[];
  notes: string[];
  /** Customer fields edited by hand; a late AI reply never overwrites them. */
  touched: EasyCustomerField[];
}

export const emptyEasyDoc = (): EasyDoc => ({
  customer: { name: "", phone: "", email: "", address: "" },
  paidStatus: "unpaid",
  paymentType: "cash",
  gst: null,
  lines: [],
  notes: [],
  touched: [],
});

/** Digits only, without a +91 / 0 prefix, so "+91 95534-19654" → "9553419654". */
export const cleanPhone = (value: string) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

/** A valid Indian mobile (10 digits, starts 6-9) or "" — never a price or pincode. */
export const mobileOrEmpty = (value: string) => {
  const phone = cleanPhone(value);
  return /^[6-9]\d{9}$/.test(phone) ? phone : "";
};

/**
 * Phone box while typing: digits only, 10 at most once a +91 / 0 prefix is
 * dropped. The prefix itself may be typed digit by digit.
 */
export const typedPhone = (value: string) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const cleaned = cleanPhone(digits);
  if (cleaned.length <= 10) return cleaned;
  const max = digits.startsWith("91") ? 12 : digits.startsWith("0") ? 11 : 10;
  return digits.slice(0, max);
};

const ADDRESS_WORDS =
  /\b(flat|plot|h\.?\s?no|d\.?\s?no|door|road|rd|street|lane|nagar|colony|layout|apartments?|apts?|residency|towers?|block|sector|phase|floor|villa|enclave|avenue|heights|gardens|estate|cross|near|opp|behind|beside|hyderabad|secunderabad|bangalore|bengaluru|chennai|mumbai|delhi|pune|telangana|andhra|karnataka|india)\b/i;

/**
 * "kent 25l 65000": letters plus a price-like number (3+ digits) once phones,
 * pincodes and emails are taken out, and no address words. These lines are
 * products, so the offline pass keeps them out of name / phone / address.
 */
export const looksLikeProductLine = (line: string) => {
  const rest = line
    .replace(/[^\s@]+@[^\s@]+/g, " ")
    .replace(/(?:\+?91[\s-]*)?[6-9](?:[\s-]*\d){9}/g, " ")
    .replace(/(?<![\d])[1-9]\d{2}\s?\d{3}(?![\d])/g, " ");
  return (
    /[a-z]/i.test(rest) &&
    /(?<![\d])\d{3,}(?![\d])|\d{1,3}(?:,\d{2,3})+/.test(rest) &&
    !ADDRESS_WORDS.test(rest)
  );
};

/** The pasted text without its product lines (or comma parts of a one-line paste). */
const contactText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1)
    return lines[0]
      .split(/\s*[,;|]\s*/)
      .filter((part) => part && !looksLikeProductLine(part))
      .join(", ");
  return lines.filter((line) => !looksLikeProductLine(line)).join("\n");
};

/** The lines (or comma parts of a one-line paste) that look like products. */
export const productLines = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parts =
    lines.length === 1 ? lines[0].split(/\s*[,;|]\s*/).filter(Boolean) : lines;
  return parts.filter(looksLikeProductLine);
};

/** GSTIN from a photo/PDF reading when valid, else the first valid one in the text. */
export const findEasyGst = (
  text: string,
  hint?: Pick<DocumentReading, "gstin" | "gstName" | "gstAddress">,
): EasyGst | null => {
  const fromFile = Boolean(hint?.gstin && describeGstin(hint.gstin).valid);
  const gstin = fromFile && hint ? hint.gstin : findGstinInText(text);
  if (!gstin) return null;
  return {
    use: true,
    gstin,
    name: (fromFile && hint?.gstName) || "",
    address: (fromFile && hint?.gstAddress) || "",
  };
};

/** Instant, offline first pass: contact details and GSTIN. Products come from AI. */
export const docFromText = (
  text: string,
  hint?: Pick<DocumentReading, "gstin" | "gstName" | "gstAddress">,
): EasyDoc => {
  const parsed = parseInvoiceBlock(contactText(text));
  let address = parsed.address;
  if (parsed.pincode && !address.includes(parsed.pincode)) {
    address = address ? `${address}, ${parsed.pincode}` : parsed.pincode;
  }
  return {
    ...emptyEasyDoc(),
    customer: {
      name: parsed.name || "",
      phone: mobileOrEmpty(parsed.phone || ""),
      email: parsed.email || "",
      address: address ? tidyAddress(address) : "",
    },
    gst: findEasyGst(text, hint),
  };
};

/** Folds the AI draft into the document, keeping fields edited by hand. */
export const mergeQuickDraft = (doc: EasyDoc, draft: QuickDraft): EasyDoc => {
  // An offline address that holds a product the AI found is not an address.
  const products = draft.items
    .map((item) => item.rawName.trim().toLowerCase())
    .filter(Boolean);
  const localAddress = doc.customer.address.toLowerCase();
  const addressIsProduct =
    !doc.touched.includes("address") &&
    products.some((name) => localAddress.includes(name));
  const base = addressIsProduct
    ? { ...doc, customer: { ...doc.customer, address: "" } }
    : doc;
  const keep = (field: EasyCustomerField, value: string) =>
    doc.touched.includes(field)
      ? doc.customer[field]
      : value || base.customer[field];
  return {
    ...doc,
    customer: {
      name: keep("name", draft.customer.name),
      phone: keep("phone", mobileOrEmpty(draft.customer.phone)),
      email: keep("email", draft.customer.email),
      address: keep(
        "address",
        draft.customer.address ? tidyAddress(draft.customer.address) : "",
      ),
    },
    paidStatus: draft.paidStatus || doc.paidStatus,
    paymentType: draft.paymentType || doc.paymentType,
    lines: toReviewLines(draft),
    notes: draft.notes,
  };
};

/** A blank custom line, numbered after the existing ones. */
export const newEasyLine = (lines: QuickReviewLine[]): QuickReviewLine => ({
  line: lines.reduce((max, entry) => Math.max(max, entry.line), 0) + 1,
  rawName: "",
  quantity: 1,
  quantityAssumed: false,
  price: "",
  serialNo: "",
  confidence: "none",
  choice: "",
  options: [],
});

/** Everything that blocks Create & send. */
export const easyProblems = (doc: EasyDoc): QuickCheck[] => {
  const problems = blockingProblems(doc.lines, {
    name: doc.customer.name,
    phone: cleanPhone(doc.customer.phone),
  });
  for (const line of doc.lines) {
    if (!line.choice && !line.rawName.trim())
      problems.push({ line: line.line, message: "Type the item name." });
  }
  if (doc.gst?.use) {
    if (!describeGstin(doc.gst.gstin).valid)
      problems.push({
        message: "The GSTIN doesn't look right. Fix it or untick GST invoice.",
      });
    if (!doc.gst.name.trim())
      problems.push({
        message: "Type the GST business name, or untick GST invoice.",
      });
  }
  return problems;
};

/** Today in the browser's time zone as YYYY-MM-DD. */
export const localToday = (now = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Document → the same form values the invoice dialog saves. */
export const toInvoiceForm = (
  doc: EasyDoc,
  catalog: CatalogProduct[],
  today = localToday(),
): InvoiceFormValues => {
  const gst = doc.gst?.use ? doc.gst : null;
  return {
    ...initialInvoiceForm,
    date: today,
    customer_name: doc.customer.name.trim(),
    customer_phone: Number(cleanPhone(doc.customer.phone)) || 0,
    customer_email: doc.customer.email.trim(),
    customer_address: tidyAddress(doc.customer.address),
    paid_status: doc.paidStatus,
    payment_type: doc.paymentType,
    gst: Boolean(gst),
    gst_no: gst ? gst.gstin.trim().toUpperCase() : "",
    gst_name: gst ? gst.name.trim() : "",
    gst_address: gst ? gst.address.trim() : "",
    products: toInvoiceLines(
      doc.lines.map((line) => ({ ...line, rawName: line.rawName.trim() })),
      catalog,
    ),
  };
};
