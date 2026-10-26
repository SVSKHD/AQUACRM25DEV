import type { SeoRecord } from "../services/seoService";
import {
  containsPhrase,
  normalizeText,
  type PageType,
  type SiteAnalysis,
  type SitePage,
} from "./siteAnalysis";

/*
 * Finds keywords and keyphrases a page is missing: target keywords that don't
 * appear where search engines weigh them, and new phrases worth targeting.
 */

export type PhrasePlace =
  "title" | "description" | "heading" | "content" | "url";

export const PLACE_LABELS: Record<PhrasePlace, string> = {
  title: "SEO title",
  description: "Meta description",
  heading: "Heading",
  content: "Content",
  url: "URL",
};

export interface PhraseCoverage {
  phrase: string;
  /** null when the place can't be checked (e.g. static page content) */
  places: Record<PhrasePlace, boolean | null>;
}

export type SuggestionSource =
  "buyer-intent" | "content" | "related" | "taxonomy" | "ai";

export const SOURCE_LABELS: Record<SuggestionSource, string> = {
  "buyer-intent": "Buyer intent",
  content: "Already in content",
  related: "Used by similar pages",
  taxonomy: "Category term",
  ai: "AI suggestion",
};

export interface PhraseSuggestion extends PhraseCoverage {
  source: SuggestionSource;
  reason: string;
}

export interface KeyphraseReport {
  /** Keywords the page targets, with where each one is missing. */
  targets: PhraseCoverage[];
  targetsWithGaps: PhraseCoverage[];
  suggestions: PhraseSuggestion[];
  /** The catalog entity has no keywords (readiness MISSING_TOPIC_TERMS). */
  catalogKeywordsMissing: boolean;
}

const MAX_SUGGESTIONS = 12;
const LOCATION = "hyderabad";

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or our that the this to was were will with you your we can all any more most other some such into than then them they these those not no only own same so too very just also about over under use used using get one two new best buy through while when which where what how why each every per may should must need make makes like".split(
    " ",
  ),
);

const BRAND_SUFFIX = /\s*[|–-]\s*aqua\s*kart.*$/i;

const singular = (phrase: string) =>
  phrase
    .replace(/\b(\w{4,}?)(ies)\b$/i, "$1y")
    .replace(/\b(\w{4,}[^s])s\b$/i, "$1");

const clean = (phrase: string) =>
  normalizeText(phrase).replace(/\s+/g, " ").trim();

const coverage = (
  phrase: string,
  page: SitePage | undefined,
  record: SeoRecord | undefined,
): PhraseCoverage => {
  const isStatic = !page || page.type === "static";
  const route = record?.route || page?.route || "";
  const routeTokens = new Set(clean(decodeURIComponentSafe(route)).split(" "));
  const tokens = clean(phrase)
    .split(" ")
    .filter((token) => token.length > 2);
  return {
    phrase,
    places: {
      title:
        Boolean(record?.title) && containsPhrase(record?.title || "", phrase),
      description:
        Boolean(record?.description) &&
        containsPhrase(record?.description || "", phrase),
      heading: isStatic ? null : containsPhrase(page?.title || "", phrase),
      content: isStatic ? null : containsPhrase(page?.text || "", phrase),
      url:
        route.replace(/\//g, "") && tokens.length
          ? tokens.every(
              (token) => routeTokens.has(token) || routeTokens.has(`${token}s`),
            )
          : null,
    },
  };
};

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Frequent 2–3 word phrases in the page text, ignoring ones that start/end with stopwords. */
const contentPhrases = (text: string, limit = 6) => {
  const words = clean(text).split(" ").filter(Boolean);
  const counts = new Map<string, number>();
  for (const size of [2, 3]) {
    for (let index = 0; index + size <= words.length; index += 1) {
      const gram = words.slice(index, index + size);
      // Allow "and"/"for" inside a phrase (e.g. "calcium and magnesium"), but no other filler.
      const filler = gram.some(
        (word, position) =>
          STOPWORDS.has(word) &&
          (position === 0 ||
            position === gram.length - 1 ||
            !["and", "for"].includes(word)),
      );
      if (filler) continue;
      if (gram.some((word) => word.length < 3 || /^\d+$/.test(word))) continue;
      const phrase = gram.join(" ");
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort(
      (a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length,
    )
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
};

/** Product name without sizes/model numbers, e.g. "kent bathroom water softener". */
const coreName = (title: string) =>
  clean(singular(title.replace(BRAND_SUFFIX, "")))
    .split(" ")
    .filter((token) => !/\d/.test(token))
    .join(" ");

const typeOf = (
  page: SitePage | undefined,
  analysis: SiteAnalysis,
  core: string,
) => {
  if (!page) return "";
  const sub = page.subCategoryId
    ? analysis.pages.find(
        (item) => item.type === "subcategory" && item.id === page.subCategoryId,
      )
    : undefined;
  const category = page.categoryId
    ? analysis.pages.find(
        (item) => item.type === "category" && item.id === page.categoryId,
      )
    : undefined;
  const kind = clean(singular((sub || category)?.title || ""));
  // One-word taxonomy terms ("filter") are too broad; use the product's own type instead.
  if (kind.split(" ").length >= 2) return kind;
  // Only product names end in their type ("kent iron filter" → "iron filter").
  if (page.type !== "product") return "";
  const words = core.split(" ");
  return words.length >= 2 ? words.slice(-2).join(" ") : kind;
};

const buyerIntentPhrases = (
  pageType: PageType,
  core: string,
  kind: string,
  brand: string,
) => {
  const phrases: { phrase: string; reason: string }[] = [];
  const add = (phrase: string, reason: string) => {
    const value = clean(phrase);
    if (value.split(" ").length >= 2) phrases.push({ phrase: value, reason });
  };
  if (pageType === "product") {
    if (core)
      add(
        `${core} price`,
        "Shoppers comparing prices search “<product> price”",
      );
    if (brand && kind && !kind.includes(brand))
      add(`${brand} ${kind}`, "Brand + product type is a common search");
    if (kind) {
      add(`${kind} price`, "High-intent price search for the product type");
      add(
        `${kind} in ${LOCATION}`,
        "Local searches convert best for installation products",
      );
      add(
        `${kind} installation ${LOCATION}`,
        "Captures buyers who need installation",
      );
      add(`best ${kind} for home`, "Popular comparison search");
    }
  } else if (pageType === "category" || pageType === "subcategory") {
    if (core) {
      add(`${core} price`, "Category price searches");
      add(`best ${core}`, "Comparison search for the category");
      add(`${core} in ${LOCATION}`, "Local category search");
      add(`buy ${core} online`, "Transactional search");
    }
  } else if (pageType === "blog") {
    if (kind)
      add(
        `how to choose ${kind}`,
        "Informational search that leads to purchase",
      );
    if (core && core.split(" ").length <= 4)
      add(`${core} guide`, "Guide-style searches");
  }
  return phrases;
};

export const analyzeKeyphrases = (
  page: SitePage | undefined,
  record: SeoRecord | undefined,
  analysis: SiteAnalysis,
  catalogKeywordsMissing = false,
): KeyphraseReport => {
  const targeted = record?.keywords?.length
    ? record.keywords
    : page?.keywords || [];
  const targets = targeted.map((keyword) => coverage(keyword, page, record));
  const targetsWithGaps = targets.filter((target) =>
    (["title", "description", "content"] as PhrasePlace[]).some(
      (place) => target.places[place] === false,
    ),
  );

  const seen = new Set(targeted.map((keyword) => clean(singular(keyword))));
  const suggestions: PhraseSuggestion[] = [];
  const suggest = (
    phrase: string,
    source: SuggestionSource,
    reason: string,
  ) => {
    phrase = phrase.trim().replace(/[.,;:!?]+$/, "");
    const key = clean(singular(phrase));
    if (!key || seen.has(key) || key.length > 80) return;
    seen.add(key);
    suggestions.push({ ...coverage(phrase, page, record), source, reason });
  };

  if (page) {
    const core = coreName(page.title);
    const kind = typeOf(page, analysis, core);
    const brand = clean(page.brand);

    // Phrases the content already repeats are the cheapest wins.
    if (page.type !== "static") {
      contentPhrases(page.text).forEach(({ phrase, count }) =>
        suggest(
          phrase,
          "content",
          `Your content uses this ${count} times but the page doesn't target it`,
        ),
      );
    }

    buyerIntentPhrases(page.type, core, kind, brand).forEach(
      ({ phrase, reason }) => suggest(phrase, "buyer-intent", reason),
    );

    if (kind && page.type === "product")
      suggest(
        kind,
        "taxonomy",
        "The page's category term, a broad head keyword",
      );

    // Keywords similar pages target that share words with this page.
    const titleTokens = new Set(
      clean(page.title)
        .split(" ")
        .filter((token) => token.length > 3),
    );
    const siblings = analysis.keywords.filter(
      (row) =>
        row.pageKey !== page.pageKey &&
        row.type === page.type &&
        ((page.subCategoryId &&
          row.page?.subCategoryId === page.subCategoryId) ||
          (page.categoryId && row.page?.categoryId === page.categoryId)),
    );
    const titleNumbers = new Set(
      clean(page.title)
        .split(" ")
        .filter((token) => /\d/.test(token)),
    );
    siblings
      .filter((row) => {
        const tokens = clean(row.keyword).split(" ");
        // Skip phrases about another size/model (e.g. "100l" on a 5.5L product page).
        return (
          tokens.some((token) => titleTokens.has(token)) &&
          tokens
            .filter((token) => /\d/.test(token))
            .every((token) => titleNumbers.has(token))
        );
      })
      .slice(0, 6)
      .forEach((row) =>
        suggest(
          row.keyword,
          "related",
          `Targeted by “${row.pageTitle}” in the same category`,
        ),
      );
  }

  // Phrases already in the content first, then the rest in discovery order.
  suggestions.sort(
    (a, b) =>
      Number(b.places.content === true) - Number(a.places.content === true),
  );

  return {
    targets,
    targetsWithGaps,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    catalogKeywordsMissing,
  };
};

export const withCoverage = (
  phrases: { phrase: string; reason: string }[],
  page: SitePage | undefined,
  record: SeoRecord | undefined,
): PhraseSuggestion[] =>
  phrases.map(({ phrase, reason }) => ({
    ...coverage(phrase, page, record),
    source: "ai",
    reason,
  }));
