import { describe, expect, it } from "vitest";
import {
  linkStatusSummary,
  normalizeLinkState,
  paymentLinkErrorMessage,
  preInvoiceIdFromError,
  reviewFlagInfo,
  shouldPollLink,
  whatsappShareUrl,
  type PaymentLinkState,
} from "./paymentLink";
import {
  convertToInvoiceErrorMessage,
  movedPreInvoiceId,
  movedPreInvoiceNo,
  moveToPreInvoiceErrorMessage,
  quotationLinkBlockedReason,
  quotationMoveBlockedReason,
  relatedPreInvoiceId,
} from "./quotationPreInvoice";

const raw = (overrides: Record<string, unknown> = {}) => ({
  linkId: "l1",
  status: "active",
  source: { kind: "quotation", id: "q1", number: "AQQ-1" },
  amount: 1500,
  currency: "INR",
  expiresAt: "2026-11-21T10:00:00.000Z",
  createdAt: "2026-11-18T10:00:00.000Z",
  boundToCustomer: true,
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
  ...overrides,
});

const link = (overrides: Record<string, unknown> = {}) =>
  normalizeLinkState(raw(overrides)) as PaymentLinkState;

describe("normalizeLinkState", () => {
  it("keeps the documented fields and never a url/token", () => {
    const state = normalizeLinkState(
      raw({ url: "https://aquakart.co.in/pay/secret", token: "secret" }),
    );
    expect(state).not.toHaveProperty("url");
    expect(state).not.toHaveProperty("token");
    expect(state?.source).toEqual({
      kind: "quotation",
      id: "q1",
      number: "AQQ-1",
    });
    expect(state?.boundToCustomer).toBe(true);
  });

  it("keeps paidAttemptId for Retry invoice (backend 049c7c5)", () => {
    expect(link({ status: "paid", paidAttemptId: "a1" }).paidAttemptId).toBe(
      "a1",
    );
    expect(link({ paidAttemptId: null })).not.toHaveProperty("paidAttemptId");
  });

  it("returns null without a link id and tolerates unknown values", () => {
    expect(normalizeLinkState(null)).toBeNull();
    const odd = link({
      status: "weird",
      conversion: { status: "odd" },
      reviewFlags: ["X", 3],
    });
    expect(odd.status).toBe("revoked");
    expect(odd.conversion.status).toBe("none");
    expect(odd.reviewFlags).toEqual(["X"]);
  });
});

describe("link labels", () => {
  it("summarises for the list", () => {
    expect(linkStatusSummary(null).label).toBe("No link");
    expect(linkStatusSummary(link()).label).toBe("Active");
    expect(linkStatusSummary(link({ matchesDocument: false })).label).toBe(
      "Outdated",
    );
    expect(
      linkStatusSummary(
        link({ status: "paid", reviewFlags: ["DUPLICATE_PAYMENT"] }),
      ).label,
    ).toBe("Needs review");
    expect(linkStatusSummary(link({ status: "expired" })).label).toBe(
      "Expired",
    );
  });

  it("explains every review flag", () => {
    for (const flag of [
      "PHONE_ON_OTHER_ACCOUNT",
      "DUPLICATE_PAYMENT",
      "AMOUNT_CHANGED_AFTER_PAYMENT",
      "PAID_AFTER_REVOKE_OR_EXPIRY",
    ])
      expect(reviewFlagInfo(flag).label).not.toBe(flag);
    expect(reviewFlagInfo("DUPLICATE_PAYMENT").explanation).toMatch(/refund/);
    expect(reviewFlagInfo("NEW_FLAG").label).toBe("NEW_FLAG");
  });

  it("polls only while the state can still change", () => {
    expect(shouldPollLink(link())).toBe(true);
    expect(
      shouldPollLink(
        link({ status: "paid", conversion: { status: "in_progress" } }),
      ),
    ).toBe(true);
    expect(
      shouldPollLink(link({ status: "paid", conversion: { status: "done" } })),
    ).toBe(false);
    expect(shouldPollLink(link({ status: "revoked" }))).toBe(false);
    expect(shouldPollLink(null)).toBe(false);
  });
});

describe("paymentLinkErrorMessage", () => {
  it("explains NOT_PAYABLE reasons", () => {
    const msg = (reason: string) =>
      paymentLinkErrorMessage({
        code: "NOT_PAYABLE",
        details: { reason },
        error: "x",
      });
    expect(msg("ALREADY_PAID")).toMatch(/already paid/);
    expect(msg("ZERO_TOTAL")).toMatch(/zero/);
    expect(msg("MOVED_TO_PRE_INVOICE")).toMatch(/pre-invoice/);
    expect(msg("STATUS_REJECTED")).toMatch(/"rejected"/);
  });

  it("explains the other codes and permission errors", () => {
    expect(paymentLinkErrorMessage({ code: "GATEWAY_DISABLED" })).toMatch(
      /PhonePe/,
    );
    expect(paymentLinkErrorMessage({ code: "CUSTOMER_PHONE_INVALID" })).toMatch(
      /mobile/,
    );
    expect(paymentLinkErrorMessage({ code: "USE_PRE_INVOICE" })).toMatch(
      /pre-invoice/,
    );
    expect(
      paymentLinkErrorMessage({
        code: "USE_PRE_INVOICE",
        details: { preInvoiceId: "p1", preInvoiceNo: "AQPI|20261118|0001" },
      }),
    ).toContain("(AQPI|20261118|0001)");
    expect(paymentLinkErrorMessage({ code: "SOURCE_NOT_FOUND" })).toMatch(
      /wasn't found/,
    );
    expect(
      paymentLinkErrorMessage({
        status: 403,
        error: "Insufficient permission",
      }),
    ).toBe("Insufficient permission");
    expect(preInvoiceIdFromError({ details: { preInvoiceId: "p1" } })).toBe(
      "p1",
    );
  });
});

describe("whatsappShareUrl", () => {
  it("builds wa.me/91<phone> with the encoded message and url", () => {
    const url = whatsappShareUrl({
      phone: "+91 98765 43210",
      customerName: "Ravi",
      documentNumber: "AQPI|20261118|0001",
      amount: "₹1,500.00",
      url: "https://aquakart.co.in/pay/abc",
    });
    expect(url?.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    const text = decodeURIComponent((url as string).split("?text=")[1]);
    expect(text).toContain("Hi Ravi,");
    expect(text).toContain("https://aquakart.co.in/pay/abc");
  });

  it("returns null for a phone that isn't an Indian mobile", () => {
    expect(
      whatsappShareUrl({
        phone: "12345",
        customerName: "",
        documentNumber: "",
        amount: "",
        url: "u",
      }),
    ).toBeNull();
  });
});

describe("quotation → pre-invoice rules", () => {
  it("allows moving open quotations only", () => {
    expect(quotationMoveBlockedReason({ status: "Accepted" })).toBeNull();
    expect(quotationMoveBlockedReason({ status: "Sold" })).toMatch(/Sold/);
    expect(
      quotationMoveBlockedReason({
        status: "Draft",
        convertedToInvoice: { _id: "i" },
      }),
    ).toMatch(/invoice/);
    expect(
      quotationMoveBlockedReason({
        status: "Converted",
        convertedToPreInvoice: "p1",
      }),
    ).toMatch(/pre-invoice/);
  });

  it("reads the stored pre-invoice number, else a populated one", () => {
    expect(
      movedPreInvoiceNo({
        convertedToPreInvoice: "p1",
        convertedToPreInvoiceNo: "AQPI|20261118|0002",
      }),
    ).toBe("AQPI|20261118|0002");
    expect(
      movedPreInvoiceNo({
        convertedToPreInvoice: { _id: "p1", preInvoiceNo: "AQPI|1" },
      }),
    ).toBe("AQPI|1");
    expect(
      movedPreInvoiceNo({
        convertedToPreInvoice: "p1",
        convertedToPreInvoiceNo: null,
      }),
    ).toBe("");
  });

  it("moved quotations have no link of their own", () => {
    expect(movedPreInvoiceId({ convertedToPreInvoice: "p1" })).toBe("p1");
    expect(movedPreInvoiceId({ convertedToPreInvoice: { _id: "p2" } })).toBe(
      "p2",
    );
    expect(
      quotationLinkBlockedReason({
        status: "Converted",
        convertedToPreInvoice: "p1",
      }),
    ).toMatch(/pre-invoice/);
    expect(quotationLinkBlockedReason({ status: "Sent" })).toBeNull();
    expect(quotationLinkBlockedReason({ status: "Expired" })).toMatch(
      /Expired/,
    );
  });

  it("explains move errors", () => {
    expect(
      moveToPreInvoiceErrorMessage({ code: "QUOTATION_ALREADY_MOVED" }),
    ).toMatch(/already has a pre-invoice/);
    expect(
      moveToPreInvoiceErrorMessage({
        code: "QUOTATION_ALREADY_MOVED",
        details: { preInvoiceId: "p1", preInvoiceNo: "AQPI|20261118|0001" },
      }),
    ).toBe("This quotation already has a pre-invoice (AQPI|20261118|0001).");
    expect(
      moveToPreInvoiceErrorMessage({ code: "QUOTATION_ALREADY_INVOICED" }),
    ).toMatch(/invoice/);
    expect(
      moveToPreInvoiceErrorMessage({
        code: "QUOTATION_NOT_MOVABLE",
        error: "A Rejected quotation can't be moved",
      }),
    ).toBe("A Rejected quotation can't be moved");
    expect(
      moveToPreInvoiceErrorMessage({
        code: "VALIDATION_FAILED",
        details: {
          "customerDetails.phone":
            "Enter a valid 10-digit Indian mobile number",
        },
      }),
    ).toMatch(/Fix the quotation first: Enter a valid/);
  });

  it("handles convert-to-invoice 409 QUOTATION_MOVED_TO_PRE_INVOICE", () => {
    const response = {
      code: "QUOTATION_MOVED_TO_PRE_INVOICE",
      error: "This quotation was moved to a pre-invoice",
      details: { preInvoiceId: "p1" },
    };
    expect(convertToInvoiceErrorMessage(response)).toMatch(
      /moved to a pre-invoice.*once the customer pays/,
    );
    expect(relatedPreInvoiceId(response)).toBe("p1");
    expect(
      convertToInvoiceErrorMessage({
        ...response,
        details: { preInvoiceId: "p1", preInvoiceNo: "AQPI|20261118|0001" },
      }),
    ).toContain("moved to a pre-invoice (AQPI|20261118|0001)");
    expect(convertToInvoiceErrorMessage({ error: "Other" })).toBe("Other");
  });
});

describe("send errors", () => {
  it("explain each send failure in plain language", () => {
    expect(paymentLinkErrorMessage({ code: "ALREADY_SENT" })).toContain(
      "Wait a minute",
    );
    expect(
      paymentLinkErrorMessage({ code: "LINK_RESEND_UNAVAILABLE" }),
    ).toContain("Regenerate");
    expect(
      paymentLinkErrorMessage({
        code: "SEND_FAILED",
        error: "Template paused",
      }),
    ).toContain("Template paused");
    expect(
      paymentLinkErrorMessage({ code: "NOTIFICATIONS_NOT_CONFIGURED" }),
    ).toContain("isn't set up");
  });
});
