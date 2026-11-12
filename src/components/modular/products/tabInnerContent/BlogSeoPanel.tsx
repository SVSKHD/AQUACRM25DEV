import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import FormSection from "../../../ui/FormSection";
import { LiquidButton, LiquidCheckbox } from "../../../ui/liquid";
import { useAIConfigured } from "../../../../hooks/useAIConfigured";
import { useAIFieldWorking } from "../../../ai/AIFieldAnimation";
import { aiService, parseAIJsonReply } from "../../../../services/aiService";
import {
  AUTO_FIX_FIELDS,
  AUTO_FIX_LABELS,
  AUTO_FIX_SYSTEM_INSTRUCTION,
  buildAutoFixPrompt,
  parseAutoFix,
  scoreBlogSeo,
  type AutoFixField,
  type AutoFixProposal,
  type BlogSeoInput,
} from "../../../../utils/blogSeo";

const tone = (score: number) =>
  score >= 75
    ? { text: "text-emerald-300", ring: "border-emerald-400/60" }
    : score >= 50
      ? { text: "text-amber-300", ring: "border-amber-400/60" }
      : { text: "text-rose-300", ring: "border-rose-400/60" };

const StatusIcon = ({ status }: { status: "pass" | "warn" | "fail" }) =>
  status === "pass" ? (
    <CheckCircle2
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
      aria-label="Passed"
    />
  ) : status === "warn" ? (
    <AlertTriangle
      className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
      aria-label="Partly met"
    />
  ) : (
    <XCircle
      className="mt-0.5 h-4 w-4 shrink-0 text-rose-300"
      aria-label="Failed"
    />
  );

interface BlogSeoPanelProps {
  input: BlogSeoInput;
  /** Names (not ids) sent to the AI as context. */
  context: { category?: string; product?: string; brand?: string };
  /** Published blog: a new slug breaks old links, so it starts unticked. */
  slugLocked: boolean;
  disabled?: boolean;
  /** Writes the chosen fields into the form (nothing is saved). */
  onApply: (patch: AutoFixProposal) => void;
}

/**
 * Live on-page SEO score for the blog being edited, with "Auto fix": Gemini
 * proposes better metadata, the editor ticks what to keep, and Apply writes
 * it into the form. Saving still needs "Update blog".
 */
export default function BlogSeoPanel({
  input,
  context,
  slugLocked,
  disabled = false,
  onApply,
}: BlogSeoPanelProps) {
  const configured = useAIConfigured();
  const report = useMemo(() => scoreBlogSeo(input), [input]);
  const [showChecks, setShowChecks] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [proposal, setProposal] = useState<AutoFixProposal | null>(null);
  const [selected, setSelected] = useState<Set<AutoFixField>>(new Set());
  const requestId = useRef(0);
  useAIFieldWorking(fixing);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const improvable = report.checks.filter((c) => c.status !== "pass");
  const { text: scoreText, ring } = tone(report.score);

  const proposedFields = proposal
    ? AUTO_FIX_FIELDS.filter((field) => proposal[field] !== undefined)
    : [];
  const chosen: AutoFixProposal = Object.fromEntries(
    proposedFields
      .filter((field) => selected.has(field))
      .map((field) => [field, proposal![field]]),
  );
  const projected = proposal ? scoreBlogSeo({ ...input, ...chosen }).score : 0;

  const runAutoFix = async () => {
    if (fixing || disabled) return;
    const id = ++requestId.current;
    setFixing(true);
    setError("");
    setNotice("");
    setProposal(null);
    const { data, error: requestError } = await aiService.generate({
      prompt: buildAutoFixPrompt(input, report, context),
      systemInstruction: AUTO_FIX_SYSTEM_INSTRUCTION,
      json: true,
      temperature: 0.4,
    });
    if (id !== requestId.current) return;
    setFixing(false);
    if (requestError || !data) {
      setError(requestError || "Auto fix failed. Try again.");
      return;
    }
    const raw = parseAIJsonReply(data.reply);
    if (!raw) {
      setError("The AI reply wasn't readable. Try again.");
      return;
    }
    const next = parseAutoFix(raw, input);
    const fields = AUTO_FIX_FIELDS.filter((field) => next[field] !== undefined);
    if (!fields.length) {
      setNotice("The AI had no changes to suggest.");
      return;
    }
    setProposal(next);
    setSelected(
      new Set(fields.filter((field) => !(field === "slug" && slugLocked))),
    );
  };

  const toggle = (field: AutoFixField) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });

  const apply = () => {
    if (!Object.keys(chosen).length) return;
    onApply(chosen);
    setProposal(null);
    setNotice(
      `Applied ${Object.keys(chosen).length} change${
        Object.keys(chosen).length === 1 ? "" : "s"
      }. Review the fields, then save the blog.`,
    );
  };

  return (
    <FormSection
      title="SEO score"
      description={
        report.focus ? (
          <>
            Focus keyphrase:{" "}
            <strong className="text-white/80">{report.focus}</strong>
            {" · "}
            {report.wordCount} words
          </>
        ) : (
          "Add a keyphrase or keyword to score against."
        )
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-4 ${ring}`}
            role="img"
            aria-label={`SEO score ${report.score} out of 100`}
          >
            <span className={`text-lg font-black leading-none ${scoreText}`}>
              {report.score}
            </span>
            <span className="text-[10px] text-white/50">/100</span>
          </div>
          <LiquidButton
            type="button"
            variant="primary"
            onClick={() => void runAutoFix()}
            disabled={disabled || fixing || configured === false}
            aria-busy={fixing || undefined}
            title={
              configured === false
                ? "AI isn't set up on the server"
                : "Ask AI to improve title, description, slug and keywords"
            }
          >
            {fixing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {fixing ? "Fixing…" : "Auto fix"}
          </LiquidButton>
        </div>
      }
    >
      <div aria-live="polite" className="space-y-3 empty:hidden">
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <LiquidButton
              type="button"
              variant="ghost"
              onClick={() => void runAutoFix()}
              disabled={disabled || fixing}
            >
              Try again
            </LiquidButton>
          </p>
        )}
        {notice && (
          <p className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {notice}
          </p>
        )}
      </div>

      {proposal && (
        <div className="space-y-3 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-violet-100">
              AI suggestions · tick what to keep
            </p>
            <p className="text-xs text-white/70">
              Score {report.score} →{" "}
              <strong className={tone(projected).text}>{projected}</strong> with
              the ticked changes
            </p>
          </div>
          <ul className="space-y-2">
            {proposedFields.map((field) => {
              const before = String(input[field] ?? "").trim();
              const after = proposal[field]!;
              return (
                <li
                  key={field}
                  className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <LiquidCheckbox
                    checked={selected.has(field)}
                    onChange={() => toggle(field)}
                    label={
                      <span className="font-semibold">
                        {AUTO_FIX_LABELS[field]}
                        {field === "slug" && slugLocked && (
                          <span className="ml-2 text-xs font-normal text-amber-300">
                            Published: a new slug breaks old links
                          </span>
                        )}
                      </span>
                    }
                  />
                  <div className="mt-2 grid min-w-0 gap-1 pl-1 text-xs sm:pl-8">
                    <p className="min-w-0 whitespace-pre-line break-words text-white/45 line-through">
                      {before || "(empty)"}
                    </p>
                    <p className="min-w-0 whitespace-pre-line break-words text-white/90">
                      {after}
                      <span className="ml-2 text-white/40">
                        ({after.length} chars)
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap justify-end gap-2">
            <LiquidButton
              type="button"
              variant="ghost"
              onClick={() => setProposal(null)}
            >
              Discard suggestions
            </LiquidButton>
            <LiquidButton
              type="button"
              variant="primary"
              onClick={apply}
              disabled={disabled || !Object.keys(chosen).length}
            >
              Apply {Object.keys(chosen).length || ""} to form
            </LiquidButton>
          </div>
        </div>
      )}

      {improvable.length > 0 ? (
        <div>
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => setShowChecks((v) => !v)}
            aria-expanded={showChecks}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showChecks ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {improvable.length} thing{improvable.length === 1 ? "" : "s"} to
            improve
          </LiquidButton>
          {showChecks && (
            <ul className="mt-2 space-y-2">
              {report.checks.map((c) => (
                <li
                  key={c.id}
                  className="flex min-w-0 items-start gap-2 text-sm"
                >
                  <StatusIcon status={c.status} />
                  <span className="min-w-0 flex-1 break-words">
                    <span className="text-white/85">{c.label}</span>
                    <span className="ml-2 text-xs text-white/45">
                      {c.earned}/{c.points}
                    </span>
                    {c.hint && (
                      <span className="block text-xs text-white/55">
                        {c.hint}
                        {!c.autoFixable &&
                          " (fix by hand — Auto fix doesn't edit the article)"}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          All SEO checks pass.
        </p>
      )}
    </FormSection>
  );
}
