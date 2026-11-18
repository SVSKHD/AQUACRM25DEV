// Import a .env file into aqua-env from the CRM. Parsing and the defaults
// match the backend CLI (AQUAKARTBACKEND src/scripts/aqua-env-import.js,
// which uses dotenv.parse): same values, same skip rules, same secret guess,
// so a file behaves the same either way. Values stay in memory only.

import {
  ENV_KEY_PATTERN,
  ENV_MAX_VALUE_LENGTH,
  blockedEnvKeyReason,
  isReservedEnvKey,
  type EnvSaveBody,
} from "./aquaEnv";

export type ParsedEnvEntry = { key: string; value: string };

export type EnvParseResult = {
  /** Last value wins for repeated keys, like dotenv. */
  entries: ParsedEnvEntry[];
  /** Keys that appear more than once in the file. */
  duplicates: string[];
};

// dotenv's line grammar: optional `export`, KEY=VALUE or KEY: VALUE, quoted
// values ('…', "…", `…`, may span lines), `#` starts a comment.
const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/** Same results as dotenv.parse (unquoted values are trimmed, "…" expands \n and \r). */
const BYTE_ORDER_MARK = new RegExp(`^${String.fromCharCode(0xfeff)}`);

export const parseEnvFile = (source: string): EnvParseResult => {
  const text = source.replace(BYTE_ORDER_MARK, "").replace(/\r\n?/g, "\n");
  const values = new Map<string, string>();
  const seen = new Map<string, number>();
  LINE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINE.exec(text)) !== null) {
    const key = match[1];
    let value = (match[2] || "").trim();
    const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    if (quote === '"')
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    // Re-insert so the order follows the last occurrence, like object keys.
    values.delete(key);
    values.set(key, value);
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return {
    entries: [...values].map(([key, value]) => ({ key, value })),
    duplicates: [...seen].filter(([, count]) => count > 1).map(([key]) => key),
  };
};

// Same guess as the CLI: names that look like secrets are masked; obvious
// settings are plain. Additionally, a URL with user:password@ is secret.
const SECRET_HINT = /KEY|SECRET|PASSWORD|TOKEN|PRIVATE|PIN|AUTH|CREDENTIAL/;
const PLAIN_HINT =
  /(_ENABLED|_MODE|_IST|_MINUTE|_HOURS|_DAYS|_SIZE|_PER_RUN|_MS|_MODEL|_ORIGIN|_URL|_NAME|_EMAIL|_HOST|_PORT|_SECURE|_ROUTE|_CONCURRENT|_FOLLOWUPS|_EXPIRY|_EXPIRY_MINUTES|_RETENTION_DAYS)$/;
const URL_WITH_PASSWORD = /\/\/[^\s/@:]*:[^\s/@]+@/;

export const looksSecret = (key: string, value = "") =>
  SECRET_HINT.test(key) ||
  !PLAIN_HINT.test(key) ||
  URL_WITH_PASSWORD.test(value);

export type ImportAction = "add" | "replace" | "keep" | "skip";

export type ImportRow = {
  key: string;
  value: string;
  action: ImportAction;
  /** Why the row is skipped or kept. */
  reason?: string;
  /** Secret flag for new variables (replace keeps the stored flag). */
  secret: boolean;
  /** Ticked rows are imported; only add/replace rows can be ticked. */
  selected: boolean;
};

/** Build the import plan, mirroring the CLI's add / replace / keep / skip. */
export const planEnvImport = (
  entries: ParsedEnvEntry[],
  storedKeys: ReadonlySet<string>,
  overwrite: boolean,
): ImportRow[] =>
  entries.map(({ key, value }) => {
    const base = { key, value, secret: looksSecret(key, value) };
    if (isReservedEnvKey(key))
      return {
        ...base,
        action: "skip",
        reason: "Server-only; stays in the server's .env",
        selected: false,
      };
    const blocked = blockedEnvKeyReason(key);
    if (blocked)
      return { ...base, action: "skip", reason: blocked, selected: false };
    if (!ENV_KEY_PATTERN.test(key))
      return {
        ...base,
        action: "skip",
        reason: "Invalid name (capital letters, digits, underscores)",
        selected: false,
      };
    if (value === "")
      return {
        ...base,
        action: "skip",
        reason: "Empty value",
        selected: false,
      };
    if (value.length > ENV_MAX_VALUE_LENGTH)
      return {
        ...base,
        action: "skip",
        reason: `Longer than ${ENV_MAX_VALUE_LENGTH} characters`,
        selected: false,
      };
    if (!storedKeys.has(key)) return { ...base, action: "add", selected: true };
    if (overwrite) return { ...base, action: "replace", selected: true };
    return {
      ...base,
      action: "keep",
      reason: "Already stored (tick “Replace stored values” to overwrite)",
      selected: false,
    };
  });

/** Request body per row: new → value + secret; replace → value only. */
export const importBody = (row: ImportRow): EnvSaveBody =>
  row.action === "add"
    ? { value: row.value, secret: row.secret }
    : { value: row.value };

export type ImportOutcome = {
  key: string;
  ok: boolean;
  message?: string;
};

export type ImportRunResult = {
  outcomes: ImportOutcome[];
  /** Set when the run stopped early (key missing, auth, or user stop). */
  stoppedReason?: string;
  restartNote: string;
};

type SaveFn = (
  key: string,
  body: EnvSaveBody,
) => Promise<{
  data?: { restartNote: string };
  error?: string;
  status?: number;
  code?: string;
}>;

// These failures affect every remaining row, so the run stops instead of
// sending more requests that would fail the same way.
const isFatal = (status?: number, code?: string) =>
  status === 401 ||
  status === 403 ||
  status === 503 ||
  code === "ENCRYPTION_KEY_MISSING" ||
  code === "NETWORK_ERROR";

/** Saves rows one at a time (no bulk endpoint). Never throws. */
export const runEnvImport = async (
  rows: ImportRow[],
  save: SaveFn,
  {
    onProgress,
    shouldStop,
  }: {
    onProgress?: (done: number, total: number, outcome: ImportOutcome) => void;
    shouldStop?: () => boolean;
  } = {},
): Promise<ImportRunResult> => {
  const todo = rows.filter(
    (row) => row.selected && (row.action === "add" || row.action === "replace"),
  );
  const outcomes: ImportOutcome[] = [];
  let restartNote = "";
  for (const row of todo) {
    if (shouldStop?.()) {
      return { outcomes, stoppedReason: "Stopped by you.", restartNote };
    }
    const response = await save(row.key, importBody(row));
    const outcome: ImportOutcome = response.error
      ? { key: row.key, ok: false, message: response.error }
      : { key: row.key, ok: true };
    if (response.data?.restartNote) restartNote = response.data.restartNote;
    outcomes.push(outcome);
    onProgress?.(outcomes.length, todo.length, outcome);
    if (!outcome.ok && isFatal(response.status, response.code)) {
      return {
        outcomes,
        stoppedReason: `Stopped: ${response.error}`,
        restartNote,
      };
    }
  }
  return { outcomes, restartNote };
};

/** Largest file the dialog reads (a .env is a few KB). */
export const ENV_FILE_MAX_BYTES = 1024 * 1024;
