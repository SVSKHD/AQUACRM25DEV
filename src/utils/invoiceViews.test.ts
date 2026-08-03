import { describe, expect, it } from "vitest";

import {
  getAdminInvoicePath,
  getCustomerInvoiceUrl,
  resolvePersistedInvoiceId,
} from "./invoiceViews";

describe("invoice view identity", () => {
  it("always prefers the persisted MongoDB _id", () => {
    expect(
      resolvePersistedInvoiceId({
        id: "6a6f00000000000000000000",
        _id: "6a6ff135aafb698d0de9966b",
      }),
    ).toBe("6a6ff135aafb698d0de9966b");
  });

  it("never creates a URL from a temporary invoice id", () => {
    expect(resolvePersistedInvoiceId({ id: "inv-random123" })).toBe("");
  });

  it("builds distinct admin and customer destinations", () => {
    const id = "6a6ff135aafb698d0de9966b";
    expect(getAdminInvoicePath(id)).toBe(`/admin/invoice/${id}`);
    expect(getCustomerInvoiceUrl(id)).toBe(
      `https://aquakart.co.in/invoice/${id}`,
    );
  });
});
