/**
 * Classify a pasted contact block into invoice fields.
 *
 * Classification priority (first match wins):
 *   1. Email   – line contains '@' and '.'
 *   2. Phone   – digits-only match /^(91)?[6-9]\d{9}$/, stored as last 10 digits
 *   3. Pincode – digits-only match /^\d{6}$/
 *   4. Name    – matches /^[A-Za-z.\s]{2,25}$/ AND has <= 3 words
 *   5. Address – everything else, joined with ", "
 *
 * When more than one line qualifies as a name (e.g. "Janapriya utopia"
 * and "Hithesh" both match the regex), the candidate with the fewest
 * words wins; the remaining candidates fall through to address.
 *
 * @param {string} text Raw block of pasted text.
 * @returns {{name: string, address: string, phone: string, pincode: string, email: string}}
 */
export function parseInvoiceBlock(text) {
  const result = { name: "", address: "", phone: "", pincode: "", email: "" };

  if (typeof text !== "string" || !text.trim()) return result;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const NAME_REGEX = /^[A-Za-z.\s]{2,25}$/;
  const PHONE_REGEX = /^(91)?[6-9]\d{9}$/;
  const PINCODE_REGEX = /^\d{6}$/;

  const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
  const isNameLike = (s) => NAME_REGEX.test(s) && wordCount(s) <= 3;

  const remaining = [];
  for (const line of lines) {
    if (!result.email && line.includes("@") && line.includes(".")) {
      result.email = line;
      continue;
    }

    const digits = line.replace(/\D/g, "");
    if (!result.phone && PHONE_REGEX.test(digits)) {
      result.phone = digits.slice(-10);
      continue;
    }

    if (!result.pincode && PINCODE_REGEX.test(digits)) {
      result.pincode = digits;
      continue;
    }

    remaining.push(line);
  }

  let nameIdx = -1;
  let bestWords = Infinity;
  remaining.forEach((line, idx) => {
    if (!isNameLike(line)) return;
    const wc = wordCount(line);
    if (wc < bestWords) {
      bestWords = wc;
      nameIdx = idx;
    }
  });

  if (nameIdx !== -1) {
    result.name = remaining[nameIdx];
    remaining.splice(nameIdx, 1);
  }

  result.address = remaining.join(", ");

  return result;
}

export default parseInvoiceBlock;
