import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Sparkles, Wrench } from "lucide-react";
import { aiService, parseAIJsonReply } from "../../../services/aiService";
import {
  seoService,
  type SeoReadinessItem,
  type SeoRecord,
} from "../../../services/seoService";
import { useAIConfigured } from "../../../hooks/useAIConfigured";
import { useToast } from "../../Toast";
import {
  buildFixPlan,
  buildSchema,
  fieldLabel,
  fixPayload,
  type FixField,
  type ProposedChange,
} from "../../../utils/seoFixes";
import type { SitePage } from "../../../utils/siteAnalysis";

interface PageFixPanelProps {
  item: SeoReadinessItem;
  page: SitePage | undefined;
  records: SeoRecord[];
  onSeoRecordSaved: (record: SeoRecord) => void;
}

const AI_FIELDS: FixField[] = [
  "title",
  "description",
  "keywords",
  "ogTitle",
  "ogDescription",
  "schemaJson",
];

const preview = (value: unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value ?? "");
};

export default function PageFixPanel({
  item,
  page,
  records,
  onSeoRecordSaved,
}: PageFixPanelProps) {
  const configured = useAIConfigured();
  const { showToast } = useToast();
  const plan = useMemo(
    () => buildFixPlan(item, records, page),
    [item, records, page],
  );
  const [overrides, setOverrides] = useState<
    Partial<Record<FixField, ProposedChange>>
  >({});
  const [unchecked, setUnchecked] = useState<Set<FixField>>(() => new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [applying, setApplying] = useState(false);

  // AI rewrites replace or add to the deterministic fixes.
  const changes = useMemo(() => {
    const merged = new Map<FixField, ProposedChange>(
      plan.changes.map((change) => [change.field, change]),
    );
    Object.values(overrides).forEach(
      (change) => change && merged.set(change.field, change),
    );
    return [...merged.values()];
  }, [plan.changes, overrides]);
  const chosen = changes.filter((change) => !unchecked.has(change.field));

  const toggle = (field: FixField) =>
    setUnchecked((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });

  const improveWithAI = async () => {
    setAiLoading(true);
    setAiError("");
    const prompt = [
      `Page: ${item.entityType} "${item.title}" at ${item.canonicalUrl}`,
      `Current SEO title: ${plan.target?.title || "none"}`,
      `Current meta description: ${plan.target?.description || "none"}`,
      `Current keywords: ${plan.target?.keywords?.join(", ") || page?.keywords.join(", ") || "none"}`,
      `Page content excerpt: ${page?.text ? page.text.slice(0, 1500) : "not available"}`,
      `Readiness issues: ${item.issues.map((issue) => issue.message).join("; ") || "none"}`,
      "",
      "Return a JSON object with exactly these fields:",
      "title: SEO title, 30-60 characters, primary keyword near the start.",
      "description: meta description, 120-155 characters, with a reason to click.",
      "keywords: 4-8 target keywords (primary first), lowercase.",
    ].join("\n");
    const { data, error } = await aiService.generate({
      prompt,
      json: true,
      temperature: 0.4,
      systemInstruction:
        "You are an SEO specialist for AquaKart (aquakart.co.in), an Indian e-commerce store for water purifiers, water softeners and installation/service in Hyderabad. Never invent prices, certifications or claims that aren't in the provided content.",
    });
    setAiLoading(false);
    const parsed = data
      ? parseAIJsonReply<{
          title?: unknown;
          description?: unknown;
          keywords?: unknown;
        }>(data.reply)
      : undefined;
    if (error || !parsed) {
      setAiError(error || "The AI reply wasn't valid JSON. Try again.");
      return;
    }
    const title = String(parsed.title || "")
      .trim()
      .slice(0, 120);
    const description = String(parsed.description || "")
      .trim()
      .slice(0, 500);
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).filter(Boolean).slice(0, 20)
      : [];
    const make = (
      field: FixField,
      value: ProposedChange["value"],
      reason: string,
    ): ProposedChange => ({
      field,
      label: fieldLabel(field),
      current: preview(plan.target?.[field as keyof SeoRecord]),
      value,
      reason,
    });
    const next: Partial<Record<FixField, ProposedChange>> = {};
    if (title) {
      next.title = make("title", title, "AI rewrite");
      next.ogTitle = make("ogTitle", title, "Match the new SEO title");
    }
    if (description) {
      next.description = make("description", description, "AI rewrite");
      next.ogDescription = make(
        "ogDescription",
        description,
        "Match the new description",
      );
    }
    if (keywords.length)
      next.keywords = make("keywords", keywords, "AI keyword set");
    // Keep generated structured data in sync with the new copy.
    if (plan.changes.some((change) => change.field === "schemaJson")) {
      next.schemaJson = make(
        "schemaJson",
        buildSchema(
          item,
          page,
          title || plan.target?.title || item.title,
          description || plan.target?.description || "",
        ),
        "Rebuilt with the new copy",
      );
    }
    setOverrides(next);
    setUnchecked((current) => {
      const updated = new Set(current);
      AI_FIELDS.forEach((field) => updated.delete(field));
      return updated;
    });
  };

  const apply = async () => {
    if (!chosen.length && plan.target) return;
    setApplying(true);
    const body = fixPayload(item, plan, chosen);
    const result = plan.target
      ? await seoService.patch(plan.target._id, body)
      : await seoService.create(body);
    setApplying(false);
    if (result.error || !result.data) {
      showToast(
        result.status === 403
          ? "You need the seo.manage permission to update SEO records."
          : result.error || "Failed to save",
        "error",
      );
      return;
    }
    showToast(
      `${plan.target ? "Updated" : "Created"} SEO record for "${item.title}". Re-scoring…`,
      "success",
    );
    setOverrides({});
    setUnchecked(new Set());
    onSeoRecordSaved(result.data);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-400/20 dark:bg-blue-500/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
          <Wrench className="h-4 w-4 text-blue-600" aria-hidden="true" />
          Fix this page
          {!plan.target && (
            <span className="text-xs font-normal text-slate-500">
              (creates its SEO record)
            </span>
          )}
        </p>
        {configured && (
          <button
            type="button"
            onClick={improveWithAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Improve title &amp; description with AI
          </button>
        )}
      </div>

      {plan.misKeyed && (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This page's SEO record is saved under page key “{plan.target?.pageKey}
          ”, so readiness never counts it. Applying renames it to “
          {item.pageKey}”.
        </p>
      )}
      {aiError && (
        <p
          className="mb-3 text-sm text-rose-600 dark:text-rose-300"
          role="alert"
        >
          {aiError}
        </p>
      )}

      {changes.length > 0 ? (
        <ul className="space-y-2">
          {changes.map((change) => (
            <li
              key={change.field}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-white/10 dark:bg-white/5"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={!unchecked.has(change.field)}
                  onChange={() => toggle(change.field)}
                  className="mt-1 h-4 w-4 rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-950 dark:text-white">
                    {change.label}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      · {change.reason}
                    </span>
                  </p>
                  {change.current && change.field !== "schemaJson" && (
                    <p className="truncate text-xs text-slate-400 line-through">
                      {change.current}
                    </p>
                  )}
                  {change.field === "schemaJson" ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-blue-700 dark:text-blue-300">
                        Show JSON-LD
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-50 p-2 text-xs dark:bg-black/30">
                        {preview(change.value)}
                      </pre>
                    </details>
                  ) : (
                    <p className="break-words text-xs text-emerald-700 dark:text-emerald-300">
                      {preview(change.value)}
                    </p>
                  )}
                </div>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          The SEO record has everything readiness checks for.
        </p>
      )}

      {plan.manual.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Needs a catalog edit (can't be fixed from the SEO record)
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700 dark:text-white/70">
            {plan.manual.map(({ issue, hint }) => (
              <li key={`${issue.code}-${issue.field}`}>{hint}</li>
            ))}
          </ul>
        </div>
      )}

      {(changes.length > 0 || !plan.target) && (
        <button
          type="button"
          onClick={apply}
          disabled={applying || (plan.target !== null && chosen.length === 0)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {applying && <Loader2 className="h-4 w-4 animate-spin" />}
          Apply {chosen.length} fix{chosen.length === 1 ? "" : "es"}
        </button>
      )}
    </div>
  );
}
