import type {
  JobActionParam,
  JobScheduleType,
  ScheduledJob,
} from "../../../services/jobsService";
import {
  DEFAULT_CRON_PRESET,
  DEFAULT_TIMEZONE,
  buildCron,
  isoToZonedInput,
  parseCronPreset,
  zonedInputToIso,
  type CronPreset,
  type CronPresetMode,
} from "../../../utils/jobSchedule";

export const jobFieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white";
export const jobLabelClass =
  "mb-1.5 block text-sm font-medium text-black dark:text-white/70";

// ---------------------------------------------------------------- recipients

/** Indian mobile number: 10 digits, optionally prefixed with 91 (matches the backend check). */
export const normalizeIndianPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return /^(91)?\d{10}$/.test(digits) ? digits : null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (raw: string) => {
  const value = raw.trim().toLowerCase();
  return EMAIL_PATTERN.test(value) ? value : null;
};

// ---------------------------------------------------------------- params

/** Arrays may come back from the API as arrays or comma/newline-separated strings. */
export const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const defaultParamValue = (param: JobActionParam): unknown => {
  if (param.type === "phone[]" || param.type === "email[]") return [];
  if (param.type === "boolean") return false;
  return "";
};

/** Coerces form state to the payload shape: arrays stay arrays, blanks are dropped. */
export const serializeParams = (
  params: JobActionParam[],
  values: Record<string, unknown>,
) => {
  const payload: Record<string, unknown> = {};
  for (const param of params) {
    const value = values[param.name];
    if (param.type === "phone[]" || param.type === "email[]") {
      const list = toStringList(value);
      if (list.length) payload[param.name] = list;
    } else if (param.type === "boolean") {
      payload[param.name] = Boolean(value);
    } else if (param.type === "number") {
      if (value !== "" && value !== null && value !== undefined)
        payload[param.name] = Number(value);
    } else if (typeof value === "string" && value.trim()) {
      payload[param.name] = value;
    }
  }
  return payload;
};

/** Client-side check mirroring the backend so obvious mistakes are caught before saving. */
export const validateParams = (
  params: JobActionParam[],
  values: Record<string, unknown>,
) => {
  for (const param of params) {
    const value = values[param.name];
    const isList = param.type === "phone[]" || param.type === "email[]";
    const empty = isList
      ? toStringList(value).length === 0
      : value === undefined ||
        value === null ||
        (typeof value === "string" && !value.trim());
    if (param.required && empty && param.type !== "boolean")
      return `${param.label} is required`;
    if (
      param.max &&
      !empty &&
      param.type !== "number" &&
      param.type !== "boolean"
    ) {
      const length = isList ? toStringList(value).length : String(value).length;
      if (length > param.max) {
        return `${param.label} allows at most ${param.max} ${isList ? "entries" : "characters"}`;
      }
    }
  }
  return null;
};

// ---------------------------------------------------------------- schedule

export type CronMode = CronPresetMode | "advanced";
export type IntervalUnit = "minutes" | "hours" | "days";

export interface ScheduleState {
  scheduleType: JobScheduleType;
  cronMode: CronMode;
  preset: CronPreset;
  rawCron: string;
  intervalValue: string;
  intervalUnit: IntervalUnit;
  runAtLocal: string;
  timezone: string;
}

export const UNIT_MINUTES: Record<IntervalUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};
const MAX_INTERVAL_MINUTES = 366 * 24 * 60;

export const scheduleStateFromJob = (
  job?: ScheduledJob | null,
): ScheduleState => {
  const timezone = job?.timezone || DEFAULT_TIMEZONE;
  const preset = parseCronPreset(job?.cron);
  const minutes = job?.intervalMinutes || 60;
  const intervalUnit: IntervalUnit =
    minutes % 1440 === 0 ? "days" : minutes % 60 === 0 ? "hours" : "minutes";
  return {
    scheduleType: job?.scheduleType || "cron",
    cronMode: job?.cron && !preset ? "advanced" : preset?.mode || "daily",
    preset: preset || DEFAULT_CRON_PRESET,
    rawCron: job?.cron || buildCron(DEFAULT_CRON_PRESET),
    intervalValue: String(minutes / UNIT_MINUTES[intervalUnit]),
    intervalUnit,
    runAtLocal: isoToZonedInput(job?.runAt, timezone),
    timezone,
  };
};

export const scheduleCron = (state: ScheduleState) =>
  state.cronMode === "advanced"
    ? state.rawCron.trim()
    : buildCron(state.preset);

export type SchedulePayload = {
  scheduleType: JobScheduleType;
  cron?: string;
  intervalMinutes?: number;
  runAt?: string;
  timezone: string;
};

export const schedulePayload = (
  state: ScheduleState,
): { payload?: SchedulePayload; error?: string } => {
  const base = { scheduleType: state.scheduleType, timezone: state.timezone };
  if (state.scheduleType === "cron") {
    const cron = scheduleCron(state);
    if (!cron) return { error: "Enter a cron expression" };
    return { payload: { ...base, cron } };
  }
  if (state.scheduleType === "interval") {
    const minutes =
      Number(state.intervalValue) * UNIT_MINUTES[state.intervalUnit];
    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > MAX_INTERVAL_MINUTES
    ) {
      return {
        error:
          "Interval must be a whole number of minutes between 1 minute and 366 days",
      };
    }
    return { payload: { ...base, intervalMinutes: minutes } };
  }
  const runAt = zonedInputToIso(state.runAtLocal, state.timezone);
  if (!runAt) return { error: "Choose the date and time to run" };
  return { payload: { ...base, runAt } };
};
