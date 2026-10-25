import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  MinusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { aiService, parseAIJsonReply } from "../../../services/aiService";
import { productsService } from "../../../services/apiService";
import { seoService, type SeoRecord } from "../../../services/seoService";
import { useAIConfigured } from "../../../hooks/useAIConfigured";
import { useToast } from "../../Toast";
import {
  PLACE_LABELS,
  SOURCE_LABELS,
  analyzeKeyphrases,
  withCoverage,
  type PhrasePlace,
  type PhraseSuggestion,
} from "../../../utils/keyphrases";
import type { SiteAnalysis, SitePage } from "../../../utils/siteAnalysis";

const PLACES: PhrasePlace[] = [
  "title",
  "description",
  "heading",
  "content",
  "url",
];
const GAP_PREVIEW = 8;
const MAX_SEO_KEYWORDS = 50;

interface KeyphrasePanelProps {
  pageKey: string;
  title: string;
  route: string;
  page: SitePage | undefined;
  record: SeoRecord | undefined;
  analysis: SiteAnalysis;
  /** Readiness flagged MISSING_TOPIC_TERMS (catalog keywords are empty). */
  catalogKeywordsMissing: boolean;
  onSeoRecordSaved: (record: SeoRecord) => void;
  /** Called after catalog data changes so the site data can reload. */
  onCatalogChanged: () => void;
}

function PlaceMark({ value }: { value: boolean | null }) {
  if (value === null)
    return (
      <MinusCircle
        className="mx-auto h-4 w-4 text-slate-300"
        aria-label="Not applicable"
      />
    );
  return value ? (
    <CheckCircle2
      className="mx-auto h-4 w-4 text-emerald-500"
      aria-label="Present"
    />
  ) : (
    <XCircle className="mx-auto h-4 w-4 text-rose-500" aria-label="Missing" />
  );
}

const missingPlaces = (suggestion: PhraseSuggestion) =>
  PLACES.filter((place) => suggestion.places[place] === false).map(
    (place) => PLACE_LABELS[place],
  );

export default function KeyphrasePanel({
  pageKey,
  title,
  route,
  page,
  record,
  analysis,
  catalogKeywordsMissing,
  onSeoRecordSaved,
  onCatalogChanged,
}: KeyphrasePanelProps) {
  const configured = useAIConfigured();
  const { showToast } = useToast();
  const report = useMemo(
    () => analyzeKeyphrases(page, record, analysis, catalogKeywordsMissing),
    [page, record, analysis, catalogKeywordsMissing],
  );
  const [aiSuggestions, setAiSuggestions] = useState<PhraseSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [saving, setSaving] = useState<"" | "seo" | "catalog">("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);

  const suggestions = useMemo(() => {
    const known = new Set(
      report.suggestions.map((item) => item.phrase.toLowerCase()),
    );
    return [
      ...report.suggestions,
      ...aiSuggestions.filter((item) => !known.has(item.phrase.toLowerCase())),
    ];
  }, [report.suggestions, aiSuggestions]);
  const chosen = suggestions
    .filter((item) => selected.has(item.phrase))
    .map((item) => item.phrase);

  const toggle = (phrase: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(phrase)) next.delete(phrase);
      else next.add(phrase);
      return next;
    });

  const addToSeoKeywords = async () => {
    const existing = record?.keywords || [];
    const merged = [...existing];
    chosen.forEach((phrase) => {
      if (
        !merged.some(
          (keyword) => keyword.toLowerCase() === phrase.toLowerCase(),
        )
      )
        merged.push(phrase);
    });
    if (merged.length > MAX_SEO_KEYWORDS) {
      showToast(
        `SEO records allow at most ${MAX_SEO_KEYWORDS} keywords; remove some first.`,
        "error",
      );
      return;
    }
    setSaving("seo");
    const result = record
      ? await seoService.patch(record._id, { keywords: merged })
      : await seoService.create({
          pageKey,
          route,
          title: title.slice(0, 60),
          keywords: merged,
        });
    setSaving("");
    if (result.error || !result.data) {
      showToast(
        result.status === 403
          ? "You need the seo.manage permission to update SEO records."
          : result.error || "Failed to save keywords",
        "error",
      );
      return;
    }
    showToast(
      `Added ${chosen.length} keyphrase${chosen.length === 1 ? "" : "s"} to the SEO keywords`,
      "success",
    );
    setSelected(new Set());
    onSeoRecordSaved(result.data);
  };

  const saveCatalogKeywords = async () => {
    if (!page || page.type !== "product") return;
    const phrases = chosen.length
      ? chosen
      : (record?.keywords || []).slice(0, 10);
    if (!phrases.length) {
      showToast("Select keyphrases to save as product keywords", "error");
      return;
    }
    setSaving("catalog");
    const { error } = await productsService.update(page.id, {
      keywords: phrases.join(", "),
    });
    setSaving("");
    if (error) {
      showToast(String(error), "error");
      return;
    }
    showToast("Product keywords saved. Re-scoring…", "success");
    onCatalogChanged();
  };

  const suggestWithAI = async () => {
    setAiLoading(true);
    setAiError("");
    const { data, error } = await aiService.generate({
      json: true,
      temperature: 0.5,
      prompt: [
        `Page: ${page?.type || "page"} "${title}" at https://aquakart.co.in${route}`,
        `Currently targeted keywords: ${(record?.keywords || page?.keywords || []).join(", ") || "none"}`,
        `Content excerpt: ${page?.text ? page.text.slice(0, 1500) : "not available"}`,
        "",
        "Suggest 6-10 keyphrases this page is missing that Indian shoppers (especially in Hyderabad) actually search for.",
        "Mix buyer-intent (price, buy, near me, installation), comparison and informational long-tail phrases. Don't repeat the targeted keywords.",
        'Return JSON: { "keyphrases": [ { "phrase": "...", "reason": "short why" } ] }',
      ].join("\n"),
      systemInstruction:
        "You are an SEO keyword researcher for AquaKart (aquakart.co.in), an Indian store for water purifiers, softeners and installation/service in Hyderabad. Only suggest phrases relevant to the page.",
    });
    setAiLoading(false);
    const parsed = data
      ? parseAIJsonReply<{
          keyphrases?: { phrase?: unknown; reason?: unknown }[];
        }>(data.reply)
      : undefined;
    const phrases = (parsed?.keyphrases || [])
      .map((item) => ({
        phrase: String(item?.phrase || "")
          .trim()
          .toLowerCase(),
        reason: String(item?.reason || "Suggested by AI"),
      }))
      .filter((item) => item.phrase && item.phrase.length <= 100);
    if (error || !phrases.length) {
      setAiError(error || "The AI didn't return any keyphrases. Try again.");
      return;
    }
    setAiSuggestions(withCoverage(phrases, page, record));
  };

  const copyChosen = async () => {
    try {
      await navigator.clipboard.writeText(
        (chosen.length ? chosen : suggestions.map((item) => item.phrase)).join(
          ", ",
        ),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const gaps = showAllGaps
    ? report.targetsWithGaps
    : report.targetsWithGaps.slice(0, GAP_PREVIEW);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-400/20 dark:bg-amber-500/5">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
        <KeyRound className="h-4 w-4 text-amber-600" aria-hidden="true" />
        Missing keywords &amp; keyphrases
      </p>

      {report.catalogKeywordsMissing && (
        <div className="mb-3 flex flex-wrap items-start gap-2 rounded-lg bg-amber-100/70 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">
            This {page?.type || "page"} has no catalog keywords, which costs 10
            points of its readiness content score.
            {page?.type === "product"
              ? " Select keyphrases below and save them as product keywords."
              : " Add keywords to it in Products."}
          </span>
          {page?.type === "product" && (
            <button
              type="button"
              onClick={saveCatalogKeywords}
              disabled={
                saving !== "" || (!chosen.length && !record?.keywords?.length)
              }
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving === "catalog" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Save {chosen.length ? chosen.length : "SEO"} keyword
              {chosen.length === 1 ? "" : "s"} to product
            </button>
          )}
        </div>
      )}

      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          Target keywords missing from key places (
          {report.targetsWithGaps.length} of {report.targets.length})
        </p>
        {report.targets.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-white/60">
            This page doesn't target any keywords yet. Pick some from the
            suggestions below.
          </p>
        ) : report.targetsWithGaps.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Every target keyword appears in the title, description and content.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-white/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Keyword</th>
                    {PLACES.map((place) => (
                      <th key={place} className="px-2 py-2 text-center">
                        {PLACE_LABELS[place]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {gaps.map((target) => (
                    <tr key={target.phrase}>
                      <td className="px-3 py-1.5 text-neutral-950 dark:text-white">
                        {target.phrase}
                      </td>
                      {PLACES.map((place) => (
                        <td key={place} className="px-2 py-1.5">
                          <PlaceMark value={target.places[place]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
              Each ✗ lowers the keyword's score (title 20 pts, description 15,
              heading 10, content 10, URL 10). Use the keyword where it's
              missing, or drop keywords this page shouldn't target.
              {report.targetsWithGaps.length > GAP_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllGaps((value) => !value)}
                  className="ml-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                >
                  {showAllGaps
                    ? "Show fewer"
                    : `Show all ${report.targetsWithGaps.length}`}
                </button>
              )}
            </p>
          </>
        )}
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Keyphrases to add ({suggestions.length})
          </p>
          {configured && (
            <button
              type="button"
              onClick={suggestWithAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Suggest more with AI
            </button>
          )}
        </div>
        {aiError && (
          <p
            className="mb-2 text-xs text-rose-600 dark:text-rose-300"
            role="alert"
          >
            {aiError}
          </p>
        )}
        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-white/60">
            No new keyphrases found for this page.
          </p>
        ) : (
          <ul className="grid gap-1.5 md:grid-cols-2">
            {suggestions.map((suggestion) => {
              const missing = missingPlaces(suggestion);
              return (
                <li key={suggestion.phrase}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-white/10 dark:bg-white/5">
                    <input
                      type="checkbox"
                      checked={selected.has(suggestion.phrase)}
                      onChange={() => toggle(suggestion.phrase)}
                      className="mt-0.5 h-4 w-4 rounded"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-neutral-950 dark:text-white">
                        {suggestion.phrase}
                      </span>
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-white/60">
                        {SOURCE_LABELS[suggestion.source]}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-white/50">
                        {suggestion.reason}
                      </span>
                      {missing.length > 0 && (
                        <span className="block text-xs text-rose-600 dark:text-rose-300">
                          Missing from: {missing.join(", ")}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addToSeoKeywords}
              disabled={!chosen.length || saving !== ""}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving === "seo" && <Loader2 className="h-4 w-4 animate-spin" />}
              Add {chosen.length || ""} to SEO keywords
            </button>
            <button
              type="button"
              onClick={copyChosen}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy {chosen.length ? "selected" : "all"}
            </button>
            <span className="text-xs text-slate-500 dark:text-white/40">
              After adding, use each phrase in the title, description or content
              (Fix this page can rewrite them with AI).
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
