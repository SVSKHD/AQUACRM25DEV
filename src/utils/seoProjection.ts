import type {
  SeoReadinessItem,
  SeoRecord,
  SeoRecordInput,
} from "../services/seoService";

/*
 * Predicts a page's readiness score after an SEO-record change, mirroring the
 * backend's seoReadiness scorer. Only the dimensions an SEO record affects are
 * recomputed (technical, metadata, schema and, for static pages, media); content,
 * merchant and catalog media scores come from the current readiness item.
 * Keep in sync with AQUAKARTBACKEND/src/services/seoReadiness.js.
 */

type SeoLike = Partial<SeoRecord> | null;

const filled = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const metadataScore = (item: SeoReadinessItem, seo: SeoLike) => {
  if (!seo) return 0;
  const checks: [boolean, number][] = [
    [filled(seo.title), 18],
    [filled(seo.description), 18],
    [filled(seo.canonicalUrl), 14],
    [filled(seo.robots), 8],
    [filled(seo.ogTitle), 8],
    [filled(seo.ogDescription), 8],
    [filled(seo.ogImage), 8],
    [Boolean(seo.schemaJson), 12],
    [seo.active !== false, 6],
  ];
  let score = checks.reduce(
    (sum, [pass, points]) => sum + (pass ? points : 0),
    0,
  );
  if (seo.canonicalUrl && seo.canonicalUrl !== item.canonicalUrl)
    score = Math.max(0, score - 8);
  if (
    String(seo.robots || "")
      .toLowerCase()
      .includes("noindex")
  )
    score = Math.max(0, score - 20);
  return Math.min(score, 100);
};

const schemaScore = (item: SeoReadinessItem, seo: SeoLike) => {
  if (!seo?.schemaJson) return 0;
  const raw = (seo.schemaJson as Record<string, unknown>)?.["@type"];
  const types = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  const expected =
    item.entityType === "product"
      ? "Product"
      : item.entityType === "blog"
        ? "BlogPosting"
        : item.entityType === "category" || item.entityType === "subcategory"
          ? "CollectionPage"
          : null;
  return expected && !types.includes(expected) ? 55 : 100;
};

const technicalScore = (item: SeoReadinessItem, seo: SeoLike) => {
  // Route problems don't depend on the SEO record; keep that part of the current score.
  let score = item.issues.some((issue) => issue.code === "INVALID_ROUTE")
    ? 50
    : 100;
  if (!seo) score -= 30;
  if (seo?.active === false) score -= 40;
  if (
    String(seo?.robots || "")
      .toLowerCase()
      .includes("noindex")
  )
    score -= 50;
  return Math.max(0, score);
};

/** Readiness score for `item` if its SEO record looked like `seo`. */
export const projectScore = (item: SeoReadinessItem, seo: SeoLike) => {
  const scores = {
    ...item.scores,
    technical: technicalScore(item, seo),
    metadata: metadataScore(item, seo),
    schema: schemaScore(item, seo),
    ...(item.entityType === "static"
      ? { media: filled(seo?.ogImage) ? 100 : 0 }
      : {}),
  };
  const applicable = Object.values(scores).filter((value): value is number =>
    Number.isFinite(value),
  );
  return applicable.length
    ? Math.round(
        applicable.reduce((sum, value) => sum + value, 0) / applicable.length,
      )
    : 0;
};

/** The record as it would be after applying `body` to `current` (or creating it). */
export const applyToRecord = (
  current: SeoRecord | null,
  body: SeoRecordInput,
): Partial<SeoRecord> => ({
  robots: "index,follow",
  active: true,
  ...(current || {}),
  ...body,
});
