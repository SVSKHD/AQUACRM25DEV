import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CalendarClock, Loader2 } from "lucide-react";
import {
  jobsService,
  type JobScheduleType,
  type SchedulePreview,
} from "../../../services/jobsService";
import {
  WEEKDAYS,
  buildCron,
  describeCron,
  formatInZone,
  formatInterval,
  formatMinutes,
  formatRelative,
  listTimeZones,
  zonedInputToIso,
  type CronPreset,
} from "../../../utils/jobSchedule";
import { LiquidButton, LiquidInput, LiquidSelect } from "../../ui/liquid";
import {
  UNIT_MINUTES,
  jobLabelClass,
  scheduleCron,
  type CronMode,
  type IntervalUnit,
  type ScheduleState,
} from "./jobFormUtils";

const CRON_MODES: { id: CronMode; label: string }[] = [
  { id: "hourly", label: "Every hour" },
  { id: "daily", label: "Daily at…" },
  { id: "weekly", label: "Weekly on…" },
  { id: "monthly", label: "Monthly on day…" },
  { id: "advanced", label: "Advanced" },
];

const pad = (value: number) => String(value).padStart(2, "0");

interface ScheduleEditorProps {
  value: ScheduleState;
  onChange: (value: ScheduleState) => void;
  enabled: boolean;
}

export default function ScheduleEditor({
  value,
  onChange,
  enabled,
}: ScheduleEditorProps) {
  const timeZones = useMemo(() => listTimeZones(), []);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const set = (patch: Partial<ScheduleState>) =>
    onChange({ ...value, ...patch });
  const setPreset = (patch: Partial<CronPreset>) =>
    set({ preset: { ...value.preset, ...patch } });
  const cron = scheduleCron(value);

  useEffect(() => {
    if (value.scheduleType !== "cron" || !cron) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    let active = true;
    setPreviewLoading(true);
    const timer = window.setTimeout(async () => {
      const { data, error } = await jobsService.previewSchedule(
        cron,
        value.timezone,
        5,
      );
      if (!active) return;
      setPreviewLoading(false);
      setPreview(data || null);
      setPreviewError(error || "");
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [cron, value.scheduleType, value.timezone]);

  const timeValue = `${pad(value.preset.hour)}:${pad(value.preset.minute)}`;
  const setTime = (text: string) => {
    const [hour, minute] = text.split(":").map(Number);
    if (Number.isFinite(hour) && Number.isFinite(minute))
      setPreset({ hour, minute });
  };

  const switchCronMode = (mode: CronMode) => {
    // Carry the generated expression into the raw editor so it can be tweaked.
    if (mode === "advanced" && value.cronMode !== "advanced") {
      set({ cronMode: mode, rawCron: buildCron(value.preset) });
    } else {
      set({ cronMode: mode });
    }
  };

  const onceIso =
    value.scheduleType === "once"
      ? zonedInputToIso(value.runAtLocal, value.timezone)
      : null;
  const onceInPast = Boolean(
    onceIso && new Date(onceIso).getTime() <= Date.now(),
  );
  const intervalMinutes =
    Number(value.intervalValue) * UNIT_MINUTES[value.intervalUnit];

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5"
        role="tablist"
        aria-label="Schedule type"
      >
        {(["cron", "interval", "once"] as JobScheduleType[]).map((type) => (
          <LiquidButton
            key={type}
            type="button"
            role="tab"
            aria-selected={value.scheduleType === type}
            onClick={() => set({ scheduleType: type })}
            variant={value.scheduleType === type ? "primary" : "ghost"}
            className={`!min-h-0 !rounded-lg !px-4 !py-1.5 text-sm ${
              value.scheduleType === type
                ? ""
                : "!border-transparent text-slate-600 dark:text-white/60"
            }`}
          >
            {type === "cron"
              ? "Cron"
              : type === "interval"
                ? "Interval"
                : "Once"}
          </LiquidButton>
        ))}
      </div>

      {value.scheduleType === "cron" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CRON_MODES.map((mode) => (
              <LiquidButton
                key={mode.id}
                type="button"
                onClick={() => switchCronMode(mode.id)}
                aria-pressed={value.cronMode === mode.id}
                variant={value.cronMode === mode.id ? "primary" : "soft"}
                className="!min-h-0 !rounded-full !px-3 !py-1 text-xs"
              >
                {mode.label}
              </LiquidButton>
            ))}
          </div>

          {value.cronMode === "hourly" && (
            <LiquidInput
              label="At minute"
              wrapperClassName="max-w-[200px]"
              type="number"
              min={0}
              max={59}
              value={value.preset.minute}
              onChange={(event) =>
                setPreset({
                  minute: Math.min(
                    59,
                    Math.max(0, Number(event.target.value) || 0),
                  ),
                })
              }
            />
          )}

          {value.cronMode === "weekly" && (
            <div>
              <span className={jobLabelClass}>On</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = value.preset.weekdays.includes(day);
                  return (
                    <LiquidButton
                      key={day}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setPreset({
                          weekdays: active
                            ? value.preset.weekdays.filter(
                                (item) => item !== day,
                              )
                            : [...value.preset.weekdays, day],
                        })
                      }
                      variant={active ? "primary" : "soft"}
                      className="!min-h-0 w-12 !rounded-lg !px-0 !py-1.5 text-xs"
                    >
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </LiquidButton>
                  );
                })}
              </div>
              {value.preset.weekdays.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Pick at least one day (defaults to Monday).
                </p>
              )}
            </div>
          )}

          {value.cronMode === "monthly" && (
            <div className="max-w-[200px]">
              <LiquidSelect
                label="Day of month"
                value={value.preset.dayOfMonth}
                onChange={(event) =>
                  setPreset({ dayOfMonth: Number(event.target.value) })
                }
              >
                {Array.from({ length: 31 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ),
                )}
              </LiquidSelect>
              {value.preset.dayOfMonth > 28 && (
                <span className="mt-1 block text-xs text-amber-600">
                  Skipped in months without this day.
                </span>
              )}
            </div>
          )}

          {(value.cronMode === "daily" ||
            value.cronMode === "weekly" ||
            value.cronMode === "monthly") && (
            <LiquidInput
              label="At"
              wrapperClassName="max-w-[200px]"
              type="time"
              value={timeValue}
              onChange={(event) => setTime(event.target.value)}
            />
          )}

          {value.cronMode === "advanced" ? (
            <div>
              <LiquidInput
                id="job-raw-cron"
                label="Cron expression"
                value={value.rawCron}
                onChange={(event) => set({ rawCron: event.target.value })}
                placeholder="0 10 * * SAT"
                spellCheck={false}
                className="font-mono"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                5 fields: minute hour day-of-month month day-of-week. Names like
                MON-FRI or JAN and @hourly / @daily / @weekly / @monthly are
                allowed.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-white/50">
              Expression:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-white/10">
                {cron}
              </code>
            </p>
          )}
        </div>
      )}

      {value.scheduleType === "interval" && (
        <div className="flex max-w-sm gap-2">
          <LiquidInput
            label="Every"
            wrapperClassName="flex-1"
            type="number"
            min={1}
            step={1}
            value={value.intervalValue}
            onChange={(event) => set({ intervalValue: event.target.value })}
          />
          <LiquidSelect
            label="Unit"
            wrapperClassName="flex-1"
            value={value.intervalUnit}
            onChange={(event) =>
              set({ intervalUnit: event.target.value as IntervalUnit })
            }
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </LiquidSelect>
        </div>
      )}

      {value.scheduleType === "once" && (
        <LiquidInput
          label={`Run at (${value.timezone})`}
          wrapperClassName="max-w-xs"
          type="datetime-local"
          value={value.runAtLocal}
          onChange={(event) => set({ runAtLocal: event.target.value })}
        />
      )}

      <LiquidSelect
        label="Timezone"
        wrapperClassName="max-w-sm"
        value={value.timezone}
        onChange={(event) => set({ timezone: event.target.value })}
      >
        {timeZones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </LiquidSelect>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
        <p className="mb-2 flex items-center gap-2 font-semibold text-neutral-950 dark:text-white">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {value.scheduleType === "cron" && cron && (!preview || preview.valid)
            ? describeCron(cron, value.timezone)
            : "Upcoming runs"}
          {previewLoading && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-slate-400"
              aria-label="Loading preview"
            />
          )}
        </p>

        {value.scheduleType === "cron" && (
          <>
            {previewError && <PreviewMessage>{previewError}</PreviewMessage>}
            {preview && !preview.valid && (
              <PreviewMessage>
                {preview.message || "Invalid cron expression"}
              </PreviewMessage>
            )}
            {preview?.valid && (
              <ol className="space-y-1 text-slate-700 dark:text-white/70">
                {preview.nextRuns.map((run) => (
                  <li key={run} className="flex justify-between gap-3">
                    <span>
                      {formatInZone(run, value.timezone, { withYear: true })}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-white/40">
                      {formatRelative(run)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {value.scheduleType === "interval" && (
          <p className="text-slate-700 dark:text-white/70">
            {Number.isInteger(intervalMinutes) && intervalMinutes >= 1
              ? `${formatInterval(intervalMinutes)}. The first run is about ${formatMinutes(intervalMinutes)} after saving.`
              : "Enter a whole number."}
          </p>
        )}

        {value.scheduleType === "once" &&
          (onceIso ? (
            onceInPast ? (
              <PreviewMessage>
                {enabled
                  ? "Run time must be in the future while the job is enabled."
                  : "This time has already passed."}
              </PreviewMessage>
            ) : (
              <p className="text-slate-700 dark:text-white/70">
                {formatInZone(onceIso, value.timezone, { withYear: true })} (
                {formatRelative(onceIso)}). The job disables itself after it
                runs.
              </p>
            )
          ) : (
            <p className="text-slate-500 dark:text-white/50">
              Choose a date and time.
            </p>
          ))}
      </div>
    </div>
  );
}

function PreviewMessage({ children }: { children: ReactNode }) {
  return (
    <p
      className="flex items-start gap-2 text-rose-600 dark:text-rose-300"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
