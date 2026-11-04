import { describe, it, expect } from "vitest";
import { parseInvoiceBlock } from "./parseInvoiceBlock.js";

describe("parseInvoiceBlock", () => {
  it("parses address, name, phone in original order", () => {
    const result = parseInvoiceBlock(
      ["Janapriya utopia", "Hithesh", "9553419654"].join("\n"),
    );
    expect(result.name).toBe("Hithesh");
    expect(result.address).toBe("Janapriya utopia");
    expect(result.phone).toBe("9553419654");
  });

  it("handles jumbled order with name first", () => {
    const result = parseInvoiceBlock(
      ["Hithesh", "Janapriya utopia", "9553419654"].join("\n"),
    );
    expect(result.name).toBe("Hithesh");
    expect(result.address).toBe("Janapriya utopia");
    expect(result.phone).toBe("9553419654");
  });

  it("handles jumbled order with phone first", () => {
    const result = parseInvoiceBlock(
      ["9553419654", "Hithesh", "Janapriya utopia"].join("\n"),
    );
    expect(result.name).toBe("Hithesh");
    expect(result.address).toBe("Janapriya utopia");
    expect(result.phone).toBe("9553419654");
  });

  it("normalizes phone with +91 prefix and spaces to 10 digits", () => {
    const result = parseInvoiceBlock(
      ["Hithesh", "Janapriya utopia", "+91 95534 19654"].join("\n"),
    );
    expect(result.phone).toBe("9553419654");
  });

  it("joins multi-line address with ', '", () => {
    const result = parseInvoiceBlock(
      [
        "Hithesh",
        "Janapriya utopia",
        "Miyapur",
        "Hyderabad",
        "9553419654",
      ].join("\n"),
    );
    expect(result.name).toBe("Hithesh");
    expect(result.address).toBe("Janapriya utopia, Miyapur, Hyderabad");
    expect(result.phone).toBe("9553419654");
  });

  it("captures a 6-digit pincode", () => {
    const result = parseInvoiceBlock(
      ["Hithesh", "Janapriya utopia", "500049", "9553419654"].join("\n"),
    );
    expect(result.pincode).toBe("500049");
    expect(result.address).toBe("Janapriya utopia");
  });

  it("captures an email line", () => {
    const result = parseInvoiceBlock(
      ["Hithesh", "Janapriya utopia", "hithesh@example.com", "9553419654"].join(
        "\n",
      ),
    );
    expect(result.email).toBe("hithesh@example.com");
    expect(result.name).toBe("Hithesh");
  });

  it("returns empty fields for empty input", () => {
    expect(parseInvoiceBlock("")).toEqual({
      name: "",
      address: "",
      phone: "",
      pincode: "",
      email: "",
    });
    expect(parseInvoiceBlock("   \n\n   ")).toEqual({
      name: "",
      address: "",
      phone: "",
      pincode: "",
      email: "",
    });
  });

  it("extracts only phone when phone-only input is given", () => {
    const result = parseInvoiceBlock("9553419654");
    expect(result.phone).toBe("9553419654");
    expect(result.name).toBe("");
    expect(result.address).toBe("");
    expect(result.pincode).toBe("");
    expect(result.email).toBe("");
  });
});

describe("parseInvoiceBlock formatting", () => {
  it("splits a single comma-separated line and pulls inline numbers", () => {
    const result = parseInvoiceBlock(
      "hithesh sunkara, Flat 12 Janapriya Utopia, Miyapur, Hyderabad - 500049, +91 95534-19654",
    );
    expect(result.name).toBe("Hithesh Sunkara");
    expect(result.phone).toBe("9553419654");
    expect(result.pincode).toBe("500049");
    expect(result.address).toBe("Flat 12 Janapriya Utopia, Miyapur, Hyderabad");
  });

  it("reads labelled WhatsApp-style messages", () => {
    const result = parseInvoiceBlock(
      [
        "Name: RAVI KUMAR",
        "Ph: 98480 12345",
        "Email: Ravi.K@Example.com",
        "Address: 3-4-56, Kukatpally, Hyd 500 072",
      ].join("\n"),
    );
    expect(result.name).toBe("Ravi Kumar");
    expect(result.phone).toBe("9848012345");
    expect(result.email).toBe("ravi.k@example.com");
    expect(result.pincode).toBe("500072");
    expect(result.address).toBe("3-4-56, Kukatpally, Hyd");
  });

  it("separates a phone written on the name line", () => {
    const result = parseInvoiceBlock(
      ["Hithesh Mob: 9553419654", "Plot 4, Madhapur"].join("\n"),
    );
    expect(result.name).toBe("Hithesh");
    expect(result.phone).toBe("9553419654");
    expect(result.address).toBe("Plot 4, Madhapur");
  });

  it("does not take an address word line as the name", () => {
    const result = parseInvoiceBlock(
      ["Hyderabad", "Anil Reddy", "9553419654"].join("\n"),
    );
    expect(result.name).toBe("Anil Reddy");
    expect(result.address).toBe("Hyderabad");
  });

  it("keeps mixed-case names as typed", () => {
    expect(parseInvoiceBlock("McDonald Rao\n9553419654").name).toBe(
      "McDonald Rao",
    );
  });
});
