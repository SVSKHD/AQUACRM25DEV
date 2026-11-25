/**
 * The invoices list's single "Period" picker: All time, a whole year, or one
 * month of one year, in one dropdown. Values: "all", "2026", "2026-11".
 */

export type InvoicePeriod = { year: number | "all"; month: number | "all" };

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const monthName = (month: number) => MONTH_NAMES[month - 1] ?? "";

export const periodValue = ({ year, month }: InvoicePeriod): string => {
  if (year === "all") return "all";
  if (month === "all") return String(year);
  return `${year}-${String(month).padStart(2, "0")}`;
};

export const parsePeriodValue = (value: string): InvoicePeriod => {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  if (!match) return { year: "all", month: "all" };
  return {
    year: Number(match[1]),
    month: match[2] ? Number(match[2]) : "all",
  };
};

export const periodLabel = ({ year, month }: InvoicePeriod): string => {
  if (year === "all") return "All time";
  if (month === "all") return `${year} · full year`;
  return `${monthName(month)} ${year}`;
};

/**
 * Newest first: each year, then its months (future months of the current year
 * are left out). `counts` (keyed by period value) adds "(n)" to each label.
 */
export const periodOptions = (
  years: number[],
  counts: Map<string, number> = new Map(),
  today: Date = new Date(),
): { value: string; label: string }[] => {
  const withCount = (value: string, label: string) => {
    const count = counts.get(value);
    return { value, label: count ? `${label} (${count})` : label };
  };
  const options = [withCount("all", "All time")];
  const thisYear = today.getFullYear();
  [...years]
    .sort((a, b) => b - a)
    .forEach((year) => {
      options.push(withCount(String(year), `${year} · full year`));
      const lastMonth =
        year === thisYear ? today.getMonth() + 1 : year > thisYear ? 0 : 12;
      for (let month = lastMonth; month >= 1; month -= 1) {
        const value = periodValue({ year, month });
        options.push(withCount(value, `${monthName(month)} ${year}`));
      }
    });
  return options;
};

/** Month grid, Monday first: leading nulls, then 1…last day, padded to whole weeks. */
export const monthGrid = (year: number, month: number): (number | null)[] => {
  const first = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(lead).fill(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
};

/** Steps a month forward (+1) or back (-1) across year ends. */
export const shiftMonth = (year: number, month: number, step: number) => {
  const date = new Date(year, month - 1 + step, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

/** Counts invoices per year and per month, keyed like periodValue(). */
export const countByPeriod = (dates: (Date | null)[]): Map<string, number> => {
  const counts = new Map<string, number>([["all", dates.length]]);
  const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
  dates.forEach((date) => {
    if (!date) return;
    const year = date.getFullYear();
    bump(String(year));
    bump(periodValue({ year, month: date.getMonth() + 1 }));
  });
  return counts;
};
