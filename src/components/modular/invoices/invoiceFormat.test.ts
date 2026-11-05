import { describe, expect, it } from "vitest";
import { amountCaret, cleanAmount, formatAmountText } from "./invoiceFormat";

/** Simulate typing `key` at the caret of the shown text, like AmountInput does. */
const typeAt = (shown: string, caret: number, key: string) => {
  const value = shown.slice(0, caret) + key + shown.slice(caret);
  const position = caret + key.length;
  const typed = value.replace(/[^\d.]/g, "");
  const raw = cleanAmount(value);
  const before = value.slice(0, position).replace(/[^\d.]/g, "").length;
  const count = Math.min(
    raw.length,
    Math.max(0, before + raw.length - typed.length),
  );
  const next = formatAmountText(raw);
  return { raw, shown: next, caret: amountCaret(next, count) };
};

const typeAll = (keys: string) => {
  let state = { raw: "", shown: "", caret: 0 };
  for (const key of keys) state = typeAt(state.shown, state.caret, key);
  return state;
};

describe("invoice amount input", () => {
  it("keeps digits in the order they are typed", () => {
    expect(typeAll("12").raw).toBe("12");
    expect(typeAll("125000").raw).toBe("125000");
    expect(typeAll("125000").shown).toBe("₹ 1,25,000");
  });

  it("handles decimals, including a leading dot", () => {
    expect(typeAll("1250.75").raw).toBe("1250.75");
    expect(typeAll(".5").raw).toBe("0.5");
    expect(typeAll("12.345").raw).toBe("12.34");
  });

  it("drops leading zeros and stray characters", () => {
    expect(cleanAmount("₹ 0012a3")).toBe("123");
    expect(cleanAmount("1.2.3")).toBe("1.23");
    expect(cleanAmount("")).toBe("");
  });

  it("inserts in the middle at the caret, past grouping commas", () => {
    // "₹ 1,000" with the caret after "1" → type 2 → 12000
    const start = formatAmountText("1000");
    const result = typeAt(start, 3, "2");
    expect(result.raw).toBe("12000");
    expect(result.shown).toBe("₹ 12,000");
    expect(result.caret).toBe(4); // right after the 2
  });

  it("puts the caret at the end after typing at the end", () => {
    const result = typeAll("12345");
    expect(result.caret).toBe(result.shown.length);
  });
});
