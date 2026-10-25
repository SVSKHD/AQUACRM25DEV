import type {
  SeoIssue,
  SeoReadinessItem,
  SeoRecord,
  SeoRecordInput,
} from "../services/seoService";
import { normalizeRoute, type SitePage } from "./siteAnalysis";

/*
 * Turns a page's readiness issues into concrete SEO-record changes that the
 * backend's readiness scorer rewards. Issues that need catalog edits (brand,
 * price, images, content) can't be fixed from the SEO record and are returned
 * as manual steps.
 */

export type FixField = keyof SeoRecordInput;

/** The og:image the storefront uses site-wide (from aquakart.co.in's home page). */
export const DEFAULT_SHARE_IMAGE =
  "https://res.cloudinary.com/aquakartproducts/image/upload/v1695408027/android-chrome-384x384_ijvo24.png";

export interface ProposedChange {
  field: FixField;
  label: string;
  current: string;
  value: SeoRecordInput[FixField];
  reason: string;
}

export interface ManualStep {
  issue: SeoIssue;
  hint: string;
}

export interface FixPlan {
  /** The record that changes will be written to (null → a new record is created). */
  target: SeoRecord | null;
  /** True when the page's record exists under a different pageKey, so readiness ignores it. */
  misKeyed: boolean;
  changes: ProposedChange[];
  manual: ManualStep[];
}

const FIELD_LABELS: Record<FixField, string> = {
  pageKey: "Page key",
  route: "Route",
  title: "SEO title",
  description: "Meta description",
  keywords: "Keywords",
  canonicalUrl: "Canonical URL",
  robots: "Robots",
  ogTitle: "Open Graph title",
  ogDescription: "Open Graph description",
  ogImage: "Open Graph image",
  schemaJson: "Structured data",
  active: "Enabled",
};

export const fieldLabel = (field: FixField) => FIELD_LABELS[field];

const MANUAL_HINTS: Record<string, string> = {
  MISSING_CONTENT:
    "Write a description for this page in Products (specs, use cases, FAQs).",
  THIN_CONTENT:
    "Expand the page description in Products with buyer-focused detail.",
  MISSING_TOPIC_TERMS: "Add keywords to the product/category/blog in Products.",
  MISSING_PRIMARY_IMAGE: "Upload at least one image for this page in Products.",
  MISSING_SOCIAL_IMAGE:
    "Add an image URL for social sharing (Open Graph image).",
  MISSING_PRODUCT_TITLE: "Add a product title in Products.",
  MISSING_PRICE: "Set a valid product price in Products.",
  MISSING_BRAND: "Set the product brand in Products.",
  MISSING_PRODUCT_IMAGE: "Upload a product photo in Products.",
  MISSING_GOOGLE_CATEGORY:
    "Set the Google Product Category in Products (e.g. 500033 for water filters).",
  MISSING_CONDITION: "Set the product condition (usually “new”) in Products.",
  MISSING_IDENTIFIER:
    "Add the GTIN or MPN in Products, or mark that no identifier exists.",
  MERCHANT_DISABLED: "Enable the product for the Merchant feed in Products.",
  INVALID_ROUTE: "Fix the product slug so the route is valid.",
};

const toText = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const clip = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6))}…`;
};

const expectedSchemaType = (entityType: SeoReadinessItem["entityType"]) =>
  entityType === "product"
    ? "Product"
    : entityType === "blog"
      ? "BlogPosting"
      : entityType === "category" || entityType === "subcategory"
        ? "CollectionPage"
        : "WebPage";

export const buildSchema = (
  item: SeoReadinessItem,
  page: SitePage | undefined,
  title: string,
  description: string,
) => {
  const base = { "@context": "https://schema.org", url: item.canonicalUrl };
  const image = page?.image ? [page.image] : undefined;
  switch (expectedSchemaType(item.entityType)) {
    case "Product":
      return {
        ...base,
        "@type": "Product",
        name: page?.title || title,
        description,
        ...(image ? { image } : {}),
        ...(page?.sku ? { sku: page.sku } : {}),
        ...(page?.brand
          ? { brand: { "@type": "Brand", name: page.brand } }
          : {}),
        ...(page?.price
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "INR",
                price: page.price,
                availability: "https://schema.org/InStock",
                url: item.canonicalUrl,
              },
            }
          : {}),
      };
    case "BlogPosting":
      return {
        ...base,
        "@type": "BlogPosting",
        headline: clip(page?.title || title, 110),
        description,
        ...(image ? { image } : {}),
        mainEntityOfPage: item.canonicalUrl,
        publisher: { "@type": "Organization", name: "AquaKart" },
      };
    case "CollectionPage":
      return {
        ...base,
        "@type": "CollectionPage",
        name: page?.title || title,
        description,
      };
    default:
      return { ...base, "@type": "WebPage", name: title, description };
  }
};

const schemaTypes = (schema: unknown) => {
  const raw =
    schema && typeof schema === "object"
      ? (schema as Record<string, unknown>)["@type"]
      : undefined;
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(String);
};

export const buildFixPlan = (
  item: SeoReadinessItem,
  records: SeoRecord[],
  page: SitePage | undefined,
): FixPlan => {
  const exact =
    records.find((record) => record.pageKey === item.pageKey) || null;
  const routeKey = normalizeRoute(item.route);
  const misKeyedRecord = exact
    ? null
    : records.find((record) => normalizeRoute(record.route) === routeKey) ||
      null;
  const target = exact || misKeyedRecord;
  const changes: ProposedChange[] = [];
  const add = (
    field: FixField,
    value: SeoRecordInput[FixField],
    reason: string,
  ) =>
    changes.push({
      field,
      label: FIELD_LABELS[field],
      current: toText(target?.[field as keyof SeoRecord]),
      value,
      reason,
    });

  if (misKeyedRecord) {
    add(
      "pageKey",
      item.pageKey,
      `Saved as "${misKeyedRecord.pageKey}", so readiness can't match it to this page`,
    );
  }

  const title = target?.title?.trim() || clip(page?.title || item.title, 60);
  const description =
    target?.description?.trim() ||
    (page?.text
      ? clip(page.text, 155)
      : clip(
          `${item.title}: buy online at AquaKart with expert installation and service in Hyderabad.`,
          155,
        ));

  if (!target?.title?.trim()) add("title", title, "SEO title is missing");
  if (!target?.description?.trim())
    add("description", description, "Meta description is missing");
  if (!target?.keywords?.length && page?.keywords.length) {
    add(
      "keywords",
      page.keywords.slice(0, 10),
      "Use the page's catalog keywords as SEO keywords",
    );
  }
  if (target?.canonicalUrl !== item.canonicalUrl) {
    add(
      "canonicalUrl",
      item.canonicalUrl,
      target?.canonicalUrl
        ? "Canonical doesn't match the page URL"
        : "Canonical URL is missing",
    );
  }
  if (!target?.robots?.trim() || /noindex/i.test(target.robots)) {
    add(
      "robots",
      "index,follow",
      target?.robots ? "Page is set to noindex" : "Robots directive is missing",
    );
  }
  if (!target?.ogTitle?.trim())
    add("ogTitle", title, "Open Graph title is missing");
  if (!target?.ogDescription?.trim())
    add("ogDescription", description, "Open Graph description is missing");
  if (!target?.ogImage?.trim()) {
    add(
      "ogImage",
      page?.image || DEFAULT_SHARE_IMAGE,
      page?.image
        ? "Use the page's main image for social sharing"
        : "Use the storefront's default sharing image",
    );
  }
  const types = schemaTypes(target?.schemaJson);
  const expected = expectedSchemaType(item.entityType);
  if (
    !target?.schemaJson ||
    (item.entityType !== "static" && !types.includes(expected))
  ) {
    add(
      "schemaJson",
      buildSchema(item, page, title, description),
      target?.schemaJson
        ? `Schema type should be ${expected}`
        : `Add ${expected} structured data`,
    );
  }
  if (target && target.active === false)
    add("active", true, "SEO record is disabled");

  const fixedBySeo = new Set(changes.map((change) => `seo.${change.field}`));
  const manual = item.issues
    .filter((issue) => {
      // Applying the plan creates the record.
      if (issue.code === "MISSING_SEO_RECORD") return false;
      // SEO-record issues are covered when the plan changes that field
      // (e.g. not the social image when the page has no image to use).
      if (issue.field.startsWith("seo."))
        return !fixedBySeo.has(issue.field.replace(/\.@type$/, ""));
      return true;
    })
    .map((issue) => ({
      issue,
      hint: MANUAL_HINTS[issue.code] || issue.message,
    }));

  return { target, misKeyed: Boolean(misKeyedRecord), changes, manual };
};

/** Builds the PATCH/POST body from the chosen changes. */
export const fixPayload = (
  item: SeoReadinessItem,
  plan: FixPlan,
  chosen: ProposedChange[],
): SeoRecordInput => {
  const body: SeoRecordInput = {};
  chosen.forEach((change) => {
    (body as Record<string, unknown>)[change.field] = change.value;
  });
  if (!plan.target) {
    // Creating: pageKey, route and title are required by the backend.
    body.pageKey = item.pageKey;
    body.route = item.route;
    body.title = body.title || clip(item.title, 60);
  }
  return body;
};
