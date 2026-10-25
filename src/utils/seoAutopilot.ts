import type { SeoReadinessItem, SeoRecord } from "../services/seoService";
import { analyzeKeyphrases } from "./keyphrases";
import {
  buildFixPlan,
  buildSchema,
  fieldLabel,
  fixPayload,
  type FixField,
  type ManualStep,
  type ProposedChange,
} from "./seoFixes";
import { applyToRecord, projectScore } from "./seoProjection";
import {
  containsPhrase,
  type SiteAnalysis,
  type SitePage,
} from "./siteAnalysis";

/*
 * Plans SEO work for every page at once: record fixes, keyphrases to target,
 * and whether the copy needs an AI rewrite, ranked by predicted impact.
 */

export interface AutopilotOptions {
  /** Fill missing/incorrect SEO record fields (canonical, robots, OG, schema, …). */
  fixRecords: boolean;
  /** Rewrite weak titles and descriptions with AI. */
  aiCopy: boolean;
  /** Add the strongest missing keyphrases to SEO keywords. */
  addKeyphrases: boolean;
}

export const DEFAULT_OPTIONS: AutopilotOptions = {
  fixRecords: true,
  aiCopy: true,
  addKeyphrases: true,
};

export interface AICopy {
  title: string;
  description: string;
}

export interface PagePlan {
  item: SeoReadinessItem;
  page: SitePage | undefined;
  target: SeoRecord | null;
  misKeyed: boolean;
  changes: ProposedChange[];
  manual: ManualStep[];
  /** Why the title/description should be rewritten (empty → copy is fine). */
  weakCopy: string[];
  primaryKeyword: string;
  keyphrasesAdded: string[];
  keywordGaps: number;
  current: number;
  projected: number;
  gain: number;
  /** Ranking: higher means do it first. */
  priority: number;
  aiCopy?: AICopy;
}

const MAX_KEYPHRASES_PER_PAGE = 3;
const MAX_SEO_KEYWORDS = 50;

const change = (
  field: FixField,
  current: unknown,
  value: ProposedChange["value"],
  reason: string,
): ProposedChange => ({
  field,
  label: fieldLabel(field),
  current:
    typeof current === "string"
      ? current
      : Array.isArray(current)
        ? current.join(", ")
        : "",
  value,
  reason,
});

const upsert = (changes: ProposedChange[], next: ProposedChange) => {
  const index = changes.findIndex((item) => item.field === next.field);
  if (index >= 0) changes[index] = next;
  else changes.push(next);
};

/** The title/description that will be live after the deterministic fixes. */
const effectiveCopy = (plan: Pick<PagePlan, "changes" | "target">) => {
  const value = (field: FixField) =>
    String(
      plan.changes.find((item) => item.field === field)?.value ??
        plan.target?.[field as keyof SeoRecord] ??
        "",
    );
  return { title: value("title"), description: value("description") };
};

const copyProblems = (title: string, description: string, keyword: string) => {
  const problems: string[] = [];
  if (!title) problems.push("No SEO title");
  else if (title.length < 30 || title.length > 60)
    problems.push(`Title is ${title.length} chars (aim for 30–60)`);
  if (!description) problems.push("No meta description");
  else if (description.length < 70 || description.length > 160)
    problems.push(
      `Description is ${description.length} chars (aim for 70–160)`,
    );
  if (keyword && title && !containsPhrase(title, keyword))
    problems.push(`Primary keyword “${keyword}” isn't in the title`);
  if (keyword && description && !containsPhrase(description, keyword))
    problems.push(`Primary keyword “${keyword}” isn't in the description`);
  return problems;
};

const recompute = (plan: PagePlan): PagePlan => {
  const body = fixPayload(
    plan.item,
    {
      target: plan.target,
      misKeyed: plan.misKeyed,
      changes: plan.changes,
      manual: plan.manual,
    },
    plan.changes,
  );
  const projected = plan.changes.length
    ? projectScore(plan.item, applyToRecord(plan.target, body))
    : plan.current;
  const gain = projected - plan.current;
  const priority =
    gain * 2 +
    Math.min(plan.keywordGaps, 10) +
    plan.weakCopy.length * 3 +
    (plan.item.priority === "P0" ? 10 : plan.item.priority === "P1" ? 5 : 0) +
    (plan.item.entityType === "product" ? 4 : 0);
  return { ...plan, projected, gain, priority };
};

export const buildPagePlans = (
  items: SeoReadinessItem[],
  records: SeoRecord[],
  analysis: SiteAnalysis,
  options: AutopilotOptions,
): PagePlan[] =>
  items
    .map((item) => {
      const page = analysis.pageByKey.get(item.pageKey);
      const fix = buildFixPlan(item, records, page);
      const changes: ProposedChange[] = options.fixRecords
        ? [...fix.changes]
        : fix.changes.filter(
            (item) =>
              item.field === "pageKey" ||
              (!fix.target && item.field === "title"),
          );

      const report = analyzeKeyphrases(page, fix.target || undefined, analysis);
      const existing = fix.target?.keywords?.length ? fix.target.keywords : [];
      const keyphrasesAdded: string[] = [];
      if (options.addKeyphrases) {
        const base = existing.length
          ? existing
          : (changes.find((item) => item.field === "keywords")?.value as
              string[] | undefined) || [];
        report.suggestions
          .filter(
            (suggestion) =>
              suggestion.source === "content" ||
              suggestion.source === "buyer-intent",
          )
          .slice(0, MAX_KEYPHRASES_PER_PAGE)
          .forEach((suggestion) => {
            if (base.length + keyphrasesAdded.length < MAX_SEO_KEYWORDS)
              keyphrasesAdded.push(suggestion.phrase);
          });
        if (keyphrasesAdded.length) {
          upsert(
            changes,
            change(
              "keywords",
              existing,
              [...base, ...keyphrasesAdded],
              `Add ${keyphrasesAdded.length} high-intent keyphrase${keyphrasesAdded.length === 1 ? "" : "s"}`,
            ),
          );
        }
      }

      const keywords =
        (changes.find((item) => item.field === "keywords")?.value as
          string[] | undefined) || existing;
      const primaryKeyword = keywords[0] || report.suggestions[0]?.phrase || "";
      const draft = { changes, target: fix.target };
      const copy = effectiveCopy(draft);
      const weakCopy = options.aiCopy
        ? copyProblems(copy.title, copy.description, primaryKeyword)
        : [];

      return recompute({
        item,
        page,
        target: fix.target,
        misKeyed: fix.misKeyed,
        changes,
        manual: fix.manual,
        weakCopy,
        primaryKeyword,
        keyphrasesAdded,
        keywordGaps: report.targetsWithGaps.length,
        current: item.score,
        projected: item.score,
        gain: 0,
        priority: 0,
      });
    })
    .filter((plan) => plan.changes.length > 0 || plan.weakCopy.length > 0)
    .sort(
      (a, b) =>
        b.priority - a.priority || a.item.title.localeCompare(b.item.title),
    );

/** Folds an AI rewrite into a plan: title, description, matching OG fields and schema. */
export const withAICopy = (plan: PagePlan, copy: AICopy): PagePlan => {
  const changes = [...plan.changes];
  const title = copy.title.trim().slice(0, 120);
  const description = copy.description.trim().slice(0, 500);
  if (title) {
    upsert(changes, change("title", plan.target?.title, title, "AI rewrite"));
    upsert(
      changes,
      change("ogTitle", plan.target?.ogTitle, title, "Match the new SEO title"),
    );
  }
  if (description) {
    upsert(
      changes,
      change(
        "description",
        plan.target?.description,
        description,
        "AI rewrite",
      ),
    );
    upsert(
      changes,
      change(
        "ogDescription",
        plan.target?.ogDescription,
        description,
        "Match the new description",
      ),
    );
  }
  if (changes.some((item) => item.field === "schemaJson")) {
    upsert(
      changes,
      change(
        "schemaJson",
        plan.target?.schemaJson,
        buildSchema(
          plan.item,
          plan.page,
          title || plan.item.title,
          description,
        ),
        "Rebuilt with the new copy",
      ),
    );
  }
  return recompute({
    ...plan,
    changes,
    aiCopy: copy,
    weakCopy: copyProblems(title, description, plan.primaryKeyword),
  });
};

export const buildCopyPrompt = (plan: PagePlan) =>
  [
    `Page: ${plan.item.entityType} "${plan.item.title}" at ${plan.item.canonicalUrl}`,
    `Primary keyword: ${plan.primaryKeyword || "choose the best one from the content"}`,
    `Other keywords: ${((plan.changes.find((item) => item.field === "keywords")?.value as string[] | undefined) || plan.target?.keywords || []).slice(1, 8).join(", ") || "none"}`,
    `Current SEO title: ${plan.target?.title || "none"}`,
    `Current meta description: ${plan.target?.description || "none"}`,
    `Problems: ${plan.weakCopy.join("; ")}`,
    `Page content excerpt: ${plan.page?.text ? plan.page.text.slice(0, 1200) : "not available"}`,
    "",
    "Return a JSON object with exactly these fields:",
    "title: SEO title, 30-60 characters, primary keyword near the start, ends with ' | AquaKart' if it fits.",
    "description: meta description, 120-155 characters, includes the primary keyword and a reason to click.",
  ].join("\n");

export const COPY_SYSTEM_INSTRUCTION =
  "You are an SEO copywriter for AquaKart (aquakart.co.in), an Indian e-commerce store for water purifiers, water softeners and installation/service in Hyderabad. Write natural, specific copy. Never invent prices, discounts, certifications or claims that aren't in the provided content.";

/** Average readiness across all pages, with planned pages swapped to their projected score. */
export const projectedSiteScore = (
  items: SeoReadinessItem[],
  plans: PagePlan[],
  included: Set<string>,
) => {
  if (!items.length) return 0;
  const projected = new Map(
    plans
      .filter((plan) => included.has(plan.item.pageKey))
      .map((plan) => [plan.item.pageKey, plan.projected]),
  );
  return Math.round(
    items.reduce(
      (sum, item) => sum + (projected.get(item.pageKey) ?? item.score),
      0,
    ) / items.length,
  );
};
