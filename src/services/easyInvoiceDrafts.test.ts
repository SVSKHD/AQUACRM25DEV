import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEasyDraftsService } from "./easyInvoiceDrafts";

// Mocked transport only: nothing here reaches a real backend.
const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
const easyDraftsService = createEasyDraftsService(api, () => ({
  deviceId: "laptop-device-1",
  deviceLabel: "Windows · Chrome",
}));

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("easyDraftsService", () => {
  it("sends this device with every call and unwraps data", async () => {
    api.post.mockResolvedValue({ data: { success: true, data: { id: "d1" } } });
    const result = await easyDraftsService.create({ rawText: "x" });
    expect(result).toEqual({ data: { id: "d1" } });
    expect(api.post).toHaveBeenCalledWith("/easy-invoice-drafts", {
      deviceId: "laptop-device-1",
      deviceLabel: "Windows · Chrome",
      content: { rawText: "x" },
    });

    api.get.mockResolvedValue({ data: { data: [] } });
    await easyDraftsService.list();
    expect(api.get.mock.calls[0][0]).toBe(
      "/easy-invoice-drafts?deviceId=laptop-device-1&deviceLabel=Windows%20%C2%B7%20Chrome",
    );

    api.post.mockResolvedValue({ data: { data: { id: "d1" } } });
    await easyDraftsService.claim("d1", true);
    expect(api.post).toHaveBeenLastCalledWith("/easy-invoice-drafts/d1/claim", {
      deviceId: "laptop-device-1",
      deviceLabel: "Windows · Chrome",
      force: true,
    });
  });

  it("keeps the lock code and who is editing", async () => {
    api.put.mockResolvedValue({
      error: "Ravi K is editing this draft",
      status: 409,
      code: "DRAFT_LOCKED",
      details: { editor: { name: "Ravi K" } },
    });
    const result = await easyDraftsService.save("d1", { rawText: "x" });
    expect(result.data).toBeUndefined();
    expect(result.code).toBe("DRAFT_LOCKED");
    expect(result.details).toEqual({ editor: { name: "Ravi K" } });
  });

  it("explains a backend that doesn't have shared drafts yet", async () => {
    api.get.mockResolvedValue({ error: "Not found", status: 404 });
    const result = await easyDraftsService.list();
    expect(result.code).toBe("DRAFTS_UNAVAILABLE");
    expect(result.error).toMatch(/aren't available on the server yet/);
  });

  it("a missing draft (404 with a code) stays a missing draft", async () => {
    api.get.mockResolvedValue({
      error: "Draft not found",
      status: 404,
      code: "NOT_FOUND",
    });
    const result = await easyDraftsService.get("d1");
    expect(result.code).toBe("NOT_FOUND");
    expect(result.error).toBe("Draft not found");
  });
});
