import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Edit2,
  History,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import { useJobsAccess } from "../../hooks/useJobsAccess";
import { useJobRunner } from "../../hooks/useJobRunner";
import {
  MESSAGING_ACTIONS,
  jobsService,
  type JobAction,
  type JobListQuery,
  type JobStatus,
  type Pagination,
  type ScheduledJob,
} from "../../services/jobsService";
import {
  describeSchedule,
  formatInZone,
  formatRelative,
  isDue,
} from "../../utils/jobSchedule";
import JobFormDrawer from "../modular/jobs/JobFormDrawer";
import JobDetail, { Pager } from "../modular/jobs/JobDetail";
import JobConfirmDialog from "../modular/jobs/JobConfirmDialog";
import JobStatusBadge, { BuiltInBadge } from "../modular/jobs/JobStatusBadge";
import { Switch } from "../modular/jobs/JobParamsForm";
import {
  LiquidButton,
  LiquidIconButton,
  LiquidInput,
  LiquidSelect,
} from "../ui/liquid";

const PAGE_SIZE = 20;
const AUTO_REFRESH_MS = 15000;

type Filters = {
  enabled: "" | "true" | "false";
  status: "" | JobStatus;
  action: string;
  system: "" | "true" | "false";
  q: string;
};

const EMPTY_FILTERS: Filters = {
  enabled: "",
  status: "",
  action: "",
  system: "",
  q: "",
};

type Confirm =
  | { kind: "delete"; job: ScheduledJob }
  | { kind: "run"; job: ScheduledJob }
  | null;

export default function JobsTab() {
  const { canRead, canManage } = useJobsAccess();

  if (canRead === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <TabInnerContent title="Scheduled Jobs">
        <div className="glass-card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
          <Lock className="h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="text-sm text-slate-600 dark:text-white/60">
            You need the <code className="font-mono">jobs.read</code> permission
            to view scheduled jobs.
          </p>
        </div>
      </TabInnerContent>
    );
  }

  return <JobsWorkspace canManage={canManage === true} />;
}

function JobsWorkspace({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [actions, setActions] = useState<JobAction[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    job: ScheduledJob | null;
  }>({ open: false, job: null });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const refreshAll = useCallback(() => setRefreshKey((key) => key + 1), []);
  const { run, activeJobIds } = useJobRunner(refreshAll);

  const actionLabel = useCallback(
    (key: string) => actions.find((action) => action.key === key)?.label || key,
    [actions],
  );

  useEffect(() => {
    jobsService.listActions().then(({ data, error: actionsError }) => {
      if (data) setActions(data);
      else if (actionsError) showToast(actionsError, "error");
    });
  }, [showToast]);

  // Debounce the name search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.q === search.trim()
          ? current
          : { ...current, q: search.trim() },
      );
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadJobs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const query: JobListQuery = {
        page,
        limit: PAGE_SIZE,
        q: filters.q || undefined,
        action: filters.action || undefined,
        status: filters.status || undefined,
        enabled: filters.enabled ? filters.enabled === "true" : undefined,
        system: filters.system ? filters.system === "true" : undefined,
      };
      const { data, error: listError } = await jobsService.list(query);
      setLoading(false);
      if (listError || !data) {
        setError(listError || "Failed to load jobs");
        return;
      }
      setError("");
      setJobs(data.items);
      setPagination(data.pagination);
      setNow(Date.now());
    },
    [filters, page],
  );

  useEffect(() => {
    loadJobs(refreshKey > 0);
  }, [loadJobs, refreshKey]);

  const anyRunning =
    jobs.some((job) => job.lastStatus === "running") || activeJobIds.size > 0;

  useEffect(() => {
    if (!anyRunning || selectedJobId) return;
    const timer = window.setInterval(() => loadJobs(true), AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [anyRunning, loadJobs, selectedJobId]);

  // Keep relative times ("in 3 min", "due") fresh between refreshes.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const setFilter = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const toggleEnabled = async (job: ScheduledJob) => {
    const enabled = !job.enabled;
    setTogglingIds((current) => new Set(current).add(job._id));
    setJobs((current) =>
      current.map((item) =>
        item._id === job._id ? { ...item, enabled } : item,
      ),
    );
    const { data, error: updateError } = await jobsService.update(job._id, {
      enabled,
    });
    setTogglingIds((current) => {
      const next = new Set(current);
      next.delete(job._id);
      return next;
    });
    if (updateError || !data) {
      setJobs((current) =>
        current.map((item) => (item._id === job._id ? job : item)),
      );
      showToast(updateError || "Failed to update job", "error");
      return;
    }
    setJobs((current) =>
      current.map((item) =>
        item._id === job._id ? { ...item, ...data } : item,
      ),
    );
    showToast(
      enabled ? `"${job.name}" resumed` : `"${job.name}" paused`,
      "success",
    );
  };

  const requestRun = (job: ScheduledJob) => {
    if (MESSAGING_ACTIONS.has(job.action)) setConfirm({ kind: "run", job });
    else run(job);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { kind, job } = confirm;
    setConfirm(null);
    if (kind === "run") {
      run(job);
      return;
    }
    const { error: deleteError } = await jobsService.remove(job._id);
    if (deleteError) {
      showToast(deleteError, "error");
      return;
    }
    showToast(`"${job.name}" deleted`, "success");
    if (selectedJobId === job._id) setSelectedJobId(null);
    refreshAll();
  };

  const handleSaved = (job: ScheduledJob, created: boolean) => {
    setDrawer({ open: false, job: null });
    showToast(
      created ? `"${job.name}" created` : `"${job.name}" saved`,
      "success",
    );
    refreshAll();
  };

  const actionOptions = useMemo(
    () =>
      [...actions].sort(
        (a, b) =>
          Number(a.systemOnly) - Number(b.systemOnly) ||
          a.label.localeCompare(b.label),
      ),
    [actions],
  );

  const sharedDialogs = (
    <>
      <JobFormDrawer
        open={drawer.open}
        job={drawer.job}
        actions={actions}
        onClose={() => setDrawer({ open: false, job: null })}
        onSaved={handleSaved}
      />
      <JobConfirmDialog
        open={Boolean(confirm)}
        tone={confirm?.kind === "delete" ? "danger" : "warning"}
        title={
          confirm?.kind === "delete"
            ? `Delete "${confirm.job.name}"?`
            : `Run "${confirm?.job.name}" now?`
        }
        message={
          confirm?.kind === "delete"
            ? "The job and its schedule will be removed. This can't be undone."
            : `This job (${confirm ? actionLabel(confirm.job.action) : ""}) sends real messages to its recipients right away.`
        }
        confirmLabel={
          confirm?.kind === "delete" ? "Yes, delete" : "Yes, run now"
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );

  if (selectedJobId) {
    return (
      <>
        <JobDetail
          jobId={selectedJobId}
          actionLabel={actionLabel}
          canManage={canManage}
          refreshKey={refreshKey}
          runningNow={activeJobIds.has(selectedJobId)}
          onBack={() => setSelectedJobId(null)}
          onEdit={(job) => setDrawer({ open: true, job })}
          onRun={requestRun}
          onDelete={(job) => setConfirm({ kind: "delete", job })}
        />
        {sharedDialogs}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Scheduled Jobs"
        description="Automate WhatsApp, email and AI messages, and manage the CRM's built-in reminder jobs."
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-52">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <LiquidInput
                aria-label="Search jobs by name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name"
                className="!pl-9 text-sm"
              />
            </div>
            <LiquidSelect
              aria-label="Filter by enabled"
              value={filters.enabled}
              onChange={(event) =>
                setFilter({ enabled: event.target.value as Filters["enabled"] })
              }
              className="text-sm"
            >
              <option value="">Enabled &amp; paused</option>
              <option value="true">Enabled</option>
              <option value="false">Paused</option>
            </LiquidSelect>
            <LiquidSelect
              aria-label="Filter by last status"
              value={filters.status}
              onChange={(event) =>
                setFilter({ status: event.target.value as Filters["status"] })
              }
              className="text-sm"
            >
              <option value="">Any status</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </LiquidSelect>
            <LiquidSelect
              aria-label="Filter by action"
              value={filters.action}
              onChange={(event) => setFilter({ action: event.target.value })}
              className="text-sm"
            >
              <option value="">All actions</option>
              {actionOptions.map((action) => (
                <option key={action.key} value={action.key}>
                  {action.label}
                  {action.systemOnly ? " (built-in)" : ""}
                </option>
              ))}
            </LiquidSelect>
            <LiquidSelect
              aria-label="Filter by type"
              value={filters.system}
              onChange={(event) =>
                setFilter({ system: event.target.value as Filters["system"] })
              }
              className="text-sm"
            >
              <option value="">Built-in &amp; custom</option>
              <option value="true">Built-in</option>
              <option value="false">Custom</option>
            </LiquidSelect>
          </div>
          <div className="flex gap-2">
            <LiquidButton
              type="button"
              variant="soft"
              onClick={() => loadJobs()}
              className="text-sm"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </LiquidButton>
            {canManage && (
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => setDrawer({ open: true, job: null })}
                disabled={!actions.length}
                className="text-sm"
              >
                <Plus className="h-4 w-4" /> New job
              </LiquidButton>
            )}
          </div>
        </div>

        {error && (
          <p
            className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="glass-card overflow-hidden border border-slate-200 shadow-xl dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Enabled
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Next run
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-black dark:text-white/60">
                    Last status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Runs
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-black dark:text-white/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {jobs.map((job) => {
                  const running =
                    job.lastStatus === "running" || activeJobIds.has(job._id);
                  return (
                    <tr
                      key={job._id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <LiquidButton
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedJobId(job._id)}
                          className="!min-h-0 !justify-start !rounded-md !border-0 !p-0 text-left text-sm !font-semibold text-neutral-950 hover:!transform-none hover:!bg-transparent hover:!bg-none hover:text-blue-600 hover:underline dark:text-white dark:hover:text-blue-300"
                        >
                          {job.name}
                        </LiquidButton>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {job.system && <BuiltInBadge />}
                          {job.description && (
                            <span className="line-clamp-1 max-w-[240px] text-xs text-slate-500 dark:text-white/40">
                              {job.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-black dark:text-white/70">
                        {actionLabel(job.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-black dark:text-white/70">
                        {describeSchedule(job)}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={job.enabled}
                          disabled={!canManage || togglingIds.has(job._id)}
                          onChange={() => toggleEnabled(job)}
                          label={
                            job.enabled
                              ? `Pause ${job.name}`
                              : `Resume ${job.name}`
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <NextRun job={job} running={running} now={now} />
                      </td>
                      <td className="px-4 py-3">
                        <JobStatusBadge
                          status={running ? "running" : job.lastStatus}
                          title={job.lastError || undefined}
                        />
                        {job.lastRunAt && (
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-white/40">
                            {formatRelative(job.lastRunAt, now)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-black dark:text-white/70">
                        {job.runCount}
                        {job.failureCount > 0 && (
                          <span className="block text-xs text-rose-600 dark:text-rose-300">
                            {job.failureCount} failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <RowButton
                              label="Run now"
                              onClick={() => requestRun(job)}
                              disabled={running}
                            >
                              <Play className="h-4 w-4" />
                            </RowButton>
                          )}
                          {canManage && (
                            <RowButton
                              label="Edit"
                              onClick={() => setDrawer({ open: true, job })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </RowButton>
                          )}
                          <RowButton
                            label="History"
                            onClick={() => setSelectedJobId(job._id)}
                          >
                            <History className="h-4 w-4" />
                          </RowButton>
                          {canManage && !job.system && (
                            <RowButton
                              label="Delete"
                              danger
                              onClick={() =>
                                setConfirm({ kind: "delete", job })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </RowButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {jobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-slate-500 dark:text-white/60"
                    >
                      {loading
                        ? "Loading jobs…"
                        : JSON.stringify(filters) !==
                            JSON.stringify(EMPTY_FILTERS)
                          ? "No jobs match these filters."
                          : canManage
                            ? "No scheduled jobs yet. Click New job to create one."
                            : "No scheduled jobs yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination && pagination.pages > 1 && (
            <Pager page={page} pages={pagination.pages} onPage={setPage} />
          )}
        </div>
      </TabInnerContent>
      {sharedDialogs}
    </div>
  );
}

function NextRun({
  job,
  running,
  now,
}: {
  job: ScheduledJob;
  running: boolean;
  now: number;
}) {
  if (!job.enabled)
    return <span className="text-slate-500 dark:text-white/40">Paused</span>;
  if (running)
    return (
      <span className="text-blue-600 dark:text-blue-300">Running now</span>
    );
  if (!job.nextRunAt)
    return <span className="text-slate-500 dark:text-white/40">—</span>;
  if (isDue(job, now)) {
    return (
      <span
        title="The scheduler checks every 30 s, so the job starts shortly."
        className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
      >
        Due
      </span>
    );
  }
  return (
    <span className="text-black dark:text-white/70">
      {formatRelative(job.nextRunAt, now)}
      <span className="block text-xs text-slate-500 dark:text-white/40">
        {formatInZone(job.nextRunAt, job.timezone)}
      </span>
    </span>
  );
}

function RowButton({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <LiquidIconButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`!h-8 !w-8 !rounded-lg disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "!text-red-600 dark:!text-red-300" : ""
      }`}
    >
      {children}
    </LiquidIconButton>
  );
}
