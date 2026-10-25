import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPayload } from "./blogTypes";

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("./api", () => ({ api: client, ecomApi: client }));
let blogService: typeof import("./apiService").blogService;
beforeAll(async () => {
  vi.stubGlobal("localStorage", { getItem: () => null });
  ({ blogService } = await import("./apiService"));
});
beforeEach(() => vi.clearAllMocks());

const payload: BlogPayload = {
  title: "Water guide",
  description: "<p>Guide</p>",
  keywords: "water",
  notes: "Editorial",
  category: "category-id",
  product: "product-id",
  brand: "Aquakart",
  titleImages: [
    { secure_url: "https://example.com/title.jpg", public_id: "title" },
  ],
  photos: [],
  ratings: 4,
  numberOfReviews: 2,
  customField: { enabled: true },
};

describe("blogService", () => {
  it("uses paths relative to the ecommerce base without double slashes", async () => {
    await blogService.getAllBlogs();
    await blogService.addBlog(payload);
    await blogService.updateBlog("blog/id", payload);
    await blogService.deleteBlog("blog/id");
    expect(client.get).toHaveBeenCalledWith("all-blogs");
    expect(client.post).toHaveBeenCalledWith("add-blog", payload);
    expect(client.put).toHaveBeenCalledWith("update-blog/blog%2Fid", payload);
    expect(client.delete).toHaveBeenCalledWith("delete-blog/blog%2Fid");
  });
  it("preserves API failures so callers can keep dialogs open", async () => {
    const failure = { error: "Permission denied", status: 403 };
    client.post.mockResolvedValue(failure);
    client.put.mockResolvedValue(failure);
    client.delete.mockResolvedValue(failure);
    expect(await blogService.addBlog(payload)).toEqual(failure);
    expect(await blogService.updateBlog("id", payload)).toEqual(failure);
    expect(await blogService.deleteBlog("id")).toEqual(failure);
  });
});
