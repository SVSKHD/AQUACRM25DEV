import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/Toast";
import { jobsService, type ScheduledJob } from "../services/jobsService";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Starts jobs manually and polls their run until it settles. `onChange` fires
 * when a run starts and when it finishes so callers can refresh their data.
 */
export function useJobRunner(onChange?: () => void) {
  const { showToast } = useToast();
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(
    () => new Set(),
  );
  const timers = useRef(new Map<string, number>());
  const mounted = useRef(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const setActive = (jobId: string, active: boolean) =>
    setActiveJobIds((current) => {
      const next = new Set(current);
      if (active) next.add(jobId);
      else next.delete(jobId);
      return next;
    });

  const run = useCallback(
    async (job: ScheduledJob) => {
      if (timers.current.has(job._id)) return;
      setActive(job._id, true);
      const { data: started, error, status } = await jobsService.run(job._id);
      if (!mounted.current) return;

      if (status === 409 || error || !started) {
        setActive(job._id, false);
        showToast(
          status === 409 ? "Already running" : error || "Failed to start job",
          "error",
        );
        onChangeRef.current?.();
        return;
      }

      showToast(`"${job.name}" started`, "success");
      onChangeRef.current?.();
      const startedAt = Date.now();

      const finish = () => {
        timers.current.delete(job._id);
        setActive(job._id, false);
        onChangeRef.current?.();
      };

      const poll = async () => {
        const { data: current } = await jobsService.getRun(started._id);
        if (!mounted.current) return;
        if (current && current.status !== "running") {
          showToast(
            current.status === "success"
              ? `"${job.name}" finished successfully`
              : `"${job.name}" failed${current.error ? `: ${current.error}` : ""}`,
            current.status === "success" ? "success" : "error",
          );
          finish();
          return;
        }
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          showToast(
            `"${job.name}" is still running. Check its history later.`,
            "error",
          );
          finish();
          return;
        }
        timers.current.set(job._id, window.setTimeout(poll, POLL_INTERVAL_MS));
      };

      timers.current.set(job._id, window.setTimeout(poll, POLL_INTERVAL_MS));
    },
    [showToast],
  );

  return { run, activeJobIds };
}
