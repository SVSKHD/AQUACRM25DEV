import type { SeoReadinessReport, SeoRecord } from "../services/seoService";
import type { PageType, SiteAnalysis } from "./siteAnalysis";

/*
 * Counts every SEO check across the site as filled or missing: SEO record
 * fields, content and media, merchant feed data, internal linking and keyword
 * targeting. A snapshot is saved as a baseline so later fixes show up as
 * "what improved" per page and per check. Page checks come from the backend
 * readiness issues (keep codes in sync with AQUAKARTBACKEND/src/services/seoReadiness.js);
 * linking and keyword checks come from the client-side site analysis.
 */

export type CoverageGroup =
  "seo" | "content" | "merchant" | "linking" | "keywords";

export const COVERAGE_GROUPS: { id: CoverageGroup; label: string }[] = [
  { id: "seo", label: "SEO record" },
  { id: "content", label: "Content & media" },
  { id: "merchant", label: "Merchant feed (products)" },
  { id: "linking", label: "Internal linking" },
  { id: "keywords", label: "Keyword targeting" },
];

interface CheckDef {
  id: string;
  label: string;
  group: CoverageGroup;
}

type EntityType = PageType;
const ALL = (): boolean => true;
const NOT_STATIC = (type: EntityType) => type !== "static";
const PRODUCT = (type: EntityType) => type === "product";

interface ReadinessCheckDef extends CheckDef {
  code: string;
  applies: (type: EntityType) => boolean;
  /** Counts as missing when the page has no SEO record at all. */
  needsRecord?: boolean;
}

const READINESS_CHECKS: ReadinessCheckDef[] = [
  {
    id: "seo.record",
    code: "MISSING_SEO_RECORD",
    label: "SEO record exists",
    group: "seo",
    applies: ALL,
  },
  {
    id: "seo.title",
    code: "MISSING_TITLE",
    label: "SEO title",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.description",
    code: "MISSING_META_DESCRIPTION",
    label: "Meta description",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.canonical",
    code: "MISSING_CANONICAL",
    label: "Canonical URL",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.canonicalMatch",
    code: "CANONICAL_ROUTE_MISMATCH",
    label: "Canonical matches page URL",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.robots",
    code: "MISSING_ROBOTS",
    label: "Robots directive",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.indexable",
    code: "PAGE_NOINDEX",
    label: "Indexable (not noindex)",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.active",
    code: "SEO_DISABLED",
    label: "SEO record enabled",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.ogTitle",
    code: "MISSING_OG_TITLE",
    label: "Open Graph title",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.ogDescription",
    code: "MISSING_OG_DESCRIPTION",
    label: "Open Graph description",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.ogImage",
    code: "MISSING_OG_IMAGE",
    label: "Open Graph image",
    group: "seo",
    applies: ALL,
    needsRecord: true,
  },
  {
    id: "seo.schema",
    code: "MISSING_SCHEMA",
    label: "Structured data (schema)",
    group: "seo",
    applies: ALL,
  },
  {
    id: "seo.schemaType",
    code: "SCHEMA_TYPE_MISMATCH",
    label: "Correct schema type",
    group: "seo",
    applies: NOT_STATIC,
    needsRecord: true,
  },
  {
    id: "seo.route",
    code: "INVALID_ROUTE",
    label: "Valid route",
    group: "seo",
    applies: ALL,
  },
  {
    id: "content.description",
    code: "MISSING_CONTENT",
    label: "Page content",
    group: "content",
    applies: NOT_STATIC,
  },
  {
    id: "content.depth",
    code: "THIN_CONTENT",
    label: "Enough content (80+ words, blogs 250+)",
    group: "content",
    applies: NOT_STATIC,
  },
  {
    id: "content.keywords",
    code: "MISSING_TOPIC_TERMS",
    label: "Catalog keywords",
    group: "content",
    applies: NOT_STATIC,
  },
  {
    id: "content.image",
    code: "MISSING_PRIMARY_IMAGE",
    label: "Page image",
    group: "content",
    applies: NOT_STATIC,
  },
  {
    id: "merchant.title",
    code: "MISSING_PRODUCT_TITLE",
    label: "Product title",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.price",
    code: "MISSING_PRICE",
    label: "Price",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.brand",
    code: "MISSING_BRAND",
    label: "Brand",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.image",
    code: "MISSING_PRODUCT_IMAGE",
    label: "Product photo",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.category",
    code: "MISSING_GOOGLE_CATEGORY",
    label: "Google product category",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.condition",
    code: "MISSING_CONDITION",
    label: "Condition",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.identifier",
    code: "MISSING_IDENTIFIER",
    label: "GTIN / MPN",
    group: "merchant",
    applies: PRODUCT,
  },
  {
    id: "merchant.enabled",
    code: "MERCHANT_DISABLED",
    label: "Enabled for Merchant feed",
    group: "merchant",
    applies: PRODUCT,
  },
];

const CLIENT_CHECKS: CheckDef[] = [
  { id: "seo.keywords", label: "SEO keywords", group: "seo" },
  {
    id: "link.inbound",
    label: "Linked from other pages (not orphan)",
    group: "linking",
  },
  {
    id: "link.contextual",
    label: "Contextual links in content point here",
    group: "linking",
  },
  { id: "link.noBroken", label: "No broken internal links", group: "linking" },
  {
    id: "link.mentions",
    label: "Mentions of other pages are linked",
    group: "linking",
  },
  {
    id: "link.category",
    label: "Product has a valid category",
    group: "linking",
  },
  {
    id: "link.subcategory",
    label: "Product has a matching subcategory",
    group: "linking",
  },
  {
    id: "link.supporting",
    label: "A blog supports the product",
    group: "linking",
  },
  {
    id: "link.blogConnected",
    label: "Blog connected to the catalog",
    group: "linking",
  },
  { id: "kw.title", label: "Keyword in SEO title", group: "keywords" },
  {
    id: "kw.titleLength",
    label: "Title is 30–60 characters",
    group: "keywords",
  },
  {
    id: "kw.description",
    label: "Keyword in meta description",
    group: "keywords",
  },
  {
    id: "kw.descriptionLength",
    label: "Description is 70–160 characters",
    group: "keywords",
  },
  { id: "kw.url", label: "Keyword words in URL", group: "keywords" },
  {
    id: "kw.heading",
    label: "Keyword in page heading (H1)",
    group: "keywords",
  },
  { id: "kw.content", label: "Keyword used in content", group: "keywords" },
  { id: "kw.depth", label: "Keyword page has enough words", group: "keywords" },
  { id: "kw.density", label: "Natural keyword density", group: "keywords" },
  {
    id: "kw.links",
    label: "Internal links to the keyword page",
    group: "keywords",
  },
  {
    id: "kw.unique",
    label: "Only one page targets the keyword",
    group: "keywords",
  },
];

export const COVERAGE_CHECKS: CheckDef[] = [
  ...READINESS_CHECKS.map(({ id, label, group }) => ({ id, label, group })),
  ...CLIENT_CHECKS,
];
const CHECK_BY_ID = new Map(COVERAGE_CHECKS.map((check) => [check.id, check]));
export const checkLabel = (id: string) => CHECK_BY_ID.get(id)?.label || id;

const KEYWORD_SLOT = "kw|";
/** Keyword rows are tracked as `kw|<pageKey>::<keyword>` slots, pages by pageKey. */
export const parseSlot = (slot: string) => {
  if (!slot.startsWith(KEYWORD_SLOT))
    return { pageKey: slot, rowId: null as string | null };
  const rowId = slot.slice(KEYWORD_SLOT.length);
  return { pageKey: rowId.split("::")[0], rowId };
};

export interface CoverageSnapshot {
  version: 1;
  at: number;
  readinessScore: number | null;
  keywordScore: number | null;
  /** check id → [filled, total] */
  counts: Record<string, [number, number]>;
  /** slot → ids of the checks missing there; every tracked slot is present */
  slots: Record<string, string[]>;
}

export interface CoverageCheckRow extends CheckDef {
  filled: number;
  total: number;
  missingSlots: string[];
}

export interface Coverage {
  snapshot: CoverageSnapshot;
  checks: CoverageCheckRow[];
  /** slot → ids of the checks that apply there */
  applies: Map<string, Set<string>>;
  filled: number;
  missing: number;
  percent: number;
  /** False when readiness couldn't load, so page-field checks are absent. */
  complete: boolean;
}

export const computeCoverage = (
  analysis: SiteAnalysis,
  readiness: SeoReadinessReport | null,
  records: SeoRecord[],
): Coverage => {
  const applies = new Map<string, Set<string>>();
  const slots: Record<string, string[]> = {};
  const mark = (slot: string, id: string, pass: boolean) => {
    const set = applies.get(slot) || new Set<string>();
    set.add(id);
    applies.set(slot, set);
    slots[slot] = slots[slot] || [];
    if (!pass) slots[slot].push(id);
  };

  const recordByKey = new Map(
    records.map((record) => [record.pageKey, record]),
  );
  readiness?.items.forEach((item) => {
    const codes = new Set(item.issues.map((issue) => issue.code));
    const noRecord = codes.has("MISSING_SEO_RECORD");
    READINESS_CHECKS.forEach((check) => {
      if (!check.applies(item.entityType)) return;
      const missing =
        codes.has(check.code) ||
        (noRecord && Boolean(check.needsRecord)) ||
        (check.code === "THIN_CONTENT" && codes.has("MISSING_CONTENT"));
      mark(item.pageKey, check.id, !missing);
    });
    const keywords = (recordByKey.get(item.pageKey)?.keywords || []).filter(
      (keyword) => String(keyword).trim(),
    );
    mark(item.pageKey, "seo.keywords", keywords.length > 0);
  });

  const { inbound, issues } = analysis.interlinking;
  const kindsByPage = new Map<string, Set<string>>();
  issues.forEach((issue) => {
    const kinds = kindsByPage.get(issue.page.pageKey) || new Set<string>();
    // Unknown references name the broken side in the message.
    kinds.add(
      issue.kind === "unknown-reference"
        ? issue.message.includes("subcategory")
          ? "unknown-subcategory"
          : "unknown-category"
        : issue.kind,
    );
    kindsByPage.set(issue.page.pageKey, kinds);
  });
  analysis.pages.forEach((page) => {
    if (page.type === "static") return;
    const kinds = kindsByPage.get(page.pageKey) || new Set<string>();
    const summary = inbound.get(page.pageKey);
    mark(
      page.pageKey,
      "link.inbound",
      Boolean(summary?.content.length || summary?.taxonomy.length),
    );
    mark(page.pageKey, "link.contextual", Boolean(summary?.content.length));
    mark(page.pageKey, "link.noBroken", !kinds.has("broken-link"));
    mark(page.pageKey, "link.mentions", !kinds.has("link-opportunity"));
    if (page.type === "product") {
      mark(
        page.pageKey,
        "link.category",
        !kinds.has("missing-category") && !kinds.has("unknown-category"),
      );
      mark(
        page.pageKey,
        "link.subcategory",
        !kinds.has("missing-subcategory") &&
          !kinds.has("unknown-subcategory") &&
          !kinds.has("taxonomy-mismatch"),
      );
      mark(
        page.pageKey,
        "link.supporting",
        !kinds.has("no-supporting-content"),
      );
    }
    if (page.type === "blog")
      mark(page.pageKey, "link.blogConnected", !kinds.has("blog-unlinked"));
  });

  analysis.keywords.forEach((row) => {
    row.checks.forEach((check) => {
      if (check.pass === null || check.weight === 0) return;
      mark(`${KEYWORD_SLOT}${row.id}`, `kw.${check.id}`, check.pass);
    });
  });

  const totals = new Map<
    string,
    { filled: number; total: number; missingSlots: string[] }
  >();
  applies.forEach((ids, slot) => {
    const missing = new Set(slots[slot]);
    ids.forEach((id) => {
      const entry = totals.get(id) || { filled: 0, total: 0, missingSlots: [] };
      entry.total += 1;
      if (missing.has(id)) entry.missingSlots.push(slot);
      else entry.filled += 1;
      totals.set(id, entry);
    });
  });

  const checks = COVERAGE_CHECKS.flatMap((check) => {
    const entry = totals.get(check.id);
    return entry ? [{ ...check, ...entry }] : [];
  });
  const filled = checks.reduce((sum, check) => sum + check.filled, 0);
  const total = checks.reduce((sum, check) => sum + check.total, 0);
  const keywordScore = analysis.keywords.length
    ? Math.round(
        analysis.keywords.reduce((sum, row) => sum + row.score, 0) /
          analysis.keywords.length,
      )
    : null;

  return {
    snapshot: {
      version: 1,
      at: Date.now(),
      readinessScore: readiness?.summary.overallScore ?? null,
      keywordScore,
      counts: Object.fromEntries(
        checks.map((check) => [check.id, [check.filled, check.total]]),
      ),
      slots,
    },
    checks,
    applies,
    filled,
    missing: total - filled,
    percent: total ? Math.round((filled / total) * 100) : 0,
    complete: Boolean(readiness),
  };
};

export const snapshotPercent = (snapshot: CoverageSnapshot) => {
  const [filled, total] = Object.values(snapshot.counts).reduce(
    ([f, t], [cf, ct]) => [f + cf, t + ct],
    [0, 0],
  );
  return {
    filled,
    missing: total - filled,
    percent: total ? Math.round((filled / total) * 100) : 0,
  };
};

export interface SlotChange {
  slot: string;
  pageKey: string;
  rowId: string | null;
  fixed: string[];
  regressed: string[];
}

/** Checks fixed or newly missing on slots tracked in both the baseline and now. */
export const diffCoverage = (
  baseline: CoverageSnapshot,
  current: Coverage,
): SlotChange[] => {
  const changes: SlotChange[] = [];
  Object.entries(baseline.slots).forEach(([slot, beforeMissing]) => {
    const applicable = current.applies.get(slot);
    if (!applicable) return;
    const before = new Set(beforeMissing);
    const now = new Set(current.snapshot.slots[slot] || []);
    const fixed = [...before].filter(
      (id) => applicable.has(id) && !now.has(id),
    );
    const regressed = [...now].filter(
      (id) => !before.has(id) && baselineTracked(baseline, id),
    );
    if (fixed.length || regressed.length)
      changes.push({ slot, ...parseSlot(slot), fixed, regressed });
  });
  return changes;
};

// A check the baseline never measured (e.g. readiness was unavailable) isn't a regression.
const baselineTracked = (baseline: CoverageSnapshot, id: string) =>
  Boolean(baseline.counts[id]);

// ---------------------------------------------------------------- baseline storage

const STORAGE_KEY = "aquacrm.seoCoverageBaseline.v1";

export const loadBaseline = (): CoverageSnapshot | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CoverageSnapshot) : null;
    return parsed?.version === 1 && parsed.slots && parsed.counts
      ? parsed
      : null;
  } catch {
    return null;
  }
};

export const saveBaseline = (snapshot: CoverageSnapshot) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the baseline lasts for this session only.
  }
};
