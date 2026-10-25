import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  MinusCircle,
  Search,
  Wrench,
  XCircle,
} from "lucide-react";
import type {
  SeoRecord,
  SeoReadinessReport,
} from "../../../services/seoService";
import type { ReadinessChange } from "../../../hooks/useSiteData";
import type {
  KeywordRow,
  KeywordStatus,
  SiteAnalysis,
} from "../../../utils/siteAnalysis";
import KeywordSuggestions from "./KeywordSuggestions";
import PageFixPanel from "./PageFixPanel";
import ChangeBanner from "./ChangeBanner";
import KeyphrasePanel from "./KeyphrasePanel";
import CoverageReport, { CoverageSummary } from "./CoverageReport";
import { analyzeKeyphrases } from "../../../utils/keyphrases";
import {
  computeCoverage,
  diffCoverage,
  loadBaseline,
  saveBaseline,
  type CoverageSnapshot,
} from "../../../utils/seoCoverage";
import { Pill, RouteLink, ScoreBar, StatCard, TypeBadge } from "./SiteParts";
import { filterClass, segmentClass } from "./siteStyles";

const PAGE_SIZE = 50;

interface SeoViewProps {
  analysis: SiteAnalysis;
  readiness: SeoReadinessReport | null;
  records: SeoRecord[];
  change: ReadinessChange | null;
  seoError: string;
  onSeoRecordSaved: (record: SeoRecord) => void;
  onCatalogChanged: () => void;
}

export default function SeoView({
  analysis,
  readiness,
  records,
  change,
  seoError,
  onSeoRecordSaved,
  onCatalogChanged,
}: SeoViewProps) {
  const [segment, setSegment] = useState<"coverage" | "keywords" | "pages">(
    "coverage",
  );
  const keywords = analysis.keywords;
  const coverage = useMemo(
    () => computeCoverage(analysis, readiness, records),
    [analysis, readiness, records],
  );
  const [baseline, setBaseline] = useState<CoverageSnapshot | null>(
    loadBaseline,
  );
  // The first complete load becomes the baseline that later fixes are measured against.
  useEffect(() => {
    if (baseline || !coverage.complete || seoError) return;
    saveBaseline(coverage.snapshot);
    setBaseline(coverage.snapshot);
  }, [baseline, coverage, seoError]);
  const resetBaseline = () => {
    saveBaseline(coverage.snapshot);
    setBaseline(coverage.snapshot);
  };
  const coverageChanges = useMemo(
    () => (baseline ? diffCoverage(baseline, coverage) : []),
    [baseline, coverage],
  );
  // Readiness joins records to pages by exact pageKey; anything else is silently ignored.
  const uncounted = useMemo(() => {
    if (!readiness) return [];
    const keys = new Set(readiness.items.map((item) => item.pageKey));
    return records.filter((record) => !keys.has(record.pageKey));
  }, [readiness, records]);
  const counts = useMemo(
    () => ({
      strong: keywords.filter((row) => row.status === "strong").length,
      weak: keywords.filter((row) => row.status === "weak").length,
      failing: keywords.filter((row) => row.status === "failing").length,
      average: keywords.length
        ? Math.round(
            keywords.reduce((sum, row) => sum + row.score, 0) / keywords.length,
          )
        : 0,
    }),
    [keywords],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Site readiness"
          value={readiness ? `${readiness.summary.overallScore}/100` : "—"}
          hint={
            readiness
              ? `${readiness.summary.ready}/${readiness.summary.totalPages} pages ready`
              : undefined
          }
          tone="blue"
        />
        <StatCard
          label="Critical pages"
          value={readiness?.summary.critical ?? "—"}
          hint="P0 priority"
          tone="rose"
        />
        <StatCard
          label="Keywords"
          value={keywords.length}
          hint={`avg score ${counts.average}`}
          tone="violet"
        />
        <StatCard
          label="Strong"
          value={counts.strong}
          hint="score 75+"
          tone="emerald"
        />
        <StatCard
          label="Weak"
          value={counts.weak}
          hint="score 50–74"
          tone="amber"
        />
        <StatCard
          label="Failing"
          value={counts.failing}
          hint="score under 50"
          tone="rose"
        />
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Rankings here are on-page SEO scores computed from your titles,
        descriptions, content, URLs and internal links. They show why a keyword
        can't rank well, not its live Google position, which needs a Google
        Search Console connection.
      </p>

      {change && <ChangeBanner change={change} />}

      <CoverageSummary
        coverage={coverage}
        baseline={baseline}
        changes={coverageChanges}
        onResetBaseline={resetBaseline}
      />

      {uncounted.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          <summary className="cursor-pointer">
            <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />
            {uncounted.length} SEO record
            {uncounted.length === 1 ? " isn't" : "s aren't"} counted in
            readiness because the page key doesn't match any page. Open that
            page in Page rankings and use Fix to re-key it.
          </summary>
          <ul className="mt-2 space-y-0.5 pl-6 text-xs">
            {uncounted.slice(0, 50).map((record) => (
              <li key={record._id}>
                <code>{record.pageKey}</code> → {record.route}
              </li>
            ))}
          </ul>
        </details>
      )}

      {seoError && (
        <p
          className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
          role="alert"
        >
          {seoError} Keyword scores below use catalog keywords only.
        </p>
      )}

      <div
        className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5"
        role="tablist"
        aria-label="SEO view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={segment === "coverage"}
          onClick={() => setSegment("coverage")}
          className={segmentClass(segment === "coverage")}
        >
          Filled &amp; missing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={segment === "keywords"}
          onClick={() => setSegment("keywords")}
          className={segmentClass(segment === "keywords")}
        >
          Keyword rankings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={segment === "pages"}
          onClick={() => setSegment("pages")}
          className={segmentClass(segment === "pages")}
        >
          Page rankings
        </button>
      </div>

      {segment === "coverage" ? (
        <CoverageReport
          coverage={coverage}
          baseline={baseline}
          changes={coverageChanges}
          analysis={analysis}
          readiness={readiness}
        />
      ) : segment === "keywords" ? (
        <KeywordTable
          analysis={analysis}
          onSeoRecordSaved={onSeoRecordSaved}
          onCatalogChanged={onCatalogChanged}
        />
      ) : (
        <PageTable
          analysis={analysis}
          readiness={readiness}
          records={records}
          change={change}
          onSeoRecordSaved={onSeoRecordSaved}
          onCatalogChanged={onCatalogChanged}
        />
      )}
    </div>
  );
}

function KeywordTable({
  analysis,
  onSeoRecordSaved,
  onCatalogChanged,
}: {
  analysis: SiteAnalysis;
  onSeoRecordSaved: (record: SeoRecord) => void;
  onCatalogChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | KeywordStatus>("");
  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [order, setOrder] = useState<"worst" | "best">("worst");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Rank is the position by score across all keywords, independent of filters.
  const rankById = useMemo(
    () => new Map(analysis.keywords.map((row, index) => [row.id, index + 1])),
    [analysis.keywords],
  );

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = analysis.keywords.filter(
      (row) =>
        (!status || row.status === status) &&
        (!type || row.type === type) &&
        (!source || row.source === source) &&
        (!needle ||
          row.keyword.toLowerCase().includes(needle) ||
          row.pageTitle.toLowerCase().includes(needle) ||
          row.route.toLowerCase().includes(needle)),
    );
    return order === "best" ? filtered : [...filtered].reverse();
  }, [analysis.keywords, search, status, type, source, order]);

  return (
    <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <label className="relative">
          <span className="sr-only">Search keywords</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Keyword or page"
            className={`${filterClass} w-52 pl-9`}
          />
        </label>
        <select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as "" | KeywordStatus);
            setVisible(PAGE_SIZE);
          }}
          className={filterClass}
        >
          <option value="">All statuses</option>
          <option value="failing">Failing</option>
          <option value="weak">Weak</option>
          <option value="strong">Strong</option>
        </select>
        <select
          aria-label="Page type"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setVisible(PAGE_SIZE);
          }}
          className={filterClass}
        >
          <option value="">All page types</option>
          <option value="product">Products</option>
          <option value="category">Categories</option>
          <option value="subcategory">Subcategories</option>
          <option value="blog">Blogs</option>
          <option value="static">Static pages</option>
          <option value="custom">Custom SEO pages</option>
        </select>
        <select
          aria-label="Keyword source"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setVisible(PAGE_SIZE);
          }}
          className={filterClass}
        >
          <option value="">SEO &amp; catalog keywords</option>
          <option value="seo">SEO record keywords</option>
          <option value="content">Catalog keywords only</option>
        </select>
        <select
          aria-label="Order"
          value={order}
          onChange={(event) => setOrder(event.target.value as "worst" | "best")}
          className={filterClass}
        >
          <option value="worst">Worst first</option>
          <option value="best">Best first</option>
        </select>
        <span className="ml-auto text-xs text-slate-500 dark:text-white/50">
          {rows.length} keywords
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand" />
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Rank
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Keyword
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Page
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Score
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Why it's failing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.slice(0, visible).map((row) => {
              const isOpen = expanded === row.id;
              const failed = row.checks.filter((check) => check.pass === false);
              return (
                <Fragment key={row.id}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                  >
                    <td className="px-2 py-3 text-slate-500">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Hide details" : "Show details"}
                        className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold tabular-nums text-slate-600 dark:text-white/60">
                      #{rankById.get(row.id)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                        {row.keyword}
                      </p>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {row.source === "seo"
                          ? "SEO keyword"
                          : "Catalog keyword"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <TypeBadge type={row.type} />
                        <span className="max-w-[220px] truncate text-sm text-neutral-950 dark:text-white">
                          {row.pageTitle}
                        </span>
                      </div>
                      <RouteLink route={row.route} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={row.score} />
                      <div className="mt-1">
                        <Pill value={row.status} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 dark:text-white/60">
                      {failed.length === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-300">
                          All checks pass
                        </span>
                      ) : (
                        <>
                          {failed.slice(0, 2).map((check) => (
                            <span key={check.id} className="block">
                              ✗ {check.label}
                            </span>
                          ))}
                          {failed.length > 2 && (
                            <span className="text-slate-400">
                              +{failed.length - 2} more
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                      <td />
                      <td colSpan={5} className="px-3 py-4">
                        <KeywordDetail
                          row={row}
                          analysis={analysis}
                          onSeoRecordSaved={onSeoRecordSaved}
                          onCatalogChanged={onCatalogChanged}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60"
                >
                  {analysis.keywords.length
                    ? "No keywords match these filters."
                    : "No target keywords found. Add keywords to SEO records or products."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > visible && (
        <div className="border-t border-slate-200 px-4 py-3 text-center dark:border-white/10">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="rounded-md bg-slate-100 px-4 py-1.5 text-sm text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white"
          >
            Show {Math.min(PAGE_SIZE, rows.length - visible)} more
          </button>
        </div>
      )}
    </div>
  );
}

function KeywordDetail({
  row,
  analysis,
  onSeoRecordSaved,
  onCatalogChanged,
}: {
  row: KeywordRow;
  analysis: SiteAnalysis;
  onSeoRecordSaved: (record: SeoRecord) => void;
  onCatalogChanged: () => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="grid gap-2 md:grid-cols-2">
        {row.checks.map((check) => (
          <li
            key={check.id}
            className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-white/5"
          >
            {check.pass === null ? (
              <MinusCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                aria-label="Not applicable"
              />
            ) : check.pass ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                aria-label="Passed"
              />
            ) : (
              <XCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                aria-label="Failed"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-neutral-950 dark:text-white">
                {check.label}
                {check.weight > 0 && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({check.weight} pts)
                  </span>
                )}
              </p>
              <p className="break-words text-xs text-slate-500 dark:text-white/50">
                {check.detail}
              </p>
              {check.pass === false && (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  → {check.fix}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {row.readiness && row.readiness.issues.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Page readiness issues
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.readiness.issues.map((issue) => (
              <span
                key={`${issue.code}-${issue.field}`}
                className="inline-flex items-center gap-1 text-xs"
              >
                <Pill value={issue.severity} />{" "}
                <span className="text-slate-600 dark:text-white/60">
                  {issue.message}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      <KeyphrasePanel
        pageKey={row.pageKey}
        title={row.pageTitle}
        route={row.route}
        page={row.page}
        record={row.seoRecord}
        analysis={analysis}
        catalogKeywordsMissing={Boolean(
          row.readiness?.issues.some(
            (issue) => issue.code === "MISSING_TOPIC_TERMS",
          ),
        )}
        onSeoRecordSaved={onSeoRecordSaved}
        onCatalogChanged={onCatalogChanged}
      />
      <KeywordSuggestions
        key={row.id}
        row={row}
        analysis={analysis}
        onSeoRecordSaved={onSeoRecordSaved}
      />
    </div>
  );
}

function ScoreDelta({
  change,
  pageKey,
}: {
  change: ReadinessChange | null;
  pageKey: string;
}) {
  const moved = change?.pages.get(pageKey);
  if (!moved) return null;
  const [before, after] = moved;
  return (
    <span
      className={`mt-0.5 block text-xs font-semibold ${after > before ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}
    >
      {after > before ? "▲ +" : "▼ "}
      {after - before} (was {before})
    </span>
  );
}

function PageTable({
  analysis,
  readiness,
  records,
  change,
  onSeoRecordSaved,
  onCatalogChanged,
}: {
  analysis: SiteAnalysis;
  readiness: SeoReadinessReport | null;
  records: SeoRecord[];
  change: ReadinessChange | null;
  onSeoRecordSaved: (record: SeoRecord) => void;
  onCatalogChanged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const ranked = useMemo(
    () =>
      [...(readiness?.items || [])].sort(
        (a, b) => b.score - a.score || a.title.localeCompare(b.title),
      ),
    [readiness],
  );
  const rankByKey = useMemo(
    () => new Map(ranked.map((item, index) => [item.pageKey, index + 1])),
    [ranked],
  );
  const keywordsByPage = useMemo(() => {
    const map = new Map<string, KeywordRow[]>();
    analysis.keywords.forEach((row) =>
      map.set(row.pageKey, [...(map.get(row.pageKey) || []), row]),
    );
    return map;
  }, [analysis.keywords]);

  const recordByKey = useMemo(
    () => new Map(records.map((record) => [record.pageKey, record])),
    [records],
  );
  // Missing-keyphrase counts for every ranked page, shown in the table.
  const keyphrases = useMemo(
    () =>
      new Map(
        ranked.map((item) => [
          item.pageKey,
          analyzeKeyphrases(
            analysis.pageByKey.get(item.pageKey),
            recordByKey.get(item.pageKey),
            analysis,
            item.issues.some((issue) => issue.code === "MISSING_TOPIC_TERMS"),
          ),
        ]),
      ),
    [ranked, recordByKey, analysis],
  );

  if (!readiness) {
    return (
      <div className="glass-card p-8 text-center text-sm text-slate-500 dark:text-white/60">
        Page readiness scores need the seo.read permission.
      </div>
    );
  }

  const needle = search.trim().toLowerCase();
  const rows = ranked.filter(
    (item) =>
      (!type || item.entityType === type) &&
      (!priority || item.priority === priority) &&
      (!needle ||
        item.title.toLowerCase().includes(needle) ||
        item.route.toLowerCase().includes(needle)),
  );

  return (
    <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <label className="relative">
          <span className="sr-only">Search pages</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Page title or URL"
            className={`${filterClass} w-52 pl-9`}
          />
        </label>
        <select
          aria-label="Page type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={filterClass}
        >
          <option value="">All page types</option>
          <option value="product">Products</option>
          <option value="category">Categories</option>
          <option value="subcategory">Subcategories</option>
          <option value="blog">Blogs</option>
          <option value="static">Static pages</option>
        </select>
        <select
          aria-label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className={filterClass}
        >
          <option value="">All priorities</option>
          <option value="P0">P0 critical</option>
          <option value="P1">P1 high</option>
          <option value="P2">P2 medium</option>
          <option value="P3">P3 ready</option>
        </select>
        <span className="ml-auto text-xs text-slate-500 dark:text-white/50">
          Report generated{" "}
          {new Date(readiness.generatedAt).toLocaleString("en-IN")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand" />
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Rank
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Page
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Score
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Priority
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Breakdown
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Missing keyphrases
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                Top issue
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.slice(0, visible).map((item) => {
              const isOpen = expanded === item.pageKey;
              const pageKeywords = keywordsByPage.get(item.pageKey) || [];
              const phraseReport = keyphrases.get(item.pageKey);
              const phraseGaps = phraseReport?.targetsWithGaps.length || 0;
              const phraseIdeas = phraseReport?.suggestions.length || 0;
              return (
                <Fragment key={item.pageKey}>
                  <tr
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    onClick={() => setExpanded(isOpen ? null : item.pageKey)}
                  >
                    <td className="px-2 py-3 text-slate-500">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Hide details" : "Show details"}
                        className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold tabular-nums text-slate-600 dark:text-white/60">
                      #{rankByKey.get(item.pageKey)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <TypeBadge type={item.entityType} />
                        <span className="max-w-[240px] truncate text-sm font-semibold text-neutral-950 dark:text-white">
                          {item.title}
                        </span>
                      </div>
                      <RouteLink route={item.route} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={item.score} />
                      <ScoreDelta change={change} pageKey={item.pageKey} />
                    </td>
                    <td className="px-3 py-3">
                      <Pill value={item.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-white/50">
                        {Object.entries(item.scores)
                          .filter(([, value]) => value !== null)
                          .map(([key, value]) => (
                            <span
                              key={key}
                              className={`rounded px-1.5 py-0.5 ${Number(value) >= 75 ? "bg-emerald-50 dark:bg-emerald-500/10" : Number(value) >= 50 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-rose-50 dark:bg-rose-500/10"}`}
                            >
                              {key} {value}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-xs">
                      {phraseGaps ||
                      phraseIdeas ||
                      phraseReport?.catalogKeywordsMissing ? (
                        <>
                          <span className="text-slate-600 dark:text-white/60">
                            {phraseGaps > 0 && (
                              <span className="font-semibold text-rose-600 dark:text-rose-300">
                                {phraseGaps} keyword gap
                                {phraseGaps === 1 ? "" : "s"}
                              </span>
                            )}
                            {phraseGaps > 0 && phraseIdeas > 0 && " · "}
                            {phraseIdeas > 0 && `${phraseIdeas} to add`}
                            {phraseReport?.catalogKeywordsMissing && (
                              <span className="block text-amber-700 dark:text-amber-300">
                                No catalog keywords
                              </span>
                            )}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {phraseReport?.suggestions
                              .slice(0, 2)
                              .map((suggestion) => (
                                <span
                                  key={suggestion.phrase}
                                  className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                                >
                                  {suggestion.phrase}
                                </span>
                              ))}
                          </span>
                        </>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-300">
                          Covered
                        </span>
                      )}
                    </td>
                    <td className="max-w-[260px] px-3 py-3 text-xs text-slate-600 dark:text-white/60">
                      {item.issues[0]?.message || "No issues"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {(item.issues.length > 0 ||
                        phraseGaps > 0 ||
                        phraseIdeas > 0) && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpanded(isOpen ? null : item.pageKey);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          <Wrench className="h-3.5 w-3.5" /> Fix
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                      <td />
                      <td colSpan={8} className="space-y-3 px-3 py-4 text-sm">
                        <KeyphrasePanel
                          pageKey={item.pageKey}
                          title={item.title}
                          route={item.route}
                          page={analysis.pageByKey.get(item.pageKey)}
                          record={recordByKey.get(item.pageKey)}
                          analysis={analysis}
                          catalogKeywordsMissing={Boolean(
                            phraseReport?.catalogKeywordsMissing,
                          )}
                          onSeoRecordSaved={onSeoRecordSaved}
                          onCatalogChanged={onCatalogChanged}
                        />
                        <PageFixPanel
                          item={item}
                          page={analysis.pageByKey.get(item.pageKey)}
                          records={records}
                          onSeoRecordSaved={onSeoRecordSaved}
                        />
                        {item.issues.length > 0 ? (
                          <ul className="space-y-1">
                            {item.issues.map((issue) => (
                              <li
                                key={`${issue.code}-${issue.field}`}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <Pill value={issue.severity} />
                                <span className="text-neutral-950 dark:text-white">
                                  {issue.message}
                                </span>
                                <code className="text-xs text-slate-400">
                                  {issue.field}
                                </code>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-emerald-600 dark:text-emerald-300">
                            This page passes every readiness check.
                          </p>
                        )}
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                            Keywords on this page
                          </p>
                          {pageKeywords.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {pageKeywords.map((row) => (
                                <span
                                  key={row.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs dark:bg-white/10"
                                >
                                  <span className="text-neutral-950 dark:text-white">
                                    {row.keyword}
                                  </span>
                                  <Pill value={row.status}>{row.score}</Pill>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-white/50">
                              No target keywords. Add keywords to this page's
                              SEO record.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60"
                >
                  No pages match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > visible && (
        <div className="border-t border-slate-200 px-4 py-3 text-center dark:border-white/10">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="rounded-md bg-slate-100 px-4 py-1.5 text-sm text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white"
          >
            Show {Math.min(PAGE_SIZE, rows.length - visible)} more
          </button>
        </div>
      )}
    </div>
  );
}
