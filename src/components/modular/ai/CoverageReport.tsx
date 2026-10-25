import { Fragment, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { SeoReadinessReport } from "../../../services/seoService";
import type { SiteAnalysis } from "../../../utils/siteAnalysis";
import {
  COVERAGE_GROUPS,
  checkLabel,
  parseSlot,
  snapshotPercent,
  type Coverage,
  type CoverageSnapshot,
  type SlotChange,
} from "../../../utils/seoCoverage";
import { RouteLink } from "./SiteParts";
import { scoreTone } from "./siteStyles";

const LIST_LIMIT = 30;

interface Labels {
  page: (pageKey: string) => { title: string; route: string };
  slot: (slot: string) => {
    title: string;
    route: string;
    keyword: string | null;
  };
}

const useLabels = (
  analysis: SiteAnalysis,
  readiness: SeoReadinessReport | null,
): Labels =>
  useMemo(() => {
    const items = new Map(
      readiness?.items.map((item) => [item.pageKey, item]) || [],
    );
    const rows = new Map(analysis.keywords.map((row) => [row.id, row]));
    const page = (pageKey: string) => {
      const known = analysis.pageByKey.get(pageKey) || items.get(pageKey);
      return { title: known?.title || pageKey, route: known?.route || "" };
    };
    return {
      page,
      slot: (slot: string) => {
        const { pageKey, rowId } = parseSlot(slot);
        return {
          ...page(pageKey),
          keyword: rowId
            ? rows.get(rowId)?.keyword || rowId.split("::")[1]
            : null,
        };
      },
    };
  }, [analysis, readiness]);

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (!value) return <span className="text-slate-400">±0{suffix}</span>;
  return (
    <span
      className={`font-semibold ${value > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
    >
      {value > 0 ? "▲ +" : "▼ "}
      {value}
      {suffix}
    </span>
  );
}

function BeforeAfter({
  label,
  before,
  after,
  suffix = "",
}: {
  label: string;
  before: number | null;
  after: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums text-neutral-950 dark:text-white">
        {after ?? "—"}
        {after !== null && suffix}
      </p>
      <p className="text-xs tabular-nums text-slate-500 dark:text-white/50">
        was {before ?? "—"}
        {before !== null && suffix}
        {before !== null && after !== null && (
          <>
            {" · "}
            <Delta value={after - before} suffix={suffix} />
          </>
        )}
      </p>
    </div>
  );
}

/** Always-visible totals: filled, missing, and what moved since the baseline. */
export function CoverageSummary({
  coverage,
  baseline,
  changes,
  onResetBaseline,
}: {
  coverage: Coverage;
  baseline: CoverageSnapshot | null;
  changes: SlotChange[];
  onResetBaseline: () => void;
}) {
  const before = baseline ? snapshotPercent(baseline) : null;
  const fixed = changes.reduce((sum, change) => sum + change.fixed.length, 0);
  const regressed = changes.reduce(
    (sum, change) => sum + change.regressed.length,
    0,
  );
  const total = coverage.filled + coverage.missing;
  return (
    <section className="glass-card space-y-3 border border-slate-200 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
            SEO checks: filled vs missing
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/50">
            Every page field, content, merchant, linking and keyword check
            across the site.
            {baseline &&
              ` Compared with the baseline from ${new Date(baseline.at).toLocaleString("en-IN")}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetBaseline}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          title="Use the current numbers as the starting point for tracking improvements"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> New baseline
        </button>
      </div>

      <div>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-rose-200 dark:bg-rose-500/30"
          aria-hidden="true"
        >
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${total ? (coverage.filled / total) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1 flex flex-wrap gap-x-4 text-xs tabular-nums text-slate-600 dark:text-white/60">
          <span>
            <CheckCircle2
              className="mr-1 inline h-3.5 w-3.5 text-emerald-500"
              aria-hidden="true"
            />
            {coverage.filled.toLocaleString("en-IN")} filled
          </span>
          <span>
            <XCircle
              className="mr-1 inline h-3.5 w-3.5 text-rose-500"
              aria-hidden="true"
            />
            {coverage.missing.toLocaleString("en-IN")} missing
          </span>
          <span>
            {total.toLocaleString("en-IN")} checks · {coverage.percent}%
            complete
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <BeforeAfter
          label="Complete"
          before={before?.percent ?? null}
          after={coverage.percent}
          suffix="%"
        />
        <BeforeAfter
          label="Missing"
          before={before?.missing ?? null}
          after={coverage.missing}
        />
        <BeforeAfter
          label="Site readiness"
          before={baseline?.readinessScore ?? null}
          after={coverage.snapshot.readinessScore}
        />
        <BeforeAfter
          label="Keyword score"
          before={baseline?.keywordScore ?? null}
          after={coverage.snapshot.keywordScore}
        />
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Fixed since baseline
          </p>
          <p className="text-lg font-bold tabular-nums text-neutral-950 dark:text-white">
            {fixed}
          </p>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {regressed ? (
              <span className="text-rose-600 dark:text-rose-300">
                {regressed} new gap{regressed === 1 ? "" : "s"}
              </span>
            ) : (
              "no new gaps"
            )}
          </p>
        </div>
      </div>

      {!coverage.complete && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Readiness data isn't loaded, so SEO record, content and merchant
          checks aren't counted.
        </p>
      )}
    </section>
  );
}

/** Per-check breakdown plus the list of what improved since the baseline. */
export default function CoverageReport({
  coverage,
  baseline,
  changes,
  analysis,
  readiness,
}: {
  coverage: Coverage;
  baseline: CoverageSnapshot | null;
  changes: SlotChange[];
  analysis: SiteAnalysis;
  readiness: SeoReadinessReport | null;
}) {
  const labels = useLabels(analysis, readiness);
  return (
    <div className="space-y-4">
      <ImprovementList changes={changes} baseline={baseline} labels={labels} />
      <CheckTable coverage={coverage} baseline={baseline} labels={labels} />
    </div>
  );
}

function CheckTable({
  coverage,
  baseline,
  labels,
}: {
  coverage: Coverage;
  baseline: CoverageSnapshot | null;
  labels: Labels;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand" />
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Check
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                Filled
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                Missing
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Coverage
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                Filled since baseline
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {COVERAGE_GROUPS.map((group) => {
              const checks = coverage.checks.filter(
                (check) => check.group === group.id,
              );
              if (!checks.length) return null;
              const filled = checks.reduce(
                (sum, check) => sum + check.filled,
                0,
              );
              const total = checks.reduce((sum, check) => sum + check.total, 0);
              const beforeFilled = baseline
                ? checks.reduce(
                    (sum, check) => sum + (baseline.counts[check.id]?.[0] ?? 0),
                    0,
                  )
                : null;
              return (
                <Fragment key={group.id}>
                  <tr className="bg-slate-50 dark:bg-white/[0.03]">
                    <td />
                    <td className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-white/70">
                      {group.label}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {filled}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-rose-700 dark:text-rose-300">
                      {total - filled}
                    </td>
                    <td className="px-3 py-2">
                      <CoverageBar filled={filled} total={total} />
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {beforeFilled !== null && (
                        <Delta value={filled - beforeFilled} />
                      )}
                    </td>
                  </tr>
                  {checks.map((check) => {
                    const isOpen = expanded === check.id;
                    const missing = check.total - check.filled;
                    const before = baseline?.counts[check.id];
                    return (
                      <Fragment key={check.id}>
                        <tr
                          className={`transition-colors ${missing ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" : ""}`}
                          onClick={() =>
                            missing && setExpanded(isOpen ? null : check.id)
                          }
                        >
                          <td className="px-2 py-2 text-slate-500">
                            {missing > 0 && (
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-label={
                                  isOpen
                                    ? "Hide missing pages"
                                    : "Show missing pages"
                                }
                                className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-neutral-950 dark:text-white">
                            {check.label}
                          </td>
                          <td className="px-3 py-2 text-right text-sm tabular-nums text-slate-700 dark:text-white/70">
                            {check.filled}
                          </td>
                          <td
                            className={`px-3 py-2 text-right text-sm tabular-nums ${missing ? "font-semibold text-rose-600 dark:text-rose-300" : "text-slate-400"}`}
                          >
                            {missing}
                          </td>
                          <td className="px-3 py-2">
                            <CoverageBar
                              filled={check.filled}
                              total={check.total}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {before && (
                              <Delta value={check.filled - before[0]} />
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                            <td />
                            <td colSpan={5} className="px-3 py-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                                Missing on {missing}{" "}
                                {group.id === "keywords" ? "keyword" : "page"}
                                {missing === 1 ? "" : "s"}
                              </p>
                              <ul className="grid gap-1 md:grid-cols-2">
                                {check.missingSlots
                                  .slice(0, LIST_LIMIT)
                                  .map((slot) => {
                                    const label = labels.slot(slot);
                                    return (
                                      <li
                                        key={slot}
                                        className="min-w-0 text-xs"
                                      >
                                        <span className="text-neutral-950 dark:text-white">
                                          {label.keyword && (
                                            <strong>
                                              “{label.keyword}” ·{" "}
                                            </strong>
                                          )}
                                          {label.title}
                                        </span>
                                        <RouteLink route={label.route} />
                                      </li>
                                    );
                                  })}
                              </ul>
                              {missing > LIST_LIMIT && (
                                <p className="mt-1 text-xs text-slate-400">
                                  +{missing - LIST_LIMIT} more
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoverageBar({ filled, total }: { filled: number; total: number }) {
  const percent = total ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${scoreTone(percent)}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-950 dark:text-white">
        {percent}%
      </span>
    </div>
  );
}

function ImprovementList({
  changes,
  baseline,
  labels,
}: {
  changes: SlotChange[];
  baseline: CoverageSnapshot | null;
  labels: Labels;
}) {
  const [visible, setVisible] = useState(LIST_LIMIT);
  // Page fields and keyword checks on the same page are shown together.
  const byPage = useMemo(() => {
    const map = new Map<string, SlotChange[]>();
    changes.forEach((change) =>
      map.set(change.pageKey, [...(map.get(change.pageKey) || []), change]),
    );
    return [...map.entries()].sort(
      ([, a], [, b]) =>
        b.reduce((sum, change) => sum + change.fixed.length, 0) -
        a.reduce((sum, change) => sum + change.fixed.length, 0),
    );
  }, [changes]);

  if (!baseline) return null;
  return (
    <section className="glass-card border border-slate-200 p-4 dark:border-white/10">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-neutral-950 dark:text-white">
        <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />{" "}
        What improved since {new Date(baseline.at).toLocaleString("en-IN")}
      </h3>
      {byPage.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-white/50">
          Nothing has changed yet. Fix a missing item and it will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-white/10">
          {byPage.slice(0, visible).map(([pageKey, pageChanges]) => {
            const page = labels.page(pageKey);
            return (
              <li key={pageKey} className="py-2">
                <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                  {page.title}
                </p>
                <RouteLink route={page.route} />
                <div className="mt-1 space-y-1">
                  {pageChanges.map((change) => {
                    const keyword = change.rowId
                      ? labels.slot(change.slot).keyword
                      : null;
                    return (
                      <div
                        key={change.slot}
                        className="flex flex-wrap items-center gap-1 text-xs"
                      >
                        {keyword && (
                          <span className="font-semibold text-slate-600 dark:text-white/60">
                            “{keyword}”:
                          </span>
                        )}
                        {change.fixed.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                          >
                            <CheckCircle2
                              className="h-3 w-3"
                              aria-hidden="true"
                            />{" "}
                            {checkLabel(id)}
                          </span>
                        ))}
                        {change.regressed.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"
                          >
                            <TrendingDown
                              className="h-3 w-3"
                              aria-hidden="true"
                            />{" "}
                            {checkLabel(id)} now missing
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {byPage.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + LIST_LIMIT)}
          className="mt-2 rounded-md bg-slate-100 px-4 py-1.5 text-sm text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white"
        >
          Show {Math.min(LIST_LIMIT, byPage.length - visible)} more pages
        </button>
      )}
    </section>
  );
}
