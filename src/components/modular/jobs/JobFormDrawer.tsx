import ResponsiveDialog from "../../ui/ResponsiveDialog";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  jobsService,
  type JobAction,
  type JobInput,
  type ScheduledJob,
} from "../../../services/jobsService";
import JobParamsForm, { Switch } from "./JobParamsForm";
import ScheduleEditor from "./ScheduleEditor";
import {
  defaultParamValue,
  jobFieldClass,
  jobLabelClass,
  schedulePayload,
  scheduleStateFromJob,
  serializeParams,
  validateParams,
  type ScheduleState,
} from "./jobFormUtils";

interface JobFormDrawerProps {
  open: boolean;
  /** null creates a new job */
  job: ScheduledJob | null;
  actions: JobAction[];
  onClose: () => void;
  onSaved: (job: ScheduledJob, created: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  action: string;
  params: Record<string, unknown>;
  schedule: ScheduleState;
  timeoutSeconds: string;
  enabled: boolean;
}

const paramValuesFor = (
  action: JobAction | undefined,
  source: Record<string, unknown> = {},
) => {
  const values: Record<string, unknown> = {};
  action?.params.forEach((param) => {
    values[param.name] = source[param.name] ?? defaultParamValue(param);
  });
  return values;
};

const initialState = (
  job: ScheduledJob | null,
  actions: JobAction[],
): FormState => {
  const actionKey =
    job?.action || actions.find((action) => !action.systemOnly)?.key || "";
  const action = actions.find((item) => item.key === actionKey);
  return {
    name: job?.name || "",
    description: job?.description || "",
    action: actionKey,
    params: paramValuesFor(action, job?.params),
    schedule: scheduleStateFromJob(job),
    timeoutSeconds: String(job?.timeoutSeconds ?? 300),
    enabled: job?.enabled ?? true,
  };
};

export default function JobFormDrawer({
  open,
  job,
  actions,
  onClose,
  onSaved,
}: JobFormDrawerProps) {
  const [form, setForm] = useState<FormState>(() => initialState(job, actions));
  const [initial, setInitial] = useState<FormState>(form);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = initialState(job, actions);
    setForm(next);
    setInitial(next);
    setError("");
    setSaving(false);
  }, [open, job, actions]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, saving, onClose]);

  const isSystem = Boolean(job?.system);
  const selectableActions = useMemo(
    () => actions.filter((action) => !action.systemOnly),
    [actions],
  );
  const selectedAction = actions.find((action) => action.key === form.action);

  const set = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));

  const selectAction = (key: string) => {
    const action = actions.find((item) => item.key === key);
    // Keep values for params that share a name (e.g. "message") across actions.
    set({ action: key, params: paramValuesFor(action, form.params) });
  };

  const buildBody = (): { body?: JobInput; error?: string } => {
    if (!form.name.trim()) return { error: "Name is required" };
    if (!selectedAction) return { error: "Choose an action" };
    const paramsError = isSystem
      ? null
      : validateParams(selectedAction.params, form.params);
    if (paramsError) return { error: paramsError };
    const { payload: schedule, error: scheduleError } = schedulePayload(
      form.schedule,
    );
    if (scheduleError || !schedule) return { error: scheduleError };
    const timeoutSeconds = Number(form.timeoutSeconds);
    if (
      !Number.isInteger(timeoutSeconds) ||
      timeoutSeconds < 10 ||
      timeoutSeconds > 3600
    ) {
      return {
        error: "Timeout must be a whole number between 10 and 3600 seconds",
      };
    }

    const full: JobInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      action: form.action,
      params: serializeParams(selectedAction.params, form.params),
      ...schedule,
      timeoutSeconds,
      enabled: form.enabled,
    };
    if (!job) return { body: full };

    // PATCH: send only what changed.
    const initialAction = actions.find(
      (action) => action.key === initial.action,
    );
    const body: JobInput = {};
    if (full.name !== initial.name.trim()) body.name = full.name;
    if (full.description !== initial.description.trim())
      body.description = full.description;
    if (!isSystem && full.action !== initial.action) body.action = full.action;
    const initialParams = initialAction
      ? serializeParams(initialAction.params, initial.params)
      : {};
    if (
      !isSystem &&
      (body.action ||
        JSON.stringify(full.params) !== JSON.stringify(initialParams))
    ) {
      body.params = full.params;
    }
    const initialSchedule = schedulePayload(initial.schedule).payload;
    if (JSON.stringify(schedule) !== JSON.stringify(initialSchedule))
      Object.assign(body, schedule);
    if (timeoutSeconds !== Number(initial.timeoutSeconds))
      body.timeoutSeconds = timeoutSeconds;
    if (form.enabled !== initial.enabled) body.enabled = form.enabled;
    return { body };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const { body, error: validationError } = buildBody();
    if (validationError || !body) {
      setError(validationError || "Please check the form");
      return;
    }
    if (job && Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    const result = job
      ? await jobsService.update(job._id, body)
      : await jobsService.create(body);
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error || "Failed to save job");
      return;
    }
    onSaved(result.data, !job);
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={job ? "Edit job" : "New scheduled job"}
      size="md"
      drawer
      busy={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-black hover:bg-slate-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="job-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {job ? "Save changes" : "Create job"}
          </button>
        </>
      }
    >
      <form id="job-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p
            className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            role="alert"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {error}
          </p>
        )}
        <section className="space-y-4">
          <label className="block">
            <span className={jobLabelClass}>
              Name <span className="text-rose-500">*</span>
            </span>
            <input
              value={form.name}
              maxLength={120}
              onChange={(event) => set({ name: event.target.value })}
              placeholder="Weekend offer"
              className={jobFieldClass}
            />
          </label>
          <label className="block">
            <span className={jobLabelClass}>Description</span>
            <textarea
              value={form.description}
              maxLength={1000}
              rows={2}
              onChange={(event) => set({ description: event.target.value })}
              className={jobFieldClass}
            />
          </label>
        </section>
        <section>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Action
          </h4>
          {isSystem || (job && selectedAction?.systemOnly) ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                {selectedAction?.label || form.action}
              </p>
              {selectedAction?.description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                  {selectedAction.description}
                </p>
              )}
            </div>
          ) : (
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Action"
            >
              {selectableActions.map((action) => {
                const selected = action.key === form.action;
                return (
                  <button
                    key={action.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectAction(action.key)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                      {action.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        {selectedAction && (
          <section>
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
              Parameters
            </h4>
            <JobParamsForm
              params={selectedAction.params}
              values={form.params}
              onChange={(params) => set({ params })}
              disabled={isSystem}
            />
          </section>
        )}
        <section>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Schedule
          </h4>
          <ScheduleEditor
            value={form.schedule}
            onChange={(schedule) => set({ schedule })}
            enabled={form.enabled}
          />
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={jobLabelClass}>Timeout (seconds)</span>
            <input
              type="number"
              min={10}
              max={3600}
              step={1}
              value={form.timeoutSeconds}
              onChange={(event) => set({ timeoutSeconds: event.target.value })}
              className={jobFieldClass}
            />
            <span className="mt-1 block text-xs text-slate-500 dark:text-white/40">
              10 – 3600
            </span>
          </label>
          <div className="flex items-center justify-between gap-3 sm:pt-7">
            <span className="text-sm font-medium text-black dark:text-white/70">
              Enabled
            </span>
            <Switch
              checked={form.enabled}
              onChange={(enabled) => set({ enabled })}
              label="Enabled"
            />
          </div>
        </section>
      </form>
    </ResponsiveDialog>
  );
}
