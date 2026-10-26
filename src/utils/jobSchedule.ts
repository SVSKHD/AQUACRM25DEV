import type { ScheduledJob } from "../services/jobsService";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export const WEEKDAYS = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const WEEKDAY_NAMES: Record<Weekday, string> = {
  SUN: "Sunday",
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

const CRON_MACROS: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
};

const pad = (value: number) => String(value).padStart(2, "0");

// ---------------------------------------------------------------- timezones

export const tzAbbreviation = (timezone: string, date = new Date()) => {
  if (timezone === "Asia/Kolkata" || timezone === "Asia/Calcutta") return "IST";
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((item) => item.type === "timeZoneName");
    return part?.value || timezone;
  } catch {
    return timezone;
  }
};

export const listTimeZones = (): string[] => {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  const zones = supported ? supported("timeZone") : [];
  return Array.from(new Set([DEFAULT_TIMEZONE, "UTC", ...zones])).filter(
    (zone) => zone !== "Asia/Calcutta",
  );
};

const zoneParts = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
};

/** Offset of `timezone` from UTC at `date`, in milliseconds. */
const zoneOffset = (date: Date, timezone: string) => {
  const p = zoneParts(date, timezone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

/** "2026-10-25T18:00" read as wall time in `timezone` → UTC ISO string. */
export const zonedInputToIso = (
  value: string,
  timezone: string,
): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wallAsUtc - zoneOffset(new Date(wallAsUtc), timezone);
  // Re-check once in case the guess crossed a DST boundary.
  guess = wallAsUtc - zoneOffset(new Date(guess), timezone);
  return new Date(guess).toISOString();
};

/** UTC ISO → "YYYY-MM-DDTHH:mm" wall time in `timezone` (for datetime-local inputs). */
export const isoToZonedInput = (
  iso: string | null | undefined,
  timezone: string,
) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = zoneParts(date, timezone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

// ---------------------------------------------------------------- formatting

export const formatInZone = (
  iso: string | null | undefined,
  timezone: string,
  {
    withYear = false,
    withZone = true,
  }: { withYear?: boolean; withZone?: boolean } = {},
) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const text = new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return withZone ? `${text} ${tzAbbreviation(timezone, date)}` : text;
};

export const formatRelative = (
  iso: string | null | undefined,
  now = Date.now(),
) => {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  let text: string;
  if (abs < minute) text = `${Math.max(1, Math.round(abs / 1000))} s`;
  else if (abs < hour) text = `${Math.round(abs / minute)} min`;
  else if (abs < day) text = `${Math.round(abs / hour)} h`;
  else text = `${Math.round(abs / day)} d`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
};

export const formatDuration = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds % 60)} s`;
};

/** 30 → "30 min", 120 → "2 hours", 1440 → "1 day". */
export const formatMinutes = (minutes: number) => {
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} min`;
};

export const formatInterval = (minutes: number) => {
  if (minutes === 1440) return "Every day";
  if (minutes === 60) return "Every hour";
  return `Every ${formatMinutes(minutes)}`;
};

// ---------------------------------------------------------------- cron presets

export type CronPresetMode = "hourly" | "daily" | "weekly" | "monthly";

export interface CronPreset {
  mode: CronPresetMode;
  minute: number;
  hour: number;
  weekdays: Weekday[];
  dayOfMonth: number;
}

export const DEFAULT_CRON_PRESET: CronPreset = {
  mode: "daily",
  minute: 0,
  hour: 10,
  weekdays: ["MON"],
  dayOfMonth: 1,
};

export const buildCron = (preset: CronPreset) => {
  const { minute, hour } = preset;
  switch (preset.mode) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const days = WEEKDAYS.filter((day) => preset.weekdays.includes(day));
      return `${minute} ${hour} * * ${(days.length ? days : ["MON"]).join(",")}`;
    }
    case "monthly":
      return `${minute} ${hour} ${preset.dayOfMonth} * *`;
  }
};

const toInt = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max
    ? Number(value)
    : null;

const weekdayIndex = (value: string) => {
  const upper = value.toUpperCase();
  const byName = WEEKDAYS.indexOf(upper as Weekday);
  if (byName >= 0) return byName;
  const number = toInt(value, 0, 7);
  return number === null ? null : number % 7;
};

/** Expands a day-of-week field like "MON-FRI", "1,3,5" or "SAT" into names. */
const parseWeekdays = (field: string): Weekday[] | null => {
  const days = new Set<Weekday>();
  for (const part of field.split(",")) {
    const [startText, endText, ...rest] = part.split("-");
    if (rest.length) return null;
    const start = weekdayIndex(startText);
    if (start === null) return null;
    if (endText === undefined) {
      days.add(WEEKDAYS[start]);
      continue;
    }
    const endRaw =
      endText.toUpperCase() === "SUN" || endText === "7"
        ? 7
        : weekdayIndex(endText);
    if (endRaw === null || endRaw < start) return null;
    for (let index = start; index <= endRaw; index += 1)
      days.add(WEEKDAYS[index % 7]);
  }
  return WEEKDAYS.filter((day) => days.has(day));
};

export const expandCronMacro = (expression: string) => {
  const trimmed = expression.trim();
  return CRON_MACROS[trimmed.toLowerCase()] || trimmed;
};

/** Maps a cron expression back to a preset, or null if it needs the raw editor. */
export const parseCronPreset = (
  expression: string | null | undefined,
): CronPreset | null => {
  if (!expression) return null;
  const fields = expandCronMacro(expression).split(/\s+/);
  if (fields.length !== 5) return null;
  const [minuteField, hourField, domField, monthField, dowField] = fields;
  const minute = toInt(minuteField, 0, 59);
  if (minute === null || monthField !== "*") return null;

  if (hourField === "*" && domField === "*" && dowField === "*") {
    return { ...DEFAULT_CRON_PRESET, mode: "hourly", minute };
  }
  const hour = toInt(hourField, 0, 23);
  if (hour === null) return null;

  if (domField === "*" && dowField === "*") {
    return { ...DEFAULT_CRON_PRESET, mode: "daily", minute, hour };
  }
  if (domField === "*") {
    const weekdays = parseWeekdays(dowField);
    return weekdays && weekdays.length
      ? { ...DEFAULT_CRON_PRESET, mode: "weekly", minute, hour, weekdays }
      : null;
  }
  const dayOfMonth = toInt(domField, 1, 31);
  if (dayOfMonth !== null && dowField === "*") {
    return {
      ...DEFAULT_CRON_PRESET,
      mode: "monthly",
      minute,
      hour,
      dayOfMonth,
    };
  }
  return null;
};

const describeWeekdays = (days: Weekday[]) => {
  const key = days.join(",");
  if (key === "MON,TUE,WED,THU,FRI") return "Every weekday";
  if (key === "SUN,SAT") return "Every weekend day";
  if (days.length === 7) return "Every day";
  if (days.length === 1) return `Every ${WEEKDAY_NAMES[days[0]]}`;
  return `Every ${days.map((day) => WEEKDAY_NAMES[day].slice(0, 3)).join(", ")}`;
};

export const describeCron = (expression: string, timezone: string) => {
  const zone = tzAbbreviation(timezone);
  const expanded = expandCronMacro(expression);
  const preset = parseCronPreset(expanded);
  if (preset) {
    const time = `${pad(preset.hour)}:${pad(preset.minute)} ${zone}`;
    switch (preset.mode) {
      case "hourly":
        return preset.minute === 0
          ? "Every hour"
          : `Every hour at :${pad(preset.minute)}`;
      case "daily":
        return `Every day at ${time}`;
      case "weekly":
        return `${describeWeekdays(preset.weekdays)} at ${time}`;
      case "monthly":
        return `Monthly on day ${preset.dayOfMonth} at ${time}`;
    }
  }

  const fields = expanded.split(/\s+/);
  if (fields.length === 5) {
    const [minuteField, hourField, domField, monthField, dowField] = fields;
    const rest = `${domField} ${monthField} ${dowField}`;
    const minuteStep = /^\*\/(\d+)$/.exec(minuteField);
    if (minuteStep && hourField === "*" && rest === "* * *") {
      return `Every ${minuteStep[1]} min`;
    }
    const hourStep = /^\*\/(\d+)$/.exec(hourField);
    const minute = toInt(minuteField, 0, 59);
    if (hourStep && minute !== null && rest === "* * *") {
      return `Every ${hourStep[1]} hours${minute ? ` at :${pad(minute)}` : ""}`;
    }
    if (expanded === "0 0 1 1 *") return `Every year on 1 Jan at 00:00 ${zone}`;
  }
  return `Cron "${expression}" (${zone})`;
};

export const describeSchedule = (
  job: Pick<
    ScheduledJob,
    "scheduleType" | "cron" | "intervalMinutes" | "runAt" | "timezone"
  >,
) => {
  const timezone = job.timezone || DEFAULT_TIMEZONE;
  if (job.scheduleType === "cron" && job.cron)
    return describeCron(job.cron, timezone);
  if (job.scheduleType === "interval" && job.intervalMinutes) {
    return formatInterval(job.intervalMinutes);
  }
  if (job.scheduleType === "once" && job.runAt) {
    return `Once on ${formatInZone(job.runAt, timezone)}`;
  }
  return "Not scheduled";
};

/** The scheduler polls every 30 s, so a job can start a little after nextRunAt. */
export const isDue = (
  job: Pick<ScheduledJob, "enabled" | "nextRunAt">,
  now = Date.now(),
) =>
  Boolean(
    job.enabled && job.nextRunAt && new Date(job.nextRunAt).getTime() <= now,
  );
