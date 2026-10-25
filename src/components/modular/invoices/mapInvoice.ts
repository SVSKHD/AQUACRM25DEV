import type { Invoice, Product } from "./invoice.types";

/*
 * Maps a raw backend invoice (AquaInvoice document or legacy flat shape) to the
 * CRM Invoice type. Shared by the Invoices tab and the dashboard so both report
 * identical totals and statuses.
 */

// Backend documents arrive loosely typed.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function normalizeNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function mapInvoiceFromApi(inv: any): Invoice {
  const customer = inv.customerDetails ?? {};
  const gstDetails = inv.gstDetails ?? {};
  const transport = inv.transport ?? {};
  const productSources = [
    inv.products,
    inv.items,
    inv.invoice_items,
    inv.invoiceItems,
    inv.order_items,
    inv.orderItems,
  ];
  const rawProducts = productSources.find((item) => Array.isArray(item)) ?? [];

  const products: Product[] = rawProducts.map((p: any, index: number) => {
    const quantity =
      normalizeNumber(p.productQuantity ?? p.quantity ?? p.qty ?? p.count) || 1;
    let unitPrice =
      [
        p.productPrice,
        p.unit_price,
        p.unitPrice,
        p.price,
        p.mrp,
        p.rate,
        p.salePrice,
        p.selling_price,
      ]
        .map(normalizeNumber)
        .find((val) => val > 0) ?? 0;

    if (!unitPrice && p.total)
      unitPrice = normalizeNumber(p.total) / quantity || 0;
    if (!unitPrice && p.total_price)
      unitPrice = normalizeNumber(p.total_price) / quantity || 0;

    return {
      productName:
        p.productName ??
        p.name ??
        p.product_name ??
        p.title ??
        `Product ${index + 1}`,
      productQuantity: quantity,
      productPrice: unitPrice,
      productSerialNo: p.productSerialNo ?? p.serial_no ?? p.sku ?? "",
    };
  });

  const computedTotal = products.reduce(
    (sum, product) => sum + product.productPrice,
    0,
  );

  return {
    id:
      inv.id ??
      inv._id ??
      inv.invoice_id ??
      `inv-${Math.random().toString(36).slice(2, 10)}`,
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
    paid_status:
      inv.paid_status ?? inv.paidStatus ?? inv.payment_status ?? "unpaid",
    payment_type: inv.payment_type ?? inv.paymentType ?? "cash",
    aquakart_online_user: Boolean(
      inv.aquakart_online_user ?? inv.aquakartOnlineUser,
    ),
    aquakart_invoice: Boolean(inv.aquakart_invoice ?? inv.aquakartInvoice),
    total_amount: Number(inv.total_amount ?? inv.total ?? computedTotal) || 0,
    created_at: inv.created_at ?? inv.createdAt ?? new Date().toISOString(),
    enriched: Boolean(String(inv.firebaseUid ?? "").trim()),
    open_count: normalizeNumber(inv.accessMetrics?.openCount),
    last_opened_at: inv.accessMetrics?.lastOpenedAt ?? null,
  };
}
