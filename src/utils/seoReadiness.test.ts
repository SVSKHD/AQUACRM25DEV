import { describe, expect, it } from "vitest";

import type { SeoCatalogItem, SeoRecord } from "../services/seoMappingService";
import {
  getSeoMissingFields,
  getSeoPriority,
  getSeoQualityIssues,
  getSeoReadinessStatus,
} from "./seoReadiness";

const productItem: SeoCatalogItem & { type: "product" } = {
  id: "kent-auto-40",
  label: "KENT Automatic Water Softener 40L",
  pageKey: "product.kent-auto-40",
  route: "/product/kent-auto-40",
  type: "product",
};

const completeRecord: SeoRecord = {
  pageKey: productItem.pageKey,
  route: productItem.route,
  title: "KENT Automatic Water Softener 40L | Aquakart",
  description:
    "Explore the KENT Automatic Water Softener 40L for whole-home hard-water treatment with automatic regeneration.",
  keywords: ["KENT water softener"],
  canonicalUrl: "https://aquakart.co.in/product/kent-auto-40",
  robots: "index,follow",
  ogTitle: "KENT Automatic Water Softener 40L | Aquakart",
  ogDescription:
    "Explore the KENT Automatic Water Softener 40L for whole-home hard-water treatment.",
  ogImage: "https://cdn.example.com/kent-auto-40.jpg",
  twitterTitle: "KENT Automatic Water Softener 40L | Aquakart",
  twitterDescription: "Whole-home hard-water treatment.",
  twitterImage: "https://cdn.example.com/kent-auto-40.jpg",
  schemaJson: { "@type": "Product" },
  active: true,
};

describe("SEO readiness", () => {
  it("marks missing and incomplete records separately", () => {
    expect(getSeoReadinessStatus(undefined)).toBe("MISSING");

    const incomplete = { ...completeRecord, schemaJson: null };
    expect(getSeoReadinessStatus(incomplete)).toBe("INCOMPLETE");
    expect(getSeoMissingFields(incomplete)).toContain("schema");
  });

  it("marks fully configured records ready", () => {
    expect(getSeoReadinessStatus(completeRecord)).toBe("READY");
    expect(getSeoMissingFields(completeRecord)).toEqual([]);
  });

  it("flags canonical and snippet quality issues without changing core readiness", () => {
    const record = {
      ...completeRecord,
      title: "KENT Softener",
      canonicalUrl: "https://aquakart.co.in/product/wrong-route",
    };

    expect(getSeoReadinessStatus(record)).toBe("READY");
    expect(getSeoQualityIssues(productItem, record)).toEqual(
      expect.arrayContaining([
        "title may be too short",
        "canonical differs from route",
      ]),
    );
  });

  it("ranks product work as high commercial priority", () => {
    expect(getSeoPriority(productItem)).toBe("HIGH");
  });
});
