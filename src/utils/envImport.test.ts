import { describe, expect, it, vi } from "vitest";
import {
  importBody,
  looksSecret,
  parseEnvFile,
  planEnvImport,
  runEnvImport,
  type ImportRow,
} from "./envImport";

// Expected values were produced by dotenv.parse (dotenv 18, the backend's
// version) on the same file, so the CRM import matches `npm run env:import`.
const SAMPLE = [
  "# comment",
  "export SMTP_HOST=smtp.example.com",
  "PLAIN = spaced value   # trailing comment",
  "HASH=abc#def",
  "HASH2=abc #def",
  'DQ="line1\\nline2"',
  "SQ='single \\n kept'",
  "BT=`back tick`",
  "EMPTY=",
  'MULTI="-----BEGIN KEY-----',
  "abc",
  '-----END KEY-----"',
  "lower_key=x",
  "DUP=first",
  "DUP=second",
  "COLON: yes",
  'ESC="say \\"hi\\""',
  "NOEQ",
  "URL=postgres://u:p@host/db",
  "TABS=\tx\t",
].join("\r\n");

const DOTENV_RESULT = {
  SMTP_HOST: "smtp.example.com",
  PLAIN: "spaced value",
  HASH: "abc",
  HASH2: "abc",
  DQ: "line1\nline2",
  SQ: "single \\n kept",
  BT: "back tick",
  EMPTY: "",
  MULTI: "-----BEGIN KEY-----\nabc\n-----END KEY-----",
  lower_key: "x",
  DUP: "second",
  COLON: "yes",
  ESC: 'say \\"hi\\"',
  URL: "postgres://u:p@host/db",
  TABS: "x",
};

describe("parseEnvFile", () => {
  it("matches dotenv.parse on a tricky file", () => {
    const { entries, duplicates } = parseEnvFile(SAMPLE);
    expect(Object.fromEntries(entries.map((e) => [e.key, e.value]))).toEqual(
      DOTENV_RESULT,
    );
    expect(duplicates).toEqual(["DUP"]);
  });

  it("ignores a byte-order mark and blank input", () => {
    expect(parseEnvFile(`${String.fromCharCode(0xfeff)}A=1`).entries).toEqual([
      { key: "A", value: "1" },
    ]);
    expect(parseEnvFile("").entries).toEqual([]);
    expect(parseEnvFile("# only a comment\n\n").entries).toEqual([]);
  });

  it("can be called repeatedly (global regex state is reset)", () => {
    expect(parseEnvFile("A=1\nB=2").entries).toHaveLength(2);
    expect(parseEnvFile("A=1\nB=2").entries).toHaveLength(2);
  });
});

describe("looksSecret", () => {
  it("follows the CLI's guess", () => {
    expect(looksSecret("JWT_SECRET")).toBe(true);
    expect(looksSecret("SMTP_PASSWORD")).toBe(true);
    expect(looksSecret("RAZORPAY_KEY_ID")).toBe(true);
    expect(looksSecret("SOMETHING_UNKNOWN")).toBe(true);
    expect(looksSecret("SMTP_HOST")).toBe(false);
    expect(looksSecret("CRON_ENABLED")).toBe(false);
    expect(looksSecret("PUBLIC_SITE_URL", "https://aquakart.co.in")).toBe(
      false,
    );
  });

  it("treats a URL with user:password@ as secret", () => {
    expect(looksSecret("REDIS_URL", "redis://user:pa55@host:6379")).toBe(true);
  });
});

describe("planEnvImport", () => {
  const entries = [
    { key: "NEW_TOKEN", value: "t" },
    { key: "SMTP_HOST", value: "smtp.example.com" },
    { key: "STORED_KEY", value: "s" },
    { key: "DB_URL", value: "mongodb://x" },
    { key: "NODE_ENV", value: "production" },
    { key: "lower_key", value: "x" },
    { key: "EMPTY", value: "" },
    { key: "HUGE", value: "x".repeat(20001) },
  ];
  const stored = new Set(["STORED_KEY"]);

  it("adds new keys, keeps stored ones and skips the rest", () => {
    const rows = planEnvImport(entries, stored, false);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.NEW_TOKEN).toMatchObject({
      action: "add",
      secret: true,
      selected: true,
    });
    expect(byKey.SMTP_HOST).toMatchObject({ action: "add", secret: false });
    expect(byKey.STORED_KEY).toMatchObject({ action: "keep", selected: false });
    expect(byKey.DB_URL).toMatchObject({ action: "skip", selected: false });
    expect(byKey.NODE_ENV.reason).toMatch(/Server-only/);
    expect(byKey.lower_key.reason).toMatch(/Invalid name/);
    expect(byKey.EMPTY.reason).toBe("Empty value");
    expect(byKey.HUGE.reason).toMatch(/Longer than/);
  });

  it("replaces stored keys when overwrite is on", () => {
    const rows = planEnvImport(entries, stored, true);
    expect(rows.find((r) => r.key === "STORED_KEY")).toMatchObject({
      action: "replace",
      selected: true,
    });
  });

  it("sends secret only for new keys", () => {
    const [add] = planEnvImport(
      [{ key: "A_TOKEN", value: "v" }],
      stored,
      false,
    );
    const [replace] = planEnvImport(
      [{ key: "STORED_KEY", value: "v" }],
      stored,
      true,
    );
    expect(importBody(add)).toEqual({ value: "v", secret: true });
    expect(importBody(replace)).toEqual({ value: "v" });
  });
});

describe("runEnvImport", () => {
  const row = (key: string, overrides: Partial<ImportRow> = {}): ImportRow => ({
    key,
    value: `${key}-value`,
    action: "add",
    secret: true,
    selected: true,
    ...overrides,
  });

  it("saves selected add/replace rows one by one and reports each", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ data: { restartNote: "Restart note" } })
      .mockResolvedValueOnce({ error: "value is longer", status: 400 });
    const progress = vi.fn();
    const result = await runEnvImport(
      [
        row("A"),
        row("SKIPPED", { selected: false }),
        row("KEPT", { action: "keep", selected: true }),
        row("B", { action: "replace" }),
      ],
      save,
      { onProgress: progress },
    );
    expect(save.mock.calls).toEqual([
      ["A", { value: "A-value", secret: true }],
      ["B", { value: "B-value" }],
    ]);
    expect(result.outcomes).toEqual([
      { key: "A", ok: true },
      { key: "B", ok: false, message: "value is longer" },
    ]);
    expect(result.stoppedReason).toBeUndefined();
    expect(result.restartNote).toBe("Restart note");
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("stops at a failure that would repeat for every row", async () => {
    const save = vi.fn().mockResolvedValue({
      error: "Encryption key missing",
      status: 503,
      code: "ENCRYPTION_KEY_MISSING",
    });
    const result = await runEnvImport([row("A"), row("B")], save);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.stoppedReason).toMatch(/Encryption key missing/);
  });

  it("stops when asked, before the next request", async () => {
    let stop = false;
    const save = vi.fn().mockImplementation(async () => {
      stop = true;
      return { data: { restartNote: "" } };
    });
    const result = await runEnvImport([row("A"), row("B")], save, {
      shouldStop: () => stop,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.stoppedReason).toBe("Stopped by you.");
  });
});
