import { describe, expect, it, vi } from "vitest";
import {
  isPartialFirebaseSave,
  parseServiceAccount,
  planFirebaseSetup,
  runFirebaseSetup,
  type ServiceAccount,
} from "./firebaseServiceAccount";
import type { EnvVariable } from "./aquaEnv";

// A made-up key: the right shape, not a real credential.
const FAKE_KEY =
  "-----BEGIN PRIVATE KEY-----\nMIIEfakefakefake\nAAAAfake\n-----END PRIVATE KEY-----\n";

const file = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    type: "service_account",
    project_id: "aquakart-demo",
    private_key_id: "0123456789abcdef",
    private_key: FAKE_KEY,
    client_email: "firebase-adminsdk-x1@aquakart-demo.iam.gserviceaccount.com",
    client_id: "123",
    ...overrides,
  });

const stored = (key: string, secret = false): EnvVariable => ({
  key,
  secret,
  value: secret ? "••••" : "old",
  readable: true,
  inEffect: true,
  description: "",
  updatedBy: null,
  createdAt: null,
  updatedAt: null,
});

describe("parseServiceAccount", () => {
  it("reads the three values and keeps the key's line breaks", () => {
    const result = parseServiceAccount(file());
    expect(result.errors).toBeUndefined();
    expect(result.account).toEqual({
      projectId: "aquakart-demo",
      clientEmail: "firebase-adminsdk-x1@aquakart-demo.iam.gserviceaccount.com",
      privateKey: FAKE_KEY,
      privateKeyId: "0123456789abcdef",
    });
    expect(result.account?.privateKey).toContain("\n");
    expect(result.warnings).toEqual([]);
  });

  it("rejects text that isn't JSON or isn't an object", () => {
    expect(parseServiceAccount("FIREBASE_PROJECT_ID=x").errors?.[0]).toMatch(
      /valid JSON/,
    );
    expect(parseServiceAccount("[1]").errors?.[0]).toMatch(/JSON object/);
  });

  it("rejects a file that isn't a service account (e.g. google-services.json)", () => {
    const errors = parseServiceAccount(
      JSON.stringify({ project_info: { project_id: "x" } }),
    ).errors;
    expect(errors?.join(" ")).toMatch(/service_account/);
    expect(errors).toHaveLength(4);
  });

  it("lists each bad field", () => {
    const errors = parseServiceAccount(
      file({
        project_id: "has space",
        client_email: "someone@gmail.com",
        private_key: "not a key",
      }),
    ).errors;
    expect(errors).toHaveLength(3);
    expect(errors?.[0]).toMatch(/project_id/);
    expect(errors?.[1]).toMatch(/client_email/);
    expect(errors?.[2]).toMatch(/private_key/);
  });

  it("warns when the email belongs to another project", () => {
    const result = parseServiceAccount(file({ project_id: "other-project" }));
    expect(result.warnings?.[0]).toMatch(/aquakart-demo/);
  });
});

describe("planFirebaseSetup", () => {
  const account = parseServiceAccount(file()).account as ServiceAccount;

  it("creates new keys: id and email plain, private key secret", () => {
    const steps = planFirebaseSetup(account, [], {
      removeGoogleCredentials: true,
    });
    expect(steps).toEqual([
      {
        kind: "save",
        key: "FIREBASE_PROJECT_ID",
        replaces: false,
        body: {
          value: "aquakart-demo",
          secret: false,
          description: "Firebase Admin service account",
        },
      },
      {
        kind: "save",
        key: "FIREBASE_CLIENT_EMAIL",
        replaces: false,
        body: {
          value: account.clientEmail,
          secret: false,
          description: "Firebase Admin service account",
        },
      },
      {
        kind: "save",
        key: "FIREBASE_PRIVATE_KEY",
        replaces: false,
        body: {
          value: FAKE_KEY,
          secret: true,
          description: "Firebase Admin service account",
        },
      },
    ]);
  });

  it("replaces stored keys with value only, but always forces the key secret", () => {
    const steps = planFirebaseSetup(
      account,
      [
        stored("FIREBASE_PROJECT_ID"),
        stored("FIREBASE_CLIENT_EMAIL"),
        stored("FIREBASE_PRIVATE_KEY", false),
      ],
      { removeGoogleCredentials: false },
    );
    expect(steps.map((step) => step.kind === "save" && step.body)).toEqual([
      { value: "aquakart-demo" },
      { value: account.clientEmail },
      { value: FAKE_KEY, secret: true },
    ]);
    expect(steps.every((step) => step.kind === "save" && step.replaces)).toBe(
      true,
    );
  });

  it("deletes a stored GOOGLE_APPLICATION_CREDENTIALS only when asked", () => {
    const withGac = [stored("GOOGLE_APPLICATION_CREDENTIALS")];
    const withDelete = planFirebaseSetup(account, withGac, {
      removeGoogleCredentials: true,
    });
    expect(withDelete[withDelete.length - 1]).toEqual({
      kind: "delete",
      key: "GOOGLE_APPLICATION_CREDENTIALS",
    });
    expect(
      planFirebaseSetup(account, withGac, { removeGoogleCredentials: false }),
    ).toHaveLength(3);
    expect(
      planFirebaseSetup(account, [], { removeGoogleCredentials: true }),
    ).toHaveLength(3);
  });
});

describe("runFirebaseSetup", () => {
  const account = parseServiceAccount(file()).account as ServiceAccount;
  const steps = planFirebaseSetup(
    account,
    [stored("GOOGLE_APPLICATION_CREDENTIALS")],
    { removeGoogleCredentials: true },
  );

  it("saves in order, then deletes, and reports a server-side leftover", async () => {
    const save = vi
      .fn()
      .mockResolvedValue({ data: { restartNote: "Restart" } });
    const remove = vi
      .fn()
      .mockResolvedValue({ data: { fallback: "server-env", restartNote: "" } });
    const result = await runFirebaseSetup(steps, { save, remove });
    expect(save.mock.calls.map((call) => call[0])).toEqual([
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ]);
    expect(remove).toHaveBeenCalledWith("GOOGLE_APPLICATION_CREDENTIALS");
    expect(result.outcomes.every((outcome) => outcome.ok)).toBe(true);
    expect(result.serverStillHasGoogleCredentials).toBe(true);
    expect(result.restartNote).toBe("Restart");
    expect(isPartialFirebaseSave(result)).toBe(false);
  });

  it("stops at the first failure and flags a mixed save", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ data: { restartNote: "" } })
      .mockResolvedValueOnce({ error: "Insufficient permission" });
    const remove = vi.fn();
    const result = await runFirebaseSetup(steps, { save, remove });
    expect(save).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([
      { key: "FIREBASE_PROJECT_ID", ok: true },
      {
        key: "FIREBASE_CLIENT_EMAIL",
        ok: false,
        message: "Insufficient permission",
      },
    ]);
    expect(result.remaining.map((step) => step.key)).toEqual([
      "FIREBASE_PRIVATE_KEY",
      "GOOGLE_APPLICATION_CREDENTIALS",
    ]);
    expect(isPartialFirebaseSave(result)).toBe(true);
  });
});
