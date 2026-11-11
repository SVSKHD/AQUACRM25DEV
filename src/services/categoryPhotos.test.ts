import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ecomApi, type ApiResponse } from "./api";
import {
  NO_PHOTO_MESSAGE,
  buildCategoryForm,
  categorySaveErrorMessage,
  dataUriToFile,
  planCategoryPhotos,
  reconcileOrder,
  saveCategoryWithPhotos,
} from "./categoryPhotos";

// Sanitized fixtures: only the format signatures plus a few bytes (no metadata).
const PNG = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 1, 2,
];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x1a, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

const dataUri = (type: string, bytes: number[]) =>
  `data:${type};base64,${btoa(String.fromCharCode(...bytes))}`;

const CLOUD = "https://res.cloudinary.com/aquakart/image/upload/v1/categories";
const A = { id: "categories/a", secure_url: `${CLOUD}/a.png` };
const B = { id: "categories/b", secure_url: `${CLOUD}/b.png` };
const newPhoto = (id: string, type = "image/png", bytes = PNG) => ({
  id,
  secure_url: dataUri(type, bytes),
});
const uploadedAs = (name: string) => ({
  id: `categories/${name}`,
  secure_url: `${CLOUD}/${name}.png`,
});

const FIELDS = {
  title: "Water Softeners",
  description: "Softeners for hard water",
  keywords: "softener, hard water",
  user_id: "u1",
};

type Call = { method: string; endpoint: string; body: unknown };

/** Records every call; answers with queued responses (default: ok). */
const fakeTransport = (responses: ApiResponse<unknown>[] = []) => {
  const calls: Call[] = [];
  const answer =
    (method: string) => async (endpoint: string, body?: unknown) => {
      calls.push({ method, endpoint, body });
      return responses.shift() ?? { data: { success: true, data: {} } };
    };
  return {
    calls,
    transport: {
      post: vi.fn(answer("post")),
      put: vi.fn(answer("put")),
      postForm: vi.fn(answer("postForm")),
      putForm: vi.fn(answer("putForm")),
    } as unknown as Parameters<typeof saveCategoryWithPhotos>[2],
  };
};

const formFiles = (form: FormData) => form.getAll("photos") as File[];
const fileBytes = async (file: File) =>
  Array.from(new Uint8Array(await file.arrayBuffer()));
const noBase64 = (form: FormData) =>
  [...form.entries()].every(
    ([, value]) => typeof value !== "string" || !value.includes("base64,"),
  );

describe("dataUriToFile", () => {
  it.each([
    ["PNG", "image/png", PNG, "image/png", "png"],
    ["JPEG", "image/jpeg", JPEG, "image/jpeg", "jpg"],
    ["JPEG declared as image/jpg", "image/jpg", JPEG, "image/jpeg", "jpg"],
    ["WebP", "image/webp", WEBP, "image/webp", "webp"],
  ])("decodes %s to a binary File", async (_, declared, bytes, type, ext) => {
    const file = dataUriToFile(dataUri(declared, bytes), "photo-1");
    expect(file.type).toBe(type);
    expect(file.name).toBe(`photo-1.${ext}`);
    expect(await fileBytes(file)).toEqual(bytes);
  });

  it("rejects values that are not image data URIs", () => {
    expect(() => dataUriToFile(A.secure_url, "x")).toThrow();
    expect(() => dataUriToFile("data:text/plain;base64,aGk=", "x")).toThrow();
  });
});

describe("planCategoryPhotos / buildCategoryForm", () => {
  it("sends kept photos in order as keepPhotos and new ones as files", async () => {
    const plan = planCategoryPhotos(
      [B, A, newPhoto("n1"), newPhoto("n2", "image/webp", WEBP)],
      "update",
    );
    expect(plan.needsReorder).toBe(false);
    const form = buildCategoryForm(FIELDS, plan, { keepPhotos: true });
    expect(JSON.parse(String(form.get("keepPhotos")))).toEqual([B, A]);
    const files = formFiles(form);
    expect(files.map((file) => file.type)).toEqual(["image/png", "image/webp"]);
    expect(await fileBytes(files[1])).toEqual(WEBP);
    expect(form.get("title")).toBe(FIELDS.title);
    expect(form.get("keywords")).toBe(FIELDS.keywords);
    expect(form.get("description")).toBe(FIELDS.description);
    expect(noBase64(form)).toBe(true);
  });

  it("needs a reorder when a new photo comes before an existing one", () => {
    const plan = planCategoryPhotos([newPhoto("n1"), B], "update");
    expect(plan.needsReorder).toBe(true);
    expect(plan.sentOrder).toEqual([1, 0]);
  });

  it("reconcileOrder puts each upload where its new photo was", () => {
    const saved = [B, uploadedAs("n1"), uploadedAs("n2")];
    expect(reconcileOrder([newPhoto("x"), B, newPhoto("y")], saved, 1)).toEqual(
      [uploadedAs("n1"), B, uploadedAs("n2")],
    );
    expect(reconcileOrder([newPhoto("x")], [B], 1)).toBeNull();
  });
});

describe("saveCategoryWithPhotos: update", () => {
  it("adds photos: multipart with keepPhotos, uploads after kept photos, no reorder", async () => {
    const { calls, transport } = fakeTransport([
      {
        data: {
          success: true,
          data: { _id: "c1", photos: [A, B, uploadedAs("n1")] },
        },
      },
    ]);
    const result = await saveCategoryWithPhotos(
      "c1",
      { ...FIELDS, photos: [A, B, newPhoto("n1", "image/jpeg", JPEG)] },
      transport,
    );
    expect(result.error).toBeUndefined();
    expect(calls.map((call) => `${call.method} ${call.endpoint}`)).toEqual([
      "putForm category-update/c1",
    ]);
    const form = calls[0].body as FormData;
    expect(JSON.parse(String(form.get("keepPhotos")))).toEqual([A, B]);
    expect(formFiles(form).map((file) => file.type)).toEqual(["image/jpeg"]);
    expect(noBase64(form)).toBe(true);
  });

  it("replaces the primary photo: upload, then a JSON reorder of Cloudinary URLs", async () => {
    const { calls, transport } = fakeTransport([
      {
        data: {
          success: true,
          data: { _id: "c1", photos: [B, uploadedAs("n1")] },
        },
      },
      {
        data: {
          success: true,
          data: { _id: "c1", photos: [uploadedAs("n1"), B] },
        },
      },
    ]);
    // A removed; new photo made primary.
    const result = await saveCategoryWithPhotos(
      "c1",
      { ...FIELDS, photos: [newPhoto("n1"), B] },
      transport,
    );
    expect(result.error).toBeUndefined();
    expect(result.warning).toBeUndefined();
    expect(calls).toHaveLength(2);
    const form = calls[0].body as FormData;
    expect(JSON.parse(String(form.get("keepPhotos")))).toEqual([B]);
    expect(calls[1]).toEqual({
      method: "put",
      endpoint: "category-update/c1",
      body: { photos: [uploadedAs("n1"), B] },
    });
    expect(JSON.stringify(calls[1].body)).not.toContain("base64");
  });

  it("reorders existing photos only with a small JSON body", async () => {
    const { calls, transport } = fakeTransport();
    await saveCategoryWithPhotos(
      "c1",
      { ...FIELDS, photos: [B, A] },
      transport,
    );
    expect(calls).toEqual([
      {
        method: "put",
        endpoint: "category-update/c1",
        body: { ...FIELDS, photos: [B, A] },
      },
    ]);
  });

  it("removes a photo by leaving it out of the JSON list", async () => {
    const { calls, transport } = fakeTransport();
    await saveCategoryWithPhotos("c1", { ...FIELDS, photos: [A] }, transport);
    expect((calls[0].body as { photos: unknown }).photos).toEqual([A]);
  });

  it("strips extra photo fields (delivery_url) before sending", async () => {
    const { calls, transport } = fakeTransport();
    await saveCategoryWithPhotos(
      "c1",
      { photos: [{ ...A, delivery_url: "https://x" } as typeof A] },
      transport,
    );
    expect((calls[0].body as { photos: unknown }).photos).toEqual([A]);
  });

  it("refuses to clear the last photo (backend keeps it) without calling the API", async () => {
    const { calls, transport } = fakeTransport();
    const result = await saveCategoryWithPhotos(
      "c1",
      { ...FIELDS, photos: [] },
      transport,
    );
    expect(result).toEqual({ error: NO_PHOTO_MESSAGE, code: "NO_PHOTOS" });
    expect(calls).toHaveLength(0);
  });

  it("refuses more than 10 photos", async () => {
    const { calls, transport } = fakeTransport();
    const photos = Array.from({ length: 11 }, (_, i) => newPhoto(`n${i}`));
    const result = await saveCategoryWithPhotos("c1", { photos }, transport);
    expect(result.code).toBe("TOO_MANY_PHOTOS");
    expect(calls).toHaveLength(0);
  });

  it("reports a saved-with-warning result when the reorder fails", async () => {
    const first = {
      data: {
        success: true,
        data: { _id: "c1", photos: [B, uploadedAs("n1")] },
      },
    };
    const { transport } = fakeTransport([
      first,
      { error: "Something went wrong", status: 500, code: "DATABASE_ERROR" },
    ]);
    const result = await saveCategoryWithPhotos(
      "c1",
      { photos: [newPhoto("n1"), B] },
      transport,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(first.data);
    expect(result.warning).toMatch(/photo order couldn't be updated/);
  });
});

describe("saveCategoryWithPhotos: create", () => {
  it("creates with PNG, JPEG and WebP files in order and no keepPhotos", async () => {
    const { calls, transport } = fakeTransport();
    await saveCategoryWithPhotos(
      undefined,
      {
        ...FIELDS,
        photos: [
          newPhoto("p"),
          newPhoto("j", "image/jpeg", JPEG),
          newPhoto("w", "image/webp", WEBP),
        ],
      },
      transport,
    );
    expect(calls.map((call) => `${call.method} ${call.endpoint}`)).toEqual([
      "postForm category-add",
    ]);
    const form = calls[0].body as FormData;
    expect(form.has("keepPhotos")).toBe(false);
    expect(formFiles(form).map((file) => file.type)).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
    expect(noBase64(form)).toBe(true);
  });

  it("requires a photo on create", async () => {
    const { calls, transport } = fakeTransport();
    const result = await saveCategoryWithPhotos(undefined, FIELDS, transport);
    expect(result.code).toBe("NO_PHOTOS");
    expect(calls).toHaveLength(0);
  });
});

describe("failed uploads", () => {
  const replaceCall = (response: ApiResponse<unknown>) => {
    const { calls, transport } = fakeTransport([response]);
    // Sent order: B (wanted #2) then the new photo (wanted #1).
    return saveCategoryWithPhotos(
      "c1",
      { photos: [newPhoto("n1"), B] },
      transport,
    ).then((result) => ({ result, calls }));
  };

  it.each([
    [
      "400 invalid photo, mapped to the user's photo number",
      {
        error: "Unsupported image",
        status: 400,
        code: "INVALID_PHOTO",
        photoIndex: 1,
      },
      "Photo 1: Unsupported image",
    ],
    [
      "413 from the backend",
      {
        error: "Each image must be 10 MB or smaller",
        status: 413,
        code: "IMAGE_TOO_LARGE",
        photoIndex: 1,
      },
      "Photo 1: Each image must be 10 MB or smaller",
    ],
    [
      "413 HTML from a proxy",
      { error: "Request failed (HTTP 413)", status: 413 },
      "The upload is too large for the server. Use smaller photos or add fewer at a time.",
    ],
    [
      "502 Cloudinary failure",
      {
        error: "Image upload to Cloudinary failed.",
        status: 502,
        code: "CLOUDINARY_UPLOAD_FAILED",
        photoIndex: 1,
      },
      "Photo 1: The image host couldn't store the photo. Nothing was saved — try again.",
    ],
    [
      "502 Cloudinary timeout",
      { error: "timed out", status: 502, code: "CLOUDINARY_TIMEOUT" },
      "The image host timed out. Nothing was saved — try again.",
    ],
    [
      "client timeout",
      { error: "The operation was aborted due to timeout", code: "TIMEOUT" },
      "The upload timed out before the server answered. It may still have saved — check the category list before trying again.",
    ],
    [
      "network failure",
      { error: "Failed to fetch", code: "NETWORK_ERROR" },
      "Couldn't reach the server. Check your connection and try again.",
    ],
  ])("%s", async (_, response, message) => {
    const { result, calls } = await replaceCall(response);
    expect(result.error).toBe(message);
    expect(calls).toHaveLength(1); // no reorder after a failure
  });

  it("keeps the server message for other errors", () => {
    expect(
      categorySaveErrorMessage({
        error: "A category with this title already exists",
        status: 409,
      }),
    ).toBe("A category with this title already exists");
  });
});

describe("ApiService multipart requests", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("localStorage", { getItem: () => "test-token" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  it("sends FormData without a manual Content-Type (browser sets the boundary)", async () => {
    fetchMock.mockResolvedValue(json(200, { success: true }));
    const form = new FormData();
    form.append("title", "x");
    await ecomApi.putForm("category-update/c1", form, { timeoutMs: 1000 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(form);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(
      Object.keys(init.headers).map((key) => key.toLowerCase()),
    ).not.toContain("content-type");
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("still sends JSON with a JSON Content-Type", async () => {
    fetchMock.mockResolvedValue(json(200, { success: true }));
    await ecomApi.put("category-update/c1", { photos: [] });
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("passes the backend code, stage and photoIndex through", async () => {
    fetchMock.mockResolvedValue(
      json(413, {
        success: false,
        message: "Each image must be 10 MB or smaller",
        code: "IMAGE_TOO_LARGE",
        stage: "validation",
        photoIndex: 2,
      }),
    );
    const result = await ecomApi.putForm("category-update/c1", new FormData());
    expect(result).toMatchObject({
      status: 413,
      code: "IMAGE_TOO_LARGE",
      stage: "validation",
      photoIndex: 2,
    });
  });

  it("reports an HTML 413 by status without a code", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>413</html>", {
        status: 413,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const result = await ecomApi.putForm("category-update/c1", new FormData());
    expect(result.status).toBe(413);
    expect(result.code).toBeUndefined();
  });

  it("labels timeouts and network failures", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );
    expect((await ecomApi.putForm("x", new FormData())).code).toBe("TIMEOUT");
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect((await ecomApi.putForm("x", new FormData())).code).toBe(
      "NETWORK_ERROR",
    );
  });
});
