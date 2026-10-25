import { toFiniteNumber } from "./priceUtils";

const normalizeDate = (value) => {
  if (value === undefined || value === null || value === "") return "";

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const normalizeOptionalDate = (value) => normalizeDate(value) || null;

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  }
  return false;
};

const normalizeText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const normalizeLabel = (value) => {
  if (typeof value === "string") return normalizeText(value);
  if (!value || typeof value !== "object") return "";
  return normalizeText(value.title ?? value.name ?? value.label);
};

const firstImageUrl = (product) => {
  const candidates = [
    product?.productImage,
    product?.image,
    product?.photo,
    product?.photos?.[0]?.secure_url,
    product?.photos?.[0]?.url,
    typeof product?.photos?.[0] === "string" ? product.photos[0] : null,
  ];

  return candidates.find((candidate) => typeof candidate === "string") || "";
};

export const unwrapInvoicePayload = (payload) => {
  if (!payload || typeof payload !== "object") return payload;
  return payload.data ?? payload.invoice ?? payload;
};

export const mapInvoiceFromApi = (payload) => {
  const inv = unwrapInvoicePayload(payload);
  if (!inv || typeof inv !== "object" || Array.isArray(inv)) return null;

  const customer = inv.customerDetails ?? {};
  const gstDetails = inv.gstDetails ?? {};
  const transport = inv.transport ?? {};
  const paidStatus =
    inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid";
  const paymentType = inv.payment_type ?? inv.paymentType ?? "cash";

  const products = Array.isArray(inv.products)
    ? inv.products.map((product, index) => {
        const rawQuantity = Math.trunc(
          toFiniteNumber(product?.productQuantity ?? product?.quantity, 1),
        );

        return {
          id: normalizeText(product?.id ?? product?._id, `item-${index + 1}`),
          productName: normalizeText(
            product?.productName ?? product?.name,
            `Product ${index + 1}`,
          ),
          productQuantity: Math.max(rawQuantity, 1),
          productPrice: Math.max(
            toFiniteNumber(product?.productPrice ?? product?.unit_price, 0),
            0,
          ),
          productSerialNo: normalizeText(
            product?.productSerialNo ?? product?.serial_no,
          ),
          productImage: firstImageUrl(product),
          productLink: normalizeText(product?.productLink ?? product?.link),
          productSlug: normalizeText(product?.productSlug ?? product?.slug),
          productCategory: normalizeLabel(
            product?.productCategory ??
              product?.category ??
              product?.categoryTitle ??
              product?.categoryName,
          ),
          productSubcategory: normalizeLabel(
            product?.productSubcategory ??
              product?.productSubCategory ??
              product?.subcategory ??
              product?.subCategory,
          ),
        };
      })
    : [];

  const computedTotal = products.reduce(
    (sum, product) => sum + product.productPrice * product.productQuantity,
    0,
  );
  const suppliedTotal = Number(inv.total_amount ?? inv.total);
  const totalAmount =
    products.length > 0
      ? computedTotal
      : Number.isFinite(suppliedTotal) && suppliedTotal >= 0
        ? suppliedTotal
        : 0;
  const createdAt = normalizeDate(inv.created_at ?? inv.createdAt);
  const invoiceDate = normalizeDate(
    inv.date ?? inv.issue_date ?? inv.created_at ?? inv.createdAt,
  );

  return {
    id: normalizeText(inv.id ?? inv._id ?? inv.invoice_id),
    invoice_no: normalizeText(
      inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number,
    ),
    date: invoiceDate,
    customer_name: normalizeText(customer.name ?? inv.customer_name),
    customer_phone: normalizeText(customer.phone ?? inv.customer_phone),
    customer_email: normalizeText(customer.email ?? inv.customer_email),
    customer_address: normalizeText(customer.address ?? inv.customer_address),
    gst: normalizeBoolean(inv.gst),
    po: normalizeBoolean(inv.po),
    quotation: normalizeBoolean(inv.quotation),
    gst_name: normalizeText(gstDetails.gstName ?? inv.gst_name) || null,
    gst_no: normalizeText(gstDetails.gstNo ?? inv.gst_no) || null,
    gst_phone: normalizeText(gstDetails.gstPhone ?? inv.gst_phone) || null,
    gst_email: normalizeText(gstDetails.gstEmail ?? inv.gst_email) || null,
    gst_address:
      normalizeText(gstDetails.gstAddress ?? inv.gst_address) || null,
    products,
    delivered_by:
      normalizeText(transport.deliveredBy ?? inv.delivered_by) || null,
    delivery_date: normalizeOptionalDate(
      transport.deliveryDate ?? inv.delivery_date,
    ),
    paid_status: normalizeText(paidStatus, "unpaid").toLowerCase(),
    payment_type: normalizeText(paymentType, "cash").toLowerCase(),
    aquakart_online_user: normalizeBoolean(
      inv.aquakart_online_user ?? inv.aquakartOnlineUser,
    ),
    aquakart_invoice: normalizeBoolean(
      inv.aquakart_invoice ?? inv.aquakartInvoice,
    ),
    total_amount: totalAmount,
    created_at: createdAt,
  };
};

export { normalizeBoolean, normalizeDate };
