// Settings → Environment → "Firebase service account": turns the Google
// service-account JSON (Firebase console → Project settings → Service
// accounts → Generate new private key) into the three variables the backend
// reads in src/config/firebaseAdmin.js. Values are kept exactly as in the
// file (the private key keeps its real line breaks; the backend also accepts
// "\n" text). Nothing here logs or stores values.

import type { EnvSaveBody, EnvVariable } from "./aquaEnv";

export const FIREBASE_PROJECT_ID = "FIREBASE_PROJECT_ID";
export const FIREBASE_CLIENT_EMAIL = "FIREBASE_CLIENT_EMAIL";
export const FIREBASE_PRIVATE_KEY = "FIREBASE_PRIVATE_KEY";
export const GOOGLE_APPLICATION_CREDENTIALS = "GOOGLE_APPLICATION_CREDENTIALS";

/** Save order: project, email, then the key. */
export const FIREBASE_KEYS = [
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
] as const;

export const SERVICE_ACCOUNT_MAX_BYTES = 64 * 1024;

const DESCRIPTION = "Firebase Admin service account";

export type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  /** Not stored; shown (last 4 characters) to match the key in the console. */
  privateKeyId: string;
};

export type ServiceAccountParse =
  | { account: ServiceAccount; warnings: string[]; errors?: undefined }
  | { account?: undefined; warnings?: undefined; errors: string[] };

const SERVICE_EMAIL = /^[^\s@]+@([^\s@]+)\.iam\.gserviceaccount\.com$/;
const PEM_KEY =
  /^-----BEGIN PRIVATE KEY-----\s+[\s\S]+\s+-----END PRIVATE KEY-----\s*$/;

const text = (value: unknown) => (typeof value === "string" ? value : "");

export const parseServiceAccount = (source: string): ServiceAccountParse => {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return {
      errors: [
        "This isn't valid JSON. Choose the .json file downloaded from Firebase.",
      ],
    };
  }
  if (!json || typeof json !== "object" || Array.isArray(json))
    return { errors: ["The file doesn't contain a JSON object."] };

  const file = json as Record<string, unknown>;
  const errors: string[] = [];
  if (file.type !== "service_account")
    errors.push(
      `"type" must be "service_account"${
        file.type ? ` (this file says "${text(file.type)}")` : ""
      }. Download it from Project settings → Service accounts.`,
    );

  const projectId = text(file.project_id);
  if (!projectId.trim() || /\s/.test(projectId))
    errors.push('"project_id" is missing or contains spaces.');

  const clientEmail = text(file.client_email);
  const emailMatch = SERVICE_EMAIL.exec(clientEmail);
  if (!emailMatch)
    errors.push(
      '"client_email" must be a service-account address ending in .iam.gserviceaccount.com.',
    );

  const privateKey = text(file.private_key);
  if (!PEM_KEY.test(privateKey))
    errors.push(
      '"private_key" must be a full PEM key from -----BEGIN PRIVATE KEY----- to -----END PRIVATE KEY-----.',
    );

  if (errors.length) return { errors };

  const warnings: string[] = [];
  if (emailMatch && emailMatch[1] !== projectId)
    warnings.push(
      `The client email belongs to project "${emailMatch[1]}", not "${projectId}". Check you downloaded the right file.`,
    );

  return {
    account: {
      projectId,
      clientEmail,
      privateKey,
      privateKeyId: text(file.private_key_id),
    },
    warnings,
  };
};

export type FirebaseStep =
  | {
      kind: "save";
      key: string;
      body: EnvSaveBody;
      /** Already stored → this replaces it. */
      replaces: boolean;
    }
  | { kind: "delete"; key: string };

/**
 * New keys get secret + description; stored ones get value only, except the
 * private key, which is always sent with secret: true.
 */
export const planFirebaseSetup = (
  account: ServiceAccount,
  stored: readonly EnvVariable[],
  { removeGoogleCredentials }: { removeGoogleCredentials: boolean },
): FirebaseStep[] => {
  const storedKeys = new Set(stored.map((variable) => variable.key));
  const values: Record<string, string> = {
    [FIREBASE_PROJECT_ID]: account.projectId,
    [FIREBASE_CLIENT_EMAIL]: account.clientEmail,
    [FIREBASE_PRIVATE_KEY]: account.privateKey,
  };
  const steps: FirebaseStep[] = FIREBASE_KEYS.map((key) => {
    const replaces = storedKeys.has(key);
    const secret = key === FIREBASE_PRIVATE_KEY;
    const body: EnvSaveBody = replaces
      ? secret
        ? { value: values[key], secret: true }
        : { value: values[key] }
      : { value: values[key], secret, description: DESCRIPTION };
    return { kind: "save", key, body, replaces };
  });
  if (removeGoogleCredentials && storedKeys.has(GOOGLE_APPLICATION_CREDENTIALS))
    steps.push({ kind: "delete", key: GOOGLE_APPLICATION_CREDENTIALS });
  return steps;
};

export type FirebaseStepOutcome = {
  key: string;
  ok: boolean;
  message?: string;
};

export type FirebaseRunResult = {
  outcomes: FirebaseStepOutcome[];
  /** Steps not attempted because an earlier one failed. */
  remaining: FirebaseStep[];
  restartNote: string;
  /** The delete fell back to a GOOGLE_APPLICATION_CREDENTIALS in the server's own .env. */
  serverStillHasGoogleCredentials: boolean;
};

type Result<T> = Promise<{ data?: T; error?: string }>;

/** Runs steps in order and stops at the first failure. Never throws. */
export const runFirebaseSetup = async (
  steps: FirebaseStep[],
  api: {
    save: (key: string, body: EnvSaveBody) => Result<{ restartNote: string }>;
    remove: (
      key: string,
    ) => Result<{ fallback: "server-env" | "none"; restartNote: string }>;
  },
  onProgress?: (done: number, total: number) => void,
): Promise<FirebaseRunResult> => {
  const outcomes: FirebaseStepOutcome[] = [];
  let restartNote = "";
  let serverStillHasGoogleCredentials = false;
  for (const [index, step] of steps.entries()) {
    const response =
      step.kind === "save"
        ? await api.save(step.key, step.body)
        : await api.remove(step.key);
    if (response.error || !response.data) {
      outcomes.push({
        key: step.key,
        ok: false,
        message: response.error || "Request failed",
      });
      onProgress?.(index + 1, steps.length);
      return {
        outcomes,
        remaining: steps.slice(index + 1),
        restartNote,
        serverStillHasGoogleCredentials,
      };
    }
    restartNote = response.data.restartNote || restartNote;
    if (
      step.kind === "delete" &&
      "fallback" in response.data &&
      response.data.fallback === "server-env"
    )
      serverStillHasGoogleCredentials = true;
    outcomes.push({ key: step.key, ok: true });
    onProgress?.(index + 1, steps.length);
  }
  return {
    outcomes,
    remaining: [],
    restartNote,
    serverStillHasGoogleCredentials,
  };
};

/** Saved some but not all three FIREBASE_* values: stored credentials may be mixed. */
export const isPartialFirebaseSave = (result: FirebaseRunResult) => {
  const saved = result.outcomes.filter(
    (outcome) =>
      outcome.ok && (FIREBASE_KEYS as readonly string[]).includes(outcome.key),
  ).length;
  return saved > 0 && saved < FIREBASE_KEYS.length;
};
