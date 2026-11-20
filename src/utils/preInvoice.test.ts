import { describe, expect, it } from "vitest";
import {
  applyCatalogProduct,
  buildPreInvoiceCreateBody,
  buildPreInvoicePatch,
  describeSaveError,
  emptyPreInvoiceForm,
  emptyPreInvoiceLine,
  fieldErrorsFromDetails,
  isPreInvoiceEditable,
  normalizeIndianMobile,
  normalizePreInvoice,
  patchChangesPayable,
  preInvoiceLinkBlockedReason,
  preInvoiceRowLinkAction,
  preInvoiceToForm,
  previewPreInvoiceTotals,
  validatePreInvoiceForm,
  type PreInvoice,
  type PreInvoiceForm,
} from "./preInvoice";
import { normalizeLinkState, type PaymentLinkState } from "./paymentLink";

const validForm = (): PreInvoiceForm => ({
  ...emptyPreInvoiceForm(),
  date: "2026-11-18",
  customerDetails: {
    name: "Ravi",
    phone: "98765 43210",
    email: "",
    address: "",
  },
  products: [
    {
      ...emptyPreInvoiceLine(),
      productName: "RO purifier",
      productQuantity: "2",
      productPrice: "100",
      productDiscount: "10",
      productTax: "5",
    },
  ],
});

const doc = (overrides: Record<string, unknown> = {}): PreInvoice =>
  normalizePreInvoice({
    _id: "64b000000000000000000001",
    preInvoiceNo: "AQPI|20261118|0001",
    date: "2026-11-18",
    customerDetails: { name: "Ravi", phone: 9876543210 },
    gst: false,
    products: [
      {
        productName: "RO purifier",
        productQuantity: 2,
        productPrice: 100,
        productDiscount: 10,
        productTax: 5,
        productTotal: 195,
      },
    ],
    subTotal: 195,
    discount: 0,
    tax: 0,
    totalAmount: 195,
    status: "Draft",
    payment: { status: "Unpaid" },
    ...overrides,
  }) as PreInvoice;

describe("validatePreInvoiceForm", () => {
  it("accepts a valid form", () => {
    expect(validatePreInvoiceForm(validForm())).toEqual({});
  });

  it("uses the server's field keys", () => {
    const form = validForm();
    form.customerDetails = {
      name: " ",
      phone: "12345",
      email: "x@",
      address: "",
    };
    form.gst = true;
    form.products = [
      {
        ...emptyPreInvoiceLine(),
        productName: "",
        productQuantity: "0",
        productPrice: "-1",
        productDiscount: "",
        productTax: "abc",
      },
    ];
    form.discount = "-5";
    const errors = validatePreInvoiceForm(form);
    expect(Object.keys(errors).sort()).toEqual(
      [
        "customerDetails.name",
        "customerDetails.phone",
        "customerDetails.email",
        "gstDetails.gstNo",
        "gstDetails.gstName",
        "products[0].productName",
        "products[0].productQuantity",
        "products[0].productPrice",
        "products[0].productDiscount",
        "products[0].productTax",
        "discount",
      ].sort(),
    );
  });

  it("needs 1-100 lines", () => {
    const form = validForm();
    form.products = [];
    expect(validatePreInvoiceForm(form).products).toMatch(/1-100/);
    form.products = Array.from({ length: 101 }, () => validForm().products[0]);
    expect(validatePreInvoiceForm(form).products).toMatch(/1-100/);
  });

  it("checks Indian mobiles like the backend", () => {
    expect(normalizeIndianMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeIndianMobile("919876543210")).toBe("9876543210");
    expect(normalizeIndianMobile("5876543210")).toBe("");
    expect(normalizeIndianMobile("98765")).toBe("");
  });
});

describe("server error mapping", () => {
  it("maps VALIDATION_FAILED details onto fields", () => {
    const result = describeSaveError({
      error: "Please fix the highlighted fields",
      code: "VALIDATION_FAILED",
      details: {
        "customerDetails.phone": "Enter a valid 10-digit Indian mobile number",
        "products[1].productPrice": "Must be 0 or more",
        ignored: 3,
      },
    });
    expect(result.message).toBe("Please fix the highlighted fields");
    expect(result.fields).toEqual({
      "customerDetails.phone": "Enter a valid 10-digit Indian mobile number",
      "products[1].productPrice": "Must be 0 or more",
    });
  });

  it("explains PRE_INVOICE_LOCKED and ignores details of other codes", () => {
    const result = describeSaveError({
      error: "A Paid pre-invoice can't be edited",
      code: "PRE_INVOICE_LOCKED",
      details: { x: "y" },
    });
    expect(result.message).toMatch(/Paid pre-invoice can't be edited.*reopen/);
    expect(result.fields).toEqual({});
    expect(fieldErrorsFromDetails(null)).toEqual({});
  });
});

describe("totals", () => {
  it("previews with the backend formula (line floor at 0, then overall)", () => {
    const form = validForm();
    form.products.push({
      ...emptyPreInvoiceLine(),
      productName: "Filter",
      productQuantity: "1",
      productPrice: "50",
      productDiscount: "80",
      productTax: "2",
    });
    form.discount = "300";
    form.tax = "18";
    // 195 + (max(50-80,0)+2 = 2) = 197; max(197-300,0)+18 = 18
    expect(previewPreInvoiceTotals(form)).toEqual({ subTotal: 197, total: 18 });
  });

  it("create body has numbers and no totals or amount", () => {
    const body = buildPreInvoiceCreateBody(validForm());
    expect(body.customerDetails?.phone).toBe("9876543210");
    expect(body.products?.[0]).toEqual({
      productName: "RO purifier",
      productDescription: "",
      productSerialNo: "",
      productQuantity: 2,
      productPrice: 100,
      productDiscount: 10,
      productTax: 5,
    });
    expect(body).not.toHaveProperty("totalAmount");
    expect(body).not.toHaveProperty("subTotal");
  });
});

describe("buildPreInvoicePatch", () => {
  it("returns null when nothing changed", () => {
    const original = doc();
    expect(
      buildPreInvoicePatch(original, preInvoiceToForm(original)),
    ).toBeNull();
  });

  it("sends only the customer group for a name change (link stays valid)", () => {
    const original = doc();
    const form = preInvoiceToForm(original);
    form.customerDetails.name = "Ravi Kumar";
    const patch = buildPreInvoicePatch(original, form);
    expect(Object.keys(patch || {})).toEqual(["customerDetails"]);
    expect(patchChangesPayable(patch)).toBe(false);
  });

  it("sends lines, discount and tax together when an amount changes", () => {
    const original = doc();
    const form = preInvoiceToForm(original);
    form.discount = "5";
    const patch = buildPreInvoicePatch(original, form);
    expect(Object.keys(patch || {}).sort()).toEqual([
      "discount",
      "products",
      "tax",
    ]);
    expect(patchChangesPayable(patch)).toBe(true);
  });
});

describe("pre-invoice state", () => {
  it("is editable only while Draft/Payment Pending and unpaid", () => {
    expect(isPreInvoiceEditable(doc())).toBe(true);
    expect(isPreInvoiceEditable(doc({ status: "Payment Pending" }))).toBe(true);
    expect(isPreInvoiceEditable(doc({ status: "Cancelled" }))).toBe(false);
    expect(isPreInvoiceEditable(doc({ payment: { status: "Paid" } }))).toBe(
      false,
    );
  });

  it("explains when a payment link can't be made", () => {
    expect(preInvoiceLinkBlockedReason(doc())).toBeNull();
    expect(preInvoiceLinkBlockedReason(doc({ status: "Cancelled" }))).toMatch(
      /Cancelled/,
    );
    expect(preInvoiceLinkBlockedReason(doc({ status: "Converted" }))).toMatch(
      /paid/,
    );
    expect(preInvoiceLinkBlockedReason(doc({ totalAmount: 0 }))).toMatch(
      /zero/,
    );
  });

  it("normalizes the linked invoice and source quotation", () => {
    const result = doc({
      convertedToInvoice: { _id: "inv1", invoiceNo: "AQ-1" },
      sourceQuotationId: "q1",
      sourceQuotationNo: "AQQ-1",
    });
    expect(result.convertedToInvoice).toEqual({
      id: "inv1",
      invoiceNo: "AQ-1",
    });
    expect(result.sourceQuotationId).toBe("q1");
  });
});

describe("applyCatalogProduct", () => {
  const catalog = [
    {
      id: "64b000000000000000000009",
      name: "RO purifier",
      price: 12000,
      sku: "RO-1",
    },
    { id: "custom-1", name: "Service", price: 500, sku: "" },
  ];

  it("fills id, price and SKU for a catalog product", () => {
    const line = applyCatalogProduct(
      emptyPreInvoiceLine(),
      "ro purifier",
      catalog,
    );
    expect(line).toMatchObject({
      productId: "64b000000000000000000009",
      productName: "RO purifier",
      productPrice: "12000",
      productSerialNo: "RO-1",
    });
  });

  it("drops non-database ids and keeps custom names", () => {
    expect(
      applyCatalogProduct(emptyPreInvoiceLine(), "Service", catalog).productId,
    ).toBe("");
    const custom = applyCatalogProduct(
      { ...emptyPreInvoiceLine(), productId: "64b000000000000000000009" },
      "Installation",
      catalog,
    );
    expect(custom).toMatchObject({
      productId: "",
      productName: "Installation",
    });
  });
});

describe("preInvoiceRowLinkAction", () => {
  const link = (overrides: Record<string, unknown> = {}) =>
    normalizeLinkState({
      linkId: "l1",
      status: "active",
      source: { kind: "pre_invoice", id: "p1", number: "AQPI-1" },
      amount: 1500,
      currency: "INR",
      expiresAt: "2026-11-21T10:00:00.000Z",
      createdAt: "2026-11-18T10:00:00.000Z",
      reviewFlags: [],
      conversion: { status: "none" },
      ...overrides,
    }) as PaymentLinkState;

  it("re-sends an active link that matches the document", () => {
    expect(preInvoiceRowLinkAction(doc(), link())).toBe("send");
  });

  it("creates (and so sends) a link when there is no working one", () => {
    expect(preInvoiceRowLinkAction(doc(), null)).toBe("create");
    expect(preInvoiceRowLinkAction(doc(), link({ status: "expired" }))).toBe(
      "create",
    );
    expect(preInvoiceRowLinkAction(doc(), link({ status: "revoked" }))).toBe(
      "create",
    );
  });

  it("offers nothing while loading, for outdated or paid links, or unpayable documents", () => {
    expect(preInvoiceRowLinkAction(doc(), undefined)).toBeNull();
    expect(
      preInvoiceRowLinkAction(doc(), link({ matchesDocument: false })),
    ).toBeNull();
    expect(preInvoiceRowLinkAction(doc(), link({ status: "paid" }))).toBeNull();
    expect(
      preInvoiceRowLinkAction(doc({ status: "Cancelled" }), link()),
    ).toBeNull();
    expect(preInvoiceRowLinkAction(doc({ totalAmount: 0 }), null)).toBeNull();
  });
});
