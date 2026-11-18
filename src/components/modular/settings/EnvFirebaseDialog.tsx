import { useMemo, useState, type ChangeEvent } from "react";
import { FileKey2, RefreshCw } from "lucide-react";
import {
  LiquidButton,
  LiquidCheckbox,
  LiquidFileButton,
} from "../../ui/liquid";
import SidebarDialog from "../../ui/SidebarDialog";
import { aquaEnvService } from "../../../services/aquaEnvService";
import { displayEnvValue, type EnvVariable } from "../../../utils/aquaEnv";
import {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
  SERVICE_ACCOUNT_MAX_BYTES,
  isPartialFirebaseSave,
  parseServiceAccount,
  planFirebaseSetup,
  runFirebaseSetup,
  type FirebaseRunResult,
  type FirebaseStep,
  type ServiceAccount,
} from "../../../utils/firebaseServiceAccount";

// Settings → Environment → Firebase service account. Reads the service-account
// JSON in the browser, shows what will be stored, then saves
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (and
// deletes a stored GOOGLE_APPLICATION_CREDENTIALS) one request at a time.
// The file contents live only in this component and are dropped on close.

type Step = "file" | "review" | "running" | "done";

const ROW_LABEL: Record<string, string> = {
  [FIREBASE_PROJECT_ID]: "Project ID",
  [FIREBASE_CLIENT_EMAIL]: "Client email",
  [FIREBASE_PRIVATE_KEY]: "Private key",
  [GOOGLE_APPLICATION_CREDENTIALS]: "Remove GOOGLE_APPLICATION_CREDENTIALS",
};

const keyPreview = (account: ServiceAccount) =>
  `Private key, ${account.privateKey.length} characters${
    account.privateKeyId
      ? `, key ID ending …${account.privateKeyId.slice(-4)}`
      : ""
  }`;

export default function EnvFirebaseDialog({
  variables,
  onClose,
  onFinished,
}: {
  variables: readonly EnvVariable[];
  onClose: () => void;
  /** Called after a run that changed at least one variable. */
  onFinished: (result: FirebaseRunResult) => void;
}) {
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [account, setAccount] = useState<ServiceAccount | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [removeGoogleCredentials, setRemoveGoogleCredentials] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<FirebaseRunResult | null>(null);
  const [failedSteps, setFailedSteps] = useState<FirebaseStep[]>([]);
  const running = step === "running";

  const stored = useMemo(
    () => new Map(variables.map((variable) => [variable.key, variable])),
    [variables],
  );
  const hasGoogleCredentials = stored.has(GOOGLE_APPLICATION_CREDENTIALS);
  const steps = useMemo(
    () =>
      account
        ? planFirebaseSetup(account, variables, { removeGoogleCredentials })
        : [],
    [account, variables, removeGoogleCredentials],
  );
  const replacing = steps.some((item) => item.kind === "save" && item.replaces);
  const canSave = steps.length > 0 && (!replacing || confirmReplace);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > SERVICE_ACCOUNT_MAX_BYTES) {
      setErrors([
        "That file is larger than 64 KB; a service-account file is about 2 KB.",
      ]);
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      setErrors(["Couldn't read that file."]);
      return;
    }
    const parsed = parseServiceAccount(content);
    if (parsed.errors) {
      setAccount(null);
      setErrors(parsed.errors);
      return;
    }
    setErrors([]);
    setFileName(file.name);
    setAccount(parsed.account);
    setWarnings(parsed.warnings);
    setConfirmReplace(false);
    setStep("review");
  };

  const run = async (toRun: FirebaseStep[]) => {
    if (!toRun.length) return;
    setProgress({ done: 0, total: toRun.length });
    setStep("running");
    const run = await runFirebaseSetup(
      toRun,
      {
        save: (key, body) => aquaEnvService.save(key, body),
        remove: (key) => aquaEnvService.remove(key),
      },
      (done, total) => setProgress({ done, total }),
    );
    // On a retry, keep the earlier successes.
    const merged: FirebaseRunResult = result
      ? {
          ...run,
          outcomes: [
            ...result.outcomes.filter(
              (outcome) =>
                outcome.ok && !run.outcomes.some((o) => o.key === outcome.key),
            ),
            ...run.outcomes,
          ],
          restartNote: run.restartNote || result.restartNote,
          serverStillHasGoogleCredentials:
            run.serverStillHasGoogleCredentials ||
            result.serverStillHasGoogleCredentials,
        }
      : run;
    const failedIndex = run.outcomes.findIndex((outcome) => !outcome.ok);
    setFailedSteps(failedIndex >= 0 ? toRun.slice(failedIndex) : []);
    setResult(merged);
    setStep("done");
    if (run.outcomes.some((outcome) => outcome.ok)) onFinished(merged);
  };

  const failed = result?.outcomes.filter((outcome) => !outcome.ok) || [];
  const partial = result ? isPartialFirebaseSave(result) : false;
  const savedKey = result?.outcomes.some(
    (outcome) => outcome.ok && outcome.key !== GOOGLE_APPLICATION_CREDENTIALS,
  );

  const footer =
    step === "file" ? (
      <LiquidButton type="button" variant="soft" onClick={onClose}>
        Cancel
      </LiquidButton>
    ) : step === "review" ? (
      <>
        <LiquidButton
          type="button"
          variant="soft"
          onClick={() => {
            setAccount(null);
            setStep("file");
          }}
        >
          Choose another file
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="primary"
          onClick={() => void run(steps)}
          disabled={!canSave}
        >
          Save to Environment
        </LiquidButton>
      </>
    ) : step === "running" ? null : (
      <>
        {failedSteps.length > 0 && (
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => void run(failedSteps)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry {failedSteps.length} not saved
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
      title="Firebase service account"
      description="Turns the service-account .json file into FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
      widthStorageKey="aquacrm:env-firebase-width"
      footer={footer}
    >
      {step === "file" && (
        <div className="space-y-4 text-sm text-aqua-tx2">
          <p>
            In the Firebase console open{" "}
            <strong>
              Project settings → Service accounts → Generate new private key
            </strong>
            , then choose the downloaded .json file here.
          </p>
          <LiquidFileButton
            id="env-firebase-file"
            variant="primary"
            accept="application/json,.json"
            onChange={(event) => void onFile(event)}
          >
            <FileKey2 className="h-4 w-4" aria-hidden="true" />
            Choose service-account file
          </LiquidFileButton>
          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <p className="font-semibold">This file can&apos;t be used:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-aqua-tx3">
            Read in your browser only; nothing is sent until you press Save.
            Only the three values are stored; the file&apos;s other fields are
            not.
          </p>
        </div>
      )}

      {step === "review" && account && (
        <div className="space-y-4 text-sm">
          {fileName && (
            <p className="break-all text-aqua-tx3">
              File: <span className="font-mono">{fileName}</span>
            </p>
          )}
          {warnings.map((warning) => (
            <p
              key={warning}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              {warning}
            </p>
          ))}

          <dl className="divide-y divide-aqua-line rounded-xl border border-aqua-line">
            {[
              {
                key: FIREBASE_PROJECT_ID,
                next: account.projectId,
                kind: "Plain",
              },
              {
                key: FIREBASE_CLIENT_EMAIL,
                next: account.clientEmail,
                kind: "Plain",
              },
              {
                key: FIREBASE_PRIVATE_KEY,
                next: keyPreview(account),
                kind: "Secret",
              },
            ].map((row) => {
              const current = stored.get(row.key);
              return (
                <div key={row.key} className="space-y-1 p-3">
                  <dt className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold text-aqua-tx">
                      {row.key}
                    </span>
                    <span className="text-xs text-aqua-tx3">
                      {row.kind} · {current ? "Replace" : "New"}
                    </span>
                  </dt>
                  <dd className="break-all font-mono text-[13px] text-aqua-tx">
                    {row.next}
                  </dd>
                  {current && (
                    <dd className="break-all text-xs text-aqua-tx3">
                      Now: {displayEnvValue(current)}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>

          {replacing && (
            <LiquidCheckbox
              label="Replace the stored Firebase credentials"
              checked={confirmReplace}
              onChange={(event) => setConfirmReplace(event.target.checked)}
            />
          )}

          {hasGoogleCredentials && (
            <div className="space-y-1">
              <LiquidCheckbox
                label="Delete the stored GOOGLE_APPLICATION_CREDENTIALS"
                checked={removeGoogleCredentials}
                onChange={(event) =>
                  setRemoveGoogleCredentials(event.target.checked)
                }
              />
              <p className="text-xs text-aqua-tx3">
                It points to a file path that doesn&apos;t exist on production
                and, while set, the backend ignores the three FIREBASE_* values.
              </p>
            </div>
          )}

          <p className="text-xs text-aqua-tx3">
            Saves go to the database the connected backend uses. Firebase starts
            once per backend process: restart the backend afterwards if it was
            already running with credentials.
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
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4 text-sm" role="status">
          <ul className="space-y-1">
            {result.outcomes.map((outcome) => (
              <li
                key={outcome.key}
                className={
                  outcome.ok
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }
              >
                {outcome.ok ? "✓" : "✗"} {ROW_LABEL[outcome.key] || outcome.key}
                {outcome.ok ? "" : `: ${outcome.message}`}
              </li>
            ))}
            {failedSteps.slice(1).map((item) => (
              <li key={item.key} className="text-aqua-tx3">
                – {ROW_LABEL[item.key] || item.key}: not attempted
              </li>
            ))}
          </ul>

          {partial && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            >
              Only some of the three values were saved, so the stored Firebase
              credentials may be a mix of old and new. Retry before restarting
              the backend.
            </p>
          )}

          {result.serverStillHasGoogleCredentials && (
            <p
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              The server&apos;s own .env still sets
              GOOGLE_APPLICATION_CREDENTIALS; remove it there, or Firebase keeps
              using that file.
            </p>
          )}

          {savedKey && failed.length === 0 && (
            <p className="text-aqua-tx">
              Restart the backend so Firebase uses the new credentials.
            </p>
          )}
          {result.restartNote && (
            <p className="text-xs text-aqua-tx3">{result.restartNote}</p>
          )}
        </div>
      )}
    </SidebarDialog>
  );
}
