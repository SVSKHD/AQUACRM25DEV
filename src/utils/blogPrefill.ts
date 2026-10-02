export const BLOG_PREFILL_KEYS = [
  "title",
  "description",
  "content",
  "imageUrl",
  "image",
  "keywords",
  "keyphrases",
  "keyPhrases",
  "slug",
  "shortDescription",
  "excerpt",
  "summary",
  "keyHighlights",
  "highlights",
  "tags",
  "notes",
  "brand",
  "category",
  "subCategory",
  "subcategory",
] as const;

const getHashParams = () => {
  if (typeof window === "undefined") return new URLSearchParams();

  const rawHash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(rawHash);
};

export const getBlogPrefillParams = () => {
  if (typeof window === "undefined") return new URLSearchParams();

  const params = new URLSearchParams(window.location.search);
  const hashParams = getHashParams();

  // Fragment values deliberately win over query-string values.
  // Long blog content belongs in the fragment because fragments are never
  // sent to Cloudflare/the origin server.
  hashParams.forEach((value, key) => {
    params.set(key, value);
  });

  return params;
};

export const hasBlogPrefill = () => {
  const params = getBlogPrefillParams();
  return (
    params.get("action") === "create" ||
    BLOG_PREFILL_KEYS.some((key) => params.has(key))
  );
};
