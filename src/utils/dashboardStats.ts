import type { Invoice } from "../components/modular/invoices/invoice.types";
import { parseInvoiceDate } from "../components/modular/invoices/mapInvoice";
import {
  deliveryStatusOf,
  enrichmentStatusOf,
  paidStatusOf,
  type DeliveryStatus,
  type EnrichmentStatus,
  type PaidStatus,
} from "./invoiceStatus";

/*
 * Pure aggregations for the dashboard. Revenue is the invoice `total_amount`
 * (the same figure the Invoices tab shows), so both screens always agree.
 * Financial years and quarters follow India's April–March year.
 */

export type PeriodKey = "month" | "lastMonth" | "quarter" | "fy" | "all";

export const PERIOD_OPTIONS: {
  key: PeriodKey;
  label: string;
  short: string;
}[] = [
  { key: "month", label: "This month", short: "Month" },
  { key: "lastMonth", label: "Last month", short: "Last mo" },
  { key: "quarter", label: "This quarter", short: "Qtr" },
  { key: "fy", label: "This financial year", short: "FY" },
  { key: "all", label: "All time", short: "All" },
];

export interface DateRange {
  start: Date;
  /** Exclusive. */
  end: Date;
}

export interface PeriodRanges {
  current: DateRange | null;
  /** Same elapsed span of the previous period, so "month so far" compares like for like. */
  previous: DateRange | null;
  comparisonLabel: string;
  label: string;
}

const startOfMonth = (year: number, month: number) => new Date(year, month, 1);
const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);
/** First month (0-based) of the Indian FY quarter containing `month`: Apr, Jul, Oct, Jan. */
const fyQuarterStartMonth = (month: number) => month - ((month - 3 + 12) % 3);
const fyStart = (date: Date) =>
  new Date(
    date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1,
    3,
    1,
  );

/** The selected period, plus the matching earlier span to compare against. */
export const periodRanges = (
  key: PeriodKey,
  now = new Date(),
): PeriodRanges => {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  // The current period is the whole month/quarter/year (matching the Invoices tab's
  // month filter); only the comparison is cut to the same number of elapsed days.
  const toDate = (
    start: Date,
    months: number,
    previousStart: Date,
    comparisonLabel: string,
    label: string,
  ): PeriodRanges => {
    const elapsed = tomorrow.getTime() - start.getTime();
    return {
      current: { start, end: addMonths(start, months) },
      previous: {
        start: previousStart,
        end: new Date(previousStart.getTime() + elapsed),
      },
      comparisonLabel,
      label,
    };
  };

  if (key === "month") {
    const start = startOfMonth(now.getFullYear(), now.getMonth());
    return toDate(
      start,
      1,
      addMonths(start, -1),
      "vs same days last month",
      "This month",
    );
  }
  if (key === "lastMonth") {
    const start = addMonths(
      startOfMonth(now.getFullYear(), now.getMonth()),
      -1,
    );
    return {
      current: { start, end: addMonths(start, 1) },
      previous: { start: addMonths(start, -1), end: start },
      comparisonLabel: "vs the month before",
      label: start.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    };
  }
  if (key === "quarter") {
    const start = new Date(
      now.getFullYear(),
      fyQuarterStartMonth(now.getMonth()),
      1,
    );
    return toDate(
      start,
      3,
      addMonths(start, -3),
      "vs same days last quarter",
      "This quarter",
    );
  }
  if (key === "fy") {
    const start = fyStart(now);
    const label = `FY ${start.getFullYear()}–${String(start.getFullYear() + 1).slice(2)}`;
    return toDate(
      start,
      12,
      new Date(start.getFullYear() - 1, 3, 1),
      "vs same days last FY",
      label,
    );
  }
  return {
    current: null,
    previous: null,
    comparisonLabel: "",
    label: "All time",
  };
};

// Same parser as the Invoices tab, so legacy DD/MM/YYYY dates land in the right month.
const invoiceTime = (invoice: Invoice) =>
  parseInvoiceDate(invoice.date)?.getTime() ?? null;

export const inRange = (invoices: Invoice[], range: DateRange | null) =>
  range
    ? invoices.filter((invoice) => {
        const time = invoiceTime(invoice);
        return (
          time !== null &&
          time >= range.start.getTime() &&
          time < range.end.getTime()
        );
      })
    : invoices;

const amountOf = (invoice: Invoice) => Number(invoice.total_amount) || 0;

export interface Kpis {
  revenue: number;
  invoices: number;
  average: number;
  paidValue: number;
  outstanding: number;
  outstandingCount: number;
}

export const computeKpis = (invoices: Invoice[]): Kpis => {
  const revenue = invoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const unpaid = invoices.filter((invoice) => paidStatusOf(invoice) !== "paid");
  return {
    revenue,
    invoices: invoices.length,
    average: invoices.length ? revenue / invoices.length : 0,
    paidValue:
      revenue - unpaid.reduce((sum, invoice) => sum + amountOf(invoice), 0),
    outstanding: unpaid.reduce((sum, invoice) => sum + amountOf(invoice), 0),
    outstandingCount: unpaid.length,
  };
};

/** Relative change in percent, or null when there's no baseline to compare with. */
export const percentChange = (
  current: number,
  previous: number | null | undefined,
) =>
  previous === null || previous === undefined || previous === 0
    ? null
    : ((current - previous) / previous) * 100;

export interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  revenue: number;
  invoices: number;
}

/** Revenue per calendar month for the last `count` months, ending with the current month. */
export const monthlyTrend = (
  invoices: Invoice[],
  count = 12,
  now = new Date(),
): MonthBucket[] => {
  const first = addMonths(
    startOfMonth(now.getFullYear(), now.getMonth()),
    -(count - 1),
  );
  const buckets: MonthBucket[] = Array.from({ length: count }, (_, index) => {
    const start = addMonths(first, index);
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString("en-IN", { month: "short" }),
      start,
      revenue: 0,
      invoices: 0,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  invoices.forEach((invoice) => {
    const time = invoiceTime(invoice);
    if (time === null) return;
    const date = new Date(time);
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    bucket.revenue += amountOf(invoice);
    bucket.invoices += 1;
  });
  return buckets;
};

export interface StatusShare<S extends string> {
  status: S;
  count: number;
  amount: number;
}

const shares = <S extends string>(
  invoices: Invoice[],
  order: S[],
  statusOf: (invoice: Invoice) => S,
): StatusShare<S>[] =>
  order.map((status) => {
    const matching = invoices.filter((invoice) => statusOf(invoice) === status);
    return {
      status,
      count: matching.length,
      amount: matching.reduce((sum, invoice) => sum + amountOf(invoice), 0),
    };
  });

export const statusShares = (invoices: Invoice[]) => ({
  paid: shares<PaidStatus>(
    invoices,
    ["paid", "partial", "unpaid"],
    paidStatusOf,
  ),
  delivery: shares<DeliveryStatus>(
    invoices,
    ["delivered", "scheduled", "assigned", "pending"],
    deliveryStatusOf,
  ),
  enrichment: shares<EnrichmentStatus>(
    invoices,
    ["enriched", "not-enriched"],
    enrichmentStatusOf,
  ),
});

export interface RankedRow {
  key: string;
  label: string;
  sublabel: string;
  value: number;
  count: number;
}

/**
 * Products by sales value. A line's value is its `productPrice`, which is what
 * `total_amount` sums, so the products add up to the revenue shown above.
 */
export const topProducts = (invoices: Invoice[], limit = 5): RankedRow[] => {
  const map = new Map<string, RankedRow>();
  invoices.forEach((invoice) =>
    invoice.products.forEach((product) => {
      const name = product.productName?.trim() || "Unnamed product";
      const key = name.toLowerCase();
      const row = map.get(key) || {
        key,
        label: name,
        sublabel: "",
        value: 0,
        count: 0,
      };
      row.value += Number(product.productPrice) || 0;
      row.count += Number(product.productQuantity) || 1;
      map.set(key, row);
    }),
  );
  return [...map.values()]
    .map((row) => ({
      ...row,
      sublabel: `${row.count} unit${row.count === 1 ? "" : "s"}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

const phoneKey = (value: unknown) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .replace(/^(?:91(?=\d{10}$)|0(?=\d{10}$))/, "");

/** Customers by invoiced value, matched by phone number (falling back to name). */
export const topCustomers = (invoices: Invoice[], limit = 5): RankedRow[] => {
  const map = new Map<string, RankedRow>();
  invoices.forEach((invoice) => {
    const phone = phoneKey(invoice.customer_phone);
    const key =
      phone || invoice.customer_name.trim().toLowerCase() || invoice.id;
    const row = map.get(key) || {
      key,
      label: invoice.customer_name || "Unknown customer",
      sublabel: "",
      value: 0,
      count: 0,
    };
    row.value += amountOf(invoice);
    row.count += 1;
    map.set(key, row);
  });
  return [...map.values()]
    .map((row) => ({
      ...row,
      sublabel: `${row.count} invoice${row.count === 1 ? "" : "s"}`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/** Rounds an axis maximum up to a clean value (1, 2, 2.5 or 5 × 10^n). */
export const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step =
    [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value) ||
    10;
  return step * magnitude;
};

/** Compact Indian currency: ₹950, ₹12.5K, ₹3.4L, ₹1.2Cr. */
export const formatCompactInr = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};
