import type { JobActionParam } from "../../../services/jobsService";
import AIAssist from "../../ai/AIAssist";
import ChipInput from "./ChipInput";
import {
  jobFieldClass,
  jobLabelClass,
  normalizeEmail,
  normalizeIndianPhone,
  toStringList,
} from "./jobFormUtils";

interface JobParamsFormProps {
  params: JobActionParam[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export default function JobParamsForm({
  params,
  values,
  onChange,
  disabled = false,
}: JobParamsFormProps) {
  if (!params.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-white/50">
        This action has no parameters.
      </p>
    );
  }

  const set = (name: string, value: unknown) =>
    onChange({ ...values, [name]: value });

  return (
    <div className="space-y-4">
      {params.map((param) => {
        const id = `job-param-${param.name}`;
        const label = (
          <span>
            {param.label}
            {param.required && <span className="text-rose-500"> *</span>}
          </span>
        );
        const value = values[param.name];

        if (param.type === "boolean") {
          return (
            <label
              key={param.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm font-medium text-black dark:text-white/70">
                {label}
              </span>
              <Switch
                checked={Boolean(value)}
                disabled={disabled}
                onChange={(checked) => set(param.name, checked)}
              />
            </label>
          );
        }

        if (param.type === "phone[]" || param.type === "email[]") {
          const isPhone = param.type === "phone[]";
          return (
            <div key={param.name}>
              <label htmlFor={id} className={jobLabelClass}>
                {label}
              </label>
              <ChipInput
                id={id}
                values={toStringList(value)}
                onChange={(next) => set(param.name, next)}
                normalize={isPhone ? normalizeIndianPhone : normalizeEmail}
                invalidMessage={(raw) =>
                  isPhone
                    ? `"${raw}" is not a valid mobile number (10 digits or 91-prefixed)`
                    : `"${raw}" is not a valid email address`
                }
                placeholder={
                  isPhone
                    ? "9876543210, press Enter to add"
                    : "name@example.com, press Enter to add"
                }
                max={param.max}
                disabled={disabled}
              />
            </div>
          );
        }

        if (param.type === "text") {
          const text = typeof value === "string" ? value : "";
          return (
            <div key={param.name}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor={id}
                  className="block text-sm font-medium text-black dark:text-white/70"
                >
                  {label}
                </label>
                {!disabled && (
                  <AIAssist
                    value={text}
                    onChange={(next) => set(param.name, next)}
                    context={param.label.toLowerCase()}
                    maxChars={param.max}
                  />
                )}
              </div>
              <textarea
                id={id}
                value={text}
                disabled={disabled}
                maxLength={param.max}
                rows={4}
                onChange={(event) => set(param.name, event.target.value)}
                className={`${jobFieldClass} min-h-[96px]`}
              />
              {param.max ? (
                <p
                  className={`mt-1 text-right text-xs ${text.length > param.max * 0.9 ? "text-amber-600" : "text-slate-500 dark:text-white/40"}`}
                >
                  {text.length}/{param.max}
                </p>
              ) : null}
            </div>
          );
        }

        return (
          <div key={param.name}>
            <label htmlFor={id} className={jobLabelClass}>
              {label}
            </label>
            <input
              id={id}
              type={param.type === "number" ? "number" : "text"}
              value={value === undefined || value === null ? "" : String(value)}
              disabled={disabled}
              maxLength={param.type === "string" ? param.max : undefined}
              onChange={(event) => set(param.name, event.target.value)}
              className={jobFieldClass}
            />
          </div>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
