import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { Bot, Sparkles } from "lucide-react";

const WorkingContext = createContext({
  working: false,
  report: (_id: string, _working: boolean) => {},
});

export function AIFieldAnimationScope({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const [requests, setRequests] = useState<Set<string>>(() => new Set());
  const report = useCallback((id: string, working: boolean) => {
    setRequests((previous) => {
      const next = new Set(previous);
      if (working) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const working = active || requests.size > 0;
  return (
    <WorkingContext.Provider value={{ working, report }}>
      {working && (
        <span className="sr-only" role="status">
          AI is working on form suggestions.
        </span>
      )}
      {children}
    </WorkingContext.Provider>
  );
}

export function useAIFieldWorking(working: boolean) {
  const { report } = useContext(WorkingContext);
  const id = useId();
  useEffect(() => {
    report(id, working);
    return () => report(id, false);
  }, [id, report, working]);
}

export default function AIFieldAnimation({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const { working } = useContext(WorkingContext);
  return (
    <span
      className={`ai-field-frame ${compact ? "ai-field-compact" : ""} ${working ? "ai-field-working" : ""}`}
    >
      {children}
      <span className="ai-field-bot" aria-hidden="true">
        <Bot className="h-4 w-4" />
        {working && <Sparkles className="ai-field-spark h-2.5 w-2.5" />}
      </span>
    </span>
  );
}
