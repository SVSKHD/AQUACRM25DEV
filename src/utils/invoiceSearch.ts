/**
 * One-box invoice search. Every word typed must appear in some field of the
 * invoice (any order). Case, accents, spaces and punctuation inside a value are
 * ignored, so "ravi softener", "RAVI", "95534 19654", "+91 9553419654",
 * "36aabcu9603r1zm" and "aq-1024" / "AQ1024" all find their invoice.
 */

const fold = (value: string) =>
  value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

const compact = (value: string) => value.replace(/[^a-z0-9]/g, "");

type PreparedField = { text: string; compact: string };

export type InvoiceSearchQuery = {
  tokens: { text: string; compact: string }[];
};

/** Splits the typed text into words; an empty result matches everything. */
export const parseInvoiceSearch = (query: string): InvoiceSearchQuery => ({
  tokens: fold(query)
    // "+91 98765 43210": the stored phone has no country code.
    .replace(/(^|\s)\+?91[\s-]*(?=[6-9]\d{4}[\s-]?\d{5}\b)/g, "$1")
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((text) => {
      let packed = compact(text);
      // "+91 98765 43210" / "919876543210": the stored phone has no 91.
      if (/^91[6-9]\d{9}$/.test(packed)) packed = packed.slice(2);
      return { text, compact: packed };
    }),
});

const prepare = (fields: unknown[]): PreparedField[] =>
  fields
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => {
      const text = fold(String(value));
      return { text, compact: compact(text) };
    });

/** True when every typed word is found in at least one field. */
export const matchesInvoiceSearch = (
  fields: unknown[],
  query: InvoiceSearchQuery,
): boolean => {
  if (!query.tokens.length) return true;
  const prepared = prepare(fields);
  return query.tokens.every(
    (token) =>
      prepared.some((field) => field.text.includes(token.text)) ||
      (token.compact.length > 0 &&
        prepared.some((field) => field.compact.includes(token.compact))),
  );
};
