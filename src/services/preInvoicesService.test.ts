import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreInvoicesService } from "./preInvoicesService";
import { createPaymentLinksService } from "./paymentLinksService";

// api.ts reads the auth token from localStorage on each request.
vi.hoisted(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
  }
});

// Mocked transports only: nothing here reaches a real backend.
const transport = (responses: {
  get?: object;
  post?: object;
  patch?: object;
  delete?: object;
}) => ({
  get: vi.fn().mockResolvedValue(responses.get ?? {}),
  post: vi.fn().mockResolvedValue(responses.post ?? {}),
  patch: vi.fn().mockResolvedValue(responses.patch ?? {}),
  delete: vi.fn().mockResolvedValue(responses.delete ?? {}),
});

const DOC = {
  _id: "64b000000000000000000001",
  preInvoiceNo: "AQPI|20261118|0001",
  date: "2026-11-18",
  customerDetails: { name: "Ravi", phone: 9876543210, email: "", address: "" },
  gst: false,
  gstDetails: {},
  products: [
    {
      productName: "RO",
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
  currency: "INR",
  status: "Draft",
  payment: { status: "Unpaid", amountPaid: 0 },
  sourceQuotationId: null,
};

const LINK = {
  linkId: "l1",
  status: "active",
  source: { kind: "pre_invoice", id: DOC._id, number: DOC.preInvoiceNo },
  amount: 195,
  currency: "INR",
  expiresAt: "2026-11-21T10:00:00.000Z",
  createdAt: "2026-11-18T10:00:00.000Z",
  boundToCustomer: false,
  reviewFlags: [],
  paidAt: null,
  amountPaid: null,
  gatewayTransactionId: null,
  conversion: {
    status: "none",
    invoiceId: null,
    invoiceNo: null,
    lastError: null,
  },
};

describe("preInvoicesService", () => {
  it("lists with query params, caps limit at 100 and keeps pagination", async () => {
    const t = transport({
      get: {
        data: {
          success: true,
          data: [DOC],
          pagination: { page: 2, limit: 100, total: 101, totalPages: 2 },
        },
      },
    });
    const result = await createPreInvoicesService(t).list({
      status: "Payment Pending",
      search: "AQPI|1",
      page: 2,
      limit: 500,
    });
    expect(t.get).toHaveBeenCalledWith(
      "/pre-invoices?status=Payment%20Pending&search=AQPI%7C1&page=2&limit=100",
    );
    expect(result.data?.items[0].preInvoiceNo).toBe("AQPI|20261118|0001");
    expect(result.data?.items[0].customerDetails.phone).toBe("9876543210");
    expect(result.data?.pagination).toEqual({
      page: 2,
      limit: 100,
      total: 101,
      totalPages: 2,
    });
  });

  it("creates and returns the server's totals and link state", async () => {
    const t = transport({
      post: {
        data: { success: true, data: { preInvoice: DOC, paymentLink: null } },
      },
    });
    const body = { products: [] };
    const result = await createPreInvoicesService(t).create(body);
    expect(t.post).toHaveBeenCalledWith("/pre-invoices", body);
    expect(result.data?.preInvoice.totalAmount).toBe(195);
    expect(result.data?.preInvoice.products[0].productTotal).toBe(195);
    expect(result.data?.paymentLink).toBeNull();
  });

  it("passes validation details through for field mapping", async () => {
    const t = transport({
      post: {
        error: "Please fix the highlighted fields",
        status: 400,
        code: "VALIDATION_FAILED",
        details: {
          "customerDetails.phone":
            "Enter a valid 10-digit Indian mobile number",
        },
      },
    });
    const result = await createPreInvoicesService(t).create({});
    expect(result.code).toBe("VALIDATION_FAILED");
    expect(result.details).toEqual({
      "customerDetails.phone": "Enter a valid 10-digit Indian mobile number",
    });
  });

  it("patches by encoded id and cancels with status only", async () => {
    const t = transport({
      patch: {
        data: {
          success: true,
          data: {
            preInvoice: { ...DOC, status: "Cancelled" },
            paymentLink: null,
          },
        },
      },
    });
    const service = createPreInvoicesService(t);
    const result = await service.cancel("a/b");
    expect(t.patch).toHaveBeenCalledWith("/pre-invoices/a%2Fb", {
      status: "Cancelled",
    });
    expect(result.data?.preInvoice.status).toBe("Cancelled");
  });

  it("moves a quotation and reports revoked quotation links", async () => {
    const t = transport({
      post: {
        data: {
          success: true,
          data: {
            preInvoice: DOC,
            paymentLink: null,
            quotationLinksRevoked: 1,
          },
        },
      },
    });
    const result = await createPreInvoicesService(t).moveQuotation("q1");
    expect(t.post).toHaveBeenCalledWith("/quotations/q1/pre-invoice", {});
    expect(result.data?.quotationLinksRevoked).toBe(1);
  });

  it("returns QUOTATION_ALREADY_MOVED with the existing pre-invoice id", async () => {
    const t = transport({
      post: {
        error: "This quotation already has a pre-invoice",
        status: 409,
        code: "QUOTATION_ALREADY_MOVED",
        details: { preInvoiceId: DOC._id },
      },
    });
    const result = await createPreInvoicesService(t).moveQuotation("q1");
    expect(result.code).toBe("QUOTATION_ALREADY_MOVED");
    expect(result.details?.preInvoiceId).toBe(DOC._id);
  });

  it("probes permissions without writing: 403 → false, 400 validation → true", async () => {
    const denied = transport({
      get: { status: 403, error: "x" },
      post: { status: 403, error: "x" },
    });
    expect(await createPreInvoicesService(denied).probeRead()).toBe(false);
    expect(await createPreInvoicesService(denied).probeManage()).toBe(false);
    const allowed = transport({
      get: { data: {} },
      post: { status: 400, code: "VALIDATION_FAILED" },
    });
    expect(await createPreInvoicesService(allowed).probeRead()).toBe(true);
    expect(await createPreInvoicesService(allowed).probeManage()).toBe(true);
    expect(allowed.post).toHaveBeenCalledWith("/pre-invoices", {});
  });
});

describe("paymentLinksService", () => {
  it("creates a link with no body (never an amount) and returns the one-time url", async () => {
    const t = transport({
      post: {
        data: {
          success: true,
          data: { ...LINK, url: "https://aquakart.co.in/pay/tok" },
        },
      },
    });
    const result = await createPaymentLinksService(t).create(
      "quotation",
      "q 1",
    );
    expect(t.post).toHaveBeenCalledWith("/quotations/q%201/payment-link");
    expect(t.post.mock.calls[0]).toHaveLength(1);
    expect(result.data?.url).toBe("https://aquakart.co.in/pay/tok");
    expect(result.data?.link.linkId).toBe("l1");
    expect(result.data?.link).not.toHaveProperty("url");
  });

  it("gets the latest link (null when none) with matchesDocument", async () => {
    const none = transport({
      get: { data: { success: true, data: { link: null } } },
    });
    expect(
      (await createPaymentLinksService(none).get("pre_invoice", "p1")).data,
    ).toBeNull();
    expect(none.get).toHaveBeenCalledWith("/pre-invoices/p1/payment-link");

    const stale = transport({
      get: {
        data: {
          success: true,
          data: { link: { ...LINK, matchesDocument: false } },
        },
      },
    });
    const result = await createPaymentLinksService(stale).get(
      "pre_invoice",
      "p1",
    );
    expect(result.data?.matchesDocument).toBe(false);
  });

  it("revokes and reports the count", async () => {
    const t = transport({
      delete: { data: { success: true, data: { revoked: 1 } } },
    });
    const result = await createPaymentLinksService(t).revoke(
      "pre_invoice",
      "p1",
    );
    expect(t.delete).toHaveBeenCalledWith("/pre-invoices/p1/payment-link");
    expect(result.data?.revoked).toBe(1);
  });

  it("keeps error codes and details (NOT_PAYABLE reason)", async () => {
    const t = transport({
      post: {
        error: "Not payable",
        status: 409,
        code: "NOT_PAYABLE",
        details: { reason: "ZERO_TOTAL" },
      },
    });
    const result = await createPaymentLinksService(t).create(
      "pre_invoice",
      "p1",
    );
    expect(result.code).toBe("NOT_PAYABLE");
    expect(result.details?.reason).toBe("ZERO_TOTAL");
  });

  it("reconciles by payment attempt id", async () => {
    const t = transport({
      post: { data: { success: true, data: { status: "paid" } } },
    });
    await createPaymentLinksService(t).reconcile("att1");
    expect(t.post).toHaveBeenCalledWith("/payments/att1/reconcile");
  });

  it("probes payments.link.manage with a GET that can't match a document", async () => {
    const t = transport({
      get: { status: 404, code: "SOURCE_NOT_FOUND", error: "x" },
    });
    expect(await createPaymentLinksService(t).probeManage()).toBe(true);
    expect(t.get).toHaveBeenCalledWith(
      "/pre-invoices/000000000000000000000000/payment-link",
    );
    const denied = transport({ get: { status: 403, error: "x" } });
    expect(await createPaymentLinksService(denied).probeManage()).toBe(false);
  });
});

describe("api client error details", () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (status: number, body: object) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve(body),
      }),
    );

  it("returns details keyed by field", async () => {
    respond(400, {
      success: false,
      code: "VALIDATION_FAILED",
      message: "Please fix the highlighted fields",
      details: { "products[0].productPrice": "Must be 0 or more" },
    });
    const { api } = await import("./api");
    const result = await api.post("/pre-invoices", {});
    expect(result.code).toBe("VALIDATION_FAILED");
    expect(result.details).toEqual({
      "products[0].productPrice": "Must be 0 or more",
    });
  });

  it("folds a top-level preInvoiceId (QUOTATION_MOVED_TO_PRE_INVOICE) into details", async () => {
    respond(409, {
      success: false,
      code: "QUOTATION_MOVED_TO_PRE_INVOICE",
      message: "This quotation was moved to a pre-invoice",
      preInvoiceId: "64b000000000000000000001",
    });
    const { api } = await import("./api");
    const result = await api.post("/quotations/q1/convert-to-invoice", {});
    expect(result.status).toBe(409);
    expect(result.details?.preInvoiceId).toBe("64b000000000000000000001");
  });

  it("keeps details from backend 049c7c5 (id + number; top-level id too)", async () => {
    respond(409, {
      success: false,
      code: "QUOTATION_MOVED_TO_PRE_INVOICE",
      message: "This quotation was moved to a pre-invoice",
      preInvoiceId: "64b000000000000000000001",
      details: {
        preInvoiceId: "64b000000000000000000001",
        preInvoiceNo: "AQPI|20261118|0001",
      },
    });
    const { api } = await import("./api");
    const result = await api.post("/quotations/q1/convert-to-invoice", {});
    expect(result.details).toEqual({
      preInvoiceId: "64b000000000000000000001",
      preInvoiceNo: "AQPI|20261118|0001",
    });
  });
});
