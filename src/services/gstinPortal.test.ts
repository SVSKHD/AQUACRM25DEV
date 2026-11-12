import { describe, expect, it, vi } from "vitest";
import { lookupGstinOnPortal, type GstTaxpayer } from "./gstinPortal";

const TAXPAYER: GstTaxpayer = {
  gstin: "36HEDPS5768R1Z8",
  legalName: "Ruhi Enterprises",
  tradeName: "Deep Trader",
  status: "Active",
  constitution: "Proprietorship",
  taxpayerType: "Regular",
  registeredOn: "27/01/2018",
  cancelledOn: "",
  address: "135, Rani Ka Bagh, Hyderabad, Telangana - 500034",
  state: "Telangana",
  pincode: "500034",
  source: "mastersindia",
  fetchedAt: "2026-11-11T00:00:00.000Z",
};

const transport = (response: object) => ({
  get: vi.fn().mockResolvedValue(response),
});

describe("lookupGstinOnPortal", () => {
  it("calls the CRM GSTIN route and returns the taxpayer", async () => {
    const t = transport({ data: { success: true, data: TAXPAYER } });
    const result = await lookupGstinOnPortal("36HEDPS5768R1Z8", t as never);
    expect(t.get).toHaveBeenCalledWith(
      "/admin/gstin/36HEDPS5768R1Z8",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual({ data: TAXPAYER });
  });

  it("passes the backend error code through", async () => {
    const result = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({
        error: "GST portal lookup isn't set up on the server yet.",
        status: 503,
        code: "GSTIN_LOOKUP_DISABLED",
      }) as never,
    );
    expect(result.code).toBe("GSTIN_LOOKUP_DISABLED");
    expect(result.data).toBeUndefined();
  });

  it("treats a 404 without a code as the route not being deployed", async () => {
    const result = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({ error: "Request failed (HTTP 404)", status: 404 }) as never,
    );
    expect(result.code).toBe("GSTIN_LOOKUP_DISABLED");
    expect(result.error).toMatch(/not deployed/);
  });

  it("keeps a real not-found from the backend", async () => {
    const result = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({
        error: "No taxpayer found for this GSTIN.",
        status: 404,
        code: "GSTIN_NOT_FOUND",
      }) as never,
    );
    expect(result.code).toBe("GSTIN_NOT_FOUND");
  });

  it("explains timeouts and network failures", async () => {
    const timeout = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({ error: "signal timed out", code: "TIMEOUT" }) as never,
    );
    expect(timeout.error).toMatch(/too long/);
    const offline = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({ error: "Failed to fetch", code: "NETWORK_ERROR" }) as never,
    );
    expect(offline.error).toMatch(/Couldn't reach/);
  });

  it("rejects an empty record", async () => {
    const result = await lookupGstinOnPortal(
      "36HEDPS5768R1Z8",
      transport({
        data: {
          success: true,
          data: { ...TAXPAYER, legalName: "", tradeName: "" },
        },
      }) as never,
    );
    expect(result.code).toBe("GSTIN_NOT_FOUND");
  });
});
