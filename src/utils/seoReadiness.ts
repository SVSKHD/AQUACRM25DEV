import type { SeoCatalogItem, SeoEntityType, SeoRecord } from "../services/seoMappingService";

export type SeoReadinessStatus = "MISSING" | "INCOMPLETE" | "READY";
export type SeoPriority = "HIGH" | "MEDIUM" | "LOW";

const COMMERCIAL_STATIC_KEYS = new Set([
  "home",
  "shop",
  "categories",
  "compare",
  "softener-planner",
  "softeners-hyderabad",
]);

const LEGAL_STATIC_KEYS = new Set([
  "privacy-policy",
  "shipping-policy",
  "terms-and-conditions",
]);

export const getSeoMissingFields = (record?: SeoRecord | null) => {
  if (!record) return ["SEO record"];

  const missing: string[] = [];
  if (!record.title?.trim()) missing.push("title");
  if (!record.description?.trim()) missing.push("description");
  if (!record.canonicalUrl?.trim()) missing.push("canonical");
  if (!record.robots?.trim()) missing.push("robots");
  if (!record.ogTitle?.trim()) missing.push("OG title");
  if (!record.ogDescription?.trim()) missing.push("OG description");
  if (!record.ogImage?.trim()) missing.push("OG image");
  if (!record.schemaJson) missing.push("schema");
  if (record.active === false) missing.push("disabled");

  return missing;
};

export const getSeoReadinessStatus = (
  record?: SeoRecord | null,
): SeoReadinessStatus => {
  if (!record) return "MISSING";
  return getSeoMissingFields(record).length ? "INCOMPLETE" : "READY";
};

const expectedCanonical = (item: SeoCatalogItem) =>
  `https://aquakart.co.in${item.route === "/" ? "" : item.route}`;

export const getSeoQualityIssues = (
  item: SeoCatalogItem,
  record?: SeoRecord | null,
) => {
  if (!record) return [];

  const issues: string[] = [];
  const titleLength = record.title?.trim().length || 0;
  const descriptionLength = record.description?.trim().length || 0;

  if (titleLength > 0 && titleLength < 28) {
    issues.push("title may be too short");
  }
  if (titleLength > 65) {
    issues.push("title may truncate");
  }
  if (descriptionLength > 0 && descriptionLength < 90) {
    issues.push("description may be too short");
  }
  if (descriptionLength > 170) {
    issues.push("description may truncate");
  }

  const canonical = record.canonicalUrl?.trim();
  if (canonical && canonical !== expectedCanonical(item)) {
    issues.push("canonical differs from route");
  }

  const robots = record.robots?.toLowerCase() || "";
  if (robots && (!robots.includes("index") || robots.includes("noindex"))) {
    issues.push("robots may block indexing");
  }

  return issues;
};

export const getSeoPriority = (
  item: SeoCatalogItem & { type: SeoEntityType },
): SeoPriority => {
  if (
    item.type === "product" ||
    item.type === "category" ||
    item.type === "subcategory"
  ) {
    return "HIGH";
  }

  if (item.type === "static") {
    if (COMMERCIAL_STATIC_KEYS.has(item.pageKey)) return "HIGH";
    if (LEGAL_STATIC_KEYS.has(item.pageKey)) return "LOW";
    return "MEDIUM";
  }

  return "MEDIUM";
};

export const SEO_STATUS_RANK: Record<SeoReadinessStatus, number> = {
  MISSING: 0,
  INCOMPLETE: 1,
  READY: 2,
};

export const SEO_PRIORITY_RANK: Record<SeoPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};
