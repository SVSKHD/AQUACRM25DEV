import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

/*
 * Shared "AI is working" state for a form: any AI request inside the scope
 * animates every AI field robot. Kept separate from AIFieldAnimation so
 * AIAssist can report work without a circular import.
 */

type WorkingState = {
  working: boolean;
  report: (id: string, working: boolean) => void;
};

const WorkingContext = createContext<WorkingState>({
  working: false,
  report: () => {},
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

export const useAIFieldScopeWorking = () => useContext(WorkingContext).working;
