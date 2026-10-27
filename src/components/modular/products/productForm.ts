import { referenceId } from "../../../utils/catalogRefs";
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
  category_id: "",
  subcategory_id: "",
});

export type ProductForm = ReturnType<typeof emptyProductForm>;

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
  if (form.subcategory_id && !form.category_id) {
    errors.push("Select a category for the chosen subcategory");
  }
  return errors;
};

export const productFormFromProduct = (
  product: CatalogProduct,
  subcategories: CatalogTaxonomy[],
): ProductForm => {
  const extra = product as Record<string, unknown>;
  const subcategoryId = referenceId(
    product.subcategory_id || extra.subCategory || extra.subcategory,
  );
  const selectedSubcategory = subcategories.find(
    (subcategory) => subcategory.id === subcategoryId,
  );
  const categoryId =
    referenceId(product.category_id || extra.category) ||
    selectedSubcategory?.category_id ||
    "";
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
    category: categoryId,
    stock: product.stock || 0,
    brand: product.brand || "",
    ratings: product.ratings || 0,
    numberOfReviews: product.numberOfReviews || 0,
    slug: product.slug || "",
    keywords: product.keywords || "",
    is_active: product.is_active !== false,
    category_id: categoryId,
    subcategory_id: subcategoryId,
  };
};
