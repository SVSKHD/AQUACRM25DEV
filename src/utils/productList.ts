// Pure helpers for the CRM catalog (Products → Products / Categories / Subcategories).
import { UNCATEGORIZED, matchesAllTerms } from "./catalogRefs";

export interface CatalogPhoto {
  id: string;
  secure_url: string;
}

export interface CatalogProduct {
  id: string;
  _id?: string;
  title: string;
  description: string | null;
  price: number;
  discountPrice: number;
  dpPrice: number;
  discountPriceStatus: boolean;
  discountPricePercentage: number;
  photos: CatalogPhoto[];
  category: string;
  stock: number;
  brand: string;
  ratings: number;
  numberOfReviews: number;
  slug: string;
  keywords: string;
  sku: string | null;
  is_active: boolean;
  category_id: string | null;
  subcategory_id: string | null;
  categories?: { title: string };
  subcategories?: { title: string };
  [key: string]: unknown;
}

export interface CatalogTaxonomy {
  id: string;
  title: string;
  description: string | null;
  keywords: string;
  photos: CatalogPhoto[];
  category_id?: string;
}

export const LOW_STOCK_THRESHOLD = 5;

export type StockState = "in" | "low" | "out";
export type StockFilter = "all" | StockState;
export type ActiveFilter = "all" | "active" | "inactive";
export type ProductSort =
  | "title-asc"
  | "title-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc";
export type TaxonomySort = "title-asc" | "title-desc" | "products-desc";

export const stockState = (stock: number): StockState =>
  !(Number(stock) > 0)
    ? "out"
    : Number(stock) <= LOW_STOCK_THRESHOLD
      ? "low"
      : "in";

/** The price a customer pays: the discount price when the discount is switched on. */
export const effectivePrice = (
  product: Pick<
    CatalogProduct,
    "price" | "discountPrice" | "discountPriceStatus"
  >,
) =>
  product.discountPriceStatus && Number(product.discountPrice) > 0
    ? Number(product.discountPrice)
    : Number(product.price) || 0;

export const discountPercent = (
  product: Pick<
    CatalogProduct,
    "price" | "discountPrice" | "discountPriceStatus"
  >,
) => {
  const price = Number(product.price);
  const discount = Number(product.discountPrice);
  if (
    !product.discountPriceStatus ||
    !(price > 0) ||
    !(discount > 0) ||
    discount >= price
  )
    return 0;
  return Math.round((1 - discount / price) * 100);
};

export const productCategoryKey = (
  product: Pick<CatalogProduct, "category_id">,
) => product.category_id || UNCATEGORIZED;

export interface ProductFilters {
  query: string;
  active: ActiveFilter;
  stock: StockFilter;
  /** Category keys to hide; new categories are shown by default. */
  excludedCategories: string[];
  sort: ProductSort;
}

export const filterAndSortProducts = (
  products: CatalogProduct[],
  filters: ProductFilters,
) => {
  const excluded = new Set(filters.excludedCategories);
  const result = products.filter((product) => {
    if (filters.active === "active" && product.is_active === false)
      return false;
    if (filters.active === "inactive" && product.is_active !== false)
      return false;
    if (filters.stock !== "all" && stockState(product.stock) !== filters.stock)
      return false;
    if (excluded.has(productCategoryKey(product))) return false;
    return matchesAllTerms(filters.query, [
      product.title,
      product.brand,
      product.sku,
      product.slug,
      product.keywords,
      product.categories?.title,
      product.subcategories?.title,
    ]);
  });
  const byTitle = (a: CatalogProduct, b: CatalogProduct) =>
    (a.title || "").localeCompare(b.title || "");
  const sorters: Record<
    ProductSort,
    (a: CatalogProduct, b: CatalogProduct) => number
  > = {
    "title-asc": byTitle,
    "title-desc": (a, b) => byTitle(b, a),
    "price-asc": (a, b) =>
      effectivePrice(a) - effectivePrice(b) || byTitle(a, b),
    "price-desc": (a, b) =>
      effectivePrice(b) - effectivePrice(a) || byTitle(a, b),
    "stock-asc": (a, b) =>
      (Number(a.stock) || 0) - (Number(b.stock) || 0) || byTitle(a, b),
    "stock-desc": (a, b) =>
      (Number(b.stock) || 0) - (Number(a.stock) || 0) || byTitle(a, b),
  };
  return result.sort(sorters[filters.sort] || byTitle);
};

export const productCounts = (products: CatalogProduct[]) => {
  const counts = {
    total: products.length,
    active: 0,
    inactive: 0,
    low: 0,
    out: 0,
  };
  for (const product of products) {
    if (product.is_active === false) counts.inactive += 1;
    else counts.active += 1;
    const state = stockState(product.stock);
    if (state === "low") counts.low += 1;
    if (state === "out") counts.out += 1;
  }
  return counts;
};

/** Number of products per category id and per subcategory id. */
export const productsPerTaxonomy = (products: CatalogProduct[]) => {
  const byCategory = new Map<string, number>();
  const bySubcategory = new Map<string, number>();
  for (const product of products) {
    if (product.category_id)
      byCategory.set(
        product.category_id,
        (byCategory.get(product.category_id) || 0) + 1,
      );
    if (product.subcategory_id)
      bySubcategory.set(
        product.subcategory_id,
        (bySubcategory.get(product.subcategory_id) || 0) + 1,
      );
  }
  return { byCategory, bySubcategory };
};

export interface TaxonomyFilters {
  query: string;
  sort: TaxonomySort;
  /** Parent category ids to hide (subcategories only). */
  excludedParents?: string[];
}

export const filterAndSortTaxonomy = <T extends CatalogTaxonomy>(
  items: T[],
  filters: TaxonomyFilters,
  productCount: (item: T) => number,
  parentTitle: (item: T) => string = () => "",
) => {
  const excluded = new Set(filters.excludedParents || []);
  const result = items.filter(
    (item) =>
      !excluded.has(item.category_id || UNCATEGORIZED) &&
      matchesAllTerms(filters.query, [
        item.title,
        item.keywords,
        item.description,
        parentTitle(item),
      ]),
  );
  const byTitle = (a: T, b: T) => (a.title || "").localeCompare(b.title || "");
  if (filters.sort === "title-desc")
    return result.sort((a, b) => byTitle(b, a));
  if (filters.sort === "products-desc")
    return result.sort(
      (a, b) => productCount(b) - productCount(a) || byTitle(a, b),
    );
  return result.sort(byTitle);
};
