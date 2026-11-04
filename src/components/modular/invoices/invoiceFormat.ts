/*
 * Formatting helpers shared by the invoice editor modes.
 * Money rule: `productPrice` is the LINE value (PR #89); never multiply a
 * saved line's productPrice by its quantity.
 */

export type InvoiceLine = {
  productName: string;
  productQuantity: number;
  productPrice: number;
  productSerialNo?: string;
  productId?: string;
  productSlug?: string;
  productLink?: string;
};

export type CatalogProduct = {
  id: string | number;
  name: string;
  price: number;
  sku?: string | null;
  slug?: string | null;
  link?: string | null;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatINR = (value: number) =>
  inrFormatter.format(Number.isFinite(value) ? value : 0);

export const findCatalogProduct = (
  products: CatalogProduct[],
  name: string,
) => {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return products.find((p) => (p.name || "").toLowerCase() === key) || null;
};

/** Tidy an address typed or pasted in pieces: single spaces, single commas. */
export const tidyAddress = (value: string) =>
  value
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(, )+/g, ", ")
    .replace(/^[,\s]+|[,\s]+$/g, "");
