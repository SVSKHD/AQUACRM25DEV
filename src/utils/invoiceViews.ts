const MONGO_OBJECT_ID = /^[a-f\d]{24}$/i;
const CUSTOMER_ORIGIN = "https://aquakart.co.in";

export const resolvePersistedInvoiceId = (invoice: unknown): string => {
  if (!invoice || typeof invoice !== "object") return "";
  const value = invoice as Record<string, unknown>;
  const nestedData =
    value.data && typeof value.data === "object"
      ? (value.data as Record<string, unknown>)
      : undefined;
  const candidates = [
    value._id,
    value.invoiceId,
    nestedData?._id,
    nestedData?.invoiceId,
    value.id,
  ];
  return (
    candidates
      .map((candidate) => String(candidate || "").trim())
      .find((candidate) => MONGO_OBJECT_ID.test(candidate)) || ""
  );
};

export const getAdminInvoicePath = (invoiceId: string) =>
  `/admin/invoice/${encodeURIComponent(invoiceId)}`;

export const getCustomerInvoiceUrl = (invoiceId: string) =>
  `${CUSTOMER_ORIGIN}/invoice/${encodeURIComponent(invoiceId)}`;
