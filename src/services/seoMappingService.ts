import { adminApi, ecomApi } from "./api";

export type SeoEntityType =
  | "static"
  | "product"
  | "category"
  | "subcategory"
  | "blog";

export type SeoCatalogItem = {
  id: string;
  label: string;
  pageKey: string;
  route: string;
};

export type SeoRecord = {
  _id?: string;
  pageKey: string;
  route: string;
  title: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaJson?: Record<string, unknown> | null;
  active?: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const normalizeKeyPart = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const routeSegment = (value: unknown) => encodeURIComponent(String(value || "").trim());

export const STATIC_SEO_PAGES: SeoCatalogItem[] = [
  { id: "home", label: "Home", pageKey: "home", route: "/" },
  { id: "shop", label: "Shop", pageKey: "shop", route: "/shop" },
  {
    id: "categories",
    label: "Categories",
    pageKey: "categories",
    route: "/categories",
  },
  { id: "blogs", label: "Blogs", pageKey: "blogs", route: "/blogs" },
  { id: "about", label: "About", pageKey: "about", route: "/about" },
  {
    id: "contact-us",
    label: "Contact",
    pageKey: "contact-us",
    route: "/contact-us",
  },
  { id: "compare", label: "Compare", pageKey: "compare", route: "/compare" },
  {
    id: "privacy-policy",
    label: "Privacy policy",
    pageKey: "privacy-policy",
    route: "/privacy-policy",
  },
  {
    id: "shipping-policy",
    label: "Shipping policy",
    pageKey: "shipping-policy",
    route: "/shipping-policy",
  },
  {
    id: "terms-and-conditions",
    label: "Terms and conditions",
    pageKey: "terms-and-conditions",
    route: "/terms-and-conditions",
  },
  {
    id: "softener-planner",
    label: "Softener planner",
    pageKey: "softener-planner",
    route: "/softener-planner",
  },
  {
    id: "softeners-hyderabad",
    label: "Softeners Hyderabad",
    pageKey: "softeners-hyderabad",
    route: "/softeners-hyderabad",
  },
];

const unwrapList = (response: any): any[] => {
  const value = response?.data;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const mapProduct = (product: any): SeoCatalogItem | null => {
  const keySource = product?.slug || product?.title;
  const routeSource = product?.slug || product?._id;
  if (!keySource || !routeSource) return null;
  return {
    id: String(product?._id || routeSource),
    label: String(product?.title || product?.slug || routeSource),
    pageKey: `product.${normalizeKeyPart(keySource)}`,
    route: `/product/${routeSegment(routeSource)}`,
  };
};

const mapCategory = (category: any): SeoCatalogItem | null => {
  const title = category?.title;
  if (!title) return null;
  return {
    id: String(category?._id || title),
    label: String(title),
    pageKey: `category.${normalizeKeyPart(title)}`,
    route: `/category/${routeSegment(title)}`,
  };
};

const mapSubcategory = (subcategory: any): SeoCatalogItem | null => {
  const title = subcategory?.title;
  if (!title) return null;
  return {
    id: String(subcategory?._id || title),
    label: String(title),
    pageKey: `subcategory.${normalizeKeyPart(title)}`,
    route: `/subcategory/${routeSegment(title)}`,
  };
};

const mapBlog = (blog: any): SeoCatalogItem | null => {
  const slug = blog?.slug || blog?._id;
  if (!slug) return null;
  return {
    id: String(blog?._id || slug),
    label: String(blog?.title || blog?.slug || slug),
    pageKey: `blog.${normalizeKeyPart(slug)}`,
    route: `/blog/${routeSegment(slug)}`,
  };
};

export const seoMappingService = {
  listSeo: (page = 1, search = "") => {
    const params = new URLSearchParams({ page: String(page), limit: "500" });
    if (search.trim()) params.set("search", search.trim());
    return adminApi.get<ApiEnvelope<SeoRecord[]>>(`/seo?${params.toString()}`);
  },

  createSeo: (body: SeoRecord) =>
    adminApi.post<ApiEnvelope<SeoRecord>>("/seo", body),

  updateSeo: (id: string, body: Partial<SeoRecord>) =>
    adminApi.patch<ApiEnvelope<SeoRecord>>(`/seo/${id}`, body),

  async loadCatalog(type: SeoEntityType): Promise<SeoCatalogItem[]> {
    if (type === "static") return STATIC_SEO_PAGES;

    const endpoint =
      type === "product"
        ? "all-products?query=crm"
        : type === "category"
          ? "allcategories"
          : type === "subcategory"
            ? "all-subcategories"
            : "all-blogs";

    const response = await ecomApi.get<any>(endpoint);
    if (response.error) throw new Error(response.error);

    const mapper =
      type === "product"
        ? mapProduct
        : type === "category"
          ? mapCategory
          : type === "subcategory"
            ? mapSubcategory
            : mapBlog;

    return unwrapList(response)
      .map(mapper)
      .filter((item): item is SeoCatalogItem => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label));
  },

  async loadFullCatalog(): Promise<Array<SeoCatalogItem & { type: SeoEntityType }>> {
    const types: SeoEntityType[] = [
      "static",
      "product",
      "category",
      "subcategory",
      "blog",
    ];
    const groups = await Promise.all(
      types.map(async (type) => {
        const items = await this.loadCatalog(type);
        return items.map((item) => ({ ...item, type }));
      }),
    );
    return groups.flat();
  },

  async loadMerchantProducts(): Promise<any[]> {
    const response = await ecomApi.get<any>("all-products?query=crm");
    if (response.error) throw new Error(response.error);
    return unwrapList(response);
  },
};
