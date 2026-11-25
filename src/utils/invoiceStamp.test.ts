import { describe, expect, it } from "vitest";
import { getInvoiceStamp } from "./invoiceStamp";

describe("getInvoiceStamp", () => {
  it("marks quotations first, whatever the payment status", () => {
    const stamp = getInvoiceStamp({ quotation: true, paid_status: "paid" });
    expect(stamp.key).toBe("quotation");
    expect(stamp.caption).toBe("NOT A TAX INVOICE");
  });

  it("shows PAID in green, naming a purchase order when there is one", () => {
    expect(getInvoiceStamp({ paid_status: "Paid" })).toMatchObject({
      word: "PAID",
      caption: "PAYMENT RECEIVED",
      hex: "#15803d",
    });
    expect(getInvoiceStamp({ po: true, paid_status: "paid" }).caption).toBe(
      "PURCHASE ORDER",
    );
  });

  it("shows PO for unpaid purchase orders and DUE for other unpaid invoices", () => {
    expect(getInvoiceStamp({ po: true, paid_status: "unpaid" }).key).toBe("po");
    expect(getInvoiceStamp({ paid_status: "unpaid" }).key).toBe("due");
    expect(getInvoiceStamp({}).key).toBe("due");
  });
});
