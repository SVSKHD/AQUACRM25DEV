import { describe, expect, it } from "vitest";
import {
  cleanPhone,
  docFromText,
  easyProblems,
  emptyEasyDoc,
  localToday,
  looksLikeProductLine,
  mergeQuickDraft,
  mobileOrEmpty,
  productLines,
  newEasyLine,
  toInvoiceForm,
  typedPhone,
  type EasyDoc,
} from "./easyInvoice";
import { buildInvoicePayload, invoiceTotal } from "./invoicePayload";
import type { QuickDraft } from "../services/invoiceAI";

const softener = {
  productId: "64b000000000000000000001",
  name: "Bathroom Water Softener",
  brand: "Aquakart",
  slug: "bathroom-water-softener",
  catalogPrice: 15000,
  stock: 4,
};

const draft = (overrides: Partial<QuickDraft> = {}): QuickDraft => ({
  customer: {
    name: "Ravi Kumar",
    phone: "+91 98765 43210",
    email: "",
    address: "Kondapur 500084",
  },
  paidStatus: "paid",
  paymentType: "upi",
  items: [
    {
      line: 1,
      rawName: "bathroom softener",
      quantity: 2,
      quantityAssumed: false,
      unitPrice: 14950,
      priceMissing: false,
      serialNo: "",
      confidence: "high",
      match: softener,
      alternatives: [],
    },
  ],
  notes: [],
  ...overrides,
});

describe("cleanPhone", () => {
  it("drops +91 / 0 prefixes and separators", () => {
    expect(cleanPhone("+91 98765-43210")).toBe("9876543210");
    expect(cleanPhone("09876543210")).toBe("9876543210");
    expect(cleanPhone("98765 43210")).toBe("9876543210");
  });
});

describe("docFromText", () => {
  it("fills contact details offline and finds no products", () => {
    const doc = docFromText("Ravi Kumar, 98765 43210\nFlat 12, Miyapur 500049");
    expect(doc.customer.phone).toBe("9876543210");
    expect(doc.customer.address).toContain("500049");
    expect(doc.lines).toEqual([]);
    expect(doc.gst).toBeNull();
  });
});

describe("mergeQuickDraft", () => {
  it("takes AI values and lines", () => {
    const merged = mergeQuickDraft(emptyEasyDoc(), draft());
    expect(merged.customer.name).toBe("Ravi Kumar");
    expect(merged.customer.phone).toBe("9876543210");
    expect(merged.paidStatus).toBe("paid");
    expect(merged.paymentType).toBe("upi");
    expect(merged.lines).toHaveLength(1);
    expect(merged.lines[0].choice).toBe(softener.productId);
  });

  it("keeps fields edited by hand while AI was reading", () => {
    const doc: EasyDoc = {
      ...emptyEasyDoc(),
      customer: {
        name: "Ravi K (Kondapur)",
        phone: "",
        email: "a@b.in",
        address: "",
      },
      touched: ["name"],
    };
    const merged = mergeQuickDraft(doc, draft());
    expect(merged.customer.name).toBe("Ravi K (Kondapur)");
    // Empty AI value keeps what was there.
    expect(merged.customer.email).toBe("a@b.in");
  });
});

describe("easyProblems", () => {
  it("is clear for a complete document", () => {
    expect(easyProblems(mergeQuickDraft(emptyEasyDoc(), draft()))).toEqual([]);
  });

  it("blocks a blank custom item and a missing price", () => {
    const doc = mergeQuickDraft(emptyEasyDoc(), draft());
    const withBlank = { ...doc, lines: [...doc.lines, newEasyLine(doc.lines)] };
    const messages = easyProblems(withBlank).map((problem) => problem.message);
    expect(messages).toContain("Type the item name.");
    expect(
      messages.some((message) => message.startsWith("Price not sent")),
    ).toBe(true);
  });

  it("blocks GST without a valid GSTIN or business name", () => {
    const doc = {
      ...mergeQuickDraft(emptyEasyDoc(), draft()),
      gst: { use: true, gstin: "36ABC", name: "", address: "" },
    };
    expect(easyProblems(doc)).toHaveLength(2);
    expect(easyProblems({ ...doc, gst: { ...doc.gst, use: false } })).toEqual(
      [],
    );
  });
});

describe("toInvoiceForm", () => {
  it("stores the line value (qty × unit price) once per line", () => {
    const form = toInvoiceForm(
      mergeQuickDraft(emptyEasyDoc(), draft()),
      [],
      "2026-11-27",
    );
    expect(form.date).toBe("2026-11-27");
    expect(form.customer_phone).toBe(9876543210);
    expect(form.products).toEqual([
      expect.objectContaining({
        productName: "Bathroom Water Softener",
        productQuantity: 2,
        productPrice: 29900,
        productId: softener.productId,
      }),
    ]);
    const payload = buildInvoicePayload(form, invoiceTotal(form.products));
    expect(payload.total_amount).toBe(29900);
    expect(payload.paidStatus).toBe("paid");
    expect(payload.gst).toBe(false);
  });
});

describe("localToday", () => {
  it("uses the local calendar date", () => {
    expect(localToday(new Date(2026, 0, 5, 1, 30))).toBe("2026-01-05");
  });
});

describe("phone is a 10-digit mobile only", () => {
  it("accepts only 10 digits starting 6-9", () => {
    expect(mobileOrEmpty("+91 98765 43210")).toBe("9876543210");
    expect(mobileOrEmpty("2565000")).toBe("");
    expect(mobileOrEmpty("65000")).toBe("");
    expect(mobileOrEmpty("500049")).toBe("");
    expect(mobileOrEmpty("1234567890")).toBe("");
  });

  it("keeps the phone box to 10 digits, letting a +91 prefix be typed", () => {
    expect(typedPhone("98765 43210 99")).toBe("9876543210");
    expect(typedPhone("abc987")).toBe("987");
    expect(typedPhone("+91 9876")).toBe("919876");
    expect(typedPhone("+91 98765432")).toBe("9198765432");
    expect(typedPhone("+91 987654321")).toBe("91987654321");
    expect(typedPhone("+91 9876543210")).toBe("9876543210");
  });
});

describe("pasting a name and a product with no phone", () => {
  const paste = "hithesh svsk\nkent 25l 65000";

  it("keeps the product out of the phone and the address", () => {
    const doc = docFromText(paste);
    expect(doc.customer).toEqual({
      name: "Hithesh Svsk",
      phone: "",
      email: "",
      address: "",
    });
  });

  it("never takes product digits from the AI as the phone", () => {
    const merged = mergeQuickDraft(
      docFromText(paste),
      draft({
        customer: {
          name: "Hithesh Svsk",
          phone: "2565000",
          email: "",
          address: "",
        },
        items: [
          {
            line: 1,
            rawName: "kent 25l",
            quantity: 1,
            quantityAssumed: true,
            unitPrice: 65000,
            priceMissing: false,
            serialNo: "",
            confidence: "none",
            match: null,
            alternatives: [],
          },
        ],
      }),
    );
    expect(merged.customer.phone).toBe("");
    expect(merged.customer.address).toBe("");
    expect(easyProblems(merged).map((p) => p.message)).toContain(
      "A 10-digit mobile number is needed to send it.",
    );
  });

  it("drops an offline address that turns out to be a product", () => {
    const doc = {
      ...emptyEasyDoc(),
      customer: { ...emptyEasyDoc().customer, address: "kent 25l 65000" },
    };
    const merged = mergeQuickDraft(
      doc,
      draft({ customer: { name: "", phone: "", email: "", address: "" } }),
    );
    // draft() item rawName is "bathroom softener", not in the address: kept.
    expect(merged.customer.address).toBe("kent 25l 65000");
    const withKent = mergeQuickDraft(doc, {
      ...draft({ customer: { name: "", phone: "", email: "", address: "" } }),
      items: [{ ...draft().items[0], rawName: "Kent 25L" }],
    });
    expect(withKent.customer.address).toBe("");
  });

  it("tells product lines from address lines", () => {
    expect(looksLikeProductLine("kent 25l 65000")).toBe(true);
    expect(looksLikeProductLine("bathroom softener 14,950")).toBe(true);
    expect(
      looksLikeProductLine("Flat 12, Janapriya Utopia, Miyapur 500049"),
    ).toBe(false);
    expect(looksLikeProductLine("Plot 1234, Road 5, Kondapur")).toBe(false);
    expect(looksLikeProductLine("Ravi Kumar 98765 43210")).toBe(false);
  });
});

describe("productLines", () => {
  it("lists the short product lines being matched", () => {
    expect(
      productLines("hithesh svsk\nkent 25l 65000\npressure pump 2 8500"),
    ).toEqual(["kent 25l 65000", "pressure pump 2 8500"]);
    expect(productLines("Ravi, 9876543210, Kondapur, softener 14950")).toEqual([
      "softener 14950",
    ]);
  });
});
