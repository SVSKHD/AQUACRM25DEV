import { describe, expect, it } from "vitest";
import {
  describeGstin,
  fillEmptyGstFields,
  findGstDetails,
  gstinCheckDigit,
  normalizeGstin,
} from "./gstin";

// Publicly documented sample GSTINs (valid check digits).
const MAHARASHTRA = "27AAPFU0939F1ZV";
const TELANGANA = "36HEDPS5768R1Z8";

describe("describeGstin", () => {
  it.each([
    [MAHARASHTRA, "Maharashtra", "AAPFU0939F"],
    [TELANGANA, "Telangana", "HEDPS5768R"],
    ["29AAGCB7383J1Z4", "Karnataka", "AAGCB7383J"],
  ])("accepts %s (%s)", (gstin, state, pan) => {
    expect(describeGstin(gstin)).toEqual({
      valid: true,
      gstin,
      stateCode: gstin.slice(0, 2),
      state,
      pan,
    });
  });

  it("normalises spaces and lower case", () => {
    expect(describeGstin(" 27aapfu0939f1zv ").valid).toBe(true);
    expect(normalizeGstin("36 hedps 5768 r1z8")).toBe(TELANGANA);
  });

  it("catches a mistyped character with the check digit", () => {
    const typo = "27AAPFU0938F1ZV"; // 9 → 8
    const info = describeGstin(typo);
    expect(info.valid).toBe(false);
    expect(info.valid ? "" : info.reason).toMatch(/check digit/);
    expect(gstinCheckDigit(MAHARASHTRA.slice(0, 14))).toBe("V");
  });

  it("rejects an unknown state code, a bad shape and short input", () => {
    const badState = describeGstin("00AAPFU0939F1ZV");
    expect(badState.valid ? "" : badState.reason).toMatch(/state code/);
    const badShape = describeGstin("27AAPFU0939F1XV");
    expect(badShape.valid ? "" : badShape.reason).toMatch(/doesn't look like/);
    const short = describeGstin("27AAPFU");
    expect(short.valid ? "" : short.reason).toMatch(/15 characters \(7/);
  });
});

describe("findGstDetails", () => {
  const invoices = [
    {
      id: "old",
      invoice_no: "AQ-101",
      date: "05/01/2026",
      gst_no: MAHARASHTRA,
      gst_name: "Old Name Pvt Ltd",
      gst_phone: "9876543210",
      gst_email: "old@example.com",
      gst_address: "1 Old Road, Mumbai",
    },
    {
      id: "new",
      invoice_no: "AQ-205",
      date: "2026-10-02",
      gst_no: "27aapfu0939f1zv",
      gst_name: "New Name Pvt Ltd",
      gst_phone: "",
      gst_email: null,
      gst_address: "2 New Road, Mumbai",
    },
    {
      id: "other",
      invoice_no: "AQ-300",
      date: "2026-11-01",
      gst_no: TELANGANA,
      gst_name: "Someone Else",
    },
  ];

  it("takes each field from the newest invoice that has it", () => {
    expect(findGstDetails(MAHARASHTRA, invoices)).toEqual({
      details: {
        gst_name: "New Name Pvt Ltd",
        gst_phone: "9876543210",
        gst_email: "old@example.com",
        gst_address: "2 New Road, Mumbai",
      },
      invoiceNo: "AQ-205",
      date: "2026-10-02",
      count: 2,
    });
  });

  it("skips the invoice being edited", () => {
    const match = findGstDetails(MAHARASHTRA, invoices, { excludeId: "new" });
    expect(match?.invoiceNo).toBe("AQ-101");
    expect(match?.details.gst_name).toBe("Old Name Pvt Ltd");
    expect(
      findGstDetails(TELANGANA, invoices, { excludeId: "other" }),
    ).toBeNull();
  });

  it("returns null for an unseen or incomplete GSTIN", () => {
    expect(findGstDetails("29AAGCB7383J1Z4", invoices)).toBeNull();
    expect(findGstDetails("27AAPFU", invoices)).toBeNull();
  });

  it("ignores a stored phone of 0", () => {
    const match = findGstDetails(TELANGANA, [
      { id: "a", gst_no: TELANGANA, gst_phone: 0, gst_name: "X" },
    ]);
    expect(match?.details).toEqual({ gst_name: "X" });
  });
});

describe("fillEmptyGstFields", () => {
  const match = {
    details: {
      gst_name: "New Name Pvt Ltd",
      gst_phone: "9876543210",
      gst_address: "2 New Road",
    },
  };

  it("fills only empty fields and never overwrites typed values", () => {
    expect(
      fillEmptyGstFields(
        {
          gst_name: "Typed Name",
          gst_phone: "",
          gst_email: "",
          gst_address: "  ",
        },
        match,
      ),
    ).toEqual({ gst_phone: "9876543210", gst_address: "2 New Road" });
  });

  it("returns nothing when every field is already filled", () => {
    expect(
      fillEmptyGstFields(
        { gst_name: "a", gst_phone: "b", gst_email: "c", gst_address: "d" },
        match,
      ),
    ).toEqual({});
  });
});
