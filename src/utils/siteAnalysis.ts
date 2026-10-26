import type { SeoReadinessItem, SeoRecord } from "../services/seoService";

/*
 * Builds a picture of the storefront from catalog data: every page, the links
 * between them, interlinking gaps, and an on-page score for each target
 * keyword. Routes and pageKeys mirror the backend's SEO readiness service so
 * the results join with SEO records and readiness items.
 */

export type PageType =
  "static" | "product" | "category" | "subcategory" | "blog";

export interface Catalog {
  products: RawEntity[];
  categories: RawEntity[];
  subcategories: RawEntity[];
  blogs: RawEntity[];
}

// Catalog documents come straight from the API, so fields are loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawEntity = Record<string, any>;

export interface ContentLink {
  from: string;
  anchor: string;
}

export interface SitePage {
  pageKey: string;
  type: PageType;
  id: string;
  title: string;
  route: string;
  routeKey: string;
  keywords: string[];
  text: string;
  wordCount: number;
  categoryId: string | null;
  subCategoryId: string | null;
  productId: string | null;
  blogId: string | null;
  /** Internal links found in the page's own content, as route keys. */
  outbound: { routeKey: string; anchor: string; href: string }[];
  /** Names that count as a mention of this page in other pages' text. */
  aliases: string[];
  /** First usable image URL (product photo, blog title image, …). */
  image: string;
  price: number | null;
  brand: string;
  sku: string;
}

export type LinkIssueKind =
  | "orphan"
  | "broken-link"
  | "missing-category"
  | "missing-subcategory"
  | "taxonomy-mismatch"
  | "unknown-reference"
  | "empty-category"
  | "empty-subcategory"
  | "blog-unlinked"
  | "no-supporting-content"
  | "link-opportunity";

export interface PageRef {
  pageKey: string;
  title: string;
  route: string;
  type: PageType;
}

export interface LinkIssue {
  id: string;
  kind: LinkIssueKind;
  severity: "high" | "medium" | "low";
  page: PageRef;
  message: string;
  suggestion: string;
  target?: PageRef;
  anchor?: string;
}

export interface InboundSummary {
  content: ContentLink[];
  taxonomy: string[];
}

export interface InterlinkingReport {
  issues: LinkIssue[];
  inbound: Map<string, InboundSummary>;
  stats: {
    pages: number;
    contentLinks: number;
    orphans: number;
    brokenLinks: number;
    taxonomyGaps: number;
    opportunities: number;
    withoutContextualLinks: number;
  };
}

export interface KeywordCheck {
  id: string;
  label: string;
  /** null when the check doesn't apply to this page type */
  pass: boolean | null;
  weight: number;
  detail: string;
  fix: string;
}

export type KeywordStatus = "strong" | "weak" | "failing";

export interface KeywordRow {
  id: string;
  keyword: string;
  pageKey: string;
  pageTitle: string;
  route: string;
  type: PageType | "custom";
  source: "seo" | "content";
  score: number;
  status: KeywordStatus;
  checks: KeywordCheck[];
  competing: PageRef[];
  seoRecord?: SeoRecord;
  page?: SitePage;
  readiness?: SeoReadinessItem;
}

export interface SiteAnalysis {
  pages: SitePage[];
  pageByKey: Map<string, SitePage>;
  interlinking: InterlinkingReport;
  keywords: KeywordRow[];
}

// ---------------------------------------------------------------- helpers

export const STOREFRONT_HOST = "aquakart.co.in";
export const STOREFRONT_URL = `https://${STOREFRONT_HOST}`;

const STATIC_PAGES: [string, string, string][] = [
  ["home", "Home", "/"],
  ["shop", "Shop", "/shop"],
  ["categories", "Categories", "/categories"],
  ["blogs", "Blogs", "/blogs"],
  ["about", "About", "/about"],
  ["contact-us", "Contact", "/contact-us"],
  ["compare", "Compare", "/compare"],
  ["privacy-policy", "Privacy policy", "/privacy-policy"],
  ["shipping-policy", "Shipping policy", "/shipping-policy"],
  ["terms-and-conditions", "Terms and conditions", "/terms-and-conditions"],
  ["softener-planner", "Softener planner", "/softener-planner"],
  ["softeners-hyderabad", "Softeners Hyderabad", "/softeners-hyderabad"],
];

const CATALOG_ROUTE_PREFIXES = [
  "/product/",
  "/category/",
  "/subcategory/",
  "/blog/",
];

const normalizeKeyPart = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const routeSegment = (value: unknown) =>
  encodeURIComponent(String(value || "").trim());

export const stripHtml = (value: unknown) =>
  String(value || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const countWords = (text: string) =>
  text ? text.split(/\s+/).filter(Boolean).length : 0;

export const idOf = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as RawEntity;
    return record._id
      ? String(record._id)
      : record.id
        ? String(record.id)
        : null;
  }
  return String(value);
};

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Maps an href or route to a comparable key, or null for external/non-page links. */
export const normalizeRoute = (href: string): string | null => {
  const value = href.trim();
  if (
    !value ||
    value.startsWith("#") ||
    /^(mailto|tel|javascript):/i.test(value)
  )
    return null;
  let path: string;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, "");
      if (host !== STOREFRONT_HOST) return null;
      path = url.pathname;
    } catch {
      return null;
    }
  } else if (value.startsWith("/")) {
    path = value.split(/[?#]/)[0];
  } else {
    return null;
  }
  const decoded = safeDecode(path).toLowerCase().replace(/\s+/g, " ");
  return decoded.length > 1 ? decoded.replace(/\/+$/, "") : "/";
};

const extractLinks = (html: string) => {
  const links: { href: string; anchor: string }[] = [];
  const pattern =
    /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    links.push({ href: match[1], anchor: stripHtml(match[2]) });
  }
  return links;
};

const splitKeywords = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      list
        .flatMap((item) => String(item || "").split(/[\n\r,]+/))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

/** Lowercase, punctuation-free text for phrase matching. */
export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Folds simple English plurals so "softeners" matches "softener". */
const stemToken = (token: string) =>
  token.length > 4 && /[^s]s$/.test(token) ? token.slice(0, -1) : token;

const stemText = (value: string) =>
  normalizeText(value).split(" ").map(stemToken).join(" ");

export const containsPhrase = (haystack: string, phrase: string) => {
  const needle = stemText(phrase);
  return Boolean(needle) && ` ${stemText(haystack)} `.includes(` ${needle} `);
};

/** Counts phrase occurrences in text already passed through stemText. */
const countPhrase = (stemmedHaystack: string, phrase: string) => {
  const needle = stemText(phrase);
  if (!needle) return 0;
  const padded = ` ${stemmedHaystack} `;
  let count = 0;
  let index = padded.indexOf(` ${needle} `);
  while (index >= 0) {
    count += 1;
    index = padded.indexOf(` ${needle} `, index + needle.length + 1);
  }
  return count;
};

const significantTokens = (phrase: string) =>
  stemText(phrase)
    .split(" ")
    .filter((token) => token.length > 2);

const refOf = (page: SitePage): PageRef => ({
  pageKey: page.pageKey,
  title: page.title,
  route: page.route,
  type: page.type,
});

// ---------------------------------------------------------------- pages

const firstImage = (photos: unknown): string => {
  if (!Array.isArray(photos)) return "";
  for (const photo of photos) {
    const url =
      typeof photo === "string" ? photo : photo?.secure_url || photo?.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return "";
};

const makePage = (
  type: PageType,
  entity: RawEntity,
  pageKey: string,
  route: string,
  extra: Partial<SitePage> = {},
): SitePage => {
  const html = String(entity.description || "");
  const text = stripHtml(html);
  return {
    pageKey,
    type,
    id: idOf(entity) || pageKey,
    title: String(entity.title || pageKey),
    route,
    routeKey: normalizeRoute(route) || route,
    keywords: splitKeywords([entity.keywords, entity.keyphrases]),
    text,
    wordCount: countWords(text),
    categoryId: idOf(entity.category),
    subCategoryId: idOf(entity.subCategory),
    productId: null,
    blogId: null,
    outbound: extractLinks(html)
      .map((link) => ({ ...link, routeKey: normalizeRoute(link.href) }))
      .filter(
        (link): link is { href: string; anchor: string; routeKey: string } =>
          Boolean(link.routeKey),
      ),
    aliases: [],
    image: firstImage(entity.photos) || firstImage(entity.titleImages),
    price:
      Number(entity.discountPrice || entity.price) > 0
        ? Number(entity.discountPrice || entity.price)
        : null,
    brand: String(entity.brand || "").trim(),
    sku: String(entity.sku || entity.code || "").trim(),
    ...extra,
  };
};

export const buildPages = (catalog: Catalog): SitePage[] => {
  const pages: SitePage[] = STATIC_PAGES.map(([pageKey, title, route]) =>
    makePage("static", { title }, pageKey, route),
  );

  catalog.products.forEach((product) => {
    const keySource = product.slug || product.title;
    const routeSource = product.slug || product._id;
    if (!keySource || !routeSource) return;
    pages.push(
      makePage(
        "product",
        product,
        `product.${normalizeKeyPart(keySource)}`,
        `/product/${routeSegment(routeSource)}`,
        {
          blogId: idOf(product.blog),
          aliases: [product.title, product.ShortName].filter(
            (alias) => String(alias || "").trim().length >= 4,
          ),
        },
      ),
    );
  });

  catalog.categories.forEach((category) => {
    if (!category.title) return;
    pages.push(
      makePage(
        "category",
        category,
        `category.${normalizeKeyPart(category.title)}`,
        `/category/${routeSegment(category.title)}`,
        {
          categoryId: null,
          aliases:
            String(category.title).trim().length >= 4 ? [category.title] : [],
        },
      ),
    );
  });

  catalog.subcategories.forEach((subcategory) => {
    if (!subcategory.title) return;
    pages.push(
      makePage(
        "subcategory",
        subcategory,
        `subcategory.${normalizeKeyPart(subcategory.title)}`,
        `/subcategory/${routeSegment(subcategory.title)}`,
        {
          subCategoryId: null,
          aliases:
            String(subcategory.title).trim().length >= 4
              ? [subcategory.title]
              : [],
        },
      ),
    );
  });

  catalog.blogs.forEach((blog) => {
    const slug = blog.slug || blog._id;
    if (!slug) return;
    pages.push(
      makePage(
        "blog",
        blog,
        `blog.${normalizeKeyPart(slug)}`,
        `/blog/${routeSegment(slug)}`,
        {
          productId: idOf(blog.product),
        },
      ),
    );
  });

  return pages;
};

// ---------------------------------------------------------------- interlinking

const MAX_OPPORTUNITIES_PER_PAGE = 5;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const analyzeInterlinking = (pages: SitePage[]): InterlinkingReport => {
  const issues: LinkIssue[] = [];
  const byRoute = new Map(pages.map((page) => [page.routeKey, page]));
  const byTypeId = new Map(
    pages.map((page) => [`${page.type}:${page.id}`, page]),
  );
  const inbound = new Map<string, InboundSummary>(
    pages.map((page) => [page.pageKey, { content: [], taxonomy: [] }]),
  );
  const add = (issue: Omit<LinkIssue, "id">) =>
    issues.push({
      ...issue,
      id: `${issue.kind}:${issue.page.pageKey}:${issue.target?.pageKey || issue.anchor || ""}`,
    });

  const linkTaxonomy = (from: SitePage, to: SitePage | undefined) => {
    if (!to || to.pageKey === from.pageKey) return;
    // Listings and breadcrumbs make taxonomy relations reachable both ways.
    inbound.get(to.pageKey)?.taxonomy.push(from.pageKey);
    inbound.get(from.pageKey)?.taxonomy.push(to.pageKey);
  };

  let contentLinks = 0;
  pages.forEach((page) => {
    page.outbound.forEach((link) => {
      const target = byRoute.get(link.routeKey);
      if (target) {
        contentLinks += 1;
        if (target.pageKey !== page.pageKey)
          inbound
            .get(target.pageKey)
            ?.content.push({ from: page.pageKey, anchor: link.anchor });
      } else if (
        CATALOG_ROUTE_PREFIXES.some((prefix) =>
          link.routeKey.startsWith(prefix),
        )
      ) {
        add({
          kind: "broken-link",
          severity: "high",
          page: refOf(page),
          anchor: link.anchor,
          message: `Links to ${link.href}, which doesn't match any page`,
          suggestion: `Fix or remove the link "${link.anchor || link.href}". The target may have been renamed or deleted.`,
        });
      }
    });
  });

  // Taxonomy relations and their gaps.
  const productCountByCategory = new Map<string, number>();
  const productCountBySubcategory = new Map<string, number>();
  const blogTargets = new Set<string>();

  pages.forEach((page) => {
    if (page.type === "product") {
      const category = page.categoryId
        ? byTypeId.get(`category:${page.categoryId}`)
        : undefined;
      const subcategory = page.subCategoryId
        ? byTypeId.get(`subcategory:${page.subCategoryId}`)
        : undefined;
      if (!page.categoryId) {
        add({
          kind: "missing-category",
          severity: "high",
          page: refOf(page),
          message:
            "Product has no category, so it is missing from category listings",
          suggestion:
            "Assign a category in Products so the product is linked from its category page.",
        });
      } else if (!category) {
        add({
          kind: "unknown-reference",
          severity: "high",
          page: refOf(page),
          message: "Product points to a category that no longer exists",
          suggestion: "Re-assign the product to an existing category.",
        });
      } else {
        productCountByCategory.set(
          category.pageKey,
          (productCountByCategory.get(category.pageKey) || 0) + 1,
        );
        linkTaxonomy(page, category);
      }
      if (!page.subCategoryId) {
        add({
          kind: "missing-subcategory",
          severity: "medium",
          page: refOf(page),
          message: "Product has no subcategory",
          suggestion:
            "Assign a subcategory so shoppers and crawlers can reach it from the subcategory page.",
        });
      } else if (!subcategory) {
        add({
          kind: "unknown-reference",
          severity: "high",
          page: refOf(page),
          message: "Product points to a subcategory that no longer exists",
          suggestion: "Re-assign the product to an existing subcategory.",
        });
      } else {
        productCountBySubcategory.set(
          subcategory.pageKey,
          (productCountBySubcategory.get(subcategory.pageKey) || 0) + 1,
        );
        linkTaxonomy(page, subcategory);
        if (
          category &&
          subcategory.categoryId &&
          subcategory.categoryId !== page.categoryId
        ) {
          add({
            kind: "taxonomy-mismatch",
            severity: "high",
            page: refOf(page),
            target: refOf(subcategory),
            message: `Subcategory "${subcategory.title}" belongs to a different category than "${category.title}"`,
            suggestion:
              "Pick a subcategory under the product's category, or change the category.",
          });
        }
      }
      if (page.blogId) {
        const blog = byTypeId.get(`blog:${page.blogId}`);
        if (blog) {
          linkTaxonomy(page, blog);
          blogTargets.add(page.pageKey);
        }
      }
    }

    if (page.type === "subcategory" && page.categoryId) {
      linkTaxonomy(page, byTypeId.get(`category:${page.categoryId}`));
    }

    if (page.type === "blog") {
      const related = [
        page.productId ? byTypeId.get(`product:${page.productId}`) : undefined,
        page.categoryId
          ? byTypeId.get(`category:${page.categoryId}`)
          : undefined,
        page.subCategoryId
          ? byTypeId.get(`subcategory:${page.subCategoryId}`)
          : undefined,
      ].filter((item): item is SitePage => Boolean(item));
      related.forEach((target) => {
        linkTaxonomy(page, target);
        if (target.type === "product") blogTargets.add(target.pageKey);
      });
      const linkedTargets = page.outbound
        .map((link) => byRoute.get(link.routeKey))
        .filter((target): target is SitePage => Boolean(target));
      linkedTargets.forEach((target) => {
        if (target.type === "product") blogTargets.add(target.pageKey);
      });
      const linksToCatalog = linkedTargets.some(
        (target) => target.type !== "blog" && target.type !== "static",
      );
      if (!related.length && !linksToCatalog) {
        add({
          kind: "blog-unlinked",
          severity: "high",
          page: refOf(page),
          message:
            "Blog isn't connected to any product, category or subcategory",
          suggestion:
            "Set the blog's related product/category and link to the products it discusses in the body.",
        });
      }
    }
  });

  pages.forEach((page) => {
    if (page.type === "category" && !productCountByCategory.get(page.pageKey)) {
      add({
        kind: "empty-category",
        severity: "medium",
        page: refOf(page),
        message: "Category has no products",
        suggestion:
          "Assign products to it, or noindex/remove the page to avoid a thin listing.",
      });
    }
    if (
      page.type === "subcategory" &&
      !productCountBySubcategory.get(page.pageKey)
    ) {
      add({
        kind: "empty-subcategory",
        severity: "medium",
        page: refOf(page),
        message: "Subcategory has no products",
        suggestion:
          "Assign products to it, or noindex/remove the page to avoid a thin listing.",
      });
    }
    if (page.type === "product" && !blogTargets.has(page.pageKey)) {
      add({
        kind: "no-supporting-content",
        severity: "low",
        page: refOf(page),
        message: "No blog supports or links to this product",
        suggestion:
          "Write or update a guide/blog that links to this product with a descriptive anchor.",
      });
    }
  });

  // Mentions without links: the cheapest internal links to add.
  const targets = pages
    .filter((page) => page.aliases.length)
    .map((page) => ({
      page,
      patterns: page.aliases.map((alias) => ({
        alias: String(alias).trim(),
        regex: new RegExp(
          `(^|[^a-z0-9])${escapeRegex(String(alias).trim().toLowerCase())}([^a-z0-9]|$)`,
          "i",
        ),
      })),
    }));

  let opportunities = 0;
  pages.forEach((source) => {
    if (!source.text) return;
    const linked = new Set(source.outbound.map((link) => link.routeKey));
    const found: LinkIssue[] = [];
    for (const { page: target, patterns } of targets) {
      if (target.pageKey === source.pageKey || linked.has(target.routeKey))
        continue;
      const hit = patterns.find((pattern) => pattern.regex.test(source.text));
      if (!hit) continue;
      const targetInbound = inbound.get(target.pageKey)?.content.length || 0;
      found.push({
        id: `link-opportunity:${source.pageKey}:${target.pageKey}`,
        kind: "link-opportunity",
        severity: targetInbound === 0 ? "medium" : "low",
        page: refOf(source),
        target: refOf(target),
        anchor: hit.alias,
        message: `Mentions "${hit.alias}" but doesn't link to it`,
        suggestion: `Link the mention to ${target.route}${targetInbound === 0 ? " (it has no contextual links yet)" : ""}.`,
      });
    }
    found
      .sort((a, b) =>
        a.severity === b.severity ? 0 : a.severity === "medium" ? -1 : 1,
      )
      .slice(0, MAX_OPPORTUNITIES_PER_PAGE)
      .forEach((item) => {
        issues.push(item);
        opportunities += 1;
      });
  });

  let orphans = 0;
  let withoutContextualLinks = 0;
  pages.forEach((page) => {
    if (page.type === "static") return;
    const summary = inbound.get(page.pageKey);
    if (!summary?.content.length) withoutContextualLinks += 1;
    if (!summary?.content.length && !summary?.taxonomy.length) {
      orphans += 1;
      add({
        kind: "orphan",
        severity: "high",
        page: refOf(page),
        message: "Orphan page: nothing links to it",
        suggestion:
          "Link to it from a related category, product or blog so it can be discovered and ranked.",
      });
    }
  });

  const severityRank = { high: 0, medium: 1, low: 2 };
  issues.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.page.title.localeCompare(b.page.title),
  );

  return {
    issues,
    inbound,
    stats: {
      pages: pages.length,
      contentLinks,
      orphans,
      brokenLinks: issues.filter((item) => item.kind === "broken-link").length,
      taxonomyGaps: issues.filter((item) =>
        [
          "missing-category",
          "missing-subcategory",
          "taxonomy-mismatch",
          "unknown-reference",
        ].includes(item.kind),
      ).length,
      opportunities,
      withoutContextualLinks,
    },
  };
};

// ---------------------------------------------------------------- keywords

const MAX_CONTENT_KEYWORDS_PER_PAGE = 8;

export const keywordStatus = (score: number): KeywordStatus =>
  score >= 75 ? "strong" : score >= 50 ? "weak" : "failing";

interface KeywordTarget {
  keyword: string;
  pageKey: string;
  source: "seo" | "content";
  page?: SitePage;
  seoRecord?: SeoRecord;
}

const scoreKeyword = (
  target: KeywordTarget,
  competing: PageRef[],
  inbound: InboundSummary | undefined,
): { score: number; checks: KeywordCheck[] } => {
  const { keyword, page, seoRecord } = target;
  const isStatic = !page || page.type === "static";
  const seoTitle = seoRecord?.title || "";
  const seoDescription = seoRecord?.description || "";
  const route = seoRecord?.route || page?.route || "";
  const heading = page?.title || seoTitle;
  const occurrences = countPhrase(stemText(page?.text || ""), keyword);
  const words = page?.wordCount || 0;
  const density = words
    ? (occurrences * significantTokens(keyword).length * 100) / words
    : 0;
  const minWords = page?.type === "blog" ? 250 : 80;
  const tokens = significantTokens(keyword);
  const routeTokens = new Set(stemText(safeDecode(route)).split(" "));
  const hasSlug = route.replace(/\//g, "") !== "";
  const anchorHits = (inbound?.content || []).filter((link) =>
    containsPhrase(link.anchor, keyword),
  ).length;
  const noindex = /noindex/i.test(seoRecord?.robots || "");
  const inactive = seoRecord?.active === false;

  const checks: KeywordCheck[] = [
    {
      id: "indexable",
      label: "Page can be indexed",
      pass: !noindex && !inactive,
      weight: 0,
      detail: noindex
        ? "Robots is set to noindex"
        : inactive
          ? "SEO record is disabled"
          : "Indexable",
      fix: noindex
        ? 'Change robots to "index,follow".'
        : "Enable the SEO record.",
    },
    {
      id: "title",
      label: "Keyword in SEO title",
      pass: Boolean(seoTitle) && containsPhrase(seoTitle, keyword),
      weight: 20,
      detail: seoTitle ? `Title: "${seoTitle}"` : "No SEO title",
      fix: `Rewrite the SEO title to include "${keyword}", ideally near the start.`,
    },
    {
      id: "titleLength",
      label: "Title is 30–60 characters",
      pass: seoTitle.length >= 30 && seoTitle.length <= 60,
      weight: 5,
      detail: `${seoTitle.length} characters`,
      fix:
        seoTitle.length > 60
          ? "Shorten the title so it isn't cut off in results."
          : "Lengthen the title with a benefit or location (e.g. Hyderabad).",
    },
    {
      id: "description",
      label: "Keyword in meta description",
      pass: Boolean(seoDescription) && containsPhrase(seoDescription, keyword),
      weight: 15,
      detail: seoDescription
        ? `${seoDescription.length} characters`
        : "No meta description",
      fix: `Write a meta description that uses "${keyword}" and a clear reason to click.`,
    },
    {
      id: "descriptionLength",
      label: "Description is 70–160 characters",
      pass: seoDescription.length >= 70 && seoDescription.length <= 160,
      weight: 5,
      detail: `${seoDescription.length} characters`,
      fix:
        seoDescription.length > 160
          ? "Trim the description to about 155 characters."
          : "Expand the description to 120–155 characters.",
    },
    {
      id: "url",
      label: "Keyword words in URL",
      pass:
        tokens.length && hasSlug
          ? tokens.every((token) => routeTokens.has(token))
          : null,
      weight: 10,
      detail: hasSlug ? route : "Home page has no slug",
      fix: "Use a slug containing the keyword (keep a redirect from the old URL).",
    },
    {
      id: "heading",
      label: "Keyword in page heading (H1)",
      // Static pages' headings live in the storefront code, not the CRM.
      pass: isStatic
        ? null
        : heading
          ? containsPhrase(heading, keyword)
          : false,
      weight: 10,
      detail: isStatic
        ? "Static page heading isn't stored in the CRM"
        : heading
          ? `Heading: "${heading}"`
          : "No heading",
      fix: `Include "${keyword}" in the product/category/blog title shown on the page.`,
    },
    {
      id: "content",
      label: "Keyword used in page content",
      pass: isStatic ? null : occurrences > 0,
      weight: 10,
      detail: isStatic
        ? "Static page content isn't stored in the CRM"
        : `Used ${occurrences} time${occurrences === 1 ? "" : "s"}`,
      fix: `Use "${keyword}" naturally in the first paragraph and a subheading.`,
    },
    {
      id: "depth",
      label: `Content has ${minWords}+ words`,
      pass: isStatic ? null : words >= minWords,
      weight: 10,
      detail: isStatic ? "Not applicable" : `${words} words`,
      fix: "Add buyer-focused detail: specs, use cases, installation, FAQs, service info.",
    },
    {
      id: "density",
      label: "Natural keyword density (0.5–3%)",
      pass: isStatic || !words ? null : density >= 0.5 && density <= 3,
      weight: 5,
      detail: isStatic || !words ? "Not applicable" : `${density.toFixed(1)}%`,
      fix:
        density > 3
          ? "Reduce repetition; use synonyms to avoid keyword stuffing."
          : "Mention the keyword or close variants a little more.",
    },
    {
      id: "links",
      label: "Internal links point here",
      pass: isStatic ? null : (inbound?.content.length || 0) > 0,
      weight: 10,
      detail: isStatic
        ? "Linked from site navigation"
        : `${inbound?.content.length || 0} contextual link${inbound?.content.length === 1 ? "" : "s"}, ${anchorHits} using the keyword as anchor`,
      fix: `Link to this page from related blogs/products using "${keyword}" as the anchor text.`,
    },
    {
      id: "unique",
      label: "Only one page targets it",
      pass: competing.length === 0,
      weight: 10,
      detail: competing.length
        ? `Also targeted by ${competing.map((item) => item.title).join(", ")}`
        : "No competing pages",
      fix: "Keep the keyword on the best page and give the others distinct variants (keyword cannibalization).",
    },
  ];

  const applicable = checks.filter(
    (check) => check.pass !== null && check.weight > 0,
  );
  const total = applicable.reduce((sum, check) => sum + check.weight, 0);
  const earned = applicable.reduce(
    (sum, check) => sum + (check.pass ? check.weight : 0),
    0,
  );
  const score = checks[0].pass
    ? Math.round((earned / Math.max(total, 1)) * 100)
    : 0;
  return { score, checks };
};

export const analyzeKeywords = (
  pages: SitePage[],
  seoRecords: SeoRecord[],
  readiness: SeoReadinessItem[],
  interlinking: InterlinkingReport,
): KeywordRow[] => {
  const pageByKey = new Map(pages.map((page) => [page.pageKey, page]));
  const pageByRoute = new Map(pages.map((page) => [page.routeKey, page]));
  const readinessByKey = new Map(readiness.map((item) => [item.pageKey, item]));
  const recordByKey = new Map(
    seoRecords.map((record) => [record.pageKey, record]),
  );

  const targets: KeywordTarget[] = [];
  seoRecords.forEach((record) => {
    const page =
      pageByKey.get(record.pageKey) ||
      pageByRoute.get(normalizeRoute(record.route) || "");
    splitKeywords(record.keywords).forEach((keyword) =>
      targets.push({
        keyword,
        pageKey: page?.pageKey || record.pageKey,
        source: "seo",
        page,
        seoRecord: record,
      }),
    );
  });
  // Pages without SEO keywords still carry catalog keywords worth checking.
  pages.forEach((page) => {
    const record = recordByKey.get(page.pageKey);
    if (record && splitKeywords(record.keywords).length) return;
    page.keywords.slice(0, MAX_CONTENT_KEYWORDS_PER_PAGE).forEach((keyword) =>
      targets.push({
        keyword,
        pageKey: page.pageKey,
        source: "content",
        page,
        seoRecord: record,
      }),
    );
  });

  const pagesByKeyword = new Map<string, Map<string, PageRef>>();
  targets.forEach((target) => {
    const norm = normalizeText(target.keyword);
    if (!norm) return;
    const refs = pagesByKeyword.get(norm) || new Map<string, PageRef>();
    refs.set(target.pageKey, {
      pageKey: target.pageKey,
      title: target.page?.title || target.seoRecord?.title || target.pageKey,
      route: target.page?.route || target.seoRecord?.route || "",
      type: target.page?.type || "static",
    });
    pagesByKeyword.set(norm, refs);
  });

  const seen = new Set<string>();
  const rows: KeywordRow[] = [];
  targets.forEach((target) => {
    const norm = normalizeText(target.keyword);
    const id = `${target.pageKey}::${norm}`;
    if (!norm || seen.has(id)) return;
    seen.add(id);
    const competing = [...(pagesByKeyword.get(norm)?.values() || [])].filter(
      (ref) => ref.pageKey !== target.pageKey,
    );
    const { score, checks } = scoreKeyword(
      target,
      competing,
      interlinking.inbound.get(target.pageKey),
    );
    rows.push({
      id,
      keyword: target.keyword,
      pageKey: target.pageKey,
      pageTitle:
        target.page?.title || target.seoRecord?.title || target.pageKey,
      route: target.page?.route || target.seoRecord?.route || "",
      type: target.page?.type || "custom",
      source: target.source,
      score,
      status: keywordStatus(score),
      checks,
      competing,
      seoRecord: target.seoRecord,
      page: target.page,
      readiness: readinessByKey.get(target.pageKey),
    });
  });

  return rows.sort(
    (a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword),
  );
};

export const analyzeSite = (
  catalog: Catalog,
  seoRecords: SeoRecord[],
  readiness: SeoReadinessItem[],
): SiteAnalysis => {
  const pages = buildPages(catalog);
  const interlinking = analyzeInterlinking(pages);
  return {
    pages,
    pageByKey: new Map(pages.map((page) => [page.pageKey, page])),
    interlinking,
    keywords: analyzeKeywords(pages, seoRecords, readiness, interlinking),
  };
};

// ---------------------------------------------------------------- AI context

/** Compact summary of the analysis that grounds the AI chat in real site data. */
export const buildAssistantContext = (
  analysis: SiteAnalysis,
  summary:
    { overallScore?: number; ready?: number; totalPages?: number } | undefined,
  maxChars = 12000,
) => {
  const counts = analysis.pages.reduce<Record<string, number>>((acc, page) => {
    acc[page.type] = (acc[page.type] || 0) + 1;
    return acc;
  }, {});
  const failing = analysis.keywords.filter((row) => row.status === "failing");
  const lines = [
    `Site: ${STOREFRONT_HOST} (AquaKart, water purifiers and softeners, Hyderabad).`,
    `Pages: ${Object.entries(counts)
      .map(([type, count]) => `${count} ${type}`)
      .join(", ")}.`,
    summary
      ? `SEO readiness: overall ${summary.overallScore ?? "?"}/100, ${summary.ready ?? "?"} of ${summary.totalPages ?? "?"} pages ready.`
      : "",
    `Keywords tracked: ${analysis.keywords.length} (${failing.length} failing, ${analysis.keywords.filter((row) => row.status === "weak").length} weak).`,
    `Interlinking: ${analysis.interlinking.stats.orphans} orphan pages, ${analysis.interlinking.stats.brokenLinks} broken links, ${analysis.interlinking.stats.taxonomyGaps} taxonomy gaps, ${analysis.interlinking.stats.opportunities} unlinked mentions.`,
    "",
    "Failing keywords (keyword | page | score | failed checks):",
    ...failing.slice(0, 25).map(
      (row) =>
        `- ${row.keyword} | ${row.route} | ${row.score} | ${row.checks
          .filter((check) => check.pass === false)
          .map((check) => check.label)
          .join("; ")}`,
    ),
    "",
    "Interlinking issues (severity | page | issue):",
    ...analysis.interlinking.issues
      .slice(0, 30)
      .map(
        (issue) =>
          `- ${issue.severity} | ${issue.page.route} | ${issue.message}`,
      ),
    "",
    "Pages (type | title | route | words | keywords):",
    ...analysis.pages
      .filter((page) => page.type !== "static")
      .map(
        (page) =>
          `- ${page.type} | ${page.title} | ${page.route} | ${page.wordCount} | ${page.keywords.slice(0, 4).join(", ")}`,
      ),
  ];
  const text = lines
    .filter((line, index) => line || lines[index - 1])
    .join("\n");
  return text.length > maxChars
    ? `${text.slice(0, maxChars)}\n…(truncated)`
    : text;
};
