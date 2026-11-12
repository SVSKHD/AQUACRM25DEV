import { describe, expect, it } from "vitest";
import {
  buildAutoFixPrompt,
  focusPhrase,
  hasPhrase,
  parseAutoFix,
  scoreBlogSeo,
  type BlogSeoInput,
} from "./blogSeo";

const words = (n: number, filler = "water") =>
  Array.from({ length: n }, () => filler).join(" ");

const GOOD: BlogSeoInput = {
  title: "Water Softener Guide: Choosing One for Hyderabad Homes",
  slug: "water-softener-guide-hyderabad",
  shortDescription:
    "Our water softener guide explains hardness, capacity and installation so Hyderabad families can pick the right softener and protect their pipes.",
  keywords: "water softener, hard water, softener price, kent softener",
  keyphrases: "water softener guide, hard water hyderabad",
  tags: "guide",
  summary: "",
  keyHighlights: "",
  description: `<p>This water softener guide helps you choose. ${words(300)}</p><h2>Why a water softener guide matters</h2><p>${words(320)} <a href="/products/kent-softener">Kent softener</a> <a href="https://aquakart.co.in/category/softeners">softeners</a></p>`,
  hasTitleImage: true,
};

const EMPTY: BlogSeoInput = {
  title: "",
  slug: "",
  shortDescription: "",
  keywords: "",
  keyphrases: "",
  tags: "",
  summary: "",
  keyHighlights: "",
  description: "",
  hasTitleImage: false,
};

describe("scoreBlogSeo", () => {
  it("scores a well-optimised blog 100 with every check passing", () => {
    const report = scoreBlogSeo(GOOD);
    expect(report.focus).toBe("water softener guide");
    expect(report.checks.filter((c) => c.status !== "pass")).toEqual([]);
    expect(report.score).toBe(100);
  });

  it("scores an empty blog 0", () => {
    const report = scoreBlogSeo(EMPTY);
    expect(report.score).toBe(0);
    expect(report.checks.every((c) => c.status === "fail")).toBe(true);
  });

  it("gives partial credit and a hint for a long title and short article", () => {
    const report = scoreBlogSeo({
      ...GOOD,
      title: `${GOOD.title} — everything you need to know before buying in 2026`,
      description: `<p>water softener guide ${words(200)}</p>`,
    });
    const title = report.checks.find((c) => c.id === "title-length")!;
    expect(title.status).toBe("warn");
    expect(title.hint).toMatch(/characters/);
    const length = report.checks.find((c) => c.id === "length")!;
    expect(length.status).toBe("warn");
    expect(length.autoFixable).toBe(false);
    expect(report.score).toBeLessThan(100);
    expect(report.score).toBeGreaterThan(50);
  });

  it("falls back to the first keyword when there are no keyphrases", () => {
    expect(
      focusPhrase({ keyphrases: "", keywords: "sand filter, softener" }),
    ).toBe("sand filter");
  });

  it("matches whole phrases ignoring case and punctuation", () => {
    expect(
      hasPhrase("Best Water-Softener Guide!", "water softener guide"),
    ).toBe(true);
    expect(hasPhrase("softeners guide", "softener guide")).toBe(false);
  });
});

describe("Auto fix", () => {
  it("builds a prompt with failing fixable checks and the article text, not HTML", () => {
    const input = { ...GOOD, title: "Softeners" };
    const prompt = buildAutoFixPrompt(input, scoreBlogSeo(input), {
      category: "Water Softeners",
    });
    expect(prompt).toMatch(/Keyphrase in title/);
    expect(prompt).toMatch(/"category": "Water Softeners"/);
    expect(prompt).not.toMatch(/<h2>/);
    expect(prompt).not.toMatch(/Article at least/); // not auto-fixable
  });

  it("cleans the AI reply and drops unchanged or empty fields", () => {
    const proposal = parseAutoFix(
      {
        title: "  Water Softener Guide for Hyderabad Homes  ",
        slug: "Water Softener Guide!!",
        keywords: ["water softener", " hard water "],
        keyHighlights: "- Removes hardness\n2. Protects geysers\n",
        shortDescription: GOOD.shortDescription,
        tags: "",
        summary: "x".repeat(1500),
        unknown: "ignored",
      },
      GOOD,
    );
    expect(proposal).toEqual({
      title: "Water Softener Guide for Hyderabad Homes",
      slug: "water-softener-guide",
      keywords: "water softener, hard water",
      keyHighlights: "Removes hardness\nProtects geysers",
      summary: "x".repeat(1000),
    });
  });

  it("returns nothing for a non-object reply", () => {
    expect(parseAutoFix("nope", GOOD)).toEqual({});
    expect(parseAutoFix(null, GOOD)).toEqual({});
  });
});
