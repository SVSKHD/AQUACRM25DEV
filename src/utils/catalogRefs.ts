// Catalog references (category, subCategory, product) arrive either as ids or
// populated `{ _id, title }` objects depending on the endpoint.

/** Filter value for items without a category. */
export const UNCATEGORIZED = "__uncategorized__";

export const referenceId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "object") {
    const reference = value as { _id?: string; id?: string };
    return String(reference._id || reference.id || "");
  }
  return String(value);
};

export const referenceTitle = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const reference = value as { title?: string; name?: string };
  return String(reference.title || reference.name || "");
};

/** Splits a free-text query into lower-case terms; every term must match. */
export const matchesAllTerms = (
  query: string,
  haystack: Array<string | null | undefined>,
) => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = haystack.filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => text.includes(term));
};
