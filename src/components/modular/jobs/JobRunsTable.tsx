import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { JobRun } from "../../../services/jobsService";
import {
  formatDuration,
  formatInZone,
  formatRelative,
} from "../../../utils/jobSchedule";
import JobStatusBadge from "./JobStatusBadge";

type Failure = { recipient?: unknown; message?: unknown };

/** Messaging results nest failures either at the top level or per channel (whatsapp/email). */
const collectFailures = (
  result: unknown,
): { channel: string; failure: Failure }[] => {
  if (!result || typeof result !== "object") return [];
  const record = result as Record<string, unknown>;
  const rows: { channel: string; failure: Failure }[] = [];
  const add = (channel: string, value: unknown) => {
    if (Array.isArray(value))
      value.forEach((failure) =>
        rows.push({ channel, failure: failure as Failure }),
      );
  };
  add("", record.failures);
  Object.entries(record).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      add(key, (value as Record<string, unknown>).failures);
    }
  });
  return rows;
};

export function RunResult({ run }: { run: JobRun }) {
  const failures = collectFailures(run.result);
  const showChannel = failures.some((row) => row.channel);
  return (
    <div className="space-y-3">
      {run.error && (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <span className="font-semibold">Error: </span>
          {run.error}
        </div>
      )}
      {failures.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-rose-200 dark:border-rose-400/20">
          <table className="min-w-full text-sm">
            <thead className="bg-rose-50 text-left text-xs uppercase text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              <tr>
                {showChannel && <th className="px-3 py-2">Channel</th>}
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Failure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 dark:divide-rose-400/10">
              {failures.map(({ channel, failure }, index) => (
                <tr key={index}>
                  {showChannel && (
                    <td className="px-3 py-1.5 capitalize text-slate-600 dark:text-white/60">
                      {channel || "—"}
                    </td>
                  )}
                  <td className="px-3 py-1.5 font-mono text-xs text-black dark:text-white">
                    {String(failure.recipient ?? "—")}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 dark:text-white/70">
                    {String(failure.message ?? "Failed")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {run.result !== null && run.result !== undefined ? (
        <details
          className="group rounded-xl border border-slate-200 dark:border-white/10"
          open={failures.length === 0 && !run.error}
        >
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Result JSON
          </summary>
          <pre className="max-h-80 overflow-auto border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-white/10 dark:bg-black/30 dark:text-white/80">
            {JSON.stringify(run.result, null, 2)}
          </pre>
        </details>
      ) : (
        !run.error && (
          <p className="text-xs text-slate-500 dark:text-white/40">
            No result recorded.
          </p>
        )
      )}
    </div>
  );
}

interface JobRunsTableProps {
  runs: JobRun[];
  timezone: string;
  loading?: boolean;
}

export default function JobRunsTable({
  runs,
  timezone,
  loading = false,
}: JobRunsTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
          <tr>
            <th className="w-8 px-2 py-3" aria-label="Expand" />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
              Trigger
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
              Triggered by
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
              Started
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
              Duration
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {runs.map((run) => {
            const isOpen = expanded === run._id;
            return (
              <Fragment key={run._id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  onClick={() => setExpanded(isOpen ? null : run._id)}
                >
                  <td className="px-2 py-3 text-slate-500">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen ? "Hide run details" : "Show run details"
                      }
                      className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-white/10"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge
                      status={run.status}
                      title={run.error || undefined}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-black dark:text-white/70">
                    {run.trigger}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white/70">
                    {run.triggeredBy
                      ? run.triggeredBy.name || run.triggeredBy.email || "Staff"
                      : run.trigger === "schedule"
                        ? "Scheduler"
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-black dark:text-white/70">
                    <span>{formatInZone(run.startedAt, timezone)}</span>
                    <span className="block text-xs text-slate-500 dark:text-white/40">
                      {formatRelative(run.startedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-black dark:text-white/70">
                    {run.status === "running"
                      ? "…"
                      : formatDuration(run.durationMs)}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                    <td />
                    <td colSpan={5} className="px-4 py-3">
                      <RunResult run={run} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {runs.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60"
              >
                {loading
                  ? "Loading runs…"
                  : "No runs yet. Runs are kept for 90 days."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
