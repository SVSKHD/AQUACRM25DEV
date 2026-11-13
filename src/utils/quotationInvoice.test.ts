import { describe, expect, it } from "vitest";
import {
  invoiceLineValues,
  invoicePreviewLines,
  quotationInvoiceProblems,
  quotationLineTotal,
} from "./quotationInvoice";

const products = [
  {
    productName: "Softener",
    productQuantity: 2,
    productPrice: 10000,
    productDiscount: 1000,
  },
  { productName: "Plumbing", productQuantity: 1, productPrice: 1000 },
];

describe("quotation → invoice preview", () => {
  it("line total is qty x price minus discount plus tax", () => {
    expect(
      quotationLineTotal({
        productQuantity: 3,
        productPrice: 100,
        productDiscount: 50,
        productTax: 18,
      }),
    ).toBe(268);
  });

  it("uses the line value as invoice productPrice", () => {
    expect(invoicePreviewLines({ products })).toEqual([
      { productName: "Softener", productQuantity: 2, lineValue: 19000 },
      { productName: "Plumbing", productQuantity: 1, lineValue: 1000 },
    ]);
  });

  it("spreads quotation discount/tax so the total matches", () => {
    const values = invoiceLineValues({ products, discount: 1000, tax: 333.33 });
    const total = values.reduce((sum, value) => sum + value, 0);
    expect(Math.round(total * 100) / 100).toBe(19333.33);
  });

  it("lists problems the backend would reject", () => {
    expect(
      quotationInvoiceProblems({
        customerDetails: { name: "Ravi", phone: 9876543210 },
        products,
      }),
    ).toEqual([]);
    expect(
      quotationInvoiceProblems({
        customerDetails: { name: "", phone: 12345 },
        products: [],
        gst: true,
        gstDetails: {},
      }),
    ).toHaveLength(5);
  });
});
