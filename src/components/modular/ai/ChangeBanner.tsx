import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReadinessChange } from "../../../hooks/useSiteData";

export default function ChangeBanner({ change }: { change: ReadinessChange }) {
  const delta = change.after.overallScore - change.before.overallScore;
  const improved = [...change.pages.values()].filter(
    ([before, after]) => after > before,
  ).length;
  const dropped = change.pages.size - improved;
  return (
    <p
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm ${
        delta > 0 || improved
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
      }`}
      role="status"
    >
      {delta >= 0 ? (
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
      ) : (
        <TrendingDown className="h-4 w-4" aria-hidden="true" />
      )}
      <span>
        Re-scored at {new Date(change.at).toLocaleTimeString("en-IN")}: site
        readiness {change.before.overallScore} →{" "}
        <strong>{change.after.overallScore}</strong>
        {delta !== 0 && ` (${delta > 0 ? "+" : ""}${delta})`}, ready pages{" "}
        {change.before.ready} → <strong>{change.after.ready}</strong>, critical{" "}
        {change.before.critical} → <strong>{change.after.critical}</strong>.
      </span>
      <span>
        {change.pages.size
          ? `${improved} page${improved === 1 ? "" : "s"} improved${dropped ? `, ${dropped} dropped` : ""}.`
          : "No page scores changed. Readiness rewards filling missing fields (canonical, robots, Open Graph, schema, catalog data), not rewording a title or description."}
      </span>
    </p>
  );
}
