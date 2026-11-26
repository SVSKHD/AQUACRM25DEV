// @vitest-environment node
import { jsPDF, type jsPDFOptions } from "jspdf";
import { describe, expect, it } from "vitest";
import {
  createPublicInvoicePdfDocument,
  getInvoiceTaxSummary,
  getUnitPrice,
  toPdfText,
} from "./invoicePdf";

const invoice = {
  invoice_no: "AQBKSJwVvUCSp|14112026",
  date: "2026-11-14",
  payment_type: "cash",
  paid_status: "unpaid",
  gst: true,
  customer_name: "Interia Infrastructure Private Limited",
  customer_phone: "8179267923",
  customer_address:
    "M⁄S Visco information technology services pvt ltd, knowledge city salapuria sattva knowledge city 9th floor unit 2A/1(octave block) parcel 4, silpa gram craft village, madhapur, telangana 500032, GST:36AAKCV7620c1zc",
  gst_name: "INTERIA INFRASTRUCTURE PRIVATE LIMITED",
  gst_no: "36AADCI2521A1ZA",
  gst_address:
    "SS Enclave, 1st Floor, Plot No.44, Jayabheri Enclave Phase - 2, Gachibowli, Telangana - 500032",
  products: [
    {
      productName: "Kent Automatic 8L | Aquakart",
      productQuantity: 3,
      productPrice: 94500,
    },
  ],
};

// Uncompressed so the text operators can be read back.
class PlainPdf extends jsPDF {
  constructor(options: jsPDFOptions) {
    super({ ...options, compress: false });
  }
}

const pageText = (doc: jsPDF) =>
  doc
    .output()
    .split("\n")
    .filter((line) => line.endsWith("Tj"))
    .join("\n");

describe("getUnitPrice", () => {
  it("divides the line value by quantity (productPrice is the line value)", () => {
    expect(getUnitPrice({ productPrice: 94500, productQuantity: 3 })).toBe(
      31500,
    );
  });

  it("falls back to the line value when quantity is missing or zero", () => {
    expect(getUnitPrice({ productPrice: 1200, productQuantity: 0 })).toBe(1200);
    expect(getUnitPrice({ productPrice: 1200 })).toBe(1200);
  });
});

describe("toPdfText", () => {
  it("maps characters Helvetica cannot draw instead of printing '?'", () => {
    expect(toPdfText("M⁄S ‘Visco’ – ／")).toBe("M/S 'Visco' - /");
    expect(toPdfText("₹500")).toBe("INR 500");
    expect(toPdfText("Café")).toBe("Café");
  });
});

describe("createPublicInvoicePdfDocument", () => {
  it("shows unit price and line total, and no '?' in the bill-to address", () => {
    const doc = createPublicInvoicePdfDocument(PlainPdf, invoice);
    const text = pageText(doc);

    expect(text).toContain("UNIT PRICE");
    expect(text).toContain("(31,500.00)");
    expect(text).toContain("INR 94,500.00");
    // Line taxable + GST add up to the invoice total.
    expect(text).toContain("TAXABLE VALUE");
    expect(text).toContain("(80,084.75)");
    expect(text).toContain("(14,415.25)");
    expect(text).toContain("Place of supply: Telangana \\(36\\)");
    expect(text).toContain("ORIGINAL FOR RECIPIENT");
    expect(text).toContain("Authorised Signatory");
    // Unpaid, non-PO invoice gets the DUE stamp.
    expect(text).toContain("(DUE)");
    expect(text).toContain("M/S Visco");
    expect(text).not.toContain("M?S");
  });

  it("titles a quotation as a quotation and stamps it", () => {
    const text = pageText(
      createPublicInvoicePdfDocument(PlainPdf, { ...invoice, quotation: true }),
    );
    expect(text).toContain("(QUOTATION)");
    expect(text).not.toContain("GST TAX INVOICE");
    expect(text).not.toContain("ORIGINAL FOR RECIPIENT");
  });

  it("stamps paid purchase orders PAID", () => {
    const text = pageText(
      createPublicInvoicePdfDocument(PlainPdf, {
        ...invoice,
        po: true,
        paid_status: "paid",
      }),
    );
    expect(text).toContain("(PAID)");
  });

  it("continues a long item list onto another page", () => {
    const products = Array.from({ length: 25 }, (_, index) => ({
      productName: `Softener model ${index + 1} with a fairly long product name`,
      productQuantity: 2,
      productPrice: 1000 + index,
      productSerialNo: `SN-${index}`,
    }));
    const doc = createPublicInvoicePdfDocument(PlainPdf, {
      ...invoice,
      products,
    });
    const text = pageText(doc);
    expect(text).toContain("GST TAX INVOICE / CONTINUED");
    expect(text).toContain("(25)");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });

  it("renders a retail invoice with no products from total_amount", () => {
    const doc = createPublicInvoicePdfDocument(PlainPdf, {
      ...invoice,
      gst: false,
      gst_no: "",
      products: [],
      total_amount: 1180,
    });
    const text = pageText(doc);
    expect(text).toContain("RETAIL TAX INVOICE");
    expect(text).toContain("No products were attached to this invoice.");
    expect(text).toContain("INR 1,180.00");
    expect(text).toContain("INR 1,000.00");
  });
});

describe("getInvoiceTaxSummary", () => {
  it("never multiplies the line value by quantity and adds up to the paisa", () => {
    const { lineTaxes, totals } = getInvoiceTaxSummary({
      products: [
        { productName: "Softener", productQuantity: 3, productPrice: 94500 },
        { productName: "Filter", productQuantity: 1, productPrice: 999 },
      ],
    });
    expect(totals.grand).toBe(95499);
    expect(lineTaxes[0].basePrice + lineTaxes[0].gstValue).toBe(94500);
    expect(totals.taxable + totals.gst).toBeCloseTo(95499, 2);
    expect(totals.cgst + totals.sgst).toBeCloseTo(totals.gst, 2);
    expect(totals.taxable).toBeCloseTo(
      lineTaxes[0].basePrice + lineTaxes[1].basePrice,
      2,
    );
  });
});
