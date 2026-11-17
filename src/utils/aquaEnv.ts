// Helpers for the Settings → Environment screen (backend collection
// "aqua-env", API /v1/crm/env). Values are configuration secrets: never log
// them, never store them in browser storage or URLs, and never trim or
// otherwise change what the user typed.

export type EnvVariable = {
  key: string;
  secret: boolean;
  /** Secrets come back masked ("••••" or "••••abcd"); null when unreadable. */
  value: string | null;
  /** false → the server can't decrypt it. */
  readable: boolean;
  /** false → the running server isn't using this stored value. */
  inEffect: boolean;
  description: string;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type EnvLastLoad = {
  at: string;
  total: number;
  loaded: string[];
  failed: string[];
  skipped: string[];
  keyConfigured: boolean;
  error: string | null;
};

export type EnvStatus = {
  keyConfigured: boolean;
  lastLoad: EnvLastLoad | null;
};

export type EnvSaveBody = {
  value?: string;
  secret?: boolean;
  description?: string;
};

export type EnvForm = {
  key: string;
  value: string;
  secret: boolean;
  description: string;
};

export const ENV_KEY_PATTERN = /^[A-Z][A-Z0-9_]{0,99}$/;
export const ENV_MAX_VALUE_LENGTH = 20000;
export const ENV_MAX_DESCRIPTION_LENGTH = 300;

// Same list as the backend (src/services/aquaEnv.js); the server refuses these.
export const RESERVED_ENV_KEYS: readonly string[] = [
  "DB_URL",
  "AQUA_ENV_ENCRYPTION_KEY",
  "PORT",
  "PATH",
  "HOME",
  "PWD",
  "SHELL",
  "USER",
  "HOSTNAME",
  "TMPDIR",
  "TEMP",
  "TMP",
];
export const RESERVED_ENV_PREFIXES: readonly string[] = [
  "NODE_",
  "NPM_",
  "PM2_",
  "DOPPLER_",
  "LD_",
  "DYLD_",
];

/** Upper-cases what was typed. Doesn't trim: a stray space must fail validation, not vanish. */
export const normalizeKeyInput = (raw: string) => raw.toUpperCase();

export const isReservedEnvKey = (key: string) =>
  RESERVED_ENV_KEYS.includes(key) ||
  RESERVED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));

/** Returns an error message, or null when the key is acceptable. */
export const validateEnvKey = (key: string): string | null => {
  if (!key) return "Enter a variable name.";
  if (!ENV_KEY_PATTERN.test(key))
    return "Use capital letters, digits and underscores, start with a letter, at most 100 characters.";
  if (isReservedEnvKey(key))
    return `${key} is set by the server environment and can't be stored here.`;
  return null;
};

export const validateEnvValue = (value: string, required: boolean) => {
  if (required && value.length === 0) return "Enter a value.";
  if (value.length > ENV_MAX_VALUE_LENGTH)
    return `Value is longer than ${ENV_MAX_VALUE_LENGTH.toLocaleString("en-IN")} characters.`;
  return null;
};

export const validateEnvDescription = (description: string) =>
  description.length > ENV_MAX_DESCRIPTION_LENGTH
    ? `Description is longer than ${ENV_MAX_DESCRIPTION_LENGTH} characters.`
    : null;

export const emptyEnvForm = (): EnvForm => ({
  key: "",
  value: "",
  secret: true,
  description: "",
});

/** Edit form: never prefilled with a value (secrets are only ever masked). */
export const envFormFromVariable = (variable: EnvVariable): EnvForm => ({
  key: variable.key,
  value: "",
  secret: variable.secret,
  description: variable.description || "",
});

export const buildCreateBody = (form: EnvForm): EnvSaveBody => ({
  value: form.value,
  secret: form.secret,
  description: form.description,
});

/**
 * Partial update: only changed fields are sent. An empty value field means
 * "keep the current value", so `value` is sent only when something was typed.
 * Returns null when nothing changed.
 */
export const buildUpdateBody = (
  original: EnvVariable,
  form: EnvForm,
): EnvSaveBody | null => {
  const body: EnvSaveBody = {};
  if (form.value !== "") body.value = form.value;
  if (form.secret !== original.secret) body.secret = form.secret;
  if (form.description !== (original.description || ""))
    body.description = form.description;
  return Object.keys(body).length ? body : null;
};

/** Text for the value column. Secrets are already masked by the server. */
export const displayEnvValue = (variable: EnvVariable) => {
  if (!variable.readable) return "Not readable";
  if (variable.value === null || variable.value === undefined) return "—";
  if (variable.secret) return variable.value || "••••";
  return variable.value === "" ? "(empty)" : variable.value;
};

export const envStatusChips = (variable: EnvVariable) => {
  const chips: string[] = [];
  if (!variable.readable) chips.push("Not readable");
  if (!variable.inEffect) chips.push("Not in effect");
  return chips;
};

export const deleteFallbackMessage = (fallback?: string) =>
  fallback === "server-env"
    ? "Server now uses its own environment value"
    : "Variable removed";

export const normalizeEnvVariable = (raw: unknown): EnvVariable | null => {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.key !== "string" || !item.key) return null;
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    key: item.key,
    secret: item.secret !== false,
    value: typeof item.value === "string" ? item.value : null,
    readable: item.readable !== false,
    inEffect: item.inEffect !== false,
    description: text(item.description) || "",
    updatedBy: text(item.updatedBy),
    createdAt: text(item.createdAt),
    updatedAt: text(item.updatedAt),
  };
};

export const normalizeEnvStatus = (raw: unknown): EnvStatus => {
  const status = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const lastLoad =
    status.lastLoad && typeof status.lastLoad === "object"
      ? (status.lastLoad as Record<string, unknown>)
      : null;
  const names = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  return {
    keyConfigured: status.keyConfigured !== false,
    lastLoad: lastLoad
      ? {
          at: typeof lastLoad.at === "string" ? lastLoad.at : "",
          total: Number(lastLoad.total) || 0,
          loaded: names(lastLoad.loaded),
          failed: names(lastLoad.failed),
          skipped: names(lastLoad.skipped),
          keyConfigured: lastLoad.keyConfigured !== false,
          error: typeof lastLoad.error === "string" ? lastLoad.error : null,
        }
      : null,
  };
};
