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
  recommendation?: Partial<SeoRecord>;
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

const STOREFRONT_URL = "https://aquakart.co.in";
const STOREFRONT_SEO_MANIFEST = `${STOREFRONT_URL}/seo-manifest.json`;
const DEFAULT_IMAGE =
  "https://res.cloudinary.com/aquakartproducts/image/upload/v1695408027/android-chrome-384x384_ijvo24.png";

const stripHtml = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const asKeywords = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      values
        .flatMap((item) => String(item || "").split(/[\n\r,]+/))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 50);
};

const imageFrom = (value: any) => {
  const candidates = Array.isArray(value) ? value : value ? [value] : [];
  for (const item of candidates) {
    if (typeof item === "string" && item.trim()) return item;
    if (item?.secure_url) return item.secure_url;
    if (item?.url) return item.url;
  }
  return DEFAULT_IMAGE;
};

const commonRecommendation = ({
  pageKey,
  route,
  title,
  description,
  keywords,
  image,
  schemaJson,
}: {
  pageKey: string;
  route: string;
  title: string;
  description: string;
  keywords?: unknown;
  image?: string;
  schemaJson?: Record<string, unknown> | null;
}): SeoRecord => {
  const canonicalUrl =
    route === "/" ? STOREFRONT_URL : `${STOREFRONT_URL}${route}`;
  const safeTitle = String(title || "Aquakart").slice(0, 120);
  const safeDescription = stripHtml(description).slice(0, 160);
  const socialImage = image || DEFAULT_IMAGE;

  return {
    pageKey,
    route,
    title: safeTitle,
    description: safeDescription,
    keywords: asKeywords(keywords),
    canonicalUrl,
    robots:
      "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    ogTitle: safeTitle,
    ogDescription: safeDescription,
    ogImage: socialImage,
    twitterTitle: safeTitle,
    twitterDescription: safeDescription,
    twitterImage: socialImage,
    schemaJson: schemaJson || null,
    active: true,
  };
};

const loadStaticSeoRecommendations = async (): Promise<SeoCatalogItem[]> => {
  const response = await fetch(STOREFRONT_SEO_MANIFEST, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Unable to load storefront SEO recommendations");
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.data)) {
    throw new Error("Storefront SEO recommendation manifest is invalid");
  }

  return payload.data.map((item: any) => ({
    id: String(item.id || item.pageKey),
    label: String(item.label || item.pageKey),
    pageKey: String(item.pageKey || ""),
    route: String(item.route || "/"),
    recommendation: item.recommendation || undefined,
  }));
};

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

  const pageKey = `product.${normalizeKeyPart(keySource)}`;
  const route = `/product/${routeSegment(routeSource)}`;
  const title =
    product?.metaTitle ||
    (product?.title ? `${product.title} | Aquakart` : "Aquakart Product");
  const description =
    product?.metaDescription ||
    stripHtml(product?.description) ||
    "Explore this Aquakart water-treatment product.";
  const image = imageFrom(product?.photos);
  const price = Number(
    product?.discountPriceStatus ? product?.discountPrice : product?.price,
  );

  const schemaJson: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.title || title,
    url: `${STOREFRONT_URL}${route}`,
    description: stripHtml(description).slice(0, 300),
    image: [image],
    sku: product?.sku || product?.code || product?._id,
    brand: product?.brand
      ? { "@type": "Brand", name: String(product.brand) }
      : undefined,
    offers: Number.isFinite(price) && price > 0
      ? {
          "@type": "Offer",
          priceCurrency: product?.currency || "INR",
          price,
          availability:
            Number(product?.stock || 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: `${STOREFRONT_URL}${route}`,
        }
      : undefined,
  };

  return {
    id: String(product?._id || routeSource),
    label: String(product?.title || product?.slug || routeSource),
    pageKey,
    route,
    recommendation: commonRecommendation({
      pageKey,
      route,
      title,
      description,
      keywords: product?.keywords,
      image,
      schemaJson,
    }),
  };
};

const mapCategory = (category: any): SeoCatalogItem | null => {
  const title = category?.title;
  if (!title) return null;
  const pageKey = `category.${normalizeKeyPart(title)}`;
  const route = `/category/${routeSegment(title)}`;
  const description =
    stripHtml(category?.description) ||
    `Explore ${title} products and water-treatment solutions from Aquakart.`;
  const seoTitle = `${title} | Water Treatment Products | Aquakart`;
  const image = imageFrom(category?.photos);

  return {
    id: String(category?._id || title),
    label: String(title),
    pageKey,
    route,
    recommendation: commonRecommendation({
      pageKey,
      route,
      title: seoTitle,
      description,
      keywords: category?.keywords,
      image,
      schemaJson: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${STOREFRONT_URL}${route}#webpage`,
        url: `${STOREFRONT_URL}${route}`,
        name: seoTitle,
        description: stripHtml(description).slice(0, 300),
        isPartOf: { "@id": `${STOREFRONT_URL}#website` },
      },
    }),
  };
};

const mapSubcategory = (subcategory: any): SeoCatalogItem | null => {
  const title = subcategory?.title;
  if (!title) return null;
  const pageKey = `subcategory.${normalizeKeyPart(title)}`;
  const route = `/subcategory/${routeSegment(title)}`;
  const description =
    stripHtml(subcategory?.description) ||
    `Explore ${title} products and specifications from Aquakart.`;
  const seoTitle = `${title} | Aquakart`;
  const image = imageFrom(subcategory?.photos);

  return {
    id: String(subcategory?._id || title),
    label: String(title),
    pageKey,
    route,
    recommendation: commonRecommendation({
      pageKey,
      route,
      title: seoTitle,
      description,
      keywords: subcategory?.keywords,
      image,
      schemaJson: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${STOREFRONT_URL}${route}#webpage`,
        url: `${STOREFRONT_URL}${route}`,
        name: seoTitle,
        description: stripHtml(description).slice(0, 300),
        isPartOf: { "@id": `${STOREFRONT_URL}#website` },
      },
    }),
  };
};

const mapBlog = (blog: any): SeoCatalogItem | null => {
  const slug = blog?.slug || blog?._id;
  if (!slug) return null;
  const pageKey = `blog.${normalizeKeyPart(slug)}`;
  const route = `/blog/${routeSegment(slug)}`;
  const seoTitle = `${blog?.title || "Aquakart Blog"} | Aquakart`;
  const description =
    stripHtml(blog?.shortDescription || blog?.description) ||
    "Practical water-treatment guidance from Aquakart.";
  const image = imageFrom(blog?.titleImages || blog?.photos);

  return {
    id: String(blog?._id || slug),
    label: String(blog?.title || blog?.slug || slug),
    pageKey,
    route,
    recommendation: commonRecommendation({
      pageKey,
      route,
      title: seoTitle,
      description,
      keywords: blog?.keywords,
      image,
      schemaJson: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "@id": `${STOREFRONT_URL}${route}#blogposting`,
        headline: blog?.title || "Aquakart Blog",
        description: stripHtml(description).slice(0, 300),
        image: [image],
        datePublished: blog?.createdAt,
        dateModified: blog?.updatedAt || blog?.createdAt,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${STOREFRONT_URL}${route}`,
        },
        author: {
          "@type": "Organization",
          name: blog?.author || "Aquakart",
          url: `${STOREFRONT_URL}/about`,
        },
        publisher: { "@id": `${STOREFRONT_URL}#organization` },
      },
    }),
  };
};

export const seoMappingService = {
  async getRecommendationSourceStatus(): Promise<{
    connected: boolean;
    count: number;
    error?: string;
  }> {
    try {
      const items = await loadStaticSeoRecommendations();
      return {
        connected: true,
        count: items.filter((item) => Boolean(item.recommendation)).length,
      };
    } catch (error) {
      return {
        connected: false,
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load storefront SEO recommendations",
      };
    }
  },

  listSeo: (page = 1, search = "") => {
    const params = new URLSearchParams({ page: String(page), limit: "500" });
    if (search.trim()) params.set("search", search.trim());
    return adminApi.get<ApiEnvelope<SeoRecord[]>>(`/seo?${params.toString()}`);
  },

  async listAllSeo(): Promise<SeoRecord[]> {
    const rows: SeoRecord[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.listSeo(page, "");
      if (response.error) throw new Error(response.error);

      const payload = response.data;
      const pageRows = Array.isArray(payload?.data) ? payload.data : [];
      rows.push(...pageRows);

      totalPages = Math.max(Number(payload?.pagination?.totalPages || 1), 1);
      page += 1;
    } while (page <= totalPages);

    return rows;
  },

  createSeo: (body: SeoRecord) =>
    adminApi.post<ApiEnvelope<SeoRecord>>("/seo", body),

  updateSeo: (id: string, body: Partial<SeoRecord>) =>
    adminApi.patch<ApiEnvelope<SeoRecord>>(`/seo/${id}`, body),

  async loadCatalog(type: SeoEntityType): Promise<SeoCatalogItem[]> {
    if (type === "static") {
      try {
        return await loadStaticSeoRecommendations();
      } catch {
        return STATIC_SEO_PAGES;
      }
    }

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
