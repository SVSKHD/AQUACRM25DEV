import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Rocket,
  Sparkles,
  Square,
} from "lucide-react";
import { aiService, parseAIJsonReply } from "../../../services/aiService";
import {
  seoService,
  type SeoReadinessReport,
  type SeoRecord,
} from "../../../services/seoService";
import { useAIConfigured } from "../../../hooks/useAIConfigured";
import type { ReadinessChange } from "../../../hooks/useSiteData";
import { useToast } from "../../Toast";
import { fixPayload } from "../../../utils/seoFixes";
import {
  COPY_SYSTEM_INSTRUCTION,
  DEFAULT_OPTIONS,
  buildCopyPrompt,
  buildPagePlans,
  projectedSiteScore,
  withAICopy,
  type AICopy,
  type AutopilotOptions,
  type PagePlan,
} from "../../../utils/seoAutopilot";
import type { SiteAnalysis } from "../../../utils/siteAnalysis";
import ChangeBanner from "./ChangeBanner";
import { Pill, RouteLink, StatCard, TypeBadge } from "./SiteParts";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidIconButton,
} from "../../ui/liquid";

// The AI endpoint allows 30 requests/min per user; stay just under it.
const AI_MIN_INTERVAL_MS = 2200;
const RATE_LIMIT_BACKOFF_MS = 30000;
const APPLY_CONCURRENCY = 2;

type Scope = "all" | "top10" | "critical";
type Draft = { copy: AICopy } | { error: string };

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const preview = (value: unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value ?? "");
};

interface AutopilotViewProps {
  analysis: SiteAnalysis;
  readiness: SeoReadinessReport | null;
  records: SeoRecord[];
  change: ReadinessChange | null;
  onSeoRecordsSaved: (records: SeoRecord[]) => void;
}

export default function AutopilotView({
  analysis,
  readiness,
  records,
  change,
  onSeoRecordsSaved,
}: AutopilotViewProps) {
  const configured = useAIConfigured();
  const { showToast } = useToast();
  const [options, setOptions] = useState<AutopilotOptions>(DEFAULT_OPTIONS);
  const [scope, setScope] = useState<Scope>("all");
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Map<string, Draft>>(() => new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [applying, setApplying] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [failures, setFailures] = useState<{ title: string; error: string }[]>(
    [],
  );
  const cancelRef = useRef(false);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    [],
  );

  const aiEnabled = options.aiCopy && configured === true;
  const effectiveOptions = useMemo(
    () => ({ ...options, aiCopy: aiEnabled }),
    [options, aiEnabled],
  );

  const basePlans = useMemo(
    () =>
      readiness
        ? buildPagePlans(readiness.items, records, analysis, effectiveOptions)
        : [],
    [readiness, records, analysis, effectiveOptions],
  );
  const plans = useMemo(
    () =>
      basePlans.map((plan) => {
        const draft = drafts.get(plan.item.pageKey);
        return draft && "copy" in draft ? withAICopy(plan, draft.copy) : plan;
      }),
    [basePlans, drafts],
  );

  const inScope = useMemo(() => {
    const scoped =
      scope === "critical"
        ? plans.filter((plan) => plan.item.priority === "P0")
        : scope === "top10"
          ? plans.slice(0, 10)
          : plans;
    return new Set(scoped.map((plan) => plan.item.pageKey));
  }, [plans, scope]);
  const included = useMemo(
    () => new Set([...inScope].filter((pageKey) => !excluded.has(pageKey))),
    [inScope, excluded],
  );
  const includedPlans = plans.filter((plan) => included.has(plan.item.pageKey));
  const needsDraft = includedPlans.filter(
    (plan) => plan.weakCopy.length && !drafts.has(plan.item.pageKey),
  );
  const toApply = includedPlans.filter((plan) => plan.changes.length);

  const siteNow = readiness?.summary.overallScore ?? 0;
  const siteProjected = readiness
    ? projectedSiteScore(readiness.items, plans, included)
    : 0;
  const totalGain = includedPlans.reduce(
    (sum, plan) => sum + Math.max(0, plan.gain),
    0,
  );
  const manualCount = plans.reduce((sum, plan) => sum + plan.manual.length, 0);
  const busy = Boolean(drafting || applying);

  const toggle = (pageKey: string) =>
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });

  const draftCopy = async () => {
    const queue = needsDraft;
    if (!queue.length) return;
    cancelRef.current = false;
    setDrafting({ done: 0, total: queue.length });
    let lastRequest = 0;
    for (let index = 0; index < queue.length; index += 1) {
      if (cancelRef.current) break;
      const plan = queue[index];
      let result: Draft | null = null;
      for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
        const wait = lastRequest + AI_MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await sleep(wait);
        lastRequest = Date.now();
        const { data, error, status } = await aiService.generate({
          prompt: buildCopyPrompt(plan),
          systemInstruction: COPY_SYSTEM_INSTRUCTION,
          json: true,
          temperature: 0.4,
        });
        if (status === 429 && attempt === 0) {
          await sleep(RATE_LIMIT_BACKOFF_MS);
          continue;
        }
        const parsed = data
          ? parseAIJsonReply<{ title?: unknown; description?: unknown }>(
              data.reply,
            )
          : undefined;
        result =
          parsed && (parsed.title || parsed.description)
            ? {
                copy: {
                  title: String(parsed.title || ""),
                  description: String(parsed.description || ""),
                },
              }
            : { error: error || "The AI reply wasn't valid JSON" };
      }
      if (cancelRef.current) break;
      if (result) {
        const draft = result;
        setDrafts((current) => new Map(current).set(plan.item.pageKey, draft));
      }
      setDrafting({ done: index + 1, total: queue.length });
    }
    setDrafting(null);
    if (!cancelRef.current)
      showToast(
        `Drafted AI copy for ${queue.length} page${queue.length === 1 ? "" : "s"}. Review, then apply.`,
        "success",
      );
  };

  const apply = async () => {
    const queue = toApply;
    if (!queue.length) return;
    if (
      !window.confirm(
        `Apply SEO changes to ${queue.length} page${queue.length === 1 ? "" : "s"}? This updates the live SEO records.`,
      )
    )
      return;
    setFailures([]);
    setApplying({ done: 0, total: queue.length });
    const saved: SeoRecord[] = [];
    const failed: { title: string; error: string }[] = [];
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < queue.length) {
        const plan: PagePlan = queue[next++];
        const body = fixPayload(
          plan.item,
          {
            target: plan.target,
            misKeyed: plan.misKeyed,
            changes: plan.changes,
            manual: plan.manual,
          },
          plan.changes,
        );
        const result = plan.target
          ? await seoService.patch(plan.target._id, body)
          : await seoService.create(body);
        if (result.data) saved.push(result.data);
        else
          failed.push({
            title: plan.item.title,
            error:
              result.status === 403
                ? "Missing seo.manage permission"
                : result.error || "Failed to save",
          });
        done += 1;
        setApplying({ done, total: queue.length });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(APPLY_CONCURRENCY, queue.length) }, worker),
    );
    setApplying(null);
    setFailures(failed);
    // Drafts for applied pages are now part of their records.
    setDrafts((current) => {
      const remaining = new Map(current);
      queue.forEach((plan) => remaining.delete(plan.item.pageKey));
      return remaining;
    });
    onSeoRecordsSaved(saved);
    showToast(
      failed.length
        ? `Applied ${saved.length} pages, ${failed.length} failed. Re-scoring…`
        : `Applied ${saved.length} pages. Re-scoring…`,
      saved.length ? "success" : "error",
    );
  };

  if (!readiness) {
    return (
      <div className="glass-card p-8 text-center text-sm text-slate-500 dark:text-white/60">
        The autopilot needs the seo.read permission to load readiness scores.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {change && <ChangeBanner change={change} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Pages to improve"
          value={plans.length}
          hint={`${included.size} selected`}
          tone="blue"
        />
        <StatCard
          label="Site readiness"
          value={`${siteNow} → ${siteProjected}`}
          hint="now → after applying selected"
          tone="emerald"
        />
        <StatCard
          label="Total score gain"
          value={`+${totalGain}`}
          hint="sum across selected pages"
          tone="violet"
        />
        <StatCard
          label="Weak copy"
          value={includedPlans.filter((plan) => plan.weakCopy.length).length}
          hint="titles/descriptions to rewrite"
          tone="amber"
        />
        <StatCard
          label="AI drafts"
          value={`${[...drafts.values()].filter((draft) => "copy" in draft).length}`}
          hint={`${needsDraft.length} still needed`}
          tone="slate"
        />
        <StatCard
          label="Catalog edits"
          value={manualCount}
          hint="manual: brand, GTIN, content…"
          tone="rose"
        />
      </div>

      <div className="glass-card border border-slate-200 p-4 shadow-xl dark:border-white/10">
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              [
                "fixRecords",
                "Fix SEO records",
                "Canonical, robots, Open Graph, structured data, missing records, wrong page keys.",
              ],
              [
                "aiCopy",
                "Rewrite weak copy with AI",
                configured === false
                  ? "AI isn't configured on the server."
                  : "Titles/descriptions that are missing, the wrong length, or lack the primary keyword.",
              ],
              [
                "addKeyphrases",
                "Add top keyphrases",
                "Up to 3 high-intent or already-in-content phrases per page to SEO keywords.",
              ],
            ] as [keyof AutopilotOptions, string, string][]
          ).map(([key, label, hint]) => (
            <LiquidCheckbox
              key={key}
              checked={options[key]}
              disabled={busy || (key === "aiCopy" && configured === false)}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }
              wrapperClassName="flex cursor-pointer !items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10"
              label={
                <span>
                  <span className="font-semibold text-neutral-950 dark:text-white">
                    {label}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-white/50">
                    {hint}
                  </span>
                </span>
              }
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <LiquidDropdown
            ariaLabel="Pages to include"
            value={scope}
            options={[
              {
                value: "all",
                label: `All pages that can improve (${plans.length})`,
              },
              { value: "top10", label: "Top 10 quick wins" },
              { value: "critical", label: "Only critical (P0) pages" },
            ]}
            onChange={(value) => setScope(value as Scope)}
            disabled={busy}
            wrapperClassName="w-72 max-w-full"
          />
          {aiEnabled && (
            <LiquidButton
              type="button"
              variant="primary"
              onClick={draftCopy}
              disabled={busy || needsDraft.length === 0}
              className="text-sm"
            >
              <Sparkles className="h-4 w-4" />
              1. Draft AI copy for {needsDraft.length} page
              {needsDraft.length === 1 ? "" : "s"}
              {needsDraft.length > 0 && (
                <span className="font-normal opacity-80">
                  (~
                  {Math.max(
                    1,
                    Math.ceil((needsDraft.length * AI_MIN_INTERVAL_MS) / 60000),
                  )}{" "}
                  min)
                </span>
              )}
            </LiquidButton>
          )}
          <LiquidButton
            type="button"
            variant="primary"
            onClick={apply}
            disabled={busy || toApply.length === 0}
            className="text-sm"
          >
            <Rocket className="h-4 w-4" />
            {aiEnabled ? "2. " : ""}Apply {toApply.length} page
            {toApply.length === 1 ? "" : "s"}
          </LiquidButton>
          {drafting && (
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => {
                cancelRef.current = true;
              }}
              className="text-sm"
            >
              <Square className="h-3.5 w-3.5" /> Stop drafting
            </LiquidButton>
          )}
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => setExcluded(new Set())}
            disabled={busy}
            className="text-sm"
          >
            Select all
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => setExcluded(new Set(inScope))}
            disabled={busy}
            className="text-sm"
          >
            Select none
          </LiquidButton>
        </div>

        {(drafting || applying) && (
          <div className="mt-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {drafting
                ? `Drafting copy ${drafting.done}/${drafting.total}`
                : `Applying ${applying?.done}/${applying?.total}`}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${drafting ? "bg-violet-500" : "bg-blue-500"}`}
                style={{
                  width: `${((drafting || applying)!.done / Math.max(1, (drafting || applying)!.total)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-white/50">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Pages are ranked by predicted readiness gain, keyword gaps, weak copy
          and priority. Predicted scores use the same rules as the backend
          scorer. Nothing is saved until you click Apply.
        </p>

        {failures.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="mb-1 font-semibold text-rose-700 dark:text-rose-300">
              {failures.length} page{failures.length === 1 ? "" : "s"} failed
            </p>
            <ul className="space-y-0.5 text-xs text-rose-700 dark:text-rose-300">
              {failures.map((failure, index) => (
                <li key={`${failure.title}-${index}`}>
                  {failure.title}: {failure.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="w-8 px-2 py-3" aria-label="Include" />
                <th className="w-8 px-2 py-3" aria-label="Expand" />
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  #
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Page
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Score
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Changes
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                  Copy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {plans.map((plan, index) => {
                const pageKey = plan.item.pageKey;
                const isIncluded = included.has(pageKey);
                const isOpen = expanded === pageKey;
                const draft = drafts.get(pageKey);
                return (
                  <Fragment key={pageKey}>
                    <tr
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${inScope.has(pageKey) ? "" : "opacity-50"}`}
                    >
                      <td className="px-2 py-3">
                        <LiquidCheckbox
                          checked={isIncluded}
                          disabled={busy || !inScope.has(pageKey)}
                          onChange={() => toggle(pageKey)}
                          ariaLabel={`Include ${plan.item.title}`}
                        />
                      </td>
                      <td className="px-2 py-3 text-slate-500">
                        <LiquidIconButton
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : pageKey)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide changes" : "Show changes"}
                          className="!h-7 !w-7 !rounded-lg"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </LiquidIconButton>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold tabular-nums text-slate-600 dark:text-white/60">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <TypeBadge type={plan.item.entityType} />
                          <span className="max-w-[240px] truncate text-sm font-semibold text-neutral-950 dark:text-white">
                            {plan.item.title}
                          </span>
                          <Pill value={plan.item.priority} />
                        </div>
                        <RouteLink route={plan.item.route} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span className="text-slate-500 dark:text-white/50">
                          {plan.current}
                        </span>
                        <span className="mx-1 text-slate-400">→</span>
                        <strong className="text-neutral-950 dark:text-white">
                          {plan.projected}
                        </strong>
                        {plan.gain > 0 && (
                          <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                            +{plan.gain}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {plan.changes.slice(0, 4).map((item) => (
                            <span
                              key={item.field}
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"
                            >
                              {item.label}
                            </span>
                          ))}
                          {plan.changes.length > 4 && (
                            <span className="text-[11px] text-slate-500">
                              +{plan.changes.length - 4}
                            </span>
                          )}
                          {plan.changes.length === 0 && (
                            <span className="text-xs text-slate-400">
                              Copy only
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-3 text-xs">
                        {draft && "copy" in draft ? (
                          <span className="font-semibold text-violet-700 dark:text-violet-300">
                            AI drafted ✓
                          </span>
                        ) : draft && "error" in draft ? (
                          <span
                            className="text-rose-600 dark:text-rose-300"
                            title={draft.error}
                          >
                            Draft failed
                          </span>
                        ) : plan.weakCopy.length ? (
                          <span className="text-amber-700 dark:text-amber-300">
                            {plan.weakCopy[0]}
                            {plan.weakCopy.length > 1 &&
                              ` (+${plan.weakCopy.length - 1})`}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-300">
                            Copy OK
                          </span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                        <td colSpan={2} />
                        <td colSpan={5} className="space-y-3 px-3 py-4 text-sm">
                          {plan.misKeyed && (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                              Its SEO record is saved under “
                              {plan.target?.pageKey}”, so readiness ignores it;
                              applying renames it.
                            </p>
                          )}
                          {plan.weakCopy.length > 0 && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Copy issues: {plan.weakCopy.join(" · ")}
                            </p>
                          )}
                          <ul className="space-y-1.5">
                            {plan.changes.map((item) => (
                              <li
                                key={item.field}
                                className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-white/5"
                              >
                                <p className="font-semibold text-neutral-950 dark:text-white">
                                  {item.label}{" "}
                                  <span className="text-xs font-normal text-slate-500">
                                    · {item.reason}
                                  </span>
                                </p>
                                {item.current &&
                                  item.field !== "schemaJson" && (
                                    <p className="truncate text-xs text-slate-400 line-through">
                                      {item.current}
                                    </p>
                                  )}
                                {item.field === "schemaJson" ? (
                                  <details>
                                    <summary className="cursor-pointer text-xs text-blue-700 dark:text-blue-300">
                                      Show JSON-LD
                                    </summary>
                                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-50 p-2 text-xs dark:bg-black/30">
                                      {preview(item.value)}
                                    </pre>
                                  </details>
                                ) : (
                                  <p className="break-words text-xs text-emerald-700 dark:text-emerald-300">
                                    {preview(item.value)}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                          {plan.manual.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                                Still needs a catalog edit
                              </p>
                              <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700 dark:text-white/70">
                                {plan.manual.map(({ issue, hint }) => (
                                  <li key={`${issue.code}-${issue.field}`}>
                                    {hint}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {plans.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-emerald-700 dark:text-emerald-300"
                  >
                    Every page's SEO record is complete. Remaining improvements
                    need catalog edits (see Page rankings).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
