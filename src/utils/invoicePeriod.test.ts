import { describe, expect, it } from "vitest";
import {
  countByPeriod,
  monthGrid,
  parsePeriodValue,
  periodOptions,
  periodValue,
  shiftMonth,
} from "./invoicePeriod";

describe("invoice period picker", () => {
  it("round-trips values", () => {
    for (const period of [
      { year: "all", month: "all" },
      { year: 2026, month: "all" },
      { year: 2026, month: 3 },
    ] as const) {
      expect(parsePeriodValue(periodValue(period))).toEqual(period);
    }
    expect(periodValue({ year: 2026, month: 3 })).toBe("2026-03");
    expect(parsePeriodValue("junk")).toEqual({ year: "all", month: "all" });
  });

  it("lists years then their months, newest first, no future months", () => {
    const counts = countByPeriod([
      new Date(2026, 10, 3),
      new Date(2026, 10, 21),
      new Date(2025, 0, 9),
      null,
    ]);
    const options = periodOptions([2025, 2026], counts, new Date(2026, 10, 21));
    expect(options[0]).toEqual({ value: "all", label: "All time (4)" });
    expect(options[1]).toEqual({
      value: "2026",
      label: "2026 · full year (2)",
    });
    expect(options[2]).toEqual({
      value: "2026-11",
      label: "November 2026 (2)",
    });
    expect(options.some((option) => option.value === "2026-12")).toBe(false);
    const year2025 = options.findIndex((option) => option.value === "2025");
    expect(options[year2025 + 1].value).toBe("2025-12");
    expect(options[options.length - 1]).toEqual({
      value: "2025-01",
      label: "January 2025 (1)",
    });
  });
});

describe("calendar helpers", () => {
  it("builds a Monday-first grid in whole weeks", () => {
    const grid = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, 1]);
    expect(grid.filter(Boolean)).toHaveLength(30);
  });

  it("steps across year ends", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
