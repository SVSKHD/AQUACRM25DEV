// Pure helpers for the CRM blog list (Products → Blogs). The API populates
// category/subCategory/product, so references may be ids or `{ _id, title }`.
import { UNCATEGORIZED, referenceId, referenceTitle } from "./catalogRefs";

export type BlogReference =
  | string
  | { _id?: string; id?: string; title?: string; name?: string }
  | null
  | undefined;

export type BlogStatus = "draft" | "published";
export type BlogStatusFilter = "all" | BlogStatus;
export type BlogSort = "newest" | "oldest" | "title-asc" | "title-desc";

export interface CrmBlog {
  _id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  slug?: string;
  titleImages?: { secure_url: string }[];
  photos?: { secure_url: string }[];
  keywords?: string;
  keyphrases?: string;
  tags?: string[];
  notes?: string;
  brand?: string;
  category?: BlogReference;
  subCategory?: BlogReference;
  product?: BlogReference;
  status?: BlogStatus;
  generatedBy?: "staff" | "ai";
  createdAt?: string;
  [key: string]: unknown;
}

export { UNCATEGORIZED, referenceId, referenceTitle };

// Blogs saved before `status` existed are published (see the backend model).
export const blogStatus = (blog: Pick<CrmBlog, "status">): BlogStatus =>
  blog.status === "draft" ? "draft" : "published";

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export const stripHtml = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /&(nbsp|amp|lt|gt|quot|#39);/g,
      (entity) => ENTITIES[entity] ?? entity,
    )
    .replace(/\s+/g, " ")
    .trim();

export const blogExcerpt = (blog: CrmBlog, max = 160) => {
  const text =
    (blog.shortDescription || "").trim() || stripHtml(blog.description || "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

export const blogCoverUrl = (blog: CrmBlog) =>
  blog.titleImages?.[0]?.secure_url || blog.photos?.[0]?.secure_url || "";

export const blogCategoryKey = (blog: CrmBlog) =>
  referenceId(blog.category) || UNCATEGORIZED;

/** Category options found in the loaded blogs, sorted by label. */
export const blogCategoryOptions = (blogs: CrmBlog[]) => {
  const labels = new Map<string, string>();
  for (const blog of blogs) {
    const key = blogCategoryKey(blog);
    if (labels.has(key)) continue;
    labels.set(
      key,
      key === UNCATEGORIZED
        ? "Uncategorized"
        : referenceTitle(blog.category) || "Unnamed category",
    );
  }
  return [...labels.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) =>
      a.value === UNCATEGORIZED
        ? 1
        : b.value === UNCATEGORIZED
          ? -1
          : a.label.localeCompare(b.label),
    );
};

export interface BlogFilters {
  query: string;
  status: BlogStatusFilter;
  /** Category keys to hide; new categories are shown by default. */
  excludedCategories: string[];
  sort: BlogSort;
}

const searchableText = (blog: CrmBlog) =>
  [
    blog.title,
    blog.slug,
    blog.keywords,
    blog.keyphrases,
    blog.brand,
    referenceTitle(blog.category),
    referenceTitle(blog.product),
    ...(Array.isArray(blog.tags) ? blog.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const createdTime = (blog: CrmBlog) => {
  const time = blog.createdAt ? Date.parse(blog.createdAt) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

export const filterAndSortBlogs = (blogs: CrmBlog[], filters: BlogFilters) => {
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const excluded = new Set(filters.excludedCategories);
  const result = blogs.filter((blog) => {
    if (filters.status !== "all" && blogStatus(blog) !== filters.status)
      return false;
    if (excluded.has(blogCategoryKey(blog))) return false;
    if (!terms.length) return true;
    const text = searchableText(blog);
    return terms.every((term) => text.includes(term));
  });
  const byTitle = (a: CrmBlog, b: CrmBlog) =>
    (a.title || "").localeCompare(b.title || "");
  switch (filters.sort) {
    case "oldest":
      return result.sort((a, b) => createdTime(a) - createdTime(b));
    case "title-asc":
      return result.sort(byTitle);
    case "title-desc":
      return result.sort((a, b) => byTitle(b, a));
    default:
      return result.sort((a, b) => createdTime(b) - createdTime(a));
  }
};

export const blogCounts = (blogs: CrmBlog[]) => {
  let drafts = 0;
  let aiDrafts = 0;
  for (const blog of blogs) {
    if (blogStatus(blog) !== "draft") continue;
    drafts += 1;
    if (blog.generatedBy === "ai") aiDrafts += 1;
  }
  return {
    total: blogs.length,
    published: blogs.length - drafts,
    drafts,
    aiDrafts,
  };
};

/** URL-safe slug: lower-case ASCII words joined by hyphens, at most 80 characters. */
export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

export const isValidSlug = (slug: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

/** Another blog already using `slug` (case-insensitive), ignoring `selfId`. */
export const findSlugConflict = (
  slug: string,
  blogs: CrmBlog[],
  selfId?: string,
) => {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return undefined;
  return blogs.find(
    (blog) =>
      blog._id !== selfId && (blog.slug || "").trim().toLowerCase() === wanted,
  );
};

/** Storefront path, matching the SEO mapping: /blog/<slug or id>. */
export const blogPublicPath = (blog: Pick<CrmBlog, "slug" | "_id">) =>
  `/blog/${encodeURIComponent(String(blog.slug || blog._id || "").trim())}`;
