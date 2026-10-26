import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Database,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useAIConfigured } from "../../../hooks/useAIConfigured";
import {
  AI_PROMPT_MAX_CHARS,
  aiService,
  type AIHistoryTurn,
} from "../../../services/aiService";
import { LiquidButton, LiquidCheckbox, LiquidTextarea } from "../../ui/liquid";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  model?: string;
  tokens?: number;
}

const GENERAL_STARTERS = [
  "Draft a 2-line WhatsApp follow-up for a customer who got a softener quotation yesterday.",
  "Write a polite payment reminder for an invoice that is 7 days overdue.",
  "Explain the difference between RO and UV purifiers in simple words for a customer.",
];

const DATA_STARTERS = [
  "Which 5 SEO fixes would have the biggest impact this week, and why?",
  "Which products have no supporting blog? Suggest a blog topic for each.",
  "Plan internal links for our orphan pages: which page should link where, with what anchor text?",
];

// The server keeps the last 30 turns; trimming here keeps requests small.
const HISTORY_TURNS = 30;

const DATA_PERSONA =
  "You are the AquaKart CRM assistant with access to a snapshot of the storefront's catalog, SEO and internal-linking data, given below. " +
  "AquaKart sells water purifiers, water softeners and related installation/service in Hyderabad, India. " +
  "Ground every answer in this data: name the exact pages, routes and keywords. If the data doesn't contain something, say so instead of guessing. " +
  "Keep answers practical and concise, using short lists.";

const newId = () => Math.random().toString(36).slice(2);

interface AIChatProps {
  /** Snapshot of site data; when present, the chat can answer questions about it. */
  siteContext?: string;
}

export default function AIChat({ siteContext }: AIChatProps) {
  const configured = useAIConfigured();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [useSiteData, setUseSiteData] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const grounded = useSiteData && Boolean(siteContext);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async (prompt: string, previous: ChatMessage[]) => {
    const history: AIHistoryTurn[] = previous
      .filter((message) => message.role !== "error")
      .slice(-HISTORY_TURNS)
      .map((message) => ({
        role: message.role as AIHistoryTurn["role"],
        text: message.text,
      }));

    setMessages([...previous, { id: newId(), role: "user", text: prompt }]);
    setSending(true);
    const { data, error } = await aiService.generate({
      prompt,
      history,
      ...(grounded
        ? {
            systemInstruction: `${DATA_PERSONA}\n\nSITE DATA SNAPSHOT:\n${siteContext}`,
          }
        : {}),
    });
    setSending(false);
    setMessages((current) => [
      ...current,
      data
        ? {
            id: newId(),
            role: "assistant",
            text: data.reply,
            model: data.model,
            tokens: data.usage?.totalTokenCount,
          }
        : { id: newId(), role: "error", text: error || "AI request failed" },
    ]);
  };

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setInput("");
    send(prompt, messages);
  };

  const retryLast = () => {
    const lastUserIndex = messages
      .map((message) => message.role)
      .lastIndexOf("user");
    if (lastUserIndex < 0 || sending) return;
    send(messages[lastUserIndex].text, messages.slice(0, lastUserIndex));
  };

  const copy = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be blocked by the browser; nothing else to do here.
    }
  };

  if (configured === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="glass-card mx-auto max-w-lg p-8 text-center text-sm text-slate-600 dark:text-white/60">
        AI isn't configured on the server. Ask an administrator to configure the
        AI provider to enable the chat.
      </div>
    );
  }

  return (
    <div className="glass-card mx-auto flex h-[calc(100vh-16rem)] min-h-[420px] max-w-4xl flex-col overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-white">
          <Sparkles className="h-4 w-4 text-violet-500" aria-hidden="true" />
          Conversation
        </h3>
        <div className="flex items-center gap-2">
          {siteContext && (
            <span title="Send a snapshot of catalog, SEO and interlinking data with each question">
              <LiquidCheckbox
                checked={useSiteData}
                onChange={(event) => setUseSiteData(event.target.checked)}
                wrapperClassName="text-xs font-semibold text-black dark:text-white"
                label={
                  <span className="inline-flex items-center gap-2">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    Use site data
                  </span>
                }
              />
            </span>
          )}
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => setMessages([])}
            disabled={messages.length === 0 || sending}
            className="text-sm"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </LiquidButton>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl space-y-2 pt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-white/50">
              {grounded
                ? "Ask about your catalog, SEO and internal links:"
                : "Try one of these:"}
            </p>
            {(grounded ? DATA_STARTERS : GENERAL_STARTERS).map((starter) => (
              <LiquidButton
                key={starter}
                type="button"
                variant="soft"
                onClick={() => setInput(starter)}
                className="w-full !justify-start text-left text-sm font-medium"
              >
                {starter}
              </LiquidButton>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
              }`}
              aria-hidden="true"
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </span>
            <div
              className={`max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}
            >
              <div
                className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : message.role === "error"
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                      : "bg-slate-100 text-neutral-950 dark:bg-white/10 dark:text-white"
                }`}
                role={message.role === "error" ? "alert" : undefined}
              >
                {message.text}
              </div>
              {message.role === "assistant" && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    onClick={() => copy(message)}
                    className="!min-h-0 !gap-1 !px-1.5 !py-0.5 text-xs"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === message.id ? "Copied" : "Copy"}
                  </LiquidButton>
                  {message.model && <span>{message.model}</span>}
                  {message.tokens ? (
                    <span>· {message.tokens} tokens</span>
                  ) : null}
                </div>
              )}
              {message.role === "error" &&
                message.id === messages[messages.length - 1]?.id && (
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    onClick={retryLast}
                    className="mt-1 !min-h-0 !gap-1 !px-1.5 !py-0.5 text-xs !text-rose-600 dark:!text-rose-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </LiquidButton>
                )}
            </div>
          </div>
        ))}

        {sending && (
          <p
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/60"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
            Thinking…
          </p>
        )}
      </div>

      <form
        className="border-t border-slate-200 p-3 dark:border-white/10"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-2">
          <LiquidTextarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            maxLength={AI_PROMPT_MAX_CHARS}
            rows={2}
            placeholder="Ask the assistant… (Enter to send, Shift+Enter for a new line)"
            aria-label="Message the AI assistant"
            wrapperClassName="min-w-0 flex-1"
            className="max-h-40 min-h-[44px] resize-y text-sm"
          />
          <LiquidButton
            type="submit"
            variant="primary"
            disabled={!input.trim() || sending}
            className="text-sm"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send
          </LiquidButton>
        </div>
      </form>
    </div>
  );
}
