import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useToast } from "../components/Toast";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
} from "../components/ui/liquid";
import {
  seoMappingService,
  type SeoCatalogItem,
  type SeoEntityType,
  type SeoRecord,
} from "../services/seoMappingService";
import {
  getSeoMissingFields,
  getSeoPriority,
  getSeoQualityIssues,
  getSeoReadinessStatus,
  SEO_PRIORITY_RANK,
  SEO_STATUS_RANK,
  type SeoPriority,
  type SeoReadinessStatus,
} from "../utils/seoReadiness";

type CoverageItem = SeoCatalogItem & { type: SeoEntityType };

type StatusFilter =
  | "work"
  | "all"
  | "missing"
  | "incomplete"
  | "quality"
  | "ready";

type ReadinessRow = CoverageItem & {
  record?: SeoRecord;
  status: SeoReadinessStatus;
  priority: SeoPriority;
  missing: string[];
  qualityIssues: string[];
  needsWork: boolean;
};

const ENTITY_LABELS: Record<SeoEntityType, string> = {
  static: "Static page",
  product: "Product",
  category: "Category",
  subcategory: "Subcategory",
  blog: "Blog",
};

const STATUS_OPTIONS = [
  { value: "work", label: "Work queue" },
  { value: "all", label: "All pages" },
  { value: "missing", label: "Missing SEO" },
  { value: "incomplete", label: "Incomplete SEO" },
  { value: "quality", label: "Quality review" },
  { value: "ready", label: "Ready" },
];

const ENTITY_OPTIONS = [
  { value: "all", label: "All entity types" },
  ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
];

const statusClass = (status: SeoReadinessStatus) =>
  status === "READY"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : status === "INCOMPLETE"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border-rose-400/20 bg-rose-400/10 text-rose-200";

const priorityClass = (priority: SeoPriority) =>
  priority === "HIGH"
    ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
    : priority === "MEDIUM"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
      : "border-slate-400/20 bg-slate-400/10 text-slate-200";

const storefrontUrl = (route: string) =>
  `https://aquakart.co.in${route === "/" ? "" : route}`;

const seoEditorUrl = (pageKey: string) =>
  `/dashboard?tab=seo&key=${encodeURIComponent(pageKey)}`;

const normalizeSearch = (value: string) => value.trim().toLowerCase();

export default function NeedsSeoPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SeoRecord[]>([]);
  const [catalog, setCatalog] = useState<CoverageItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("work");
  const [entityFilter, setEntityFilter] = useState<"all" | SeoEntityType>("all");
  const [recommendationSource, setRecommendationSource] = useState<{
    connected: boolean;
    count: number;
    error?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [seoRecords, fullCatalog, sourceStatus] = await Promise.all([
        seoMappingService.listAllSeo(),
        seoMappingService.loadFullCatalog(),
        seoMappingService.getRecommendationSourceStatus(),
      ]);

      setRecords(seoRecords);
      setCatalog(fullCatalog);
      setRecommendationSource(sourceStatus);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load SEO readiness",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recordByKey = useMemo(
    () => new Map(records.map((record) => [record.pageKey, record])),
    [records],
  );

  const rows = useMemo<ReadinessRow[]>(() => {
    return catalog
      .map((item) => {
        const record = recordByKey.get(item.pageKey);
        const status = getSeoReadinessStatus(record);
        const missing = getSeoMissingFields(record);
        const qualityIssues = getSeoQualityIssues(item, record);
        const priority = getSeoPriority(item);

        return {
          ...item,
          record,
          status,
          priority,
          missing,
          qualityIssues,
          needsWork: status !== "READY" || qualityIssues.length > 0,
        };
      })
      .sort((a, b) => {
        const statusDiff = SEO_STATUS_RANK[a.status] - SEO_STATUS_RANK[b.status];
        if (statusDiff) return statusDiff;

        const priorityDiff =
          SEO_PRIORITY_RANK[a.priority] - SEO_PRIORITY_RANK[b.priority];
        if (priorityDiff) return priorityDiff;

        return a.label.localeCompare(b.label);
      });
  }, [catalog, recordByKey]);

  const summary = useMemo(() => {
    const missing = rows.filter((row) => row.status === "MISSING").length;
    const incomplete = rows.filter((row) => row.status === "INCOMPLETE").length;
    const ready = rows.filter((row) => row.status === "READY").length;
    const quality = rows.filter(
      (row) => row.status === "READY" && row.qualityIssues.length > 0,
    ).length;
    const highPriority = rows.filter(
      (row) => row.needsWork && row.priority === "HIGH",
    ).length;
    const score = rows.length ? Math.round((ready / rows.length) * 100) : 0;

    return {
      total: rows.length,
      missing,
      incomplete,
      ready,
      quality,
      highPriority,
      score,
      work: rows.filter((row) => row.needsWork).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = normalizeSearch(search);

    return rows.filter((row) => {
      if (
        query &&
        ![
          row.label,
          row.pageKey,
          row.route,
          row.record?.title || "",
          row.type,
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        return false;
      }

      if (entityFilter !== "all" && row.type !== entityFilter) return false;

      if (statusFilter === "work") return row.needsWork;
      if (statusFilter === "missing") return row.status === "MISSING";
      if (statusFilter === "incomplete") return row.status === "INCOMPLETE";
      if (statusFilter === "quality") {
        return row.status === "READY" && row.qualityIssues.length > 0;
      }
      if (statusFilter === "ready") {
        return row.status === "READY" && row.qualityIssues.length === 0;
      }

      return true;
    });
  }, [entityFilter, rows, search, statusFilter]);

  const workRows = useMemo(
    () => rows.filter((row) => row.needsWork),
    [rows],
  );

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage, "success");
    } catch {
      showToast("Clipboard access was blocked by the browser", "error");
    }
  };

  const copyWorklist = async () => {
    const payload = workRows
      .map((row) => {
        const issueText =
          row.status === "MISSING"
            ? "SEO record missing"
            : row.status === "INCOMPLETE"
              ? row.missing.join(", ")
              : row.qualityIssues.join(", ");

        return `[${row.priority}] ${row.pageKey} | ${row.route} | ${row.status} | ${issueText}`;
      })
      .join("\n");

    await copyText(payload, `Copied ${workRows.length} SEO work items`);
  };

  const fixNext = () => {
    const next = workRows[0];
    if (!next) {
      showToast("SEO queue is clear", "success");
      return;
    }
    navigate(seoEditorUrl(next.pageKey));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link
                to="/dashboard?tab=seo"
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Back to SEO dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-sky-200">
                    <Target className="h-3.5 w-3.5" />
                    Search readiness
                  </span>
                  {recommendationSource && (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                        recommendationSource.connected
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-200"
                      }`}
                      title={recommendationSource.error || undefined}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {recommendationSource.connected
                        ? "Recommendations connected"
                        : "Recommendation fallback active"}
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Needs SEO
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                  One queue for every storefront page, product, category,
                  subcategory and blog. Missing records come first, then
                  incomplete records, then pages that deserve a quality review.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <LiquidButton type="button" variant="soft" onClick={() => void loadData()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </LiquidButton>
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => void copyWorklist()}
                disabled={!workRows.length}
              >
                <Copy className="h-4 w-4" />
                Copy worklist
              </LiquidButton>
              <LiquidButton
                type="button"
                variant="primary"
                onClick={fixNext}
                disabled={!workRows.length}
              >
                Fix next
                <ArrowRight className="h-4 w-4" />
              </LiquidButton>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Core readiness
              </span>
              <strong className="mt-2 block text-2xl font-black">{summary.score}%</strong>
              <small className="text-white/40">{summary.ready}/{summary.total} core ready</small>
            </div>
            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200/60">
                Missing
              </span>
              <strong className="mt-2 block text-2xl font-black text-rose-100">
                {summary.missing}
              </strong>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/60">
                Incomplete
              </span>
              <strong className="mt-2 block text-2xl font-black text-amber-100">
                {summary.incomplete}
              </strong>
            </div>
            <div className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-200/60">
                Quality review
              </span>
              <strong className="mt-2 block text-2xl font-black text-violet-100">
                {summary.quality}
              </strong>
            </div>
            <div className="rounded-2xl border border-orange-400/15 bg-orange-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-200/60">
                High priority
              </span>
              <strong className="mt-2 block text-2xl font-black text-orange-100">
                {summary.highPriority}
              </strong>
            </div>
            <div className="rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200/60">
                Work queue
              </span>
              <strong className="mt-2 block text-2xl font-black text-sky-100">
                {summary.work}
              </strong>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/60">
                Clean ready
              </span>
              <strong className="mt-2 block text-2xl font-black text-emerald-100">
                {summary.ready - summary.quality}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg font-black">SEO work queue</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/45">
                High-commercial-intent products and collection pages are ranked
                ahead of informational and legal pages.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_190px_190px]">
              <div className="relative">
                <SearchCheck className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35" />
                <LiquidInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search key, page, route…"
                  aria-label="Search SEO readiness"
                  className="pl-10"
                />
              </div>
              <LiquidDropdown
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                ariaLabel="SEO readiness status"
              />
              <LiquidDropdown
                value={entityFilter}
                options={ENTITY_OPTIONS}
                onChange={(value) =>
                  setEntityFilter(value as "all" | SeoEntityType)
                }
                ariaLabel="SEO entity type"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto h-7 w-7 animate-spin text-sky-300" />
                <p className="mt-3 text-sm font-bold text-white/70">
                  Auditing every SEO key…
                </p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-6 text-center">
              <div>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
                <h3 className="mt-4 text-lg font-black">No matching SEO work</h3>
                <p className="mt-2 text-sm text-white/45">
                  Try another filter, or enjoy the clean queue.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="border-b border-white/10 bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  <tr>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Page</th>
                    <th className="px-5 py-4">Key</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">What needs work</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((row) => {
                    const workText =
                      row.status === "MISSING"
                        ? "No saved SEO record"
                        : row.status === "INCOMPLETE"
                          ? row.missing.join(", ")
                          : row.qualityIssues.length
                            ? row.qualityIssues.join(", ")
                            : "Nothing";

                    return (
                      <tr
                        key={row.pageKey}
                        className="transition hover:bg-white/[0.035]"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${priorityClass(
                              row.priority,
                            )}`}
                          >
                            {row.priority}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <strong className="block max-w-[280px] text-sm text-white">
                            {row.label}
                          </strong>
                          <small className="mt-1 block text-[11px] text-white/35">
                            {ENTITY_LABELS[row.type]} · {row.route}
                          </small>
                        </td>
                        <td className="px-5 py-4">
                          <code className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-sky-200">
                            {row.pageKey}
                          </code>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(
                              row.status,
                            )}`}
                          >
                            {row.status === "READY" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : row.status === "INCOMPLETE" ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {row.status}
                          </span>
                          {row.status === "READY" &&
                            row.qualityIssues.length > 0 && (
                              <span className="ml-2 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-1 text-[9px] font-black text-violet-200">
                                REVIEW
                              </span>
                            )}
                        </td>
                        <td className="px-5 py-4">
                          <small className="block max-w-[330px] text-xs leading-5 text-white/50">
                            {workText}
                          </small>
                          {row.recommendation && row.status !== "READY" && (
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300/75">
                              <Sparkles className="h-3 w-3" />
                              Recommendation available
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <LiquidButton
                              type="button"
                              variant="ghost"
                              title="Copy page key"
                              onClick={() =>
                                void copyText(row.pageKey, "SEO key copied")
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </LiquidButton>
                            <LiquidButton
                              type="button"
                              variant="ghost"
                              title="Open storefront page"
                              onClick={() =>
                                window.open(
                                  storefrontUrl(row.route),
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                            </LiquidButton>
                            <LiquidButton
                              type="button"
                              variant={row.needsWork ? "primary" : "soft"}
                              onClick={() => navigate(seoEditorUrl(row.pageKey))}
                            >
                              {row.needsWork ? "Fix SEO" : "Review"}
                              <ArrowRight className="h-4 w-4" />
                            </LiquidButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
