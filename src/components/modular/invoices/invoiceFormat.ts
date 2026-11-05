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

/* Amount field text: "₹ 1,25,000.5" while typing. Values stay plain numbers. */
const AMOUNT_PREFIX = "₹ ";

/** Keep digits and one dot; at most 9 whole digits and 2 decimals. */
export const cleanAmount = (value: string) => {
  const raw = value.replace(/[^\d.]/g, "");
  const dot = raw.indexOf(".");
  const whole = (dot === -1 ? raw : raw.slice(0, dot))
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9);
  if (dot === -1) return whole;
  return `${whole || "0"}.${raw
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2)}`;
};

/** "125000.5" → "₹ 1,25,000.5" (Indian grouping); "" stays "". */
export const formatAmountText = (raw: string) => {
  if (!raw) return "";
  const [whole, decimals] = raw.split(".");
  const grouped = Number(whole || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  return `${AMOUNT_PREFIX}${decimals !== undefined ? `${grouped}.${decimals}` : grouped}`;
};

/** Caret index in `shown` just after the first `count` digits/dots. */
export const amountCaret = (shown: string, count: number) => {
  let seen = 0;
  for (let i = AMOUNT_PREFIX.length; i < shown.length; i += 1) {
    if (seen === count) return i;
    if (/[\d.]/.test(shown[i])) seen += 1;
  }
  return shown.length;
};
