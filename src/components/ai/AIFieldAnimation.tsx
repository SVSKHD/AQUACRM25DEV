import type { ReactNode } from "react";
import { Bot, Sparkles } from "lucide-react";
import AIAssist, { type AIAssistProps } from "./AIAssist";
import { useAIFieldScopeWorking } from "./aiFieldWorking";

export { AIFieldAnimationScope, useAIFieldWorking } from "./aiFieldWorking";

/** What the robot does when clicked (opens the AI assistant for this field). */
export type AIFieldAssist = Omit<AIAssistProps, "variant" | "className">;

/** A robot that runs one AI action directly instead of opening the assistant. */
export type AIFieldAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function AIFieldAnimation({
  children,
  compact = false,
  assist,
  action,
}: {
  children: ReactNode;
  compact?: boolean;
  /** Makes the robot open the AI assistant for this field. */
  assist?: AIFieldAssist;
  /** Makes the robot run this action (used when assist doesn't fit). */
  action?: AIFieldAction;
}) {
  const working = useAIFieldScopeWorking();
  const spark = working && (
    <Sparkles className="ai-field-spark h-2.5 w-2.5" aria-hidden="true" />
  );
  return (
    <span
      className={`ai-field-frame ${compact ? "ai-field-compact" : ""} ${working ? "ai-field-working" : ""}`}
    >
      {children}
      {assist ? (
        <span className="ai-field-bot ai-field-bot-interactive">
          <AIAssist variant="bot" {...assist} />
          {spark}
        </span>
      ) : action ? (
        <span className="ai-field-bot ai-field-bot-interactive">
          <button
            type="button"
            className="ai-field-bot-button"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.label}
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
          </button>
          {spark}
        </span>
      ) : (
        <span className="ai-field-bot" aria-hidden="true">
          <Bot className="h-4 w-4" />
          {spark}
        </span>
      )}
    </span>
  );
}
