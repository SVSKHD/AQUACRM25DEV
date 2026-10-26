import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Edit2, Play, RefreshCw, Trash2 } from "lucide-react";
import {
  jobsService,
  type JobRun,
  type Pagination,
  type ScheduledJob,
} from "../../../services/jobsService";
import {
  describeSchedule,
  formatDuration,
  formatInZone,
  formatRelative,
  isDue,
} from "../../../utils/jobSchedule";
import { LiquidButton } from "../../ui/liquid";
import JobRunsTable from "./JobRunsTable";
import JobStatusBadge, { BuiltInBadge } from "./JobStatusBadge";

const RUNS_PAGE_SIZE = 20;

interface JobDetailProps {
  jobId: string;
  actionLabel: (key: string) => string;
  canManage: boolean;
  /** Changes whenever the parent knows the job changed (run started/finished, edited). */
  refreshKey: number;
  runningNow: boolean;
  onBack: () => void;
  onEdit: (job: ScheduledJob) => void;
  onRun: (job: ScheduledJob) => void;
  onDelete: (job: ScheduledJob) => void;
}

export default function JobDetail({
  jobId,
  actionLabel,
  canManage,
  refreshKey,
  runningNow,
  onBack,
  onEdit,
  onRun,
  onDelete,
}: JobDetailProps) {
  const [job, setJob] = useState<ScheduledJob | null>(null);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const [jobResult, runsResult] = await Promise.all([
        jobsService.get(jobId),
        jobsService.listRuns(jobId, { page, limit: RUNS_PAGE_SIZE }),
      ]);
      setLoading(false);
      if (jobResult.error || !jobResult.data) {
        setError(jobResult.error || "Failed to load job");
        return;
      }
      setError("");
      setJob(jobResult.data);
      if (runsResult.data) {
        setRuns(runsResult.data.items);
        setPagination(runsResult.data.pagination);
      }
    },
    [jobId, page],
  );

  useEffect(() => {
    load(true);
  }, [load, refreshKey]);

  const isRunning =
    runningNow ||
    job?.lastStatus === "running" ||
    runs.some((run) => run.status === "running");

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => load(true), 5000);
    return () => window.clearInterval(timer);
  }, [isRunning, load]);

  if (loading && !job) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <BackButton onClick={onBack} />
        <div className="glass-card p-8 text-center text-sm text-rose-600 dark:text-rose-300">
          {error || "Job not found"}
        </div>
      </div>
    );
  }

  const due = isDue(job) && job.lastStatus !== "running";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton onClick={onBack} />
        <div className="flex flex-wrap gap-2">
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => load()}
            className="text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </LiquidButton>
          {canManage && (
            <>
              <LiquidButton
                type="button"
                variant="soft"
                onClick={() => onEdit(job)}
                className="text-sm"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </LiquidButton>
              {!job.system && (
                <LiquidButton
                  type="button"
                  variant="danger"
                  onClick={() => onDelete(job)}
                  className="text-sm"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </LiquidButton>
              )}
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => onRun(job)}
                disabled={isRunning}
                className="text-sm"
              >
                <Play className="h-4 w-4" />{" "}
                {isRunning ? "Running…" : "Run now"}
              </LiquidButton>
            </>
          )}
        </div>
      </div>

      <div className="glass-card border border-slate-200 p-5 shadow-xl dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-neutral-950 dark:text-white">
            {job.name}
          </h2>
          {job.system && <BuiltInBadge />}
          {!job.enabled && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">
              Paused
            </span>
          )}
        </div>
        {job.description && (
          <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
            {job.description}
          </p>
        )}

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Action" value={actionLabel(job.action)} />
          <Summary label="Schedule" value={describeSchedule(job)} />
          <Summary
            label="Next run"
            value={
              !job.enabled
                ? "Paused"
                : due
                  ? "Due, starting shortly"
                  : job.nextRunAt
                    ? `${formatInZone(job.nextRunAt, job.timezone)} (${formatRelative(job.nextRunAt)})`
                    : "—"
            }
          />
          <Summary
            label="Last run"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <JobStatusBadge
                  status={job.lastStatus}
                  title={job.lastError || undefined}
                />
                {job.lastRunAt && (
                  <span className="text-xs text-slate-500 dark:text-white/40">
                    {formatRelative(job.lastRunAt)}
                  </span>
                )}
              </span>
            }
          />
          <Summary
            label="Runs"
            value={`${job.runCount} total · ${job.failureCount} failed`}
          />
          <Summary
            label="Last duration"
            value={formatDuration(job.lastDurationMs)}
          />
          <Summary label="Timeout" value={`${job.timeoutSeconds} s`} />
          <Summary label="Timezone" value={job.timezone} />
        </dl>
        {job.lastError && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <span className="font-semibold">Last error: </span>
            {job.lastError}
          </p>
        )}
      </div>

      <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-lg font-semibold text-neutral-950 dark:text-white">
            Run history
          </h3>
          {pagination && (
            <span className="text-xs text-slate-500 dark:text-white/50">
              {pagination.total} runs · kept 90 days
            </span>
          )}
        </div>
        <JobRunsTable runs={runs} timezone={job.timezone} loading={loading} />
        {pagination && pagination.pages > 1 && (
          <Pager page={page} pages={pagination.pages} onPage={setPage} />
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <LiquidButton
      type="button"
      variant="ghost"
      onClick={onClick}
      className="text-sm"
    >
      <ArrowLeft className="h-4 w-4" /> All jobs
    </LiquidButton>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 text-neutral-950 dark:text-white">{value}</dd>
    </div>
  );
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 text-sm dark:border-white/10">
      <LiquidButton
        type="button"
        variant="soft"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="!min-h-0 !py-1.5 text-sm"
      >
        Previous
      </LiquidButton>
      <span className="text-slate-600 dark:text-white/60">
        Page {page} of {pages}
      </span>
      <LiquidButton
        type="button"
        variant="soft"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="!min-h-0 !py-1.5 text-sm"
      >
        Next
      </LiquidButton>
    </div>
  );
}
