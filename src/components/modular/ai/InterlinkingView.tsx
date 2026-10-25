import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Search } from "lucide-react";
import { useToast } from "../../Toast";
import type { LinkIssueKind, SiteAnalysis } from "../../../utils/siteAnalysis";
import { Pill, RouteLink, StatCard, TypeBadge } from "./SiteParts";
import { filterClass } from "./siteStyles";

const PAGE_SIZE = 60;

const KIND_LABELS: Record<LinkIssueKind, string> = {
  orphan: "Orphan pages",
  "broken-link": "Broken links",
  "missing-category": "Missing category",
  "missing-subcategory": "Missing subcategory",
  "taxonomy-mismatch": "Category mismatch",
  "unknown-reference": "Deleted references",
  "empty-category": "Empty categories",
  "empty-subcategory": "Empty subcategories",
  "blog-unlinked": "Unlinked blogs",
  "no-supporting-content": "No supporting blog",
  "link-opportunity": "Unlinked mentions",
};

export default function InterlinkingView({
  analysis,
}: {
  analysis: SiteAnalysis;
}) {
  const { showToast } = useToast();
  const { issues, stats } = analysis.interlinking;
  const [kind, setKind] = useState<"" | LinkIssueKind>("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [copied, setCopied] = useState("");

  const kindCounts = useMemo(() => {
    const counts = new Map<LinkIssueKind, number>();
    issues.forEach((issue) =>
      counts.set(issue.kind, (counts.get(issue.kind) || 0) + 1),
    );
    return counts;
  }, [issues]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return issues.filter(
      (issue) =>
        (!kind || issue.kind === kind) &&
        (!severity || issue.severity === severity) &&
        (!needle ||
          issue.page.title.toLowerCase().includes(needle) ||
          issue.page.route.toLowerCase().includes(needle) ||
          issue.target?.title.toLowerCase().includes(needle)),
    );
  }, [issues, kind, severity, search]);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const resetPaging = () => setVisible(PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Contextual links"
          value={stats.contentLinks}
          hint={`across ${stats.pages} pages`}
          tone="blue"
        />
        <StatCard
          label="Orphan pages"
          value={stats.orphans}
          hint="nothing links to them"
          tone="rose"
        />
        <StatCard label="Broken links" value={stats.brokenLinks} tone="rose" />
        <StatCard
          label="Taxonomy gaps"
          value={stats.taxonomyGaps}
          hint="category/subcategory"
          tone="amber"
        />
        <StatCard
          label="Unlinked mentions"
          value={stats.opportunities}
          hint="easy links to add"
          tone="violet"
        />
        <StatCard
          label="No contextual links"
          value={stats.withoutContextualLinks}
          hint="only reached via listings"
          tone="slate"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setKind("");
            resetPaging();
          }}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${!kind ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"}`}
        >
          All ({issues.length})
        </button>
        {(Object.keys(KIND_LABELS) as LinkIssueKind[])
          .filter((key) => kindCounts.get(key))
          .map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setKind(key);
                resetPaging();
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${kind === key ? "border-blue-500 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"}`}
            >
              {KIND_LABELS[key]} ({kindCounts.get(key)})
            </button>
          ))}
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
                resetPaging();
              }}
              placeholder="Page title or URL"
              className={`${filterClass} w-52 pl-9`}
            />
          </label>
          <select
            aria-label="Severity"
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              resetPaging();
            }}
            className={filterClass}
          >
            <option value="">All severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="ml-auto text-xs text-slate-500 dark:text-white/50">
            {rows.length} findings
          </span>
        </div>

        <ul className="divide-y divide-slate-200 dark:divide-white/10">
          {rows.slice(0, visible).map((issue) => {
            const snippet =
              issue.target && issue.anchor
                ? `<a href="${issue.target.route}">${issue.anchor}</a>`
                : "";
            return (
              <li
                key={issue.id}
                className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start"
              >
                <div className="flex shrink-0 items-center gap-2 md:w-40">
                  <Pill value={issue.severity} />
                  <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                    {KIND_LABELS[issue.kind]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TypeBadge type={issue.page.type} />
                    <span className="text-sm font-semibold text-neutral-950 dark:text-white">
                      {issue.page.title}
                    </span>
                    <RouteLink route={issue.page.route} />
                    {issue.target && (
                      <>
                        <ArrowRight
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-label="links to"
                        />
                        <TypeBadge type={issue.target.type} />
                        <span className="text-sm text-neutral-950 dark:text-white">
                          {issue.target.title}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-white/60">
                    {issue.message}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    → {issue.suggestion}
                  </p>
                </div>
                {snippet && (
                  <button
                    type="button"
                    onClick={() => copy(issue.id, snippet)}
                    title={snippet}
                    className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-slate-100 px-2.5 py-1 text-xs text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    {copied === issue.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy link HTML
                  </button>
                )}
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60">
              {issues.length
                ? "No findings match these filters."
                : "No interlinking problems found."}
            </li>
          )}
        </ul>
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
