import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  XCircle,
} from "lucide-react";
import type { SiteData } from "../../../hooks/useSiteData";
import type {
  PageType,
  SiteAnalysis,
  SitePage,
} from "../../../utils/siteAnalysis";
import { Pill, RouteLink, ScoreBar, StatCard, TypeBadge } from "./SiteParts";
import { filterClass } from "./siteStyles";

const PAGE_SIZE = 60;

export default function SiteDataView({
  analysis,
  data,
}: {
  analysis: SiteAnalysis;
  data: SiteData;
}) {
  const [type, setType] = useState<"" | PageType>("");
  const [missingSeo, setMissingSeo] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const recordByKey = useMemo(
    () => new Map(data.seoRecords.map((record) => [record.pageKey, record])),
    [data.seoRecords],
  );
  const readinessByKey = useMemo(
    () =>
      new Map(
        (data.readiness?.items || []).map((item) => [item.pageKey, item]),
      ),
    [data.readiness],
  );
  const keywordCount = useMemo(() => {
    const map = new Map<string, number>();
    analysis.keywords.forEach((row) =>
      map.set(row.pageKey, (map.get(row.pageKey) || 0) + 1),
    );
    return map;
  }, [analysis.keywords]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    analysis.pages.forEach((page) => {
      byType[page.type] = (byType[page.type] || 0) + 1;
    });
    return byType;
  }, [analysis.pages]);

  const needle = search.trim().toLowerCase();
  const rows = analysis.pages.filter(
    (page) =>
      (!type || page.type === type) &&
      (!missingSeo || !recordByKey.has(page.pageKey)) &&
      (!needle ||
        page.title.toLowerCase().includes(needle) ||
        page.route.toLowerCase().includes(needle) ||
        page.keywords.some((keyword) =>
          keyword.toLowerCase().includes(needle),
        )),
  );

  const titleFor = (pageKey: string) =>
    analysis.pageByKey.get(pageKey)?.title || pageKey;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Products" value={counts.product || 0} tone="blue" />
        <StatCard
          label="Categories"
          value={counts.category || 0}
          tone="violet"
        />
        <StatCard
          label="Subcategories"
          value={counts.subcategory || 0}
          tone="violet"
        />
        <StatCard label="Blogs" value={counts.blog || 0} tone="emerald" />
        <StatCard
          label="SEO records"
          value={data.seoRecords.length}
          hint={`${analysis.pages.filter((page) => !recordByKey.has(page.pageKey)).length} pages without one`}
          tone="amber"
        />
        <StatCard
          label="Target keywords"
          value={analysis.keywords.length}
          tone="slate"
        />
      </div>

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
              onChange={(event) => {
                setSearch(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Title, URL or keyword"
              className={`${filterClass} w-56 pl-9`}
            />
          </label>
          <select
            aria-label="Page type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as "" | PageType);
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
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-black dark:text-white/70">
            <input
              type="checkbox"
              checked={missingSeo}
              onChange={(event) => {
                setMissingSeo(event.target.checked);
                setVisible(PAGE_SIZE);
              }}
              className="h-4 w-4 rounded"
            />
            Missing SEO record only
          </label>
          <span className="ml-auto text-xs text-slate-500 dark:text-white/50">
            {rows.length} pages · loaded{" "}
            {new Date(data.loadedAt).toLocaleTimeString("en-IN")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="w-8 px-2 py-3" aria-label="Expand" />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Page
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  SEO record
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Readiness
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                  Words
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                  Keywords
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                  Links in
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                  Links out
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.slice(0, visible).map((page) => {
                const isOpen = expanded === page.pageKey;
                const record = recordByKey.get(page.pageKey);
                const readiness = readinessByKey.get(page.pageKey);
                const inbound = analysis.interlinking.inbound.get(page.pageKey);
                return (
                  <Fragment key={page.pageKey}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                      onClick={() => setExpanded(isOpen ? null : page.pageKey)}
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
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <TypeBadge type={page.type} />
                          <span className="max-w-[260px] truncate text-sm font-semibold text-neutral-950 dark:text-white">
                            {page.title}
                          </span>
                        </div>
                        <RouteLink route={page.route} />
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {record ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
                            <XCircle className="h-4 w-4" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {readiness ? (
                          <ScoreBar score={readiness.score} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-black dark:text-white/70">
                        {page.type === "static" ? "—" : page.wordCount}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-black dark:text-white/70">
                        {keywordCount.get(page.pageKey) || 0}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-black dark:text-white/70">
                        {inbound?.content.length || 0}
                        <span className="block text-[10px] text-slate-400">
                          +{inbound?.taxonomy.length || 0} listing
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-black dark:text-white/70">
                        {page.outbound.length}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                        <td />
                        <td colSpan={7} className="px-3 py-4">
                          <PageDetail
                            page={page}
                            recordTitle={record?.title}
                            recordDescription={record?.description}
                            inboundFrom={(inbound?.content || []).map(
                              (link) => ({
                                title: titleFor(link.from),
                                anchor: link.anchor,
                              }),
                            )}
                            issues={
                              readiness?.issues.map((issue) => ({
                                severity: issue.severity,
                                message: issue.message,
                              })) || []
                            }
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
                    colSpan={8}
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
    </div>
  );
}

function PageDetail({
  page,
  recordTitle,
  recordDescription,
  inboundFrom,
  issues,
}: {
  page: SitePage;
  recordTitle?: string;
  recordDescription?: string;
  inboundFrom: { title: string; anchor: string }[];
  issues: { severity: string; message: string }[];
}) {
  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <div className="space-y-2">
        <Detail label="SEO title">
          {recordTitle || (
            <span className="text-rose-600 dark:text-rose-300">Not set</span>
          )}
        </Detail>
        <Detail label="Meta description">
          {recordDescription || (
            <span className="text-rose-600 dark:text-rose-300">Not set</span>
          )}
        </Detail>
        <Detail label="Catalog keywords">
          {page.keywords.length ? (
            page.keywords.join(", ")
          ) : (
            <span className="text-slate-400">None</span>
          )}
        </Detail>
        {issues.length > 0 && (
          <Detail label="Readiness issues">
            <ul className="space-y-1">
              {issues.map((issue) => (
                <li key={issue.message} className="flex items-center gap-2">
                  <Pill value={issue.severity} /> {issue.message}
                </li>
              ))}
            </ul>
          </Detail>
        )}
      </div>
      <div className="space-y-2">
        <Detail label={`Linked from (${inboundFrom.length})`}>
          {inboundFrom.length ? (
            <ul className="space-y-0.5">
              {inboundFrom.map((link, index) => (
                <li key={`${link.title}-${index}`}>
                  {link.title}{" "}
                  <span className="text-slate-400">
                    “{link.anchor || "no anchor text"}”
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-slate-400">
              No contextual links point here
            </span>
          )}
        </Detail>
        <Detail label={`Links out (${page.outbound.length})`}>
          {page.outbound.length ? (
            <ul className="space-y-0.5">
              {page.outbound.map((link, index) => (
                <li key={`${link.href}-${index}`} className="break-all">
                  {link.routeKey}{" "}
                  <span className="text-slate-400">“{link.anchor}”</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-slate-400">
              No internal links in the content
            </span>
          )}
        </Detail>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
        {label}
      </p>
      <div className="text-neutral-950 dark:text-white">{children}</div>
    </div>
  );
}
