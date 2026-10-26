import { useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { LiquidIconButton, LiquidInput } from "../../ui/liquid";

interface ChipInputProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Returns the normalized value, or null when the entry is invalid. */
  normalize: (raw: string) => string | null;
  invalidMessage: (raw: string) => string;
  placeholder?: string;
  max?: number;
  disabled?: boolean;
}

const SEPARATORS = /[\s,;]+/;

export default function ChipInput({
  id,
  values,
  onChange,
  normalize,
  invalidMessage,
  placeholder,
  max,
  disabled = false,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const addEntries = (raw: string) => {
    const entries = raw
      .split(SEPARATORS)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!entries.length) return;
    const next = [...values];
    const rejected: string[] = [];
    let overLimit = false;
    for (const entry of entries) {
      const value = normalize(entry);
      if (!value) {
        rejected.push(entry);
      } else if (!next.includes(value)) {
        if (max && next.length >= max) {
          overLimit = true;
          break;
        }
        next.push(value);
      }
    }
    onChange(next);
    setDraft(rejected.join(", "));
    setError(
      rejected.length
        ? invalidMessage(rejected[0])
        : overLimit
          ? `At most ${max} entries allowed`
          : "",
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      if (!draft.trim()) return;
      event.preventDefault();
      addEntries(draft);
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!SEPARATORS.test(text.trim())) return;
    event.preventDefault();
    addEntries(`${draft} ${text}`);
  };

  return (
    <div>
      <div
        className={`flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 dark:border-white/10 dark:bg-white/5 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
          >
            {value}
            {!disabled && (
              <LiquidIconButton
                type="button"
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
                className="!h-4 !w-4 !rounded-full !border-0 !bg-transparent !bg-none !text-current !shadow-none hover:!bg-blue-100 dark:hover:!bg-blue-500/30"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3 w-3" />
              </LiquidIconButton>
            )}
          </span>
        ))}
        <LiquidInput
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => draft.trim() && addEntries(draft)}
          placeholder={values.length ? "" : placeholder}
          wrapperClassName="min-w-[140px] flex-1"
          className="!min-h-0 !rounded-lg !bg-transparent !bg-none !px-1 !py-1 text-sm !shadow-none outline-none"
        />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs">
        <span className="text-rose-600 dark:text-rose-300">{error}</span>
        {max ? (
          <span className="text-slate-500 dark:text-white/40">
            {values.length}/{max}
          </span>
        ) : null}
      </div>
    </div>
  );
}
