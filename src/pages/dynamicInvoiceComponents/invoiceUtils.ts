import type { DbProduct, Invoice, Product } from "./types/invoice.types";

export const mapSuggestedProducts = (data: unknown): DbProduct[] => {
  if (!data || typeof data !== "object") return [];

  const payload = data as {
    products?: unknown;
    data?: unknown;
  };

  let products: any[] = [];
  if (Array.isArray(data)) {
    products = data;
  } else if (Array.isArray(payload.products)) {
    products = payload.products;
  } else if (Array.isArray(payload.data)) {
    products = payload.data;
  }

  return products
    .map((product) => ({
      id: product.id || product._id,
      title: product.title || product.name || product.productName,
      price: Number(product.price || product.selling_price || product.mrp || 0),
      discountPrice: Number(
        product.discountPrice || product.discount_price || 0,
      ),
      photos: product.photos || [],
      slug: product.slug || "",
    }))
    .slice(0, 10);
};

export const mapInvoiceFromApi = (inv: any): Invoice => {
  const customer = inv.customerDetails ?? {};
  const gstDetails = inv.gstDetails ?? {};
  const transport = inv.transport ?? {};
  const paidStatus =
    inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid";
  const paymentType = inv.payment_type ?? inv.paymentType ?? "cash";

  const products: Product[] = Array.isArray(inv.products)
    ? inv.products.map((product: any) => ({
        productName: product.productName ?? product.name ?? "",
        productQuantity:
          Number(product.productQuantity ?? product.quantity ?? 1) || 1,
        productPrice:
          Number(product.productPrice ?? product.unit_price ?? 0) || 0,
        productSerialNo: product.productSerialNo ?? product.serial_no ?? "",
      }))
    : [];

  const computedTotal = products.reduce(
    (sum: number, product: Product) => sum + product.productPrice,
    0,
  );

  return {
    id: inv.id ?? inv._id ?? inv.invoice_id ?? "",
    invoice_no: inv.invoice_no ?? inv.invoiceNo ?? inv.invoice_number ?? "",
    date:
      inv.date ||
      inv.issue_date ||
      inv.created_at ||
      inv.createdAt ||
      new Date().toISOString(),
    customer_name: customer.name ?? inv.customer_name ?? "",
    customer_phone: (customer.phone ?? inv.customer_phone ?? "").toString(),
    customer_email: customer.email ?? inv.customer_email ?? "",
    customer_address: customer.address ?? inv.customer_address ?? "",
    gst: Boolean(inv.gst),
    po: Boolean(inv.po),
    quotation: Boolean(inv.quotation),
    gst_name: gstDetails.gstName ?? inv.gst_name ?? null,
    gst_no: gstDetails.gstNo ?? inv.gst_no ?? null,
    gst_phone: gstDetails.gstPhone?.toString?.() ?? inv.gst_phone ?? null,
    gst_email: gstDetails.gstEmail ?? inv.gst_email ?? null,
    gst_address: gstDetails.gstAddress ?? inv.gst_address ?? null,
    products,
    delivered_by: transport.deliveredBy ?? inv.delivered_by ?? null,
    delivery_date: transport.deliveryDate ?? inv.delivery_date ?? null,
    paid_status: paidStatus,
    payment_type: paymentType,
    aquakart_online_user: Boolean(
      inv.aquakart_online_user ?? inv.aquakartOnlineUser,
    ),
    aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
    total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
    created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
  };
};
