import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Search } from "lucide-react";
import { useToast } from "../../Toast";
import type { LinkIssueKind, SiteAnalysis } from "../../../utils/siteAnalysis";
import { Pill, RouteLink, StatCard, TypeBadge } from "./SiteParts";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  type LiquidDropdownOption,
} from "../../ui/liquid";

const PAGE_SIZE = 60;

const SEVERITY_OPTIONS: LiquidDropdownOption[] = [
  { value: "", label: "All severities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

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
        <LiquidButton
          type="button"
          variant={!kind ? "primary" : "ghost"}
          aria-pressed={!kind}
          onClick={() => {
            setKind("");
            resetPaging();
          }}
          className="!min-h-0 rounded-full !px-3 !py-1 text-xs"
        >
          All ({issues.length})
        </LiquidButton>
        {(Object.keys(KIND_LABELS) as LinkIssueKind[])
          .filter((key) => kindCounts.get(key))
          .map((key) => (
            <LiquidButton
              key={key}
              type="button"
              variant={kind === key ? "primary" : "ghost"}
              aria-pressed={kind === key}
              onClick={() => {
                setKind(key);
                resetPaging();
              }}
              className="!min-h-0 rounded-full !px-3 !py-1 text-xs"
            >
              {KIND_LABELS[key]} ({kindCounts.get(key)})
            </LiquidButton>
          ))}
      </div>

      <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <LiquidInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPaging();
              }}
              placeholder="Page title or URL"
              aria-label="Search pages"
              className="w-52 !pl-9 text-sm"
            />
          </div>
          <LiquidDropdown
            ariaLabel="Severity"
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={(value) => {
              setSeverity(value);
              resetPaging();
            }}
            wrapperClassName="w-44"
          />
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
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={() => copy(issue.id, snippet)}
                    title={snippet}
                    className="shrink-0 self-start !min-h-0 !gap-1 !px-2.5 !py-1 text-xs"
                  >
                    {copied === issue.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy link HTML
                  </LiquidButton>
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
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              className="text-sm"
            >
              Show {Math.min(PAGE_SIZE, rows.length - visible)} more
            </LiquidButton>
          </div>
        )}
      </div>
    </div>
  );
}
