import { describe, expect, it } from "vitest";
import {
  RESERVED_ENV_KEYS,
  RESERVED_ENV_PREFIXES,
  buildCreateBody,
  buildUpdateBody,
  deleteFallbackMessage,
  displayEnvValue,
  emptyEnvForm,
  envFormFromVariable,
  envStatusChips,
  normalizeEnvStatus,
  normalizeEnvVariable,
  normalizeKeyInput,
  validateEnvDescription,
  validateEnvKey,
  validateEnvValue,
  type EnvVariable,
} from "./aquaEnv";
import { filterGatedItems } from "./permissions";

const variable = (overrides: Partial<EnvVariable> = {}): EnvVariable => ({
  key: "SMTP_PASSWORD",
  secret: true,
  value: "••••abcd",
  readable: true,
  inEffect: true,
  description: "Mail login",
  updatedBy: null,
  createdAt: null,
  updatedAt: "2026-11-17T10:00:00.000Z",
  ...overrides,
});

describe("key validation", () => {
  it("upper-cases input without trimming it", () => {
    expect(normalizeKeyInput("smtp_host")).toBe("SMTP_HOST");
    expect(normalizeKeyInput(" smtp ")).toBe(" SMTP ");
  });

  it("accepts the server's pattern", () => {
    expect(validateEnvKey("SMTP_HOST")).toBeNull();
    expect(validateEnvKey("A")).toBeNull();
    expect(validateEnvKey("A".repeat(100))).toBeNull();
  });

  it.each([
    ["", "Enter a variable name."],
    ["1KEY", null],
    ["_KEY", null],
    ["SMTP-HOST", null],
    ["SMTP HOST", null],
    [" SMTP", null],
    ["smtp", null],
    ["A".repeat(101), null],
  ])("rejects %j", (key, message) => {
    const error = validateEnvKey(key);
    expect(error).toBeTruthy();
    if (message) expect(error).toBe(message);
  });

  it.each(RESERVED_ENV_KEYS)("rejects reserved name %s", (key) => {
    expect(validateEnvKey(key)).toMatch(/can't be stored here/);
  });

  it.each(RESERVED_ENV_PREFIXES)("rejects reserved prefix %s", (prefix) => {
    expect(validateEnvKey(`${prefix}OPTIONS`)).toMatch(/can't be stored here/);
  });

  it("allows names that only contain a reserved word", () => {
    expect(validateEnvKey("MY_NODE_URL")).toBeNull();
    expect(validateEnvKey("DB_URL_BACKUP")).toBeNull();
  });
});

describe("values and descriptions", () => {
  it("requires a value only when creating, and caps its length", () => {
    expect(validateEnvValue("", true)).toBe("Enter a value.");
    expect(validateEnvValue("", false)).toBeNull();
    expect(validateEnvValue("x".repeat(20000), true)).toBeNull();
    expect(validateEnvValue("x".repeat(20001), true)).toMatch(/longer/);
  });

  it("caps the description at 300 characters", () => {
    expect(validateEnvDescription("d".repeat(300))).toBeNull();
    expect(validateEnvDescription("d".repeat(301))).toMatch(/longer/);
  });
});

describe("create and update bodies", () => {
  it("creates with secret on by default and the value exactly as typed", () => {
    const form = { ...emptyEnvForm(), key: "FIREBASE_PRIVATE_KEY" };
    expect(form.secret).toBe(true);
    const value = "  -----BEGIN KEY-----\nabc\n-----END KEY-----\n ";
    expect(buildCreateBody({ ...form, value })).toEqual({
      value,
      secret: true,
      description: "",
    });
  });

  it("never prefills a value into the edit form", () => {
    const form = envFormFromVariable(variable({ secret: false, value: "x" }));
    expect(form.value).toBe("");
  });

  it("does not send value when the field is left blank", () => {
    const original = variable();
    const form = { ...envFormFromVariable(original), description: "New" };
    const body = buildUpdateBody(original, form);
    expect(body).toEqual({ description: "New" });
    expect(body).not.toHaveProperty("value");
  });

  it("can turn secret off alone, without a value", () => {
    const original = variable();
    const body = buildUpdateBody(original, {
      ...envFormFromVariable(original),
      secret: false,
    });
    expect(body).toEqual({ secret: false });
  });

  it("sends a typed value unchanged, including whitespace", () => {
    const original = variable();
    const body = buildUpdateBody(original, {
      ...envFormFromVariable(original),
      value: " new pass ",
    });
    expect(body).toEqual({ value: " new pass " });
  });

  it("returns null when nothing changed", () => {
    const original = variable();
    expect(buildUpdateBody(original, envFormFromVariable(original))).toBeNull();
  });
});

describe("display", () => {
  it("shows the server's mask for secrets and plain values as-is", () => {
    expect(displayEnvValue(variable())).toBe("••••abcd");
    expect(displayEnvValue(variable({ value: "" }))).toBe("••••");
    expect(
      displayEnvValue(variable({ secret: false, value: "smtp.gmail.com" })),
    ).toBe("smtp.gmail.com");
    expect(displayEnvValue(variable({ secret: false, value: "" }))).toBe(
      "(empty)",
    );
    expect(displayEnvValue(variable({ readable: false, value: null }))).toBe(
      "Not readable",
    );
  });

  it("lists status chips", () => {
    expect(envStatusChips(variable())).toEqual([]);
    expect(
      envStatusChips(variable({ readable: false, inEffect: false })),
    ).toEqual(["Not readable", "Not in effect"]);
  });

  it("describes the delete fallback", () => {
    expect(deleteFallbackMessage("server-env")).toBe(
      "Server now uses its own environment value",
    );
    expect(deleteFallbackMessage("none")).toBe("Variable removed");
  });
});

describe("normalizing API data", () => {
  it("keeps valid variables and drops junk", () => {
    expect(
      normalizeEnvVariable({ key: "A", secret: false, value: "1" }),
    ).toMatchObject({ key: "A", secret: false, value: "1", readable: true });
    expect(normalizeEnvVariable({ value: "x" })).toBeNull();
    expect(normalizeEnvVariable(null)).toBeNull();
  });

  it("reads status and the last load", () => {
    expect(
      normalizeEnvStatus({ keyConfigured: false, lastLoad: null }),
    ).toEqual({
      keyConfigured: false,
      lastLoad: null,
    });
    expect(
      normalizeEnvStatus({
        keyConfigured: true,
        lastLoad: { at: "x", total: 2, failed: ["A", 3], loaded: ["B"] },
      }).lastLoad?.failed,
    ).toEqual(["A"]);
  });
});

describe("navigation gating", () => {
  const items = [{ id: "dashboard" }, { id: "jobs" }, { id: "settings" }];

  it("shows gated items only when the permission is granted", () => {
    expect(
      filterGatedItems(items, { jobs: true, settings: false }).map((i) => i.id),
    ).toEqual(["dashboard", "jobs"]);
    expect(
      filterGatedItems(items, { jobs: false, settings: true }).map((i) => i.id),
    ).toEqual(["dashboard", "settings"]);
  });

  it("hides gated items while the permission is still resolving", () => {
    expect(
      filterGatedItems(items, { jobs: undefined, settings: undefined }).map(
        (i) => i.id,
      ),
    ).toEqual(["dashboard"]);
  });
});
