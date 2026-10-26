import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { STOREFRONT_URL, type PageType } from "../../../utils/siteAnalysis";
import { scoreTone } from "./siteStyles";

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const tones = {
    slate:
      "border-slate-500/20 bg-slate-500/5 text-slate-600 dark:text-white/60",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
    emerald:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    violet:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-neutral-950 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-white/40">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ScoreBar({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${scoreTone(score)}`}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-semibold tabular-nums text-neutral-950 dark:text-white">
        {score}
      </span>
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  strong:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  weak: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  failing: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  high: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  critical: "bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  low: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60",
  P0: "bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-100",
  P1: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  P2: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  P3: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
};

export function Pill({
  value,
  children,
}: {
  value: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PILL_TONES[value] || PILL_TONES.low}`}
    >
      {children ?? value}
    </span>
  );
}

const TYPE_LABELS: Record<PageType | "custom", string> = {
  static: "Page",
  product: "Product",
  category: "Category",
  subcategory: "Subcategory",
  blog: "Blog",
  custom: "Custom",
};

export function TypeBadge({ type }: { type: PageType | "custom" }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-white/60">
      {TYPE_LABELS[type]}
    </span>
  );
}

export function RouteLink({ route }: { route: string }) {
  if (!route) return <span className="text-xs text-slate-400">—</span>;
  return (
    <a
      href={`${STOREFRONT_URL}${route === "/" ? "" : route}`}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex max-w-[260px] items-center gap-1 truncate text-xs text-blue-600 hover:underline dark:text-blue-300"
      title={route}
    >
      <span className="truncate">
        {(() => {
          try {
            return decodeURIComponent(route);
          } catch {
            return route;
          }
        })()}
      </span>
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}
