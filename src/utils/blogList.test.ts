import { describe, expect, it } from "vitest";
import {
  UNCATEGORIZED,
  blogCategoryOptions,
  blogCounts,
  blogExcerpt,
  blogStatus,
  filterAndSortBlogs,
  blogPublicPath,
  findSlugConflict,
  isValidSlug,
  slugify,
  type BlogFilters,
  type CrmBlog,
} from "./blogList";

const blogs: CrmBlog[] = [
  {
    _id: "1",
    title: "Water softener guide",
    description: "<p>Hard&nbsp;water <strong>damages</strong> pipes.</p>",
    category: { _id: "c1", title: "Softeners" },
    tags: ["guide"],
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    _id: "2",
    title: "RO maintenance",
    status: "draft",
    generatedBy: "ai",
    category: "c2",
    keywords: "ro, filter",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    _id: "3",
    title: "Alkaline water myths",
    status: "published",
    createdAt: "2025-12-01T00:00:00Z",
  },
];

const base: BlogFilters = {
  query: "",
  status: "all",
  excludedCategories: [],
  sort: "newest",
};
const ids = (list: CrmBlog[]) => list.map((blog) => blog._id);

describe("blogList", () => {
  it("treats blogs without a status as published", () => {
    expect(blogStatus(blogs[0])).toBe("published");
    expect(blogStatus(blogs[1])).toBe("draft");
  });

  it("counts drafts and AI drafts", () => {
    expect(blogCounts(blogs)).toEqual({
      total: 3,
      published: 2,
      drafts: 1,
      aiDrafts: 1,
    });
  });

  it("builds an excerpt from HTML when there is no short description", () => {
    expect(blogExcerpt(blogs[0])).toBe("Hard water damages pipes.");
    expect(blogExcerpt({ ...blogs[0], shortDescription: "Short" })).toBe(
      "Short",
    );
    expect(blogExcerpt(blogs[0], 10)).toBe("Hard wate…");
  });

  it("lists categories with uncategorized last", () => {
    expect(blogCategoryOptions(blogs)).toEqual([
      { value: "c1", label: "Softeners" },
      { value: "c2", label: "Unnamed category" },
      { value: UNCATEGORIZED, label: "Uncategorized" },
    ]);
  });

  it("filters by status, excluded categories and every search term", () => {
    expect(
      ids(filterAndSortBlogs(blogs, { ...base, status: "draft" })),
    ).toEqual(["2"]);
    expect(
      ids(
        filterAndSortBlogs(blogs, {
          ...base,
          excludedCategories: ["c1", UNCATEGORIZED],
        }),
      ),
    ).toEqual(["2"]);
    expect(
      ids(filterAndSortBlogs(blogs, { ...base, query: "softeners guide" })),
    ).toEqual(["1"]);
    expect(
      ids(filterAndSortBlogs(blogs, { ...base, query: "filter" })),
    ).toEqual(["2"]);
  });

  it("sorts by date and title", () => {
    expect(ids(filterAndSortBlogs(blogs, base))).toEqual(["2", "1", "3"]);
    expect(ids(filterAndSortBlogs(blogs, { ...base, sort: "oldest" }))).toEqual(
      ["3", "1", "2"],
    );
    expect(
      ids(filterAndSortBlogs(blogs, { ...base, sort: "title-asc" })),
    ).toEqual(["3", "2", "1"]);
    expect(
      ids(filterAndSortBlogs(blogs, { ...base, sort: "title-desc" })),
    ).toEqual(["1", "2", "3"]);
  });
});

describe("blog slugs and links", () => {
  it("slugifies titles", () => {
    expect(slugify("  Water Softener: Buyer's Guide & FAQ (2026) ")).toBe(
      "water-softener-buyer-s-guide-and-faq-2026",
    );
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
    expect(slugify("x".repeat(100)).length).toBe(80);
  });

  it("validates slugs", () => {
    expect(isValidSlug("ro-guide-2026")).toBe(true);
    expect(isValidSlug("RO Guide")).toBe(false);
    expect(isValidSlug("-ro")).toBe(false);
  });

  it("finds slug conflicts except the blog itself", () => {
    const list = [{ _id: "a", title: "A", slug: "ro-guide" }];
    expect(findSlugConflict("RO-guide", list)?._id).toBe("a");
    expect(findSlugConflict("ro-guide", list, "a")).toBeUndefined();
    expect(findSlugConflict("", list)).toBeUndefined();
  });

  it("builds the storefront path from the slug or id", () => {
    expect(blogPublicPath({ _id: "a1", slug: "ro guide" })).toBe(
      "/blog/ro%20guide",
    );
    expect(blogPublicPath({ _id: "a1" })).toBe("/blog/a1");
  });
});
