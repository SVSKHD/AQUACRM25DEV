import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import NotifyOperations, {
  type WhatsAppStatus,
  type WhatsAppTemplate,
} from "../../../services/notify";
import {
  LiquidButton,
  LiquidIconButton,
  LiquidInput,
  LiquidSelect,
} from "../../ui/liquid";
import {
  fillVariables,
  renderTemplate,
  type TemplateSelection,
} from "./templateUtils";

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
  const fieldId = useId();
  const selectId = `${fieldId}-template`;
  const manualId = `${fieldId}-message-id`;
  const variablesLabelId = `${fieldId}-variables`;

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
        <label
          htmlFor={templates.length > 0 ? selectId : manualId}
          className={labelClass}
        >
          WhatsApp template
        </label>
        {templates.length > 0 && (
          <LiquidSelect
            id={selectId}
            value={manual ? MANUAL : value.messageId}
            onChange={(event) => selectTemplate(event.target.value)}
          >
            <option value="">Choose an approved template…</option>
            {templates.map((item) => (
              <option key={item.messageId} value={item.messageId}>
                {item.name} ({item.messageId})
              </option>
            ))}
            <option value={MANUAL}>Enter a message ID manually…</option>
          </LiquidSelect>
        )}
        {manual && (
          <LiquidInput
            id={manualId}
            aria-label={
              templates.length > 0 ? "WhatsApp template message ID" : undefined
            }
            value={value.messageId}
            onChange={(event) =>
              onChange({ ...value, messageId: event.target.value.trim() })
            }
            placeholder="Approved Fast2SMS message ID, e.g. 4521"
            wrapperClassName={templates.length ? "mt-2" : ""}
          />
        )}
        <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
          WhatsApp only allows business-initiated messages that use an approved
          template.
        </p>
      </div>

      {variableCount > 0 && (
        <div
          className="space-y-2"
          role="group"
          aria-labelledby={variablesLabelId}
        >
          <p id={variablesLabelId} className={labelClass}>
            Template variables{" "}
            <span className="font-normal text-slate-400">
              · use {"{name}"} for each customer's name
            </span>
          </p>
          {Array.from({ length: variableCount }, (_, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-12 shrink-0 text-xs font-mono text-slate-500"
              >{`{{${index + 1}}}`}</span>
              <LiquidInput
                aria-label={`Template variable ${index + 1}`}
                value={value.variables[index] ?? ""}
                onChange={(event) => setVariable(index, event.target.value)}
                wrapperClassName="min-w-0 flex-1"
              />
              {manual && (
                <LiquidIconButton
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
                </LiquidIconButton>
              )}
            </div>
          ))}
        </div>
      )}
      {manual && (
        <LiquidButton
          type="button"
          variant="ghost"
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
        </LiquidButton>
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
