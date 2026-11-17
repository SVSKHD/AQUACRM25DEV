import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Edit2,
  FileUp,
  Eye,
  EyeOff,
  Info,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import TabInnerContent from "../Layout/tabInnerlayout";
import { useToast } from "../Toast";
import AquaGenericTable, {
  type AquaTableAction,
  type AquaTableColumn,
} from "../modular/invoices/invoiceTable";
import {
  LiquidBadge,
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
  LiquidInput,
  LiquidTextarea,
  SidebarRequestBanner,
  type RequestState,
} from "../ui/liquid";
import SidebarDialog from "../ui/SidebarDialog";
import EnvImportDialog from "../modular/settings/EnvImportDialog";
import type { ImportRunResult } from "../../utils/envImport";
import { useSettingsAccess } from "../../hooks/useSettingsAccess";
import {
  aquaEnvService,
  type EnvDeleteResult,
  type EnvSaveResult,
} from "../../services/aquaEnvService";
import {
  buildCreateBody,
  buildUpdateBody,
  deleteFallbackMessage,
  displayEnvValue,
  emptyEnvForm,
  envFormFromVariable,
  envStatusChips,
  normalizeKeyInput,
  validateEnvDescription,
  validateEnvKey,
  validateEnvValue,
  ENV_MAX_DESCRIPTION_LENGTH,
  type EnvForm,
  type EnvStatus,
  type EnvVariable,
} from "../../utils/aquaEnv";

// Settings → Environment: the backend's runtime configuration (encrypted
// "aqua-env" collection). Values are credentials: this screen never logs
// them, never keeps them in browser storage or URLs, and drops form state as
// soon as a dialog closes (the dialogs unmount).

export type SettingsView = "environment";

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const chipClass = {
  "Not readable":
    "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  "Not in effect":
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
} as Record<string, string>;

// Keeps password managers and autofill away from configuration values.
const noAutofill = {
  autoComplete: "off",
  spellCheck: false,
  autoCorrect: "off",
  autoCapitalize: "off",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

const canMaskTextarea = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("-webkit-text-security", "disc");

export default function SettingsTab({
  view = "environment",
}: {
  view?: SettingsView;
}) {
  const { canRead, canManage } = useSettingsAccess();

  if (canRead === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!canRead) return <SettingsNoAccess />;

  return view === "environment" ? (
    <EnvironmentSettings canManage={canManage === true} />
  ) : null;
}

export function SettingsNoAccess() {
  return (
    <TabInnerContent title="Settings">
      <div className="glass-card mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <Lock className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-600 dark:text-white/60">
          You need the <code className="font-mono">settings.read</code>{" "}
          permission to view environment settings.
        </p>
      </div>
    </TabInnerContent>
  );
}

type DialogState =
  { mode: "create" } | { mode: "edit"; variable: EnvVariable } | null;

function EnvironmentSettings({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast();
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deleting, setDeleting] = useState<EnvVariable | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await aquaEnvService.list();
    setLoading(false);
    if (response.error || !response.data) {
      setLoadError(response.error || "Couldn't load environment variables.");
      return;
    }
    setLoadError(null);
    setVariables(response.data.variables);
    setStatus(response.data.status);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSaved = (result: EnvSaveResult, created: boolean) => {
    setDialog(null);
    showToast(
      `${result.variable.key} ${created ? "created" : "updated"}`,
      "success",
    );
    setRestartNote(result.restartNote || null);
    void load();
  };

  // The import drawer stays open on its results; this refreshes the list.
  const handleImported = (result: ImportRunResult) => {
    const saved = result.outcomes.filter((outcome) => outcome.ok).length;
    showToast(
      `Imported ${saved} ${saved === 1 ? "variable" : "variables"}`,
      "success",
    );
    setRestartNote(result.restartNote || null);
    void load();
  };

  const handleDeleted = (result: EnvDeleteResult) => {
    setDeleting(null);
    showToast(
      `${result.key}: ${deleteFallbackMessage(result.fallback)}`,
      "success",
    );
    setRestartNote(result.restartNote || null);
    void load();
  };

  return (
    <>
      <EnvironmentView
        canManage={canManage}
        variables={variables}
        status={status}
        loading={loading}
        loadError={loadError}
        restartNote={restartNote}
        onDismissRestartNote={() => setRestartNote(null)}
        onRefresh={() => void load()}
        onCreate={() => setDialog({ mode: "create" })}
        onEdit={(variable) => setDialog({ mode: "edit", variable })}
        onDelete={setDeleting}
        onImport={() => setImporting(true)}
      />

      {canManage && importing && (
        <EnvImportDialog
          storedKeys={new Set(variables.map((variable) => variable.key))}
          onClose={() => setImporting(false)}
          onFinished={handleImported}
        />
      )}

      {canManage && dialog && (
        <EnvVariableDialog
          variable={dialog.mode === "edit" ? dialog.variable : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {canManage && deleting && (
        <EnvDeleteDialog
          variable={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

export type EnvironmentViewProps = {
  canManage: boolean;
  variables: EnvVariable[];
  status: EnvStatus | null;
  loading: boolean;
  loadError: string | null;
  restartNote: string | null;
  onDismissRestartNote: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (variable: EnvVariable) => void;
  onDelete: (variable: EnvVariable) => void;
  onImport: () => void;
};

/** Presentational page (no requests), so permission visibility is testable. */
export function EnvironmentView({
  canManage,
  variables,
  status,
  loading,
  loadError,
  restartNote,
  onDismissRestartNote,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
  onImport,
}: EnvironmentViewProps) {
  const failed = status?.lastLoad?.failed || [];

  const columns: AquaTableColumn<EnvVariable>[] = [
    {
      key: "key",
      header: "Key",
      render: (variable) => (
        <span className="font-mono text-[13px] font-semibold text-aqua-tx">
          {variable.key}
        </span>
      ),
      filterValue: (variable) => variable.key,
      sortValue: (variable) => variable.key,
    },
    {
      key: "value",
      header: "Value",
      render: (variable) => (
        <span
          className={`font-mono text-[13px] ${
            variable.readable
              ? "text-aqua-tx2"
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {displayEnvValue(variable)}
        </span>
      ),
      // Search is by key only; values are never matched.
      filterValue: () => "",
    },
    {
      key: "secret",
      header: "Type",
      render: (variable) =>
        variable.secret ? (
          <LiquidBadge className="bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
            Secret
          </LiquidBadge>
        ) : (
          <LiquidBadge>Plain</LiquidBadge>
        ),
      filterValue: () => "",
    },
    {
      key: "description",
      header: "Description",
      wrap: true,
      headerClassName: "min-w-[180px]",
      render: (variable) => (
        <span className="text-aqua-tx2">{variable.description || "—"}</span>
      ),
      filterValue: () => "",
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (variable) => (
        <span className="tabular-nums">
          {formatDateTime(variable.updatedAt)}
        </span>
      ),
      filterValue: () => "",
      sortValue: (variable) => variable.updatedAt || "",
    },
    {
      key: "status",
      header: "Status",
      render: (variable) => {
        const chips = envStatusChips(variable);
        return chips.length ? (
          <span className="flex flex-wrap gap-1">
            {chips.map((chip) => (
              <LiquidBadge key={chip} className={chipClass[chip]}>
                {chip}
              </LiquidBadge>
            ))}
          </span>
        ) : (
          <span className="text-aqua-tx3">In effect</span>
        );
      },
      filterValue: () => "",
    },
  ];

  const actions: AquaTableAction<EnvVariable>[] | undefined = canManage
    ? [
        {
          label: "Edit",
          icon: <Edit2 className="h-4 w-4" />,
          onClick: onEdit,
        },
        {
          label: "Delete",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: onDelete,
          tone: "danger",
        },
      ]
    : undefined;

  return (
    <div className="space-y-6">
      <TabInnerContent
        title="Environment"
        description="Backend configuration stored encrypted in the database (aqua-env)"
      >
        <div className="space-y-4 p-4 sm:p-5">
          {status && !status.keyConfigured && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <ShieldAlert
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p>
                Encryption key missing on server; values can&apos;t be saved or
                read.
              </p>
            </div>
          )}

          {failed.length > 0 && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="font-semibold">
                  {failed.length === 1
                    ? "1 variable failed to load at the last server start:"
                    : `${failed.length} variables failed to load at the last server start:`}
                </p>
                <p className="mt-1 break-words font-mono text-[13px]">
                  {failed.join(", ")}
                </p>
              </div>
            </div>
          )}

          {loadError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <p className="min-w-0">{loadError}</p>
              <LiquidButton type="button" variant="soft" onClick={onRefresh}>
                Try again
              </LiquidButton>
            </div>
          )}

          {restartNote && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1">{restartNote}</p>
              <LiquidIconButton
                type="button"
                onClick={onDismissRestartNote}
                aria-label="Dismiss restart note"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </LiquidIconButton>
            </div>
          )}

          <p className="text-xs text-aqua-tx3">
            Values apply to the running server right away; settings read at
            startup (Cloudinary, WhatsApp, MCP, scheduler, CORS) need a backend
            restart. Give <code className="font-mono">settings.manage</code>{" "}
            only to trusted admins: it controls credentials such as{" "}
            <code className="font-mono">JWT_SECRET</code>.
          </p>

          <AquaGenericTable
            heading="Variables"
            subHeading={
              canManage
                ? "Secret values are always masked; the server never sends them in full."
                : "Read-only: editing needs the settings.manage permission."
            }
            columns={columns}
            data={variables}
            isLoading={loading}
            getRowId={(variable) => variable.key}
            enableFilter
            filterPlaceholder="Search by key"
            emptyMessage="No variables stored yet"
            actionsLabel="Actions"
            actions={actions}
            headerActions={
              <div className="flex flex-wrap gap-2">
                <LiquidButton
                  type="button"
                  variant="soft"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </LiquidButton>
                {canManage && (
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={onImport}
                    disabled={status?.keyConfigured === false || loading}
                  >
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    Import .env
                  </LiquidButton>
                )}
                {canManage && (
                  <LiquidButton
                    type="button"
                    variant="primary"
                    onClick={onCreate}
                    disabled={status?.keyConfigured === false}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New variable
                  </LiquidButton>
                )}
              </div>
            }
          />
        </div>
      </TabInnerContent>
    </div>
  );
}

type FieldErrors = Partial<Record<"key" | "value" | "description", string>>;

const validateForm = (form: EnvForm, creating: boolean): FieldErrors => {
  const errors: FieldErrors = {};
  if (creating) {
    const keyError = validateEnvKey(form.key);
    if (keyError) errors.key = keyError;
  }
  const valueError = validateEnvValue(form.value, creating);
  if (valueError) errors.value = valueError;
  const descriptionError = validateEnvDescription(form.description);
  if (descriptionError) errors.description = descriptionError;
  return errors;
};

export function EnvVariableDialog({
  variable,
  onClose,
  onSaved,
}: {
  /** null = create */
  variable: EnvVariable | null;
  onClose: () => void;
  onSaved: (result: EnvSaveResult, created: boolean) => void;
}) {
  const creating = variable === null;
  const [form, setForm] = useState<EnvForm>(() =>
    variable ? envFormFromVariable(variable) : emptyEnvForm(),
  );
  const [showValue, setShowValue] = useState(false);
  const [multiline, setMultiline] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const busy = requestState === "loading";
  const errors = validateForm(form, creating);
  const visibleErrors: FieldErrors = submitted
    ? errors
    : {
        key: form.key ? errors.key : undefined,
        value: errors.value,
        description: errors.description,
      };
  const maskTextarea = form.secret && !showValue;
  const textareaMaskSupported = canMaskTextarea();

  const update = (patch: Partial<EnvForm>) =>
    setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(validateForm(form, creating)).length) return;
    const body = creating
      ? buildCreateBody(form)
      : buildUpdateBody(variable as EnvVariable, form);
    if (!body) {
      setRequestState("error");
      setRequestError("Nothing changed.");
      setConflict(false);
      return;
    }
    setRequestState("loading");
    setRequestError(null);
    setConflict(false);
    const response = await aquaEnvService.save(form.key, body);
    if (response.error || !response.data) {
      setRequestState("error");
      setRequestError(response.error || "Save failed.");
      setConflict(response.status === 409 || response.code === "CONFLICT");
      return;
    }
    setRequestState("success");
    onSaved(response.data, creating);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy) void submit();
  };

  const valueLabel = creating ? "Value" : "New value";
  const valueHint = creating
    ? "Saved exactly as typed (spaces and line breaks are kept)."
    : "Leave empty to keep the current value.";

  return (
    <SidebarDialog
      open
      onClose={onClose}
      busy={busy}
      title={creating ? "New variable" : `Edit ${variable?.key}`}
      description={
        creating
          ? "Stored encrypted in aqua-env and applied to the running server."
          : "Only the fields you change are sent."
      }
      widthStorageKey="aquacrm:env-variable-width"
      footer={
        <>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </LiquidButton>
          <LiquidButton
            type="submit"
            form="env-variable-form"
            variant="primary"
            disabled={busy}
            requestState={busy ? "loading" : "idle"}
            loadingLabel="Saving..."
          >
            {creating ? "Create variable" : "Save changes"}
          </LiquidButton>
        </>
      }
    >
      <form
        id="env-variable-form"
        className="space-y-5"
        onSubmit={onSubmit}
        noValidate
      >
        <SidebarRequestBanner
          state={requestState}
          message={requestError}
          title={creating ? "Couldn't create the variable" : "Couldn't save"}
          onDismiss={() => {
            setRequestState("idle");
            setRequestError(null);
            setConflict(false);
          }}
        />
        {conflict && (
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => void submit()}
            disabled={busy}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </LiquidButton>
        )}

        {creating ? (
          <div>
            <LiquidInput
              label="Key"
              value={form.key}
              onChange={(event) =>
                update({ key: normalizeKeyInput(event.target.value) })
              }
              placeholder="SMTP_PASSWORD"
              maxLength={100}
              className="font-mono"
              aria-invalid={Boolean(visibleErrors.key) || undefined}
              aria-describedby="env-key-hint"
              {...noAutofill}
            />
            <p
              id="env-key-hint"
              className={`mt-1 text-xs ${
                visibleErrors.key
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-aqua-tx3"
              }`}
            >
              {visibleErrors.key ||
                "Capital letters, digits and underscores; starts with a letter."}
            </p>
          </div>
        ) : (
          variable && (
            <div className="rounded-xl border border-aqua-line p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-aqua-tx3">
                Current value
              </p>
              <p className="mt-1 break-all font-mono text-aqua-tx">
                {displayEnvValue(variable)}
              </p>
              {variable.secret && (
                <p className="mt-1 text-xs text-aqua-tx3">
                  Secret values can&apos;t be shown. Type a new value to replace
                  it.
                </p>
              )}
            </div>
          )
        )}

        <div>
          <div className="flex items-end gap-2">
            {multiline ? (
              <LiquidTextarea
                label={valueLabel}
                value={form.value}
                onChange={(event) => update({ value: event.target.value })}
                rows={8}
                wrapperClassName="min-w-0 flex-1"
                className={`font-mono ${maskTextarea ? "env-value-masked" : ""}`}
                aria-invalid={Boolean(visibleErrors.value) || undefined}
                aria-describedby="env-value-hint"
                {...noAutofill}
              />
            ) : (
              <LiquidInput
                label={valueLabel}
                type={form.secret && !showValue ? "password" : "text"}
                value={form.value}
                onChange={(event) => update({ value: event.target.value })}
                wrapperClassName="min-w-0 flex-1"
                className="font-mono"
                aria-invalid={Boolean(visibleErrors.value) || undefined}
                aria-describedby="env-value-hint"
                {...noAutofill}
                autoComplete={form.secret ? "new-password" : "off"}
              />
            )}
            {form.secret && (
              <LiquidIconButton
                type="button"
                onClick={() => setShowValue((current) => !current)}
                aria-label={showValue ? "Hide typed value" : "Show typed value"}
                aria-pressed={showValue}
                title={showValue ? "Hide typed value" : "Show typed value"}
              >
                {showValue ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </LiquidIconButton>
            )}
          </div>
          <p
            id="env-value-hint"
            className={`mt-1 text-xs ${
              visibleErrors.value
                ? "text-rose-700 dark:text-rose-300"
                : "text-aqua-tx3"
            }`}
          >
            {visibleErrors.value || valueHint}
          </p>
          {multiline && maskTextarea && !textareaMaskSupported && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              This browser can&apos;t hide multi-line text; make sure no one is
              looking at your screen.
            </p>
          )}
          <LiquidCheckbox
            label="Multi-line value (e.g. FIREBASE_PRIVATE_KEY)"
            checked={multiline}
            onChange={(event) => setMultiline(event.target.checked)}
            wrapperClassName="mt-2"
          />
        </div>

        <div>
          <LiquidCheckbox
            label="Secret (value is masked everywhere after saving)"
            checked={form.secret}
            onChange={(event) => update({ secret: event.target.checked })}
          />
          {!creating && variable?.secret && !form.secret && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              After saving, the stored value is shown in plain text to everyone
              with settings.read.
            </p>
          )}
        </div>

        <div>
          <LiquidTextarea
            label="Description"
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
            rows={2}
            maxLength={ENV_MAX_DESCRIPTION_LENGTH}
            placeholder="What this is for (no secrets here)"
            aria-describedby="env-description-hint"
          />
          <p
            id="env-description-hint"
            className={`mt-1 text-xs ${
              visibleErrors.description
                ? "text-rose-700 dark:text-rose-300"
                : "text-aqua-tx3"
            }`}
          >
            {visibleErrors.description ||
              `${form.description.length}/${ENV_MAX_DESCRIPTION_LENGTH}`}
          </p>
        </div>
      </form>
    </SidebarDialog>
  );
}

function EnvDeleteDialog({
  variable,
  onClose,
  onDeleted,
}: {
  variable: EnvVariable;
  onClose: () => void;
  onDeleted: (result: EnvDeleteResult) => void;
}) {
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const busy = requestState === "loading";

  const remove = async () => {
    setRequestState("loading");
    setRequestError(null);
    setConflict(false);
    const response = await aquaEnvService.remove(variable.key);
    if (response.error || !response.data) {
      setRequestState("error");
      setRequestError(response.error || "Delete failed.");
      setConflict(response.status === 409 || response.code === "CONFLICT");
      return;
    }
    setRequestState("success");
    onDeleted(response.data);
  };

  return (
    <SidebarDialog
      open
      onClose={onClose}
      busy={busy}
      size="sm"
      title={`Delete ${variable.key}?`}
      widthStorageKey="aquacrm:env-delete-width"
      footer={
        <>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="danger"
            onClick={() => void remove()}
            disabled={busy}
            requestState={busy ? "loading" : "idle"}
            loadingLabel="Deleting..."
          >
            {conflict ? "Try again" : "Delete"}
          </LiquidButton>
        </>
      }
    >
      <div className="space-y-4 text-sm text-aqua-tx2">
        <SidebarRequestBanner
          state={requestState}
          message={requestError}
          title="Couldn't delete"
          onDismiss={() => {
            setRequestState("idle");
            setRequestError(null);
          }}
        />
        <p>
          <span className="font-mono font-semibold text-aqua-tx">
            {variable.key}
          </span>{" "}
          will be removed from aqua-env. If the server has its own environment
          value for it, the server switches to that; otherwise the variable is
          removed from the running server.
        </p>
      </div>
    </SidebarDialog>
  );
}
