import { describe, expect, it } from "vitest";
import { matchesInvoiceSearch, parseInvoiceSearch } from "./invoiceSearch";

const invoice = [
  "AQ-1024",
  "Ravi Kumar",
  9876543210,
  "Ravi@Example.com",
  "Flat 12, Kondapur, Hyderabad 500084",
  "36AABCU9603R1ZM",
  "Ravi Traders Pvt Ltd",
  "Bathroom Water Softener",
  14950,
  null,
  undefined,
];

const finds = (query: string) =>
  matchesInvoiceSearch(invoice, parseInvoiceSearch(query));

describe("invoice search", () => {
  it("ignores case both ways", () => {
    expect(finds("ravi kumar")).toBe(true);
    expect(finds("RAVI KUMAR")).toBe(true);
    expect(finds("ravi@example.com")).toBe(true);
    expect(finds("36aabcu9603r1zm")).toBe(true);
  });

  it("matches every word in any order, across fields", () => {
    expect(finds("softener ravi")).toBe(true);
    expect(finds("kondapur 500084")).toBe(true);
    expect(finds("ravi purifier")).toBe(false);
  });

  it("ignores spaces, dashes and the +91 prefix inside values", () => {
    expect(finds("98765 43210")).toBe(true);
    expect(finds("+91 9876543210")).toBe(true);
    expect(finds("+919876543210")).toBe(true);
    expect(finds("aq1024")).toBe(true);
    expect(finds("36AABCU 9603R1ZM")).toBe(true);
  });

  it("does not join digits from different fields", () => {
    // 14950 (price) followed by nothing; "500084 98765" must not match as one number.
    expect(finds("50008498765")).toBe(false);
  });

  it("empty search matches everything", () => {
    expect(finds("   ")).toBe(true);
  });
});
