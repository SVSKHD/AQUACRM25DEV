import { describe, expect, it, vi } from "vitest";
import type { QuickDraft, QuickDraftProduct } from "../services/invoiceAI";
import {
  blockingProblems,
  lineWarnings,
  reviewTotal,
  toInvoiceLines,
  toReviewLines,
} from "./quickInvoice";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../services/api", () => ({ api: { post } }));
vi.mock("../services/aiService", () => ({
  aiService: {},
  AI_PROMPT_MAX_CHARS: 4000,
  parseAIJsonReply: () => undefined,
}));

const SOFTENER: QuickDraftProduct = {
  productId: "6a6ff135aafb698d0de9966b",
  name: "Aquakart Bathroom Water Softener",
  brand: "Aquakart",
  slug: "bathroom-softener",
  catalogPrice: 15500,
  stock: 3,
};
const WHOLE_HOUSE: QuickDraftProduct = {
  ...SOFTENER,
  productId: "6a6ff135aafb698d0de9966c",
  name: "Whole House Water Softener",
  slug: "whole-house",
  catalogPrice: 45000,
  stock: null,
};

const draft = (
  overrides: Partial<QuickDraft["items"][number]> = {},
): QuickDraft => ({
  customer: { name: "Ravi", phone: "9876543210", email: "", address: "" },
  paidStatus: "",
  paymentType: "",
  notes: [],
  items: [
    {
      line: 1,
      rawName: "bathroo softener",
      quantity: 1,
      quantityAssumed: true,
      unitPrice: 14950,
      priceMissing: false,
      serialNo: "",
      confidence: "high",
      match: SOFTENER,
      alternatives: [WHOLE_HOUSE],
      ...overrides,
    },
  ],
});

const customer = { name: "Ravi", phone: "9876543210" };

describe("quick invoice review", () => {
  it("keeps the typed price and stores the line value on the invoice line", () => {
    const lines = toReviewLines(draft({ quantity: 2, quantityAssumed: false }));
    expect(blockingProblems(lines, customer)).toEqual([]);
    expect(reviewTotal(lines)).toBe(29900);
    const [line] = toInvoiceLines(lines, [
      {
        id: SOFTENER.productId,
        name: "Bathroom Softener",
        price: 15500,
        slug: "bs",
        link: "https://x/bs",
      },
    ]);
    expect(line).toMatchObject({
      productName: "Bathroom Softener",
      productQuantity: 2,
      productPrice: 29900,
      productId: SOFTENER.productId,
      productSlug: "bs",
      productLink: "https://x/bs",
    });
  });

  it("blocks when the price was not sent", () => {
    const lines = toReviewLines(draft({ unitPrice: null, priceMissing: true }));
    expect(lines[0].price).toBe("");
    const problems = blockingProblems(lines, customer);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ line: 1 });
    expect(problems[0].message).toMatch(/Price not sent/);
    lines[0].price = "14950";
    expect(blockingProblems(lines, customer)).toEqual([]);
  });

  it("blocks on stock: missing record or not enough", () => {
    const lines = toReviewLines(draft({ quantity: 5 }));
    expect(blockingProblems(lines, customer)[0].message).toMatch(
      /only 3 in stock/,
    );
    lines[0].choice = WHOLE_HOUSE.productId;
    lines[0].quantity = 1;
    expect(blockingProblems(lines, customer)[0].message).toMatch(
      /no CRM stock record/,
    );
    lines[0].choice = ""; // custom item: no stock check, but a warning
    expect(blockingProblems(lines, customer)).toEqual([]);
    expect(lineWarnings(lines[0])[0]).toMatch(/Custom item/);
    expect(toInvoiceLines(lines, [])[0]).toMatchObject({
      productName: "bathroo softener",
      productId: "",
    });
  });

  it("needs a name and a 10-digit mobile number", () => {
    const lines = toReviewLines(draft());
    const problems = blockingProblems(lines, { name: " ", phone: "98765" });
    expect(problems.map((p) => p.message)).toEqual([
      "Customer name is missing.",
      "A 10-digit mobile number is needed to send it.",
    ]);
  });

  it("warns when the typed price is far from the catalog price", () => {
    const lines = toReviewLines(draft({ unitPrice: 5000 }));
    expect(lineWarnings(lines[0])[0]).toMatch(/25% away/);
    expect(lineWarnings(toReviewLines(draft())[0])).toEqual([]);
  });
});

describe("requestQuickDraft", () => {
  it("posts the text and returns the draft", async () => {
    const { requestQuickDraft } = await import("../services/invoiceAI");
    post.mockResolvedValueOnce({
      data: { success: true, data: draft() },
      status: 200,
    });
    const result = await requestQuickDraft(
      "  Ravi 9876543210 bathroo softener 14950 ",
    );
    expect(post).toHaveBeenCalledWith("/ai/invoice/quick-draft", {
      text: "Ravi 9876543210 bathroo softener 14950",
    });
    expect(result.data?.items[0].unitPrice).toBe(14950);
  });

  it("explains a missing backend route instead of a generic failure", async () => {
    const { requestQuickDraft } = await import("../services/invoiceAI");
    post.mockResolvedValueOnce({ error: "Not found", status: 404 });
    expect((await requestQuickDraft("x")).error).toMatch(
      /isn't available on the server/,
    );
    expect((await requestQuickDraft("   ")).error).toMatch(/Paste/);
  });
});
