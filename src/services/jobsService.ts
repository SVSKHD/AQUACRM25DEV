import { api } from "./api";

export type JobParamType =
  "string" | "text" | "phone[]" | "email[]" | "number" | "boolean";

export interface JobActionParam {
  name: string;
  type: JobParamType;
  label: string;
  required?: boolean;
  max?: number;
  description?: string;
}

export interface JobAction {
  key: string;
  label: string;
  description: string;
  systemOnly: boolean;
  params: JobActionParam[];
}

export type JobScheduleType = "cron" | "interval" | "once";
export type JobStatus = "running" | "success" | "failed";

export interface ScheduledJob {
  _id: string;
  name: string;
  description: string;
  action: string;
  params: Record<string, unknown>;
  scheduleType: JobScheduleType;
  cron: string | null;
  intervalMinutes: number | null;
  runAt: string | null;
  timezone: string;
  timeoutSeconds: number;
  enabled: boolean;
  system: boolean;
  key: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: JobStatus | null;
  lastError: string | null;
  lastDurationMs: number | null;
  runCount: number;
  failureCount: number;
  lockUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRun {
  _id: string;
  job: string;
  jobName: string;
  action: string;
  trigger: "schedule" | "manual";
  triggeredBy: { name?: string; email?: string } | null;
  status: JobStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  result: unknown;
  error: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface JobInput {
  name?: string;
  description?: string;
  action?: string;
  params?: Record<string, unknown>;
  scheduleType?: JobScheduleType;
  cron?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone?: string;
  timeoutSeconds?: number;
  enabled?: boolean;
}

export interface JobListQuery {
  enabled?: boolean;
  system?: boolean;
  action?: string;
  status?: JobStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface SchedulePreview {
  valid: boolean;
  message?: string;
  nextRuns: string[];
}

export interface JobsResult<T> {
  data?: T;
  error?: string;
  status?: number;
}

type Envelope<T> = { success: boolean; data: T; pagination?: Pagination };

const unwrap = async <T>(
  request: Promise<{ data?: Envelope<T>; error?: string; status?: number }>,
  fallback: string,
): Promise<JobsResult<T>> => {
  const { data, error, status } = await request;
  if (error || !data) return { error: error || fallback, status };
  return { data: data.data };
};

const unwrapPage = async <T>(
  request: Promise<{ data?: Envelope<T[]>; error?: string; status?: number }>,
  fallback: string,
): Promise<JobsResult<Paginated<T>>> => {
  const { data, error, status } = await request;
  if (error || !data) return { error: error || fallback, status };
  const items = Array.isArray(data.data) ? data.data : [];
  return {
    data: {
      items,
      pagination: data.pagination || {
        page: 1,
        limit: items.length,
        total: items.length,
        pages: 1,
      },
    },
  };
};

const toQuery = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
};

export const jobsService = {
  listActions() {
    return unwrap(
      api.get<Envelope<JobAction[]>>("/jobs/actions"),
      "Failed to load actions",
    );
  },

  previewSchedule(cron: string, timezone: string, count = 5) {
    return unwrap(
      api.post<Envelope<SchedulePreview>>("/jobs/preview-schedule", {
        cron,
        timezone,
        count,
      }),
      "Failed to preview schedule",
    );
  },

  list(query: JobListQuery = {}) {
    return unwrapPage(
      api.get<Envelope<ScheduledJob[]>>(`/jobs${toQuery({ ...query })}`),
      "Failed to load jobs",
    );
  },

  get(id: string) {
    return unwrap(
      api.get<Envelope<ScheduledJob>>(`/jobs/${id}`),
      "Failed to load job",
    );
  },

  create(body: JobInput) {
    return unwrap(
      api.post<Envelope<ScheduledJob>>("/jobs", body),
      "Failed to create job",
    );
  },

  update(id: string, body: JobInput) {
    return unwrap(
      api.patch<Envelope<ScheduledJob>>(`/jobs/${id}`, body),
      "Failed to update job",
    );
  },

  async remove(id: string): Promise<JobsResult<true>> {
    const { error, status } = await api.delete(`/jobs/${id}`);
    return error ? { error, status } : { data: true };
  },

  run(id: string) {
    return unwrap(
      api.post<Envelope<JobRun>>(`/jobs/${id}/run`),
      "Failed to start job",
    );
  },

  listRuns(
    id: string,
    query: { page?: number; limit?: number; status?: JobStatus } = {},
  ) {
    return unwrapPage(
      api.get<Envelope<JobRun[]>>(`/jobs/${id}/runs${toQuery({ ...query })}`),
      "Failed to load run history",
    );
  },

  getRun(runId: string) {
    return unwrap(
      api.get<Envelope<JobRun>>(`/jobs/runs/${runId}`),
      "Failed to load run",
    );
  },

  /**
   * Detects jobs.manage without side effects: the permission check runs before
   * the lookup, so a PATCH to a non-existent id answers 403 without the
   * permission and 404 with it.
   */
  async probeManage(): Promise<boolean> {
    const { status } = await api.patch("/jobs/000000000000000000000000", {});
    return status !== 403;
  },
};

/** Actions that send real messages to customers/recipients when run. */
export const MESSAGING_ACTIONS = new Set([
  "whatsapp.send",
  "email.send",
  "ai.generate_and_notify",
  "service.product_reminders",
  "quotation.followups",
]);
