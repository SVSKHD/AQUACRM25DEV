import { describe, expect, it } from "vitest";
import { DEV_API_ORIGIN, PRODUCTION_API_ORIGIN, resolveApiOrigin } from "./api";

describe("resolveApiOrigin", () => {
  it("uses the local backend on port 5300 in dev", () => {
    expect(resolveApiOrigin({ DEV: true })).toBe("http://localhost:5300");
    expect(DEV_API_ORIGIN).toBe("http://localhost:5300");
  });

  it("uses the existing production API in builds", () => {
    expect(resolveApiOrigin({ DEV: false })).toBe("https://api.aquakart.co.in");
    expect(resolveApiOrigin({})).toBe(PRODUCTION_API_ORIGIN);
  });

  it("lets VITE_API_ORIGIN override either, without a trailing slash", () => {
    expect(
      resolveApiOrigin({
        DEV: true,
        VITE_API_ORIGIN: "http://localhost:6000/",
      }),
    ).toBe("http://localhost:6000");
    expect(
      resolveApiOrigin({
        DEV: false,
        VITE_API_ORIGIN: "https://staging.example",
      }),
    ).toBe("https://staging.example");
  });
});
