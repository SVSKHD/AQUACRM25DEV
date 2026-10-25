import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Layers,
  Minus,
  Package,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  categoriesService,
  customersService,
  dealsService,
  invoicesService,
  leadsService,
  productsService,
  stockService,
} from "../../services/apiService";
import priceUtils from "../../utils/priceUtils";
import { useAuth } from "../../contexts/AuthContext";
import TabInnerContent from "../Layout/tabInnerlayout";
import { LiquidButton, LiquidPanel } from "../ui/liquid";
import { extractArrayPayload } from "../../utils/apiPayload";
import type { Invoice } from "../modular/invoices/invoice.types";
import { mapInvoiceFromApi } from "../modular/invoices/mapInvoice";
import {
  DELIVERY_LABELS,
  ENRICHMENT_LABELS,
  PAID_LABELS,
} from "../../utils/invoiceStatus";
import {
  PERIOD_OPTIONS,
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
  type MonthBucket,
  type PeriodKey,
  type RankedRow,
  type StatusShare,
} from "../../utils/dashboardStats";

/*
 * Dashboard ("General Statistics"). Invoice figures reuse the Invoices tab's
 * mapper and status rules, so totals and statuses always match that tab.
 * Chart colours follow the dataviz palette: one blue series hue (#2a78d6 /
 * dark #3987e5), status colours only for good/warning/critical states and
 * always beside an icon and label.
 */

// API payloads come in several list shapes; extractArrayPayload knows the envelopes.
/* eslint-disable @typescript-eslint/no-explicit-any */
const listOf = (payload: any): any[] => extractArrayPayload(payload);

/** Prefers a server-side total (paginated lists) over the page length. */
const countOf = (payload: any) =>
  Number(
    payload?.data?.pagination?.total ??
      payload?.pagination?.total ??
      payload?.data?.total ??
      payload?.total,
  ) || listOf(payload).length;
/* eslint-enable @typescript-eslint/no-explicit-any */

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

interface Counts {
  leads: number;
  customers: number;
  deals: number;
  products: number;
  categories: number;
  stock: number;
}

interface DashboardData {
  invoices: Invoice[];
  counts: Partial<Counts>;
  failed: string[];
}

const SOURCES = [
  ["leads", "Leads", () => leadsService.getAll()],
  ["customers", "Customers", () => customersService.getAll()],
  ["deals", "Deals", () => dealsService.getAll()],
  ["invoices", "Invoices", () => invoicesService.getAll()],
  ["products", "Products", () => productsService.getAll()],
  ["categories", "Categories", () => categoriesService.getAll()],
  ["stock", "Stock", () => stockService.getAllStock()],
] as const;

const loadDashboard = async (): Promise<DashboardData> => {
  const results = await Promise.allSettled(SOURCES.map(([, , load]) => load()));
  const counts: Partial<Counts> = {};
  const failed: string[] = [];
  let invoices: Invoice[] = [];
  results.forEach((result, index) => {
    const [key, label] = SOURCES[index];
    // Services resolve with { error } on HTTP failures rather than throwing.
    const value =
      result.status === "fulfilled"
        ? (result.value as { data?: unknown; error?: unknown })
        : null;
    if (!value || value.error) {
      failed.push(label);
      return;
    }
    if (key === "invoices")
      invoices = listOf(value.data).map(mapInvoiceFromApi);
    else counts[key] = countOf(value.data);
  });
  return { invoices, counts, failed };
};

export default function DashboardOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("month");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await loadDashboard());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const view = useMemo(() => {
    if (!data) return null;
    const ranges = periodRanges(period);
    const current = inRange(data.invoices, ranges.current);
    const previous = ranges.previous
      ? inRange(data.invoices, ranges.previous)
      : null;
    return {
      ranges,
      current,
      kpis: computeKpis(current),
      previousKpis: previous ? computeKpis(previous) : null,
      trend: monthlyTrend(data.invoices),
      shares: statusShares(current),
      products: topProducts(current),
      customers: topCustomers(current),
      allTimeRevenue: computeKpis(data.invoices).revenue,
    };
  }, [data, period]);

  return (
    <TabInnerContent
      title="General Statistics"
      description="How the business is doing, at a glance."
    >
      <div
        className={`space-y-3 transition-opacity ${refreshing && data ? "opacity-60" : ""}`}
      >
        {/* One filter row scopes every figure below. */}
        <div className="flex items-center gap-2">
          <div
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 sm:flex-none"
            role="group"
            aria-label="Period"
          >
            {PERIOD_OPTIONS.map((option) => {
              const active = period === option.key;
              return (
                <LiquidButton
                  key={option.key}
                  type="button"
                  variant={active ? "primary" : "soft"}
                  aria-pressed={active}
                  onClick={() => setPeriod(option.key)}
                  className="shrink-0 whitespace-nowrap"
                >
                  <span className="sm:hidden">{option.short}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </LiquidButton>
              );
            })}
          </div>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={refresh}
            disabled={refreshing}
            className="ml-auto shrink-0"
            aria-label="Refresh statistics"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh</span>
          </LiquidButton>
        </div>

        {data && data.failed.length > 0 && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            Couldn't load {data.failed.join(", ")}. Those figures are hidden;
            everything else is current.
          </p>
        )}

        {!view ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
              <HeroRevenue
                revenue={view.kpis.revenue}
                change={percentChange(
                  view.kpis.revenue,
                  view.previousKpis?.revenue,
                )}
                comparisonLabel={view.ranges.comparisonLabel}
                periodLabel={view.ranges.label}
                allTime={period === "all"}
              />
              <Kpi
                label="Invoices"
                value={view.kpis.invoices.toLocaleString("en-IN")}
                change={percentChange(
                  view.kpis.invoices,
                  view.previousKpis?.invoices,
                )}
              />
              <Kpi
                label="Average invoice"
                value={formatAmount(view.kpis.average)}
                change={percentChange(
                  view.kpis.average,
                  view.previousKpis?.average,
                )}
              />
              <Kpi
                label="Paid value"
                value={formatAmount(view.kpis.paidValue)}
                change={percentChange(
                  view.kpis.paidValue,
                  view.previousKpis?.paidValue,
                )}
              />
              <Kpi
                label="Outstanding"
                hint={`${view.kpis.outstandingCount} unpaid or partial`}
                value={formatAmount(view.kpis.outstanding)}
                change={percentChange(
                  view.kpis.outstanding,
                  view.previousKpis?.outstanding,
                )}
                upIsGood={false}
              />
            </div>
            {view.ranges.comparisonLabel && (
              <p className="-mt-1 px-1 text-[11px] text-slate-500 dark:text-white/50">
                Changes are {view.ranges.comparisonLabel}.
              </p>
            )}

            <div className="grid gap-3 lg:grid-cols-5">
              <RevenueTrend
                buckets={view.trend}
                period={period}
                ranges={view.ranges}
                className="lg:col-span-3"
              />
              <InvoiceHealth
                shares={view.shares}
                total={view.kpis.invoices}
                className="lg:col-span-2"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <RankedBars
                title="Top products"
                subtitle="Sales value in the period"
                rows={view.products}
                empty="No products sold in this period."
              />
              <RankedBars
                title="Top customers"
                subtitle="Invoiced value in the period"
                rows={view.customers}
                empty="No invoices in this period."
              />
            </div>

            <BusinessCounts counts={data?.counts ?? {}} />

            <p className="px-1 text-[11px] text-slate-500 dark:text-white/50">
              All-time invoiced revenue {formatAmount(view.allTimeRevenue)} (
              {priceUtils.numberToWords(view.allTimeRevenue)}).
            </p>
          </>
        )}
      </div>
    </TabInnerContent>
  );
}

// ---------------------------------------------------------------- figures

function Delta({
  change,
  upIsGood = true,
}: {
  change: number | null;
  upIsGood?: boolean;
}) {
  if (change === null) {
    return (
      <span className="text-[11px] text-slate-400 dark:text-white/40">
        no earlier data
      </span>
    );
  }
  const flat = Math.abs(change) < 0.5;
  const good = flat ? null : change > 0 === upIsGood;
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${
        good === null
          ? "text-slate-500 dark:text-white/50"
          : good
            ? "text-[#006300] dark:text-[#0ca30c]"
            : "text-[#d03b3b] dark:text-[#e66767]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {flat
        ? "no change"
        : `${change > 0 ? "+" : ""}${change.toFixed(Math.abs(change) < 10 ? 1 : 0)}%`}
    </span>
  );
}

function HeroRevenue({
  revenue,
  change,
  comparisonLabel,
  periodLabel,
  allTime,
}: {
  revenue: number;
  change: number | null;
  comparisonLabel: string;
  periodLabel: string;
  allTime: boolean;
}) {
  return (
    <LiquidPanel className="col-span-2 flex flex-col justify-between gap-1 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
        Revenue · {periodLabel}
      </p>
      <p className="text-4xl font-black text-neutral-950 dark:text-white sm:text-5xl">
        {formatAmount(revenue)}
      </p>
      {allTime ? (
        <p className="text-xs text-slate-500 dark:text-white/50">
          Every invoice on record
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-white/50">
          <Delta change={change} /> <span>{comparisonLabel}</span>
        </p>
      )}
    </LiquidPanel>
  );
}

function Kpi({
  label,
  value,
  change,
  hint,
  upIsGood = true,
}: {
  label: string;
  value: string;
  change: number | null;
  hint?: string;
  upIsGood?: boolean;
}) {
  return (
    <LiquidPanel className="flex min-w-0 flex-col justify-between gap-1 p-3">
      <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </p>
      <p className="truncate text-xl font-black text-neutral-950 dark:text-white sm:text-2xl">
        {value}
      </p>
      <div className="flex flex-wrap items-center gap-x-2">
        <Delta change={change} upIsGood={upIsGood} />
        {hint && (
          <span className="truncate text-[11px] text-slate-500 dark:text-white/50">
            {hint}
          </span>
        )}
      </div>
    </LiquidPanel>
  );
}

// ---------------------------------------------------------------- charts

function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <LiquidPanel className={`min-w-0 p-3 sm:p-4 ${className}`}>
      <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-white/50">{subtitle}</p>
      )}
      <div className="mt-3">{children}</div>
    </LiquidPanel>
  );
}

/** 12-month revenue columns; months inside the selected period are highlighted. */
function RevenueTrend({
  buckets,
  period,
  ranges,
  className,
}: {
  buckets: MonthBucket[];
  period: PeriodKey;
  ranges: ReturnType<typeof periodRanges>;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...buckets.map((bucket) => bucket.revenue), 0));
  const ticks = [max, max / 2, 0];
  const inPeriod = (bucket: MonthBucket) =>
    period === "all" ||
    Boolean(
      ranges.current &&
      bucket.start < ranges.current.end &&
      new Date(bucket.start.getFullYear(), bucket.start.getMonth() + 1, 1) >
        ranges.current.start,
    );
  const shown = active === null ? null : buckets[active];

  return (
    <ChartCard
      title="Revenue by month"
      subtitle="Last 12 months · highlighted months are in the selected period"
      className={className}
    >
      <div className="relative flex gap-2" onMouseLeave={() => setActive(null)}>
        {/* Y axis: clean ticks, compact values. */}
        <div
          className="flex h-44 w-10 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-[#898781]"
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="-translate-y-1/2 first:translate-y-0 last:translate-y-0"
            >
              {formatCompactInr(tick)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-44">
            {/* Hairline gridlines, solid, recessive. */}
            {ticks.map((tick) => (
              <div
                key={tick}
                className={`absolute inset-x-0 h-px ${tick === 0 ? "bg-[#c3c2b7] dark:bg-[#383835]" : "bg-[#e1e0d9] dark:bg-[#2c2c2a]"}`}
                style={{ bottom: `${(tick / max) * 100}%` }}
                aria-hidden="true"
              />
            ))}
            {/* Bars are focusable list items (hover/focus shows the tooltip), not actions. */}
            <div
              className="absolute inset-0 flex items-end"
              role="list"
              aria-label="Revenue by month"
            >
              {buckets.map((bucket, index) => {
                const highlighted = inPeriod(bucket);
                const height =
                  bucket.revenue > 0
                    ? Math.max((bucket.revenue / max) * 100, 1.5)
                    : 0;
                return (
                  <div
                    key={bucket.key}
                    role="listitem"
                    tabIndex={0}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    aria-label={`${bucket.start.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}: ${formatAmount(bucket.revenue)} from ${bucket.invoices} invoice${bucket.invoices === 1 ? "" : "s"}`}
                    className="group flex h-full flex-1 items-end justify-center rounded-md px-[1px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t transition-opacity ${
                        highlighted
                          ? "bg-[#2a78d6] dark:bg-[#3987e5]"
                          : "bg-[#d6d5cf] dark:bg-[#3a3a37]"
                      } ${active !== null && active !== index ? "opacity-60" : ""}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {shown && active !== null && (
              <div
                className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900"
                style={{ left: `${((active + 0.5) / buckets.length) * 100}%` }}
                role="status"
              >
                <p className="font-bold text-neutral-950 dark:text-white">
                  {shown.start.toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="tabular-nums text-slate-600 dark:text-white/70">
                  {formatAmount(shown.revenue)} · {shown.invoices} invoice
                  {shown.invoices === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
          <div
            className="mt-1 flex text-center text-[10px] text-[#898781]"
            aria-hidden="true"
          >
            {buckets.map((bucket, index) => (
              <span
                key={bucket.key}
                className={`flex-1 ${index % 2 === 1 ? "hidden sm:block" : ""}`}
              >
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
          View as table
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-slate-500 dark:text-white/50">
            <tr>
              <th className="py-1 font-semibold">Month</th>
              <th className="py-1 text-right font-semibold">Revenue</th>
              <th className="py-1 text-right font-semibold">Invoices</th>
            </tr>
          </thead>
          <tbody className="text-neutral-950 dark:text-white/80">
            {buckets.map((bucket) => (
              <tr
                key={bucket.key}
                className="border-t border-slate-100 dark:border-white/5"
              >
                <td className="py-1">
                  {bucket.start.toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-1 text-right">
                  {formatAmount(bucket.revenue)}
                </td>
                <td className="py-1 text-right">{bucket.invoices}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </ChartCard>
  );
}

type Tone = "good" | "warning" | "critical" | "neutral";
const TONE_FILL: Record<Tone, string> = {
  good: "bg-[#0ca30c]",
  warning: "bg-[#fab219]",
  critical: "bg-[#d03b3b]",
  neutral: "bg-[#c3c2b7] dark:bg-[#4a4a46]",
};
const TONE_ICON: Record<Tone, typeof CheckCircle> = {
  good: CheckCircle,
  warning: Clock,
  critical: XCircle,
  neutral: Minus,
};

/** 100% bar of status shares: 2px surface gaps, status colour + icon + label in the legend. */
function ShareBar<S extends string>({
  title,
  shares,
  labels,
  tones,
  measure,
}: {
  title: string;
  shares: StatusShare<S>[];
  labels: Record<S, string>;
  tones: Record<S, Tone>;
  measure: "amount" | "count";
}) {
  const total = shares.reduce((sum, share) => sum + share[measure], 0);
  const lead = shares[0];
  const leadShare = total ? Math.round((lead[measure] / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-neutral-950 dark:text-white">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-white/50">
          <span className="font-bold text-neutral-950 dark:text-white">
            {leadShare}%
          </span>{" "}
          {labels[lead.status].toLowerCase()}
          {measure === "amount" ? " by value" : ""}
        </p>
      </div>
      <div
        className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"
        aria-hidden="true"
      >
        {total > 0 &&
          shares
            .filter((share) => share[measure] > 0)
            .map((share) => (
              <span
                key={share.status}
                className={TONE_FILL[tones[share.status]]}
                style={{ width: `${(share[measure] / total) * 100}%` }}
              />
            ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600 dark:text-white/60">
        {shares.map((share) => {
          const tone: Tone = tones[share.status];
          const Icon: typeof CheckCircle = TONE_ICON[tone];
          return (
            <li key={share.status} className="inline-flex items-center gap-1">
              <span
                className={`h-2 w-2 rounded-full ${TONE_FILL[tones[share.status]]}`}
                aria-hidden="true"
              />
              <Icon className="h-3 w-3" aria-hidden="true" />
              {labels[share.status]} {share.count}
              {measure === "amount" && share.count > 0 && (
                <span className="tabular-nums">
                  · {formatCompactInr(share.amount)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InvoiceHealth({
  shares,
  total,
  className,
}: {
  shares: ReturnType<typeof statusShares>;
  total: number;
  className?: string;
}) {
  return (
    <ChartCard
      title="Invoice health"
      subtitle={`${total} invoice${total === 1 ? "" : "s"} in the period`}
      className={className}
    >
      {total === 0 ? (
        <p className="text-sm text-slate-500 dark:text-white/50">
          No invoices in this period.
        </p>
      ) : (
        <div className="space-y-4">
          <ShareBar
            title="Payment"
            shares={shares.paid}
            labels={PAID_LABELS}
            tones={{ paid: "good", partial: "warning", unpaid: "critical" }}
            measure="amount"
          />
          <ShareBar
            title="Delivery"
            shares={shares.delivery}
            labels={DELIVERY_LABELS}
            tones={{
              delivered: "good",
              scheduled: "warning",
              assigned: "warning",
              pending: "neutral",
            }}
            measure="count"
          />
          <ShareBar
            title="Customer link (enriched)"
            shares={shares.enrichment}
            labels={ENRICHMENT_LABELS}
            tones={{ enriched: "good", "not-enriched": "neutral" }}
            measure="count"
          />
        </div>
      )}
    </ChartCard>
  );
}

/** Horizontal bars, one series colour, value at the bar tip. */
function RankedBars({
  title,
  subtitle,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  rows: RankedRow[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-white/50">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span
                  className="min-w-0 truncate font-semibold text-neutral-950 dark:text-white"
                  title={row.label}
                >
                  {row.label}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-neutral-950 dark:text-white">
                  {formatAmount(row.value)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-2 flex-1 rounded-full bg-[#cde2fb]/60 dark:bg-white/5"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]"
                    style={{
                      width: `${max ? Math.max((row.value / max) * 100, 2) : 0}%`,
                    }}
                  />
                </div>
                <span className="w-20 shrink-0 truncate text-right text-[11px] text-slate-500 dark:text-white/50">
                  {row.sublabel}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}

function BusinessCounts({ counts }: { counts: Partial<Counts> }) {
  const items: [keyof Counts, string, typeof Users][] = [
    ["leads", "Leads", UserPlus],
    ["customers", "Customers", Users],
    ["deals", "Deals", TrendingUp],
    ["products", "Products", Package],
    ["categories", "Categories", Layers],
    ["stock", "Stock items", Archive],
  ];
  const available = items.filter(([key]) => counts[key] !== undefined);
  if (!available.length) return null;
  return (
    <LiquidPanel className="grid grid-cols-3 gap-px overflow-hidden p-0 sm:grid-cols-6">
      {available.map(([key, label, Icon]) => (
        <div
          key={key}
          className="flex items-center gap-2 bg-white/40 px-3 py-2.5 dark:bg-white/[0.03]"
        >
          <Icon
            className="hidden h-4 w-4 shrink-0 text-slate-400 dark:text-white/40 sm:block"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-white/50">
              {label}
            </p>
            <p className="text-base font-black text-neutral-950 dark:text-white">
              {(counts[key] || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      ))}
    </LiquidPanel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading statistics">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <div className="col-span-2 h-32 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5" />
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/5" />
    </div>
  );
}
