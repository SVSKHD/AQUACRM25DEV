// Pre-invoices (backend /v1/crm/pre-invoices, number series AQPI|YYYYMMDD|0001).
// The server computes every total; the form only previews them with the same
// formula. Nothing here logs customer phone numbers or addresses.

export const PRE_INVOICE_STATUSES = [
  "Draft",
  "Payment Pending",
  "Paid",
  "Cancelled",
  "Converted",
] as const;
export type PreInvoiceStatus = (typeof PRE_INVOICE_STATUSES)[number];

/** Statuses a pre-invoice can be edited in (and only while unpaid). */
export const EDITABLE_PRE_INVOICE_STATUSES: readonly string[] = [
  "Draft",
  "Payment Pending",
];

export const MAX_PRE_INVOICE_LINES = 100;

export type PreInvoiceLine = {
  productId?: string;
  productName: string;
  productDescription: string;
  productSerialNo: string;
  productQuantity: number;
  productPrice: number;
  productDiscount: number;
  productTax: number;
  productTotal: number;
};

export type PreInvoiceCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type PreInvoiceGstDetails = {
  gstName: string;
  gstNo: string;
  gstPhone: string;
  gstEmail: string;
  gstAddress: string;
};

export type PreInvoice = {
  _id: string;
  preInvoiceNo: string;
  date: string;
  customerDetails: PreInvoiceCustomer;
  gst: boolean;
  gstDetails: PreInvoiceGstDetails;
  products: PreInvoiceLine[];
  subTotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: string;
  payment: {
    status: string;
    amountPaid: number;
    transactionId: string;
    paidAt: string | null;
    mode: string;
  };
  sourceQuotationId: string | null;
  sourceQuotationNo: string;
  convertedToInvoice: { id: string; invoiceNo: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// ---- Normalising API documents ------------------------------------------

const str = (value: unknown) =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const obj = (value: unknown) =>
  (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
const idOf = (value: unknown): string | null => {
  if (typeof value === "string" && value) return value;
  const record = obj(value);
  return typeof record._id === "string" && record._id ? record._id : null;
};

export const normalizePreInvoiceLine = (raw: unknown): PreInvoiceLine => {
  const line = obj(raw);
  const productId = idOf(line.productId);
  return {
    ...(productId ? { productId } : {}),
    productName: str(line.productName),
    productDescription: str(line.productDescription),
    productSerialNo: str(line.productSerialNo),
    productQuantity: num(line.productQuantity),
    productPrice: num(line.productPrice),
    productDiscount: num(line.productDiscount),
    productTax: num(line.productTax),
    productTotal: num(line.productTotal),
  };
};

export const normalizePreInvoice = (raw: unknown): PreInvoice | null => {
  const doc = obj(raw);
  const id = idOf(doc._id);
  if (!id) return null;
  const customer = obj(doc.customerDetails);
  const gstDetails = obj(doc.gstDetails);
  const payment = obj(doc.payment);
  const invoice = doc.convertedToInvoice;
  const invoiceId = idOf(invoice);
  return {
    _id: id,
    preInvoiceNo: str(doc.preInvoiceNo),
    date: str(doc.date),
    customerDetails: {
      name: str(customer.name),
      phone: str(customer.phone),
      email: str(customer.email),
      address: str(customer.address),
    },
    gst: doc.gst === true,
    gstDetails: {
      gstName: str(gstDetails.gstName),
      gstNo: str(gstDetails.gstNo),
      gstPhone: str(gstDetails.gstPhone),
      gstEmail: str(gstDetails.gstEmail),
      gstAddress: str(gstDetails.gstAddress),
    },
    products: Array.isArray(doc.products)
      ? doc.products.map(normalizePreInvoiceLine)
      : [],
    subTotal: num(doc.subTotal),
    discount: num(doc.discount),
    tax: num(doc.tax),
    totalAmount: num(doc.totalAmount),
    currency: str(doc.currency) || "INR",
    status: str(doc.status) || "Draft",
    payment: {
      status: str(payment.status) || "Unpaid",
      amountPaid: num(payment.amountPaid),
      transactionId: str(payment.transactionId),
      paidAt: str(payment.paidAt) || null,
      mode: str(payment.mode),
    },
    sourceQuotationId: idOf(doc.sourceQuotationId),
    sourceQuotationNo: str(doc.sourceQuotationNo),
    convertedToInvoice: invoiceId
      ? { id: invoiceId, invoiceNo: str(obj(invoice).invoiceNo) }
      : null,
    createdAt: str(doc.createdAt) || null,
    updatedAt: str(doc.updatedAt) || null,
  };
};

export const isPreInvoiceEditable = (doc: PreInvoice) =>
  EDITABLE_PRE_INVOICE_STATUSES.includes(doc.status) &&
  doc.payment.status !== "Paid";

// ---- Form ---------------------------------------------------------------

/** Number fields are kept as typed text so the user can clear them. */
export type PreInvoiceFormLine = {
  productId: string;
  productName: string;
  productDescription: string;
  productSerialNo: string;
  productQuantity: string;
  productPrice: string;
  productDiscount: string;
  productTax: string;
};

export type PreInvoiceForm = {
  date: string;
  customerDetails: PreInvoiceCustomer;
  gst: boolean;
  gstDetails: PreInvoiceGstDetails;
  products: PreInvoiceFormLine[];
  discount: string;
  tax: string;
};

export const emptyPreInvoiceLine = (): PreInvoiceFormLine => ({
  productId: "",
  productName: "",
  productDescription: "",
  productSerialNo: "",
  productQuantity: "1",
  productPrice: "0",
  productDiscount: "0",
  productTax: "0",
});

const today = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const emptyPreInvoiceForm = (): PreInvoiceForm => ({
  date: today(),
  customerDetails: { name: "", phone: "", email: "", address: "" },
  gst: false,
  gstDetails: {
    gstName: "",
    gstNo: "",
    gstPhone: "",
    gstEmail: "",
    gstAddress: "",
  },
  products: [emptyPreInvoiceLine()],
  discount: "0",
  tax: "0",
});

export const preInvoiceToForm = (doc: PreInvoice): PreInvoiceForm => ({
  date: doc.date ? doc.date.slice(0, 10) : today(),
  customerDetails: { ...doc.customerDetails },
  gst: doc.gst,
  gstDetails: { ...doc.gstDetails },
  products: doc.products.length
    ? doc.products.map((line) => ({
        productId: line.productId || "",
        productName: line.productName,
        productDescription: line.productDescription,
        productSerialNo: line.productSerialNo,
        productQuantity: String(line.productQuantity),
        productPrice: String(line.productPrice),
        productDiscount: String(line.productDiscount),
        productTax: String(line.productTax),
      }))
    : [emptyPreInvoiceLine()],
  discount: String(doc.discount),
  tax: String(doc.tax),
});

const amount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const paise = (value: number) => Math.round(value * 100) / 100;

/** Same formula as the backend: max(qty × price − discount, 0) + tax. */
export const previewLineTotal = (line: PreInvoiceFormLine) =>
  paise(
    Math.max(
      amount(line.productQuantity) * amount(line.productPrice) -
        amount(line.productDiscount),
      0,
    ) + amount(line.productTax),
  );

/** Live estimate only; always display the totals the API returns. */
export const previewPreInvoiceTotals = (form: PreInvoiceForm) => {
  const subTotal = paise(
    form.products.reduce((sum, line) => sum + previewLineTotal(line), 0),
  );
  const total = paise(
    Math.max(subTotal - amount(form.discount), 0) + amount(form.tax),
  );
  return { subTotal, total };
};

// Mirrors the backend's normalizeIndianPhone (10 digits starting 6-9, an
// optional 91 prefix).
export const normalizeIndianMobile = (value: string) => {
  const digits = String(value).replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : "";
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID = /^[a-f\d]{24}$/i;

const nonNegative = (value: string) => {
  if (value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
};

/**
 * Field errors keyed like the server's VALIDATION_FAILED details
 * ("customerDetails.phone", "products[0].productPrice", …).
 */
export type FieldErrors = Record<string, string>;

export const validatePreInvoiceForm = (form: PreInvoiceForm): FieldErrors => {
  const errors: FieldErrors = {};
  const customer = form.customerDetails;
  if (!customer.name.trim())
    errors["customerDetails.name"] = "Customer name is required";
  if (!normalizeIndianMobile(customer.phone))
    errors["customerDetails.phone"] =
      "Enter a valid 10-digit Indian mobile number";
  if (customer.email.trim() && !EMAIL.test(customer.email.trim()))
    errors["customerDetails.email"] = "Invalid email";

  if (form.gst) {
    if (!form.gstDetails.gstNo.trim())
      errors["gstDetails.gstNo"] = "GST number is required for a GST bill";
    if (!form.gstDetails.gstName.trim())
      errors["gstDetails.gstName"] = "GST name is required for a GST bill";
  }

  if (!form.products.length || form.products.length > MAX_PRE_INVOICE_LINES)
    errors.products = `Add 1-${MAX_PRE_INVOICE_LINES} products`;
  form.products.forEach((line, index) => {
    const path = `products[${index}]`;
    if (line.productId && !OBJECT_ID.test(line.productId))
      errors[`${path}.productId`] = "Invalid product id";
    if (!line.productName.trim())
      errors[`${path}.productName`] = "Product name is required";
    const quantity = Number(line.productQuantity);
    if (!(Number.isFinite(quantity) && quantity > 0))
      errors[`${path}.productQuantity`] = "Quantity must be greater than 0";
    for (const key of [
      "productPrice",
      "productDiscount",
      "productTax",
    ] as const)
      if (!nonNegative(line[key]))
        errors[`${path}.${key}`] = "Must be 0 or more";
  });
  if (!nonNegative(form.discount)) errors.discount = "Must be 0 or more";
  if (!nonNegative(form.tax)) errors.tax = "Must be 0 or more";
  return errors;
};

/** Server `details` → field errors (string messages only). */
export const fieldErrorsFromDetails = (details: unknown): FieldErrors => {
  const errors: FieldErrors = {};
  for (const [field, message] of Object.entries(obj(details)))
    if (typeof message === "string" && message.trim())
      errors[field] = message.trim();
  return errors;
};

// ---- Request bodies -------------------------------------------------------

export type PreInvoiceLinePayload = {
  productId?: string;
  productName: string;
  productDescription: string;
  productSerialNo: string;
  productQuantity: number;
  productPrice: number;
  productDiscount: number;
  productTax: number;
};

export type PreInvoicePayload = {
  date?: string;
  customerDetails?: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  gst?: boolean;
  gstDetails?: PreInvoiceGstDetails;
  products?: PreInvoiceLinePayload[];
  discount?: number;
  tax?: number;
  status?: "Draft" | "Payment Pending" | "Cancelled";
};

const linesPayload = (form: PreInvoiceForm): PreInvoiceLinePayload[] =>
  form.products.map((line) => ({
    ...(line.productId ? { productId: line.productId } : {}),
    productName: line.productName.trim(),
    productDescription: line.productDescription.trim(),
    productSerialNo: line.productSerialNo.trim(),
    productQuantity: amount(line.productQuantity),
    productPrice: amount(line.productPrice),
    productDiscount: amount(line.productDiscount),
    productTax: amount(line.productTax),
  }));

const customerPayload = (form: PreInvoiceForm) => ({
  name: form.customerDetails.name.trim(),
  phone:
    normalizeIndianMobile(form.customerDetails.phone) ||
    form.customerDetails.phone.trim(),
  email: form.customerDetails.email.trim(),
  address: form.customerDetails.address.trim(),
});

const gstPayload = (form: PreInvoiceForm): PreInvoiceGstDetails =>
  form.gst
    ? {
        gstName: form.gstDetails.gstName.trim(),
        gstNo: form.gstDetails.gstNo.trim().toUpperCase(),
        gstPhone: form.gstDetails.gstPhone.trim(),
        gstEmail: form.gstDetails.gstEmail.trim(),
        gstAddress: form.gstDetails.gstAddress.trim(),
      }
    : { gstName: "", gstNo: "", gstPhone: "", gstEmail: "", gstAddress: "" };

export const buildPreInvoiceCreateBody = (
  form: PreInvoiceForm,
): PreInvoicePayload => ({
  date: form.date,
  customerDetails: customerPayload(form),
  gst: form.gst,
  gstDetails: gstPayload(form),
  products: linesPayload(form),
  discount: amount(form.discount),
  tax: amount(form.tax),
});

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * PATCH body with only the groups that changed. Returns null when nothing
 * changed. Lines, discount and tax travel together because the server
 * recomputes totals from all three.
 */
export const buildPreInvoicePatch = (
  original: PreInvoice,
  form: PreInvoiceForm,
): PreInvoicePayload | null => {
  const before = buildPreInvoiceCreateBody(preInvoiceToForm(original));
  const after = buildPreInvoiceCreateBody(form);
  const patch: PreInvoicePayload = {};
  if (after.date !== before.date) patch.date = after.date;
  if (!same(after.customerDetails, before.customerDetails))
    patch.customerDetails = after.customerDetails;
  if (after.gst !== before.gst || !same(after.gstDetails, before.gstDetails)) {
    patch.gst = after.gst;
    patch.gstDetails = after.gstDetails;
  }
  if (
    !same(after.products, before.products) ||
    after.discount !== before.discount ||
    after.tax !== before.tax
  ) {
    patch.products = after.products;
    patch.discount = after.discount;
    patch.tax = after.tax;
  }
  return Object.keys(patch).length ? patch : null;
};

/** true when the patch changes what the customer pays (an active link stops working). */
export const patchChangesPayable = (patch: PreInvoicePayload | null) =>
  Boolean(patch && patch.products !== undefined);

// ---- Display -------------------------------------------------------------

export const formatInr = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDocDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export const formatDocDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export const preInvoiceStatusTone = (status: string) => {
  if (status === "Paid" || status === "Converted")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";
  if (status === "Payment Pending")
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200";
  if (status === "Cancelled")
    return "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200";
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";
};

// ---- Catalog suggestions for the line editor ---------------------------------

export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  sku: string;
};

/** Products from productsService.getAll() in any of its response shapes. */
export const catalogFromProducts = (payload: unknown): CatalogProduct[] => {
  const root = obj(payload);
  const data = obj(root.data);
  const list = [
    data.products,
    data.data,
    root.data,
    root.products,
    payload,
  ].find(Array.isArray) as unknown[] | undefined;
  const seen = new Set<string>();
  return (list || [])
    .map((raw) => {
      const product = obj(raw);
      const discounted =
        product.discountPriceStatus || product.discount_price_status
          ? (product.discountPrice ?? product.discount_price)
          : undefined;
      return {
        id: str(product._id ?? product.id),
        name: str(product.title ?? product.name ?? product.productName).trim(),
        price: num(discounted ?? product.price ?? product.salePrice ?? 0),
        sku: str(product.sku ?? product.code),
      };
    })
    .filter((product) => {
      const key = product.name.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Applies a catalog pick to a line: id (when it's a real product), name, price, SKU. */
export const applyCatalogProduct = (
  line: PreInvoiceFormLine,
  typedName: string,
  catalog: readonly CatalogProduct[],
): PreInvoiceFormLine => {
  const match = catalog.find(
    (product) => product.name.toLowerCase() === typedName.trim().toLowerCase(),
  );
  if (!match) return { ...line, productName: typedName, productId: "" };
  return {
    ...line,
    productId: OBJECT_ID.test(match.id) ? match.id : "",
    productName: match.name,
    productPrice: String(match.price),
    productSerialNo: line.productSerialNo || match.sku,
  };
};

/** Why a payment link can't be created for this pre-invoice; null = allowed. */
export const preInvoiceLinkBlockedReason = (doc: PreInvoice): string | null => {
  if (doc.status === "Cancelled")
    return "Cancelled pre-invoices can't be paid.";
  if (
    doc.payment.status === "Paid" ||
    doc.status === "Paid" ||
    doc.status === "Converted"
  )
    return "This pre-invoice is already paid.";
  if (doc.convertedToInvoice)
    return "An invoice already exists for this pre-invoice.";
  if (!(doc.totalAmount > 0))
    return "The total is zero, so there is nothing to pay.";
  return null;
};

/** Server error → banner message + field errors. */
export const describeSaveError = (response: {
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}) => {
  const fields =
    response.code === "VALIDATION_FAILED"
      ? fieldErrorsFromDetails(response.details)
      : {};
  const message =
    response.code === "PRE_INVOICE_LOCKED"
      ? `${response.error || "This pre-invoice can't be edited any more"}. Close and reopen it to see its current state.`
      : response.error || "Couldn't save the pre-invoice.";
  return { message, fields };
};
