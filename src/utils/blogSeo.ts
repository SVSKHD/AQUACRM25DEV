import { slugify } from "./blogList";

/*
 * On-page SEO score for one blog in the editor (0–100), computed locally from
 * the form so it updates as you type, plus the prompt/parser for "Auto fix",
 * which asks Gemini (via /crm/ai/generate) for better metadata. Auto fix never
 * rewrites the article body; content checks are listed as manual fixes.
 */

export interface BlogSeoInput {
  title: string;
  slug: string;
  shortDescription: string;
  keywords: string;
  keyphrases: string;
  tags: string;
  summary: string;
  keyHighlights: string;
  /** Article HTML. */
  description: string;
  hasTitleImage: boolean;
}

export type SeoCheckStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  id: string;
  label: string;
  points: number;
  earned: number;
  status: SeoCheckStatus;
  /** What to do; empty when passing. */
  hint: string;
  /** true when Auto fix can change the fields this check looks at. */
  autoFixable: boolean;
}

export interface BlogSeoReport {
  score: number;
  focus: string;
  checks: SeoCheck[];
  wordCount: number;
}

export const TITLE_RANGE = [30, 65] as const;
export const META_RANGE = [120, 160] as const;
export const MIN_WORDS = 600;

export const splitList = (value: string) =>
  String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const norm = (value: string) =>
  ` ${String(value || "")
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

/** Whole-phrase match, ignoring case and punctuation. */
export const hasPhrase = (text: string, phrase: string) => {
  const p = norm(phrase).trim();
  return Boolean(p) && norm(text).includes(` ${p} `);
};

/** Share of the phrase's words (ignoring tiny ones) that appear in the text. */
const wordShare = (text: string, phrase: string) => {
  const words = norm(phrase)
    .trim()
    .split(" ")
    .filter((w) => w.length > 2);
  if (!words.length) return 0;
  const haystack = norm(text);
  return words.filter((w) => haystack.includes(` ${w} `)).length / words.length;
};

const htmlText = (html: string) =>
  String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .trim();

const headingsOf = (html: string) =>
  [...String(html || "").matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map(
    (m) => htmlText(m[1]),
  );

const internalLinks = (html: string) =>
  [...String(html || "").matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((href) => /^\/(?!\/)|aquakart\.co\.in/i.test(href)).length;

/** The phrase the page should rank for: first keyphrase, else first keyword. */
export const focusPhrase = (
  input: Pick<BlogSeoInput, "keyphrases" | "keywords">,
) => splitList(input.keyphrases)[0] || splitList(input.keywords)[0] || "";

const check = (
  id: string,
  label: string,
  points: number,
  ratio: number,
  hint: string,
  autoFixable: boolean,
): SeoCheck => {
  const earned = Math.round(points * Math.max(0, Math.min(1, ratio)));
  const status: SeoCheckStatus =
    earned >= points ? "pass" : earned > 0 ? "warn" : "fail";
  return {
    id,
    label,
    points,
    earned,
    status,
    hint: status === "pass" ? "" : hint,
    autoFixable,
  };
};

const lengthRatio = (length: number, [min, max]: readonly [number, number]) =>
  length >= min && length <= max
    ? 1
    : length === 0
      ? 0
      : length < min
        ? Math.max(0.3, length / min)
        : Math.max(0.3, max / length);

export const scoreBlogSeo = (input: BlogSeoInput): BlogSeoReport => {
  const focus = focusPhrase(input);
  const title = input.title.trim();
  const meta = input.shortDescription.trim();
  const slug = input.slug.trim();
  const body = htmlText(input.description);
  const words = body ? body.split(/\s+/).filter(Boolean) : [];
  const firstWords = words.slice(0, 100).join(" ");
  const headings = headingsOf(input.description);
  const keywords = splitList(input.keywords);
  const links = internalLinks(input.description);
  const inPlace = (text: string) =>
    !focus
      ? 0
      : hasPhrase(text, focus)
        ? 1
        : wordShare(text, focus) >= 0.6
          ? 0.5
          : 0;

  const checks: SeoCheck[] = [
    check(
      "focus",
      "Focus keyphrase set",
      10,
      focus ? 1 : 0,
      "Add a keyphrase (or a first keyword) people search for.",
      true,
    ),
    check(
      "title-length",
      `Title ${TITLE_RANGE[0]}–${TITLE_RANGE[1]} characters`,
      10,
      lengthRatio(title.length, TITLE_RANGE),
      `Title is ${title.length} characters; search results cut long titles.`,
      true,
    ),
    check(
      "title-focus",
      "Keyphrase in title",
      10,
      inPlace(title),
      focus ? `Use “${focus}” in the title.` : "Set a keyphrase first.",
      true,
    ),
    check(
      "meta-length",
      `Short description ${META_RANGE[0]}–${META_RANGE[1]} characters`,
      10,
      lengthRatio(meta.length, META_RANGE),
      `Short description is ${meta.length} characters; it is the search snippet.`,
      true,
    ),
    check(
      "meta-focus",
      "Keyphrase in short description",
      10,
      inPlace(meta),
      focus
        ? `Use “${focus}” in the short description.`
        : "Set a keyphrase first.",
      true,
    ),
    check(
      "slug",
      "Short slug with the keyphrase",
      8,
      !slug
        ? 0
        : (slug.length <= 75 ? 0.5 : 0.25) +
            (focus && wordShare(slug.replace(/-/g, " "), focus) >= 0.6
              ? 0.5
              : 0),
      !slug
        ? "Add a slug."
        : slug.length > 75
          ? `Slug is ${slug.length} characters; keep it under 75.`
          : `Put “${focus || "the keyphrase"}” in the slug.`,
      true,
    ),
    check(
      "keywords",
      "3–10 keywords",
      5,
      keywords.length >= 3 && keywords.length <= 10
        ? 1
        : keywords.length
          ? 0.5
          : 0,
      `There are ${keywords.length} keywords.`,
      true,
    ),
    check(
      "length",
      `Article at least ${MIN_WORDS} words`,
      12,
      words.length / MIN_WORDS,
      `The article has ${words.length} words; expand it in the Content editor.`,
      false,
    ),
    check(
      "intro-focus",
      "Keyphrase in the first 100 words",
      8,
      inPlace(firstWords),
      focus
        ? `Mention “${focus}” in the opening paragraph.`
        : "Set a keyphrase first.",
      false,
    ),
    check(
      "headings",
      "Subheadings, one with the keyphrase",
      8,
      !headings.length
        ? 0
        : 0.5 + (focus && headings.some((h) => inPlace(h) > 0) ? 0.5 : 0),
      headings.length
        ? `Use “${focus || "the keyphrase"}” in an H2/H3 subheading.`
        : "Split the article with H2/H3 subheadings.",
      false,
    ),
    check(
      "links",
      "Links to other Aquakart pages",
      5,
      links >= 2 ? 1 : links ? 0.5 : 0,
      "Link to related products, categories or blogs on aquakart.co.in.",
      false,
    ),
    check(
      "image",
      "Title image",
      4,
      input.hasTitleImage ? 1 : 0,
      "Add a title image in Media.",
      false,
    ),
  ];

  const total = checks.reduce((sum, c) => sum + c.points, 0);
  const earned = checks.reduce((sum, c) => sum + c.earned, 0);
  return {
    score: Math.round((earned / total) * 100),
    focus,
    checks,
    wordCount: words.length,
  };
};

/* ---------------------------- Auto fix (Gemini) --------------------------- */

export const AUTO_FIX_FIELDS = [
  "title",
  "shortDescription",
  "slug",
  "keyphrases",
  "keywords",
  "tags",
  "summary",
  "keyHighlights",
] as const;
export type AutoFixField = (typeof AUTO_FIX_FIELDS)[number];
export type AutoFixProposal = Partial<Record<AutoFixField, string>>;

export const AUTO_FIX_LABELS: Record<AutoFixField, string> = {
  title: "Title",
  shortDescription: "Short description",
  slug: "Slug",
  keyphrases: "Keyphrases",
  keywords: "Keywords",
  tags: "Tags",
  summary: "Summary",
  keyHighlights: "Key highlights",
};

const LIMITS: Partial<Record<AutoFixField, number>> = {
  title: 120,
  shortDescription: 320,
  summary: 1000,
  keyHighlights: 1200,
};

export const AUTO_FIX_SYSTEM_INSTRUCTION =
  "You are an SEO editor for Aquakart, a Hyderabad (India) store for water softeners, water purifiers, sand filters and related products. You improve blog metadata so it ranks and gets clicks, without inventing facts, prices or claims not supported by the article. Reply with JSON only.";

export const buildAutoFixPrompt = (
  input: BlogSeoInput,
  report: BlogSeoReport,
  context: { category?: string; product?: string; brand?: string } = {},
) => {
  const body = htmlText(input.description).slice(0, 6000);
  const failing = report.checks
    .filter((c) => c.status !== "pass" && c.autoFixable)
    .map((c) => `- ${c.label}: ${c.hint}`)
    .join("\n");
  return [
    "Improve this blog's SEO metadata. Current SEO score: " +
      report.score +
      "/100.",
    failing
      ? `Failing checks you can fix:\n${failing}`
      : "All metadata checks pass; only polish where clearly better.",
    "",
    "Rules:",
    `- title: ${TITLE_RANGE[0]}-${TITLE_RANGE[1]} characters, contains the focus keyphrase near the start, natural and click-worthy.`,
    `- shortDescription: ${META_RANGE[0]}-${META_RANGE[1]} characters, contains the focus keyphrase, ends with a reason to read.`,
    "- slug: lowercase words joined by single hyphens, under 60 characters, contains the keyphrase words.",
    "- keyphrases: 2-4 comma-separated search phrases; the first one is the focus keyphrase (keep the current focus unless it is empty or clearly off-topic).",
    "- keywords: 5-8 comma-separated keywords.",
    "- tags: 3-6 short comma-separated tags.",
    "- summary: 2-3 sentences.",
    "- keyHighlights: 3-5 highlights, one per line (use \\n between them).",
    "- Base everything on the article. Indian English. No emojis, no quotes around values.",
    "",
    'Return JSON: {"title": "", "shortDescription": "", "slug": "", "keyphrases": "", "keywords": "", "tags": "", "summary": "", "keyHighlights": ""}',
    "",
    "Current fields:",
    JSON.stringify(
      {
        title: input.title,
        shortDescription: input.shortDescription,
        slug: input.slug,
        keyphrases: input.keyphrases,
        keywords: input.keywords,
        tags: input.tags,
        summary: input.summary,
        keyHighlights: input.keyHighlights,
        focusKeyphrase: report.focus,
        category: context.category || "",
        relatedProduct: context.product || "",
        brand: context.brand || "",
      },
      null,
      1,
    ),
    "",
    `Article (${report.wordCount} words${body.length >= 6000 ? ", truncated" : ""}):`,
    body || "(empty)",
  ].join("\n");
};

const asText = (value: unknown) =>
  Array.isArray(value)
    ? value.map((v) => String(v ?? "").trim()).filter(Boolean)
    : typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : "";

/**
 * Cleans a Gemini reply into field proposals: trims, clamps lengths, slugifies
 * the slug, joins arrays, and drops fields that are empty or unchanged.
 */
export const parseAutoFix = (
  raw: unknown,
  current: Partial<Record<AutoFixField, string>>,
): AutoFixProposal => {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const proposal: AutoFixProposal = {};
  for (const field of AUTO_FIX_FIELDS) {
    const value = asText(source[field]);
    let text = Array.isArray(value)
      ? value.join(field === "keyHighlights" ? "\n" : ", ")
      : value;
    if (field === "slug") text = slugify(text);
    if (field === "keyHighlights")
      text = text
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean)
        .join("\n");
    else text = text.replace(/\s+/g, " ").trim();
    const limit = LIMITS[field];
    if (limit && text.length > limit) text = text.slice(0, limit).trim();
    if (text && text !== String(current[field] ?? "").trim())
      proposal[field] = text;
  }
  return proposal;
};
