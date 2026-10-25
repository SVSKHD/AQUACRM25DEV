import { describe, expect, it } from "vitest";
import { mapInvoiceFromApi } from "../components/modular/invoices/mapInvoice";
import {
  computeKpis,
  formatCompactInr,
  inRange,
  monthlyTrend,
  niceMax,
  percentChange,
  periodRanges,
  statusShares,
  topCustomers,
  topProducts,
  type PeriodKey,
} from "./dashboardStats";

const iso = (date?: Date) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "-";

const rangesOf = (key: PeriodKey, now: Date) => {
  const ranges = periodRanges(key, now);
  return [
    ranges.current?.start,
    ranges.current?.end,
    ranges.previous?.start,
    ranges.previous?.end,
  ].map(iso);
};

const raw = (
  date: string,
  total: number,
  extra: Record<string, unknown> = {},
) => ({
  _id: `${date}-${total}`,
  invoiceNo: "AQ",
  date,
  customerDetails: { name: "Ravi", phone: 9876543210 },
  products: [{ productName: "RO", productQuantity: 2, productPrice: total }],
  paidStatus: "paid",
  total_amount: total,
  ...extra,
});

describe("periodRanges (Indian April–March financial year)", () => {
  const now = new Date(2026, 9, 25, 10);

  it("covers the whole current month and compares the same elapsed days", () => {
    expect(rangesOf("month", now)).toEqual([
      "2026-10-01",
      "2026-11-01",
      "2026-09-01",
      "2026-09-26",
    ]);
  });

  it("compares last month with the month before in full", () => {
    expect(rangesOf("lastMonth", now)).toEqual([
      "2026-09-01",
      "2026-10-01",
      "2026-08-01",
      "2026-09-01",
    ]);
  });

  it("uses FY quarters (Oct–Dec, Jan–Mar)", () => {
    expect(rangesOf("quarter", now)).toEqual([
      "2026-10-01",
      "2027-01-01",
      "2026-07-01",
      "2026-07-26",
    ]);
    expect(rangesOf("quarter", new Date(2027, 1, 10)).slice(0, 2)).toEqual([
      "2027-01-01",
      "2027-04-01",
    ]);
  });

  it("starts the financial year in April, including for dates in March", () => {
    expect(rangesOf("fy", now)).toEqual([
      "2026-04-01",
      "2027-04-01",
      "2025-04-01",
      "2025-10-26",
    ]);
    expect(rangesOf("fy", new Date(2027, 2, 15))[0]).toBe("2026-04-01");
    expect(periodRanges("fy", now).label).toBe("FY 2026–27");
  });

  it("has no ranges for all time", () => {
    expect(rangesOf("all", now)).toEqual(["-", "-", "-", "-"]);
  });
});

describe("aggregations over mapped invoices", () => {
  const now = new Date(2026, 9, 25, 10);
  const invoices = [
    raw("05/10/2026", 20000),
    raw("2026-10-20", 10000, {
      firebaseUid: "u1",
      paidStatus: "Partially paid",
      customerDetails: { name: "Ravi", phone: "+91 98765 43210" },
    }),
    raw("12-09-26", 5000),
    raw("2026-10-30", 999),
  ].map(mapInvoiceFromApi);
  const october = inRange(invoices, periodRanges("month", now).current);

  it("parses legacy DD/MM/YYYY and DD-MM-YY dates into the right month", () => {
    expect(october).toHaveLength(3);
    expect(monthlyTrend(invoices, 12, now)[10].revenue).toBe(5000);
  });

  it("keeps the month total equal to that month's bar", () => {
    expect(computeKpis(october).revenue).toBe(
      monthlyTrend(invoices, 12, now)[11].revenue,
    );
  });

  it("splits paid and outstanding value", () => {
    const kpis = computeKpis(october);
    expect([
      kpis.revenue,
      kpis.invoices,
      kpis.paidValue,
      kpis.outstanding,
      kpis.outstandingCount,
    ]).toEqual([30999, 3, 20999, 10000, 1]);
  });

  it("treats productPrice as the line value (never price × quantity)", () => {
    expect(topProducts(october)[0]).toMatchObject({
      label: "RO",
      value: 30999,
      sublabel: "6 units",
    });
  });

  it("merges customers whose phone differs only by +91 and spacing", () => {
    expect(topCustomers(october).map((row) => [row.value, row.count])).toEqual([
      [30999, 3],
    ]);
  });

  it("reads enrichment from invoice_login_linked", () => {
    expect(
      statusShares(october).enrichment.map((share) => share.count),
    ).toEqual([1, 2]);
  });
});

describe("number helpers", () => {
  it("computes percentage change only with a baseline", () => {
    expect([
      percentChange(110, 100),
      percentChange(5, 0),
      percentChange(5, null),
    ]).toEqual([10, null, null]);
  });

  it("rounds axis maxima to clean values", () => {
    expect([niceMax(30999), niceMax(0), niceMax(180000)]).toEqual([
      50000, 1, 200000,
    ]);
  });

  it("formats compact Indian currency", () => {
    expect([
      formatCompactInr(950),
      formatCompactInr(12500),
      formatCompactInr(340000),
      formatCompactInr(12000000),
    ]).toEqual(["₹950", "₹13K", "₹3.4L", "₹1.2Cr"]);
  });
});
