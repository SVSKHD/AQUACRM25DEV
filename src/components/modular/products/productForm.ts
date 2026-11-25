import { referenceId, referenceList } from "../../../utils/catalogRefs";
import type {
  CatalogPhoto,
  CatalogProduct,
  CatalogTaxonomy,
} from "../../../utils/productList";

export const emptyProductForm = () => ({
  title: "",
  description: "",
  price: 0,
  discountPrice: 0,
  dpPrice: 0,
  discountPriceStatus: false,
  discountPricePercentage: 0,
  photos: [] as CatalogPhoto[],
  category: "",
  stock: 0,
  brand: "",
  ratings: 0,
  numberOfReviews: 0,
  slug: "",
  keywords: "",
  sku: "",
  gtin: "",
  mpn: "",
  googleProductCategory: "",
  productType: "",
  condition: "new",
  shippingWeight: "",
  identifierExists: true,
  merchantEnabled: true,
  is_active: true,
  // Primary category/subcategory = first entry of the lists below. Kept in
  // sync for the backend's single fields and for drafts saved before
  // multi-category support.
  category_id: "",
  subcategory_id: "",
  category_ids: [] as string[],
  subcategory_ids: [] as string[],
});

export type ProductForm = ReturnType<typeof emptyProductForm>;

type TaxonomyFields = Pick<
  ProductForm,
  "category_id" | "subcategory_id" | "category_ids" | "subcategory_ids"
>;

const listOf = (list: unknown, primary: unknown) => {
  const ids = Array.isArray(list)
    ? list.map((id) => String(id || "")).filter(Boolean)
    : [];
  const first = String(primary || "");
  return first && !ids.includes(first) ? [first, ...ids] : [...new Set(ids)];
};

/** Category and subcategory ids of a form, primary first (handles old drafts). */
export const formCategoryIds = (form: Partial<TaxonomyFields>) =>
  listOf(form.category_ids, form.category_id);
export const formSubcategoryIds = (form: Partial<TaxonomyFields>) =>
  listOf(form.subcategory_ids, form.subcategory_id);

/** Fills the lists from the single fields (or the other way) after a draft restore. */
export const normalizeFormTaxonomy = <T extends Partial<TaxonomyFields>>(
  form: T,
): T & TaxonomyFields => {
  const categoryIds = formCategoryIds(form);
  const subcategoryIds = formSubcategoryIds(form);
  return {
    ...form,
    category_ids: categoryIds,
    subcategory_ids: subcategoryIds,
    category_id: categoryIds[0] || "",
    subcategory_id: subcategoryIds[0] || "",
  };
};

/**
 * Applies a new selection while keeping the order the user built: entries
 * still selected keep their place (so the primary stays first), new ones are
 * appended. LiquidMultiSelect reports values in option order, which would
 * otherwise silently change the primary.
 */
export const mergeSelection = (previous: string[], next: string[]) => {
  const chosen = new Set(next);
  const kept = previous.filter((id) => chosen.has(id));
  return [...kept, ...next.filter((id) => !kept.includes(id))];
};

/** Moves one id to the front (makes it the primary). */
export const makePrimary = (ids: string[], id: string) =>
  ids.includes(id) ? [id, ...ids.filter((item) => item !== id)] : ids;

/**
 * Form patch for a new category selection. Subcategories whose parent is no
 * longer selected are dropped, so the drawer never sends a mapping the
 * backend refuses.
 */
export const categorySelectionPatch = (
  form: Partial<TaxonomyFields>,
  categoryIds: string[],
  subcategories: Pick<CatalogTaxonomy, "id" | "category_id">[],
): TaxonomyFields => {
  const selected = new Set(categoryIds);
  const parentOf = new Map(
    subcategories.map((sub) => [sub.id, sub.category_id || ""]),
  );
  const subcategoryIds = formSubcategoryIds(form).filter((id) =>
    selected.has(parentOf.get(id) || ""),
  );
  return {
    category_ids: categoryIds,
    category_id: categoryIds[0] || "",
    subcategory_ids: subcategoryIds,
    subcategory_id: subcategoryIds[0] || "",
  };
};

export const subcategorySelectionPatch = (subcategoryIds: string[]) => ({
  subcategory_ids: subcategoryIds,
  subcategory_id: subcategoryIds[0] || "",
});

/** Request fields for the backend (lists plus the primary single fields). */
export const taxonomyPayload = (form: Partial<TaxonomyFields>) => {
  const categoryIds = formCategoryIds(form);
  const subcategoryIds = formSubcategoryIds(form);
  return {
    category: categoryIds[0] || null,
    subCategory: subcategoryIds[0] || null,
    category_id: categoryIds[0] || null,
    subcategory_id: subcategoryIds[0] || null,
    category_ids: categoryIds,
    subcategory_ids: subcategoryIds,
  };
};

export const hasRichTextContent = (html: string) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length > 0;

export const validateProductForm = (form: ProductForm) => {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Product title is required");
  if (!form.brand.trim()) errors.push("Brand is required");
  if (!hasRichTextContent(form.description))
    errors.push("Product description is required");
  if (!form.photos.some((photo) => Boolean(photo?.secure_url))) {
    errors.push("At least one product image is required");
  }
  if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
    errors.push("Price must be a non-negative number");
  }
  if (Number(form.stock) < 0 || Number.isNaN(Number(form.stock))) {
    errors.push("Stock must be a non-negative number");
  }
  if (formSubcategoryIds(form).length && !formCategoryIds(form).length) {
    errors.push("Select a category for the chosen subcategory");
  }
  return errors;
};

export const productFormFromProduct = (
  product: CatalogProduct,
  subcategories: CatalogTaxonomy[],
): ProductForm => {
  const extra = product as Record<string, unknown>;
  const subcategoryIds = product.subcategory_ids?.length
    ? product.subcategory_ids
    : referenceList(
        extra.subCategories,
        product.subcategory_id || extra.subCategory || extra.subcategory,
      ).ids;
  let categoryIds = product.category_ids?.length
    ? product.category_ids
    : referenceList(
        Array.isArray(extra.categories) ? extra.categories : undefined,
        product.category_id || extra.category,
      ).ids;
  if (!categoryIds.length) {
    // Very old products: only a subcategory; use its parent.
    const parent = subcategories.find(
      (subcategory) => subcategory.id === referenceId(subcategoryIds[0]),
    )?.category_id;
    if (parent) categoryIds = [parent];
  }
  const text = (value: unknown) => (typeof value === "string" ? value : "");

  return {
    ...emptyProductForm(),
    title: product.title || "",
    description: product.description || "",
    sku: product.sku || "",
    gtin: text(extra.gtin),
    mpn: text(extra.mpn),
    googleProductCategory: text(extra.googleProductCategory),
    productType: text(extra.productType),
    condition: text(extra.condition) || "new",
    shippingWeight: text(extra.shippingWeight),
    identifierExists: extra.identifierExists !== false,
    merchantEnabled: extra.merchantEnabled !== false,
    price: product.price || 0,
    discountPrice: product.discountPrice || 0,
    dpPrice: product.dpPrice || 0,
    discountPriceStatus: product.discountPriceStatus || false,
    discountPricePercentage: product.discountPricePercentage || 0,
    photos: product.photos || [],
    category: categoryIds[0] || "",
    stock: product.stock || 0,
    brand: product.brand || "",
    ratings: product.ratings || 0,
    numberOfReviews: product.numberOfReviews || 0,
    slug: product.slug || "",
    keywords: product.keywords || "",
    is_active: product.is_active !== false,
    category_id: categoryIds[0] || "",
    subcategory_id: subcategoryIds[0] || "",
    category_ids: [...categoryIds],
    subcategory_ids: [...subcategoryIds],
  };
};
