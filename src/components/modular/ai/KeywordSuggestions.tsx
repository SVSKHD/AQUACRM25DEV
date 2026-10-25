import { useMemo, useState } from "react";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { aiService, parseAIJsonReply } from "../../../services/aiService";
import { seoService, type SeoRecord } from "../../../services/seoService";
import { useAIConfigured } from "../../../hooks/useAIConfigured";
import { useToast } from "../../Toast";
import {
  STOREFRONT_URL,
  containsPhrase,
  type KeywordRow,
  type SiteAnalysis,
} from "../../../utils/siteAnalysis";
import { RouteLink } from "./SiteParts";

interface Suggestion {
  diagnosis: string;
  title: string;
  description: string;
  contentIdeas: string[];
  internalLinks: { fromRoute: string; anchor: string; reason: string }[];
  relatedKeywords: string[];
}

const asStrings = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

const toSuggestion = (raw: unknown): Suggestion | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return {
    diagnosis: String(record.diagnosis || ""),
    title: String(record.title || ""),
    description: String(record.description || ""),
    contentIdeas: asStrings(record.contentIdeas),
    internalLinks: Array.isArray(record.internalLinks)
      ? record.internalLinks
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object",
          )
          .map((item) => ({
            fromRoute: String(item.fromRoute || ""),
            anchor: String(item.anchor || ""),
            reason: String(item.reason || ""),
          }))
      : [],
    relatedKeywords: asStrings(record.relatedKeywords),
  };
};

interface KeywordSuggestionsProps {
  row: KeywordRow;
  analysis: SiteAnalysis;
  onSeoRecordSaved: (record: SeoRecord) => void;
}

export default function KeywordSuggestions({
  row,
  analysis,
  onSeoRecordSaved,
}: KeywordSuggestionsProps) {
  const configured = useAIConfigured();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState("");

  // Pages that already talk about the keyword are the natural link sources.
  const linkSources = useMemo(() => {
    const targetRoute = row.page?.routeKey;
    return analysis.pages
      .filter(
        (page) =>
          page.pageKey !== row.pageKey &&
          page.text &&
          containsPhrase(page.text, row.keyword) &&
          !page.outbound.some((link) => link.routeKey === targetRoute),
      )
      .slice(0, 10);
  }, [analysis.pages, row]);

  const generate = async () => {
    setLoading(true);
    setError("");
    const failed = row.checks.filter((check) => check.pass === false);
    const prompt = [
      `Target keyword: "${row.keyword}"`,
      `Page: ${row.type} "${row.pageTitle}" at ${STOREFRONT_URL}${row.route}`,
      `Current SEO title: ${row.seoRecord?.title ? `"${row.seoRecord.title}" (${row.seoRecord.title.length} chars)` : "none"}`,
      `Current meta description: ${row.seoRecord?.description ? `"${row.seoRecord.description}"` : "none"}`,
      `Page content excerpt: ${row.page?.text ? row.page.text.slice(0, 1500) : "not available"}`,
      `On-page score: ${row.score}/100. Failed checks:`,
      ...failed.map((check) => `- ${check.label}: ${check.detail}`),
      row.competing.length
        ? `Other pages on the site targeting the same keyword: ${row.competing.map((page) => `${page.route} (${page.title})`).join("; ")}`
        : "No other pages target this keyword.",
      linkSources.length
        ? `Pages that mention the keyword but don't link here:\n${linkSources.map((page) => `- ${page.route} (${page.title})`).join("\n")}`
        : "No pages currently mention the keyword.",
      "",
      "Return a JSON object with exactly these fields:",
      "diagnosis: 2-3 sentences on why this keyword underperforms for this page.",
      `title: a new SEO title, 30-60 characters, containing "${row.keyword}".`,
      `description: a new meta description, 120-155 characters, containing "${row.keyword}" and a reason to click.`,
      "contentIdeas: 3-5 short, specific additions to the page content.",
      "internalLinks: up to 5 objects {fromRoute, anchor, reason}; fromRoute must come from the list of pages above.",
      "relatedKeywords: 3-6 close variants or long-tail keywords for this page.",
    ].join("\n");

    const { data, error: requestError } = await aiService.generate({
      prompt,
      json: true,
      temperature: 0.4,
      systemInstruction:
        "You are an SEO specialist for AquaKart (aquakart.co.in), an Indian e-commerce store for water purifiers, water softeners and related installation/service in Hyderabad. Give practical, specific recommendations. Never invent prices, certifications or claims that aren't in the provided content.",
    });
    setLoading(false);
    if (requestError || !data) {
      setError(requestError || "AI request failed");
      return;
    }
    const parsed = toSuggestion(parseAIJsonReply(data.reply));
    if (!parsed) {
      setError("The AI reply wasn't valid JSON. Try again.");
      return;
    }
    setSuggestion(parsed);
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  const apply = async () => {
    if (!suggestion) return;
    setApplying(true);
    const fields = {
      title: suggestion.title.slice(0, 120),
      description: suggestion.description.slice(0, 500),
    };
    const result = row.seoRecord
      ? await seoService.patch(row.seoRecord._id, fields)
      : await seoService.create({
          ...fields,
          pageKey: row.pageKey,
          route: row.route,
          keywords: [row.keyword],
          canonicalUrl: `${STOREFRONT_URL}${row.route === "/" ? "" : row.route}`,
          robots: "index,follow",
        });
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
      row.seoRecord
        ? "SEO title and description updated"
        : "SEO record created",
      "success",
    );
    onSeoRecordSaved(result.data);
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-400/20 dark:bg-violet-500/5">
      {linkSources.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Pages that mention “{row.keyword}” but don't link here
          </p>
          <ul className="space-y-1">
            {linkSources.map((page) => {
              const snippet = `<a href="${row.route}">${row.keyword}</a>`;
              return (
                <li
                  key={page.pageKey}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="text-neutral-950 dark:text-white">
                    {page.title}
                  </span>
                  <RouteLink route={page.route} />
                  <button
                    type="button"
                    onClick={() => copy(page.pageKey, snippet)}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:bg-white/10 dark:text-white/70"
                    title={snippet}
                  >
                    {copied === page.pageKey ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy link HTML
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {configured === false ? (
        <p className="text-sm text-slate-500 dark:text-white/50">
          AI suggestions are unavailable because AI isn't configured on the
          server.
        </p>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={loading || !configured}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {suggestion ? "Regenerate AI suggestions" : "Get AI suggestions"}
        </button>
      )}

      {error && (
        <p
          className="mt-3 text-sm text-rose-600 dark:text-rose-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {suggestion && (
        <div className="mt-4 space-y-4 text-sm">
          {suggestion.diagnosis && (
            <p className="text-slate-700 dark:text-white/80">
              {suggestion.diagnosis}
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                key: "title",
                label: "Suggested SEO title",
                value: suggestion.title,
                current: row.seoRecord?.title,
              },
              {
                key: "description",
                label: "Suggested meta description",
                value: suggestion.description,
                current: row.seoRecord?.description,
              },
            ].map((field) => (
              <div
                key={field.key}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                    {field.label} · {field.value.length} chars
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(field.key, field.value)}
                    className="text-slate-500 hover:text-black dark:text-white/50 dark:hover:text-white"
                    aria-label={`Copy ${field.label}`}
                  >
                    {copied === field.key ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-neutral-950 dark:text-white">
                  {field.value}
                </p>
                {field.current && (
                  <p className="mt-1 text-xs text-slate-400 line-through">
                    {field.current}
                  </p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={apply}
            disabled={applying || !suggestion.title}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin" />}
            {row.seoRecord
              ? "Apply title & description to SEO record"
              : "Create SEO record with these"}
          </button>

          {suggestion.contentIdeas.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Content to add
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-white/80">
                {suggestion.contentIdeas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.internalLinks.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Internal links to add
              </p>
              <ul className="space-y-1">
                {suggestion.internalLinks.map((link) => (
                  <li
                    key={`${link.fromRoute}-${link.anchor}`}
                    className="text-slate-700 dark:text-white/80"
                  >
                    From <RouteLink route={link.fromRoute} /> with anchor{" "}
                    <strong>“{link.anchor}”</strong>
                    {link.reason && (
                      <span className="text-slate-500 dark:text-white/50">
                        {" "}
                        — {link.reason}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.relatedKeywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                Related keywords:
              </span>
              {suggestion.relatedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 dark:bg-white/10 dark:text-white/80"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
