import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Eye, EyeOff, FileUp, RefreshCw, Square } from "lucide-react";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidFileButton,
  LiquidIconButton,
  LiquidTextarea,
} from "../../ui/liquid";
import SidebarDialog from "../../ui/SidebarDialog";
import { aquaEnvService } from "../../../services/aquaEnvService";
import {
  ENV_FILE_MAX_BYTES,
  parseEnvFile,
  planEnvImport,
  runEnvImport,
  type ImportOutcome,
  type ImportRow,
  type ImportRunResult,
  type ParsedEnvEntry,
} from "../../../utils/envImport";

// Settings → Environment → Import .env. Paste a .env or pick the file; it is
// parsed in the browser (same rules as the backend's `npm run env:import`),
// reviewed, then saved one variable at a time through PUT /crm/env/:key.
// The text stays in this component's memory only and is dropped on close.

type Step = "source" | "review" | "running" | "done";

const ACTION_LABEL: Record<ImportRow["action"], string> = {
  add: "New",
  replace: "Replace",
  keep: "Kept",
  skip: "Skipped",
};

const ACTION_CLASS: Record<ImportRow["action"], string> = {
  add: "text-emerald-700 dark:text-emerald-300",
  replace: "text-amber-700 dark:text-amber-300",
  keep: "text-aqua-tx3",
  skip: "text-aqua-tx3",
};

const previewValue = (row: ImportRow) => {
  const lines = row.value.split("\n").length;
  const size = `${row.value.length} chars${lines > 1 ? `, ${lines} lines` : ""}`;
  if (row.secret || lines > 1) return `•••• (${size})`;
  return row.value.length > 60 ? `${row.value.slice(0, 60)}…` : row.value;
};

export default function EnvImportDialog({
  storedKeys,
  onClose,
  onFinished,
}: {
  storedKeys: ReadonlySet<string>;
  onClose: () => void;
  /** Called after a run that saved at least one variable. */
  onFinished: (result: ImportRunResult) => void;
}) {
  const [step, setStep] = useState<Step>("source");
  const [text, setText] = useState("");
  const [showText, setShowText] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [entries, setEntries] = useState<ParsedEnvEntry[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  // Per-key choices survive toggling "Replace stored values".
  const [secretChoice, setSecretChoice] = useState<Record<string, boolean>>({});
  const [selectedChoice, setSelectedChoice] = useState<Record<string, boolean>>(
    {},
  );
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportRunResult | null>(null);
  const stopRef = useRef(false);
  const running = step === "running";

  const rows = useMemo(
    () =>
      planEnvImport(entries, storedKeys, overwrite).map((row) => {
        const importable = row.action === "add" || row.action === "replace";
        return {
          ...row,
          secret: secretChoice[row.key] ?? row.secret,
          selected: importable && (selectedChoice[row.key] ?? row.selected),
        };
      }),
    [entries, storedKeys, overwrite, secretChoice, selectedChoice],
  );

  const counts = useMemo(() => {
    const byAction = { add: 0, replace: 0, keep: 0, skip: 0 };
    rows.forEach((row) => (byAction[row.action] += 1));
    return {
      ...byAction,
      selected: rows.filter((row) => row.selected).length,
    };
  }, [rows]);

  const review = (source: string, name: string | null) => {
    const parsed = parseEnvFile(source);
    if (!parsed.entries.length) {
      setSourceError(
        "No KEY=value lines found. Paste the contents of a .env file.",
      );
      return;
    }
    setSourceError(null);
    setFileName(name);
    setEntries(parsed.entries);
    setDuplicates(parsed.duplicates);
    setSecretChoice({});
    setSelectedChoice({});
    setStep("review");
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow picking the same file again; don't keep a reference to it.
    event.target.value = "";
    if (!file) return;
    if (file.size > ENV_FILE_MAX_BYTES) {
      setSourceError("That file is larger than 1 MB; is it really a .env?");
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      review(content, file.name);
    } catch {
      setSourceError("Couldn't read that file.");
    }
  };

  const start = async (subset?: ImportRow[]) => {
    const todo = (subset || rows).filter((row) => row.selected);
    if (!todo.length) return;
    stopRef.current = false;
    setProgress({ done: 0, total: todo.length });
    setStep("running");
    const run = await runEnvImport(
      todo,
      (key, body) => aquaEnvService.save(key, body),
      {
        onProgress: (done, total) => setProgress({ done, total }),
        shouldStop: () => stopRef.current,
      },
    );
    // Retrying failed rows: merge with the earlier successes.
    const merged: ImportRunResult =
      subset && result
        ? {
            ...run,
            outcomes: [
              ...result.outcomes.filter(
                (outcome) => !run.outcomes.some((o) => o.key === outcome.key),
              ),
              ...run.outcomes,
            ],
            restartNote: run.restartNote || result.restartNote,
          }
        : run;
    setResult(merged);
    setStep("done");
    if (run.outcomes.some((outcome) => outcome.ok)) onFinished(merged);
  };

  const failed: ImportOutcome[] = result
    ? result.outcomes.filter((outcome) => !outcome.ok)
    : [];
  const saved = result ? result.outcomes.filter((o) => o.ok).length : 0;
  const notRun = result
    ? rows.filter(
        (row) =>
          row.selected && !result.outcomes.some((o) => o.key === row.key),
      )
    : [];

  const retry = () => {
    const keys = new Set([
      ...failed.map((outcome) => outcome.key),
      ...notRun.map((row) => row.key),
    ]);
    void start(rows.filter((row) => keys.has(row.key)));
  };

  const footer =
    step === "source" ? (
      <>
        <LiquidButton type="button" variant="soft" onClick={onClose}>
          Cancel
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="primary"
          onClick={() => review(text, null)}
          disabled={!text.trim()}
        >
          Review variables
        </LiquidButton>
      </>
    ) : step === "review" ? (
      <>
        <LiquidButton
          type="button"
          variant="soft"
          onClick={() => setStep("source")}
        >
          Back
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="primary"
          onClick={() => void start()}
          disabled={counts.selected === 0}
        >
          Import {counts.selected}{" "}
          {counts.selected === 1 ? "variable" : "variables"}
        </LiquidButton>
      </>
    ) : step === "running" ? (
      <LiquidButton
        type="button"
        variant="soft"
        onClick={() => {
          stopRef.current = true;
        }}
      >
        <Square className="h-4 w-4" aria-hidden="true" />
        Stop after this one
      </LiquidButton>
    ) : (
      <>
        {(failed.length > 0 || notRun.length > 0) && (
          <LiquidButton type="button" variant="soft" onClick={retry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry {failed.length + notRun.length} not saved
          </LiquidButton>
        )}
        <LiquidButton type="button" variant="primary" onClick={onClose}>
          Done
        </LiquidButton>
      </>
    );

  return (
    <SidebarDialog
      open
      onClose={onClose}
      busy={running}
      size="lg"
      title="Import .env"
      description="Paste or upload a .env file; each variable is saved encrypted in aqua-env."
      widthStorageKey="aquacrm:env-import-width"
      footer={footer}
    >
      {step === "source" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <LiquidFileButton
              id="env-import-file"
              variant="soft"
              onChange={(event) => void onFile(event)}
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Choose .env file
            </LiquidFileButton>
            <span className="text-xs text-aqua-tx3">
              or paste its contents below
            </span>
          </div>
          <div className="flex items-start gap-2">
            <LiquidTextarea
              label=".env contents"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setSourceError(null);
              }}
              rows={12}
              placeholder={"SMTP_HOST=smtp.example.com\nSMTP_PASSWORD=..."}
              wrapperClassName="min-w-0 flex-1"
              className={`font-mono text-[13px] ${showText ? "" : "env-value-masked"}`}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              data-1p-ignore="true"
              data-lpignore="true"
            />
            <LiquidIconButton
              type="button"
              className="mt-7"
              onClick={() => setShowText((current) => !current)}
              aria-label={showText ? "Hide pasted text" : "Show pasted text"}
              aria-pressed={showText}
              title={showText ? "Hide pasted text" : "Show pasted text"}
            >
              {showText ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </LiquidIconButton>
          </div>
          {sourceError && (
            <p
              role="alert"
              className="text-sm text-rose-700 dark:text-rose-300"
            >
              {sourceError}
            </p>
          )}
          <p className="text-xs text-aqua-tx3">
            Read in your browser only; nothing is sent until you press Import.
            DB_URL, AQUA_ENV_ENCRYPTION_KEY and other server-only names are
            skipped. Same rules as the backend&apos;s{" "}
            <code className="font-mono">npm run env:import</code>.
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <p className="text-sm text-aqua-tx2">
            {fileName ? (
              <>
                <span className="font-mono">{fileName}</span>:{" "}
              </>
            ) : null}
            {counts.add} new · {counts.replace} to replace · {counts.keep}{" "}
            already stored · {counts.skip} skipped
          </p>
          {duplicates.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Listed more than once (the last value is used):{" "}
              <span className="font-mono">{duplicates.join(", ")}</span>
            </p>
          )}
          <LiquidCheckbox
            label="Replace stored values (keys already in aqua-env)"
            checked={overwrite}
            onChange={(event) => setOverwrite(event.target.checked)}
          />
          {overwrite && counts.replace > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Replacing changes the live backend&apos;s configuration. Replaced
              keys keep their Secret setting and description.
            </p>
          )}

          <div className="aqua-table-card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-aqua-tx3">
                  <th className="px-3 py-2 font-semibold">Import</th>
                  <th className="px-3 py-2 font-semibold">Key</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                  <th className="px-3 py-2 font-semibold">Secret</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const importable =
                    row.action === "add" || row.action === "replace";
                  return (
                    <tr key={row.key} className="border-t border-aqua-line">
                      <td className="px-3 py-2 align-top">
                        {importable ? (
                          <LiquidCheckbox
                            ariaLabel={`Import ${row.key}`}
                            checked={row.selected}
                            onChange={(event) =>
                              setSelectedChoice((current) => ({
                                ...current,
                                [row.key]: event.target.checked,
                              }))
                            }
                          />
                        ) : (
                          <span className="text-aqua-tx3">—</span>
                        )}
                      </td>
                      <td className="break-all px-3 py-2 align-top font-mono text-[13px] text-aqua-tx">
                        {row.key}
                      </td>
                      <td className="break-all px-3 py-2 align-top font-mono text-[13px] text-aqua-tx2">
                        {previewValue(row)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {row.action === "add" ? (
                          <LiquidCheckbox
                            ariaLabel={`Store ${row.key} as secret`}
                            checked={row.secret}
                            onChange={(event) =>
                              setSecretChoice((current) => ({
                                ...current,
                                [row.key]: event.target.checked,
                              }))
                            }
                          />
                        ) : (
                          <span className="text-xs text-aqua-tx3">
                            {row.action === "replace" ? "unchanged" : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`font-semibold ${ACTION_CLASS[row.action]}`}
                        >
                          {ACTION_LABEL[row.action]}
                        </span>
                        {row.reason && (
                          <span className="block text-xs text-aqua-tx3">
                            {row.reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-aqua-tx3">
            Secret is pre-ticked from the variable name (like the backend
            import); untick only values that are safe for every settings.read
            user to see.
          </p>
        </div>
      )}

      {step === "running" && (
        <div className="space-y-3" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-aqua-tx">
            Saving {Math.min(progress.done + 1, progress.total)} of{" "}
            {progress.total}…
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-aqua-sunk">
            <div
              className="h-full bg-emerald-500 transition-[width]"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-aqua-tx3">
            Keep this panel open until it finishes.
          </p>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4" role="status">
          <p className="text-sm font-semibold text-aqua-tx">
            Saved {saved} of {result.outcomes.length + notRun.length}.
          </p>
          {result.stoppedReason && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {result.stoppedReason}
              {notRun.length > 0 && ` ${notRun.length} not attempted.`}
            </p>
          )}
          {failed.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <p className="font-semibold">Not saved:</p>
              <ul className="mt-1 space-y-1">
                {failed.map((outcome) => (
                  <li key={outcome.key}>
                    <span className="font-mono">{outcome.key}</span>:{" "}
                    {outcome.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.restartNote && saved > 0 && (
            <p className="text-xs text-aqua-tx3">{result.restartNote}</p>
          )}
          {saved > 0 && (
            <p className="text-xs text-aqua-tx3">
              Once everything is imported, the copied keys can be removed from
              the server&apos;s .env, keeping only DB_URL and
              AQUA_ENV_ENCRYPTION_KEY.
            </p>
          )}
        </div>
      )}
    </SidebarDialog>
  );
}
