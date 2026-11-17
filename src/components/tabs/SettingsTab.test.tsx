import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  EnvironmentView,
  SettingsNoAccess,
  type EnvironmentViewProps,
} from "./SettingsTab";
import type { EnvVariable } from "../../utils/aquaEnv";

// SettingsTab → useSettingsAccess → AuthContext → apiService reads
// localStorage at import time; give the node test run an empty one.
vi.hoisted(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
  }
});

const noop = () => undefined;

const variables: EnvVariable[] = [
  {
    key: "JWT_SECRET",
    secret: true,
    value: "••••9f2c",
    readable: true,
    inEffect: true,
    description: "Signs staff tokens",
    updatedBy: null,
    createdAt: null,
    updatedAt: "2026-11-17T10:00:00.000Z",
  },
  {
    key: "SMTP_HOST",
    secret: false,
    value: "smtp.example.com",
    readable: true,
    inEffect: false,
    description: "",
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  },
  {
    key: "BROKEN_KEY",
    secret: true,
    value: null,
    readable: false,
    inEffect: false,
    description: "",
    updatedBy: null,
    createdAt: null,
    updatedAt: null,
  },
];

const render = (overrides: Partial<EnvironmentViewProps> = {}) =>
  renderToStaticMarkup(
    <EnvironmentView
      canManage={false}
      variables={variables}
      status={{ keyConfigured: true, lastLoad: null }}
      loading={false}
      loadError={null}
      restartNote={null}
      onDismissRestartNote={noop}
      onRefresh={noop}
      onCreate={noop}
      onEdit={noop}
      onDelete={noop}
      onImport={noop}
      {...overrides}
    />,
  );

describe("Settings → Environment", () => {
  it("shows masked secrets, plain values and status chips", () => {
    const html = render();
    expect(html).toContain("••••9f2c");
    expect(html).toContain("smtp.example.com");
    expect(html).toContain("Not readable");
    expect(html).toContain("Not in effect");
    expect(html).toContain("Secret");
  });

  it("hides create/edit/delete without settings.manage", () => {
    const html = render({ canManage: false });
    expect(html).not.toContain("New variable");
    expect(html).not.toContain("Import .env");
    // Edit/Delete live in each row's actions menu; no menu without manage.
    expect(html).not.toContain('aria-label="Actions menu"');
    expect(html).not.toContain("<span>Actions</span>");
    expect(html).toContain("Read-only");
  });

  it("shows create/edit/delete with settings.manage", () => {
    const html = render({ canManage: true });
    expect(html).toContain("New variable");
    expect(html).toContain("Import .env");
    expect(html).toContain('aria-label="Actions menu"');
    expect(html).toContain("<span>Actions</span>");
  });

  it("warns when the server has no encryption key", () => {
    const html = render({
      canManage: true,
      status: { keyConfigured: false, lastLoad: null },
    });
    expect(html).toContain(
      "Encryption key missing on server; values can&#x27;t be saved or read.",
    );
  });

  it("lists keys that failed to load", () => {
    const html = render({
      status: {
        keyConfigured: true,
        lastLoad: {
          at: "2026-11-17T09:00:00.000Z",
          total: 3,
          loaded: ["SMTP_HOST"],
          failed: ["BROKEN_KEY", "OLD_TOKEN"],
          skipped: [],
          keyConfigured: true,
          error: null,
        },
      },
    });
    expect(html).toContain("2 variables failed to load");
    expect(html).toContain("BROKEN_KEY, OLD_TOKEN");
  });

  it("shows the restart note after a change", () => {
    expect(render({ restartNote: "Restart needed for CORS" })).toContain(
      "Restart needed for CORS",
    );
  });

  it("explains the missing permission", () => {
    expect(renderToStaticMarkup(<SettingsNoAccess />)).toContain(
      "settings.read",
    );
  });
});
