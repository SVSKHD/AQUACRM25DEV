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
