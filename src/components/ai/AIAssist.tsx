import { useAIFieldWorking } from "./AIFieldAnimation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { aiService } from "../../services/aiService";
import { useAIConfigured } from "../../hooks/useAIConfigured";

type QuickAction = {
  id: string;
  label: string;
  instruction: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "improve",
    label: "Improve",
    instruction:
      "Improve this {context}: fix grammar and make it clear, friendly and professional. Keep the same meaning",
  },
  {
    id: "shorten",
    label: "Shorten",
    instruction: "Shorten this {context} while keeping the key information",
  },
  {
    id: "formal",
    label: "Make more formal",
    instruction: "Rewrite this {context} in a more formal, professional tone",
  },
  {
    id: "telugu",
    label: "Translate to Telugu",
    instruction:
      "Translate this {context} to Telugu. Keep product names, numbers and prices unchanged",
  },
  {
    id: "hindi",
    label: "Translate to Hindi",
    instruction:
      "Translate this {context} to Hindi. Keep product names, numbers and prices unchanged",
  },
];

const OUTPUT_RULE =
  "Reply with only the resulting text: no preamble, explanation or surrounding quotes.";

interface AIAssistProps {
  /** Current text of the field; used as context for the request. */
  value: string;
  /** Writes text back into the field. */
  onChange: (next: string) => void;
  /** What the field holds, used in prompts, e.g. "WhatsApp message to a customer". */
  context?: string;
  /** Optional length limit passed to the model and enforced on insert. */
  maxChars?: number;
  label?: string;
  className?: string;
}

type PopoverPosition = { top: number; left: number; width: number };

const POPOVER_WIDTH = 380;

const buildAssistPrompt = ({
  instruction,
  text,
  context,
  maxChars,
}: {
  instruction: string;
  text: string;
  context: string;
  maxChars?: number;
}) => {
  const limit = maxChars ? ` Keep it under ${maxChars} characters.` : "";
  const trimmed = text.trim();
  if (!trimmed) {
    return `${instruction}\n\nThis is for: ${context}.${limit} ${OUTPUT_RULE}`;
  }
  return `${instruction.replace(/\{context\}/g, context)}.${limit} ${OUTPUT_RULE}\n\n${trimmed}`;
};

export default function AIAssist({
  value,
  onChange,
  context = "text",
  maxChars,
  label = "AI",
  className = "",
}: AIAssistProps) {
  const configured = useAIConfigured();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    width: POPOVER_WIDTH,
  });
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  useAIFieldWorking(loading);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const hasText = value.trim().length > 0;

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gutter = 12;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - gutter * 2);
    const left = Math.min(
      Math.max(gutter, rect.right - width),
      window.innerWidth - width - gutter,
    );
    const estimatedHeight = popoverRef.current?.offsetHeight || 420;
    const below = rect.bottom + 8;
    const top =
      below + estimatedHeight > window.innerHeight &&
      rect.top - estimatedHeight - 8 > gutter
        ? rect.top - estimatedHeight - 8
        : Math.max(
            gutter,
            Math.min(below, window.innerHeight - estimatedHeight - gutter),
          );
    setPosition({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, reply, error, loading]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleReposition = () => updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  if (!configured) return null;

  const runPrompt = async (prompt: string) => {
    const id = ++requestId.current;
    setLastPrompt(prompt);
    setLoading(true);
    setError("");
    setReply("");
    const { data, error: requestError } = await aiService.generate({ prompt });
    if (id !== requestId.current) return;
    setLoading(false);
    if (requestError || !data) {
      setError(requestError || "AI request failed");
      return;
    }
    setReply(data.reply.trim());
  };

  const runQuickAction = (action: QuickAction) =>
    runPrompt(
      buildAssistPrompt({
        instruction: action.instruction,
        text: value,
        context,
        maxChars,
      }),
    );

  const runCustom = () => {
    const instruction = custom.trim();
    if (!instruction) return;
    runPrompt(
      buildAssistPrompt({
        instruction: hasText
          ? `${instruction}\n\nApply this to the following ${context}`
          : instruction,
        text: value,
        context,
        maxChars,
      }),
    );
  };

  const clamp = (text: string) => (maxChars ? text.slice(0, maxChars) : text);

  const insertReply = () => {
    onChange(
      clamp(hasText ? `${value.replace(/\s+$/, "")}\n\n${reply}` : reply),
    );
    setOpen(false);
  };

  const replaceWithReply = () => {
    onChange(clamp(reply));
    setOpen(false);
  };

  const copyReply = async () => {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="AI writing assistant"
          className="fixed z-[10000] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl dark:border-white/10 dark:bg-slate-900"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-neutral-950 dark:text-white">
              <Sparkles
                className="h-4 w-4 text-violet-500"
                aria-hidden="true"
              />
              AI assistant
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
              aria-label="Close AI assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasText ? (
            <p className="mb-3 line-clamp-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-white/60">
              {value}
            </p>
          ) : (
            <p className="mb-3 text-xs text-slate-500 dark:text-white/50">
              The field is empty. Describe what to write below.
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!hasText || loading}
                onClick={() => runQuickAction(action)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20"
              >
                {action.label}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              runCustom();
            }}
          >
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder={
                hasText
                  ? "Custom instruction, e.g. add a thank-you line"
                  : "e.g. Write a follow-up for a softener quotation"
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              aria-label="Custom instruction"
            />
            <button
              type="submit"
              disabled={!custom.trim() || loading}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              Go
            </button>
          </form>

          {loading && (
            <p
              className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-white/60"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Writing…
            </p>
          )}

          {error && (
            <div
              className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
              role="alert"
            >
              <span>{error}</span>
              {lastPrompt && (
                <button
                  type="button"
                  onClick={() => runPrompt(lastPrompt)}
                  className="shrink-0 font-semibold underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {reply && !loading && (
            <div className="mt-3">
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2 text-sm text-neutral-900 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-white">
                {reply}
              </div>
              {maxChars && reply.length > maxChars && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                  Reply is {reply.length} characters; it will be cut to{" "}
                  {maxChars}.
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={replaceWithReply}
                  className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-violet-700"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={insertReply}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-black hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={copyReply}
                  className="ml-auto rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
                  aria-label="Copy reply"
                  title="Copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => runPrompt(lastPrompt)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"
                  aria-label="Regenerate"
                  title="Regenerate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="AI writing assistant"
        className={`inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20 ${className}`}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
      {popover}
    </>
  );
}
