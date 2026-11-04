/**
 * Classify a pasted contact block into invoice fields, without any network
 * call. Works for one item per line, a single comma-separated line, labelled
 * WhatsApp-style messages ("Name: …", "Ph: …", "Address: …") and inline
 * numbers ("Hyderabad - 500049", "Hithesh 9553419654").
 *
 *   1. Labelled lines go straight to their field.
 *   2. Email, Indian mobile number (optional +91, spaces or dashes) and a
 *      6-digit pincode are pulled out of any line; the rest of the line stays.
 *   3. Name: the first comma segment of a single-line paste, otherwise the
 *      name-like line (letters only, at most 3 words, no address words) with
 *      the fewest words. Other candidates fall through to the address.
 *   4. Address: everything left, joined with ", ".
 *
 * Values are tidied: names in lower or upper case become Title Case, emails
 * are lower-cased, phones keep the last 10 digits, stray separators go.
 *
 * @param {string} text Raw block of pasted text.
 * @returns {{name: string, address: string, phone: string, pincode: string, email: string}}
 */

const NAME_REGEX = /^[A-Za-z.'\s]{2,40}$/;
const EMAIL_REGEX = /[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[A-Za-z]{2,}/;
const PHONE_REGEX = /(?<![\d])(?:\+?91[\s-]*)?[6-9](?:[\s-]*\d){9}(?![\d])/;
const PINCODE_REGEX = /(?<![\d/-])[1-9]\d{2}\s?\d{3}(?![\d/-])/;
const ADDRESS_HINT =
  /\b(flat|plot|h\.?\s?no|d\.?\s?no|door|road|rd|street|lane|nagar|colony|layout|apartments?|apts?|residency|towers?|block|sector|phase|floor|villa|villas|enclave|avenue|heights|gardens|estate|cross|near|opp|opposite|behind|beside|hyderabad|secunderabad|bangalore|bengaluru|chennai|mumbai|delhi|pune|kolkata|telangana|andhra|karnataka|india)\b/i;

const LABELS = [
  ["name", /^(?:customer\s*)?name\s*[:=\-–]\s*/i],
  [
    "phone",
    /^(?:mobile|mob|phone|ph|cell|contact|whatsapp|wa)\.?\s*(?:no\.?|number|num)?\s*[:=\-–]\s*/i,
  ],
  ["email", /^(?:e-?mail|mail)\s*(?:id)?\s*[:=\-–]\s*/i],
  ["address", /^(?:address|addr|location|delivery\s*address)\s*[:=\-–]\s*/i],
  ["pincode", /^(?:pin\s*code|pincode|pin|zip)\s*[:=\-–]\s*/i],
];

const TRAILING_LABEL =
  /[\s,;:|/-]*\b(?:mobile|mob|phone|ph|cell|contact|whatsapp|no|number|pin\s*code|pincode|pin|e-?mail|mail)\.?\s*[:=\-–]?\s*$/i;

const collapse = (value) => value.replace(/\s+/g, " ").trim();

/** Trim separators and dangling labels left after pulling numbers out. */
const tidy = (value) => {
  let next = collapse(value);
  for (let i = 0; i < 3; i += 1) {
    const stripped = next.replace(TRAILING_LABEL, "");
    if (stripped === next) break;
    next = stripped;
  }
  return next
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/^[\s,;:|.\-–]+|[\s,;:|\-–]+$/g, "")
    .trim();
};

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

const isNameLike = (s) =>
  NAME_REGEX.test(s) && wordCount(s) <= 3 && !ADDRESS_HINT.test(s);

/** Title-case only text typed in a single case; keep deliberate casing. */
export function toTitleCase(value) {
  const text = collapse(String(value || ""));
  if (!text) return "";
  if (text !== text.toLowerCase() && text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(/(^|[\s.'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function parseInvoiceBlock(text) {
  const result = { name: "", address: "", phone: "", pincode: "", email: "" };

  if (typeof text !== "string" || !text.trim()) return result;

  let lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // A single pasted line ("Name, address, phone") is split on separators.
  const singleLine = lines.length === 1;
  if (singleLine) {
    lines = lines[0]
      .split(/\s*[,;|]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const addressParts = [];
  const nameCandidates = [];

  lines.forEach((rawLine, index) => {
    let line = rawLine;
    let label = "";

    for (const [field, regex] of LABELS) {
      if (!regex.test(line)) continue;
      label = field;
      line = line.replace(regex, "");
      break;
    }

    if (label === "name" && !result.name) {
      result.name = tidy(line);
      return;
    }

    const email = line.match(EMAIL_REGEX);
    if (email && !result.email) {
      result.email = email[0].toLowerCase();
      line = line.replace(email[0], " ");
    }

    const phone = line.match(PHONE_REGEX);
    if (phone && !result.phone) {
      result.phone = phone[0].replace(/\D/g, "").slice(-10);
      line = line.replace(phone[0], " ");
    }

    const pincode = line.match(PINCODE_REGEX);
    if (pincode && !result.pincode) {
      result.pincode = pincode[0].replace(/\s/g, "");
      line = line.replace(pincode[0], " ");
    }

    line = tidy(line);
    if (!line) return;

    if (label !== "address" && isNameLike(line))
      nameCandidates.push({ line, index });
    addressParts.push({ line, index });
  });

  if (!result.name && nameCandidates.length) {
    let pick = nameCandidates[0];
    const firstSegment = singleLine && nameCandidates[0].index === 0;
    if (!firstSegment) {
      nameCandidates.forEach((candidate) => {
        if (wordCount(candidate.line) < wordCount(pick.line)) pick = candidate;
      });
    }
    result.name = pick.line;
    const at = addressParts.findIndex((part) => part.index === pick.index);
    if (at !== -1) addressParts.splice(at, 1);
  }

  result.name = toTitleCase(result.name);
  result.address = addressParts.map((part) => part.line).join(", ");

  return result;
}

export default parseInvoiceBlock;
