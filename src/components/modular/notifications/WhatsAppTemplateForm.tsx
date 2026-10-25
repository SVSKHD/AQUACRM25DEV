import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import NotifyOperations, {
  type WhatsAppStatus,
  type WhatsAppTemplate,
} from "../../../services/notify";
import {
  fillVariables,
  renderTemplate,
  type TemplateSelection,
} from "./templateUtils";

const fieldClass =
  "w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white dark:bg-white/5 text-black dark:text-white text-sm";
const labelClass =
  "block text-sm font-medium text-black dark:text-white/60 mb-2";
const MANUAL = "__manual__";

// Templates and provider status rarely change; share one load per session.
let templatesPromise: Promise<{
  templates: WhatsAppTemplate[];
  error?: string;
  status: WhatsAppStatus;
}> | null = null;

const loadTemplates = () => {
  if (!templatesPromise) {
    templatesPromise = Promise.all([
      NotifyOperations.getTemplates(),
      NotifyOperations.getStatus(),
    ]).then(([result, status]) => {
      if (result.error) templatesPromise = null;
      return { ...result, status };
    });
  }
  return templatesPromise;
};

interface WhatsAppTemplateFormProps {
  value: TemplateSelection;
  onChange: (value: TemplateSelection) => void;
  /** Used to preview {name}; bulk sends fill it per customer. */
  previewName?: string;
  onTemplateChange?: (template: WhatsAppTemplate | undefined) => void;
}

export default function WhatsAppTemplateForm({
  value,
  onChange,
  previewName,
  onTemplateChange,
}: WhatsAppTemplateFormProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let active = true;
    loadTemplates().then((result) => {
      if (!active) return;
      setTemplates(result.templates);
      setStatus(result.status);
      setLoadError(result.error || "");
      setManual(!result.templates.length);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const template = manual
    ? undefined
    : templates.find((item) => item.messageId === value.messageId);

  useEffect(() => {
    onTemplateChange?.(template);
  }, [template, onTemplateChange]);

  const selectTemplate = (messageId: string) => {
    if (messageId === MANUAL) {
      setManual(true);
      onChange({ messageId: "", variables: [] });
      return;
    }
    setManual(false);
    const next = templates.find((item) => item.messageId === messageId);
    onChange({
      messageId,
      // Variable 1 is usually the customer's name.
      variables: Array.from(
        { length: next?.variableCount || 0 },
        (_, index) => value.variables[index] ?? (index === 0 ? "{name}" : ""),
      ),
    });
  };

  const setVariable = (index: number, text: string) => {
    const variables = Array.from(
      { length: Math.max(value.variables.length, index + 1) },
      (_, item) => value.variables[item] ?? "",
    );
    variables[index] = text;
    onChange({ ...value, variables });
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading approved WhatsApp
        templates…
      </p>
    );
  }

  const variableCount = template
    ? template.variableCount
    : value.variables.length;
  const preview = renderTemplate(
    template,
    fillVariables(value.variables, { name: previewName }),
  );

  return (
    <div className="space-y-4">
      {status && !status.configured && status.missing.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          WhatsApp sending isn't fully configured on the server (missing{" "}
          {status.missing.join(", ")}). Sends may fail.
        </p>
      )}
      {loadError && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-white/60">
          Couldn't load templates ({loadError}). Enter an approved template's
          message ID instead.
        </p>
      )}

      <div>
        <label className={labelClass}>WhatsApp template</label>
        {templates.length > 0 && (
          <select
            value={manual ? MANUAL : value.messageId}
            onChange={(event) => selectTemplate(event.target.value)}
            className={fieldClass}
          >
            <option value="">Choose an approved template…</option>
            {templates.map((item) => (
              <option key={item.messageId} value={item.messageId}>
                {item.name} ({item.messageId})
              </option>
            ))}
            <option value={MANUAL}>Enter a message ID manually…</option>
          </select>
        )}
        {manual && (
          <input
            value={value.messageId}
            onChange={(event) =>
              onChange({ ...value, messageId: event.target.value.trim() })
            }
            placeholder="Approved Fast2SMS message ID, e.g. 4521"
            className={`${fieldClass} ${templates.length ? "mt-2" : ""}`}
          />
        )}
        <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
          WhatsApp only allows business-initiated messages that use an approved
          template.
        </p>
      </div>

      {variableCount > 0 && (
        <div className="space-y-2">
          <label className={labelClass}>
            Template variables{" "}
            <span className="font-normal text-slate-400">
              · use {"{name}"} for each customer's name
            </span>
          </label>
          {Array.from({ length: variableCount }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs font-mono text-slate-500">{`{{${index + 1}}}`}</span>
              <input
                value={value.variables[index] ?? ""}
                onChange={(event) => setVariable(index, event.target.value)}
                className={fieldClass}
              />
              {manual && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      variables: value.variables.filter(
                        (_, item) => item !== index,
                      ),
                    })
                  }
                  className="rounded p-1 text-slate-400 hover:text-rose-600"
                  aria-label={`Remove variable ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {manual && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              variables: [
                ...value.variables,
                value.variables.length ? "" : "{name}",
              ],
            })
          }
          className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline dark:text-green-400"
        >
          <Plus className="h-4 w-4" /> Add variable
        </button>
      )}

      {preview && (
        <div>
          <label className={labelClass}>Preview</label>
          <div className="whitespace-pre-wrap rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-neutral-900 dark:border-green-500/20 dark:bg-green-500/10 dark:text-white">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}
