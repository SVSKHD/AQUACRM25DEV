import type {
  DbProduct,
  Product,
} from "../components/modular/invoices/invoice.types";

/**
 * Invoice form values as the editor screens hold them, and the API payload
 * built from them. Shared by the invoice dialog (InvoicesTab) and the Easy
 * invoice page so both save invoices the same way.
 * Money rule: `productPrice` is the LINE value; never multiply by quantity.
 */
export const initialInvoiceForm = {
  invoice_no: "",
  date: new Date().toISOString().split("T")[0],
  customer_name: "",
  customer_phone: 0,
  customer_email: "",
  customer_address: "",
  gst: false,
  po: false,
  quotation: false,
  gst_name: "",
  gst_no: "",
  gst_phone: "",
  gst_email: "",
  gst_address: "",
  products: [] as Product[],
  delivered_by: "",
  delivery_date: "",
  paid_status: "unpaid",
  payment_type: "cash",
  aquakart_online_user: false,
  aquakart_invoice: false,
};

export type InvoiceFormValues = typeof initialInvoiceForm;

/** Sum of line values (productPrice is already quantity × unit price). */
export const invoiceTotal = (products: Pick<Product, "productPrice">[]) =>
  products.reduce((sum, product) => sum + product.productPrice, 0);

export const buildInvoicePayload = (
  base: InvoiceFormValues,
  total: number,
) => ({
  invoiceNo: base.invoice_no,
  date: base.date,
  customerDetails: {
    name: base.customer_name,
    phone: base.customer_phone,
    email: base.customer_email,
    address: base.customer_address,
  },
  gst: base.gst,
  po: base.po,
  quotation: base.quotation,
  gstDetails: {
    gstName: base.gst_name,
    gstNo: base.gst_no,
    gstPhone: base.gst_phone,
    gstEmail: base.gst_email,
    gstAddress: base.gst_address,
  },
  products: base.products.map((p) => ({
    productName: p.productName,
    productQuantity: p.productQuantity,
    productPrice: p.productPrice,
    productSerialNo: p.productSerialNo,
    productId: p.productId || undefined,
    productSlug: p.productSlug || undefined,
    productLink: p.productLink || undefined,
  })),
  transport: {
    deliveredBy: base.delivered_by,
    deliveryDate: base.delivery_date || null,
  },
  paidStatus: base.paid_status,
  paymentType: base.payment_type,
  aquakartOnlineUser: base.aquakart_online_user,
  aquakartInvoice: base.aquakart_invoice,
  total_amount: total,
});

export function normalizePrice(value: unknown) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const cleaned = parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(cleaned) ? cleaned : 0;
}

type RawRecord = Record<string, unknown>;

/** `obj[key]` when obj is an object, else undefined. */
const read = (obj: unknown, key: string): unknown =>
  obj && typeof obj === "object" ? (obj as RawRecord)[key] : undefined;

/** First of the keys whose value isn't null/undefined (like chained `??`). */
const firstSet = (obj: RawRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

/** Products API reply (any of its shapes) → catalog entries for the invoice editors. */
export function normalizeCatalogProducts(payload: unknown): DbProduct[] {
  const candidates = [
    read(read(payload, "data"), "products"),
    read(read(payload, "data"), "data"),
    read(payload, "data"),
    read(payload, "products"),
    payload,
  ];
  const rawProducts = (candidates.find((item) => Array.isArray(item)) ||
    []) as RawRecord[];
  return rawProducts
    .map((p, index) => {
      const discountedPrice =
        p.discountPriceStatus || p.discount_price_status
          ? firstSet(p, ["discountPrice", "discount_price"])
          : undefined;
      return {
        id: (firstSet(p, ["id", "_id", "product_id", "sku"]) ??
          `product-${index}`) as string,
        name: (firstSet(p, ["name", "title", "product_name", "productName"]) ??
          "") as string,
        price: normalizePrice(
          discountedPrice ??
            firstSet(p, ["price", "selling_price", "salePrice", "mrp"]) ??
            0,
        ),
        dpPrice: (p.dpPrice || 0) as number,
        sku: (firstSet(p, ["sku", "sku_code", "skuCode", "code"]) ?? null) as
          string | null,
        slug: (firstSet(p, ["slug", "seoSlug"]) ?? null) as string | null,
        link: (firstSet(p, ["productLink", "link"]) ?? null) as string | null,
      };
    })
    .filter((product: DbProduct) => product.name);
}
