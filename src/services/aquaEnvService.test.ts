import { describe, expect, it, vi } from "vitest";
import { createAquaEnvService } from "./aquaEnvService";

// Mocked transport only: nothing here reaches the real backend.
const transport = (responses: {
  get?: object;
  put?: object;
  delete?: object;
}) => ({
  get: vi.fn().mockResolvedValue(responses.get ?? {}),
  put: vi.fn().mockResolvedValue(responses.put ?? {}),
  delete: vi.fn().mockResolvedValue(responses.delete ?? {}),
});

const VARIABLE = {
  key: "SMTP_PASSWORD",
  secret: true,
  value: "••••abcd",
  readable: true,
  inEffect: true,
  description: "",
  updatedBy: null,
  createdAt: null,
  updatedAt: null,
};

describe("aquaEnvService", () => {
  it("lists variables and status", async () => {
    const t = transport({
      get: {
        data: {
          success: true,
          data: [VARIABLE],
          status: { keyConfigured: true, lastLoad: null },
        },
      },
    });
    const result = await createAquaEnvService(t).list();
    expect(t.get).toHaveBeenCalledWith("/env");
    expect(result.data?.variables).toHaveLength(1);
    expect(result.data?.status.keyConfigured).toBe(true);
  });

  it("URL-encodes the key and sends the value only in the body", async () => {
    const t = transport({
      put: { data: { success: true, data: VARIABLE, restartNote: "Restart" } },
    });
    const service = createAquaEnvService(t);
    const result = await service.save("A B/C", { value: " v\n" });
    expect(t.put).toHaveBeenCalledWith("/env/A%20B%2FC", { value: " v\n" });
    expect(result.data?.restartNote).toBe("Restart");
  });

  it("passes a description-only edit through without a value", async () => {
    const t = transport({
      put: { data: { success: true, data: VARIABLE, restartNote: "" } },
    });
    await createAquaEnvService(t).save("SMTP_PASSWORD", { description: "x" });
    expect(t.put.mock.calls[0][1]).toEqual({ description: "x" });
  });

  it("returns the server message, status and code on errors", async () => {
    const t = transport({
      put: {
        error: "The variable was created at the same time; retry.",
        status: 409,
        code: "CONFLICT",
      },
    });
    const result = await createAquaEnvService(t).save("A", { value: "1" });
    expect(result).toEqual({
      error: "The variable was created at the same time; retry.",
      status: 409,
      code: "CONFLICT",
    });
  });

  it("reports the delete fallback", async () => {
    const t = transport({
      delete: {
        data: {
          success: true,
          data: { key: "SMTP_HOST", secret: false, fallback: "server-env" },
          restartNote: "Restart",
        },
      },
    });
    const result = await createAquaEnvService(t).remove("SMTP_HOST");
    expect(t.delete).toHaveBeenCalledWith("/env/SMTP_HOST");
    expect(result.data).toEqual({
      key: "SMTP_HOST",
      fallback: "server-env",
      restartNote: "Restart",
    });
  });

  it("probes permissions without writing (invalid key → 400 when allowed)", async () => {
    const allowed = transport({
      get: { data: { data: [] } },
      put: { error: "bad key", status: 400, code: "INVALID_KEY" },
    });
    const service = createAquaEnvService(allowed);
    expect(await service.probeRead()).toBe(true);
    expect(await service.probeManage()).toBe(true);
    expect(allowed.put).toHaveBeenCalledWith("/env/__probe", {});

    const denied = transport({
      get: { error: "Insufficient permission", status: 403 },
      put: { error: "Insufficient permission", status: 403 },
    });
    const deniedService = createAquaEnvService(denied);
    expect(await deniedService.probeRead()).toBe(false);
    expect(await deniedService.probeManage()).toBe(false);
  });
});
