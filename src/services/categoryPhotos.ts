import { ecomApi, type ApiResponse } from "./api";
import type { CatalogPhoto } from "../utils/productList";

/**
 * Category create/update with photos sent as binary multipart files.
 *
 * The form keeps new photos as image data URIs (PhotoUploader, drafts); they
 * are turned into Files here, so no base64 is sent. Backend contract
 * (AQUAKARTBACKEND `src/controllers/category.js`, db8c049):
 * - POST category-add: multipart `photos` files, or JSON `photos`. At least
 *   one photo is required.
 * - PUT category-update/:id with files: saved list = `keepPhotos` (JSON array
 *   of existing { id, secure_url }, in order) + the files in send order.
 *   Without files `keepPhotos` is ignored; JSON `photos` (existing Cloudinary
 *   URLs) sets the list and its order. An empty list keeps the current
 *   photos, so the last photo cannot be cleared.
 * - Errors: { message, code, stage, photoIndex? } with 400/413/502.
 */

export const MAX_CATEGORY_PHOTOS = 10;
export const CATEGORY_UPLOAD_TIMEOUT_MS = 120_000;

export const NO_PHOTO_MESSAGE =
  "Add at least one photo. A category always needs a photo, so the last one can't be removed — add its replacement first.";

const DATA_URI = /^data:(image\/[\w.+-]+);base64,/i;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** A photo picked in this form session (still a data URI, not uploaded). */
export const isNewPhoto = (photo: CatalogPhoto) =>
  DATA_URI.test(String(photo?.secure_url || "").trim());

/** Only the fields the backend stores for a photo. */
const photoRef = (photo: CatalogPhoto): CatalogPhoto => ({
  id: String(photo.id || ""),
  secure_url: photo.secure_url,
});

/** Decodes an image data URI into a File with its real MIME type. */
export const dataUriToFile = (uri: string, baseName: string): File => {
  const value = uri.trim();
  const match = DATA_URI.exec(value);
  if (!match) throw new Error("Not an image data URI");
  const declared = match[1].toLowerCase();
  const type = declared === "image/jpg" ? "image/jpeg" : declared;
  const binary = atob(value.slice(match[0].length).replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], `${baseName}.${EXTENSIONS[type] || "img"}`, {
    type,
  });
};

export interface CategoryPhotoPlan {
  /** Already-uploaded photos, in the wanted order. */
  existing: CatalogPhoto[];
  /** New (data URI) photos, in the wanted order. */
  newPhotos: CatalogPhoto[];
  /** Wanted position of each photo, in the order the first request sends them. */
  sentOrder: number[];
  /** The first request can't produce the wanted order; a reorder PUT follows. */
  needsReorder: boolean;
}

/**
 * Splits the wanted list into existing and new photos. `create` sends only
 * the files; `update` sends existing (keepPhotos) first, then the files.
 */
export const planCategoryPhotos = (
  photos: CatalogPhoto[],
  mode: "create" | "update",
): CategoryPhotoPlan => {
  const existingIdx: number[] = [];
  const newIdx: number[] = [];
  photos.forEach((photo, index) =>
    (isNewPhoto(photo) ? newIdx : existingIdx).push(index),
  );
  const hasNew = newIdx.length > 0;
  const sentOrder = !hasNew
    ? existingIdx
    : mode === "create"
      ? newIdx
      : [...existingIdx, ...newIdx];
  const needsReorder =
    sentOrder.length !== photos.length ||
    sentOrder.some((wanted, sent) => wanted !== sent);
  return {
    existing: existingIdx.map((i) => photoRef(photos[i])),
    newPhotos: newIdx.map((i) => photos[i]),
    sentOrder,
    needsReorder,
  };
};

type Fields = Record<string, unknown>;

/** Form fields other than photos, as multipart text fields (strings). */
const appendFields = (form: FormData, fields: Fields) => {
  for (const [key, value] of Object.entries(fields)) {
    if (key === "photos" || value === undefined || value === null) continue;
    if (["string", "number", "boolean"].includes(typeof value))
      form.append(key, String(value));
  }
};

export const buildCategoryForm = (
  fields: Fields,
  plan: CategoryPhotoPlan,
  { keepPhotos }: { keepPhotos: boolean },
): FormData => {
  const form = new FormData();
  appendFields(form, fields);
  if (keepPhotos) form.append("keepPhotos", JSON.stringify(plan.existing));
  plan.newPhotos.forEach((photo, index) =>
    form.append(
      "photos",
      dataUriToFile(photo.secure_url, `category-photo-${index + 1}`),
    ),
  );
  return form;
};

/** The saved category from `{ success, data }` (or the record itself). */
export const savedCategory = (payload: unknown): Record<string, unknown> => {
  const body = (payload || {}) as Record<string, unknown>;
  const inner = body.data;
  return (
    inner && typeof inner === "object" && !Array.isArray(inner) ? inner : body
  ) as Record<string, unknown>;
};

const savedPhotos = (payload: unknown): CatalogPhoto[] => {
  const photos = savedCategory(payload).photos;
  return Array.isArray(photos)
    ? photos.filter(
        (photo): photo is CatalogPhoto =>
          Boolean(photo) && typeof photo.secure_url === "string",
      )
    : [];
};

/**
 * The wanted order with every new photo replaced by its upload result.
 * `uploadedOffset` is where the uploads start in the saved list (after the
 * kept photos on update, 0 on create). Null when the response doesn't hold
 * every upload.
 */
export const reconcileOrder = (
  wanted: CatalogPhoto[],
  saved: CatalogPhoto[],
  uploadedOffset: number,
): CatalogPhoto[] | null => {
  const uploaded = saved.slice(uploadedOffset);
  const newCount = wanted.filter(isNewPhoto).length;
  if (uploaded.length < newCount) return null;
  let next = 0;
  return wanted.map((photo) => {
    if (isNewPhoto(photo)) return photoRef(uploaded[next++]);
    const match = saved.find((item) => item.secure_url === photo.secure_url);
    return photoRef(match || photo);
  });
};

/** A short, actionable message for a failed category save. */
export const categorySaveErrorMessage = (
  result: ApiResponse<unknown>,
  sentOrder: number[] = [],
): string => {
  const wanted =
    result.photoIndex !== undefined ? sentOrder[result.photoIndex] : undefined;
  const which =
    wanted !== undefined
      ? `Photo ${wanted + 1}: `
      : result.photoIndex !== undefined
        ? `Photo ${result.photoIndex + 1}: `
        : "";
  const detail = String(result.error || "").trim();

  if (result.code === "TIMEOUT")
    return "The upload timed out before the server answered. It may still have saved — check the category list before trying again.";
  if (result.code === "NETWORK_ERROR")
    return "Couldn't reach the server. Check your connection and try again.";
  if (result.status === 413)
    return result.code
      ? `${which}${detail || "The photo is too large."}`
      : "The upload is too large for the server. Use smaller photos or add fewer at a time.";
  if (result.status === 400)
    return `${which}${detail || "The server rejected the request."}`;
  if (result.status === 502)
    return result.code === "CLOUDINARY_TIMEOUT"
      ? `${which}The image host timed out. Nothing was saved — try again.`
      : `${which}The image host couldn't store the photo. Nothing was saved — try again.`;
  if (result.status !== undefined && result.status >= 500)
    return detail || "The server couldn't save the category. Try again.";
  return detail || "Failed to save category";
};

export type CategorySaveResult = ApiResponse<unknown> & {
  /** Saved, but something after the save (photo order) didn't apply. */
  warning?: string;
};

type Transport = Pick<typeof ecomApi, "post" | "put" | "postForm" | "putForm">;

const failure = (
  result: ApiResponse<unknown>,
  sentOrder: number[],
): CategorySaveResult => ({
  ...result,
  error: categorySaveErrorMessage(result, sentOrder),
});

/**
 * Creates (no `id`) or updates a category. `data` is the category form;
 * `data.photos` is the wanted photo list in display order.
 */
export const saveCategoryWithPhotos = async (
  id: string | undefined,
  data: Fields & { photos?: CatalogPhoto[] },
  transport: Transport = ecomApi,
): Promise<CategorySaveResult> => {
  const wanted = Array.isArray(data.photos) ? data.photos : [];
  if (!wanted.length) return { error: NO_PHOTO_MESSAGE, code: "NO_PHOTOS" };
  if (wanted.length > MAX_CATEGORY_PHOTOS)
    return {
      error: `A category can have at most ${MAX_CATEGORY_PHOTOS} photos.`,
      code: "TOO_MANY_PHOTOS",
    };

  const mode = id ? "update" : "create";
  const plan = planCategoryPhotos(wanted, mode);
  const fields = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== "photos"),
  );
  const updatePath = (categoryId: string) => `category-update/${categoryId}`;

  // Only existing photos: small JSON body (sets order, drops removed ones).
  if (!plan.newPhotos.length) {
    const body = { ...fields, photos: plan.existing };
    const result = id
      ? await transport.put(updatePath(id), body)
      : await transport.post("category-add", body);
    return result.error ? failure(result, plan.sentOrder) : result;
  }

  let form: FormData;
  try {
    form = buildCategoryForm(fields, plan, { keepPhotos: mode === "update" });
  } catch {
    return {
      error: "A selected photo couldn't be read. Remove it and add it again.",
      code: "INVALID_LOCAL_PHOTO",
    };
  }
  const options = { timeoutMs: CATEGORY_UPLOAD_TIMEOUT_MS };
  const first = id
    ? await transport.putForm(updatePath(id), form, options)
    : await transport.postForm("category-add", form, options);
  if (first.error) return failure(first, plan.sentOrder);
  if (!plan.needsReorder) return first;

  // A new photo goes before an existing one (replace, make primary, or a
  // create that also keeps existing photos): set the final order.
  const created = savedCategory(first.data);
  const savedId = id || String(created._id || created.id || "");
  const finalOrder = reconcileOrder(
    wanted,
    savedPhotos(first.data),
    mode === "update" ? plan.existing.length : 0,
  );
  const orderWarning = (reason: string) =>
    `Category saved, but the photo order couldn't be updated (${reason}). Reopen the category to fix the order.`;
  if (!savedId || !finalOrder)
    return {
      ...first,
      warning: orderWarning("the server response had no photo list"),
    };
  const second = await transport.put(updatePath(savedId), {
    photos: finalOrder,
  });
  if (second.error)
    return {
      ...first,
      warning: orderWarning(categorySaveErrorMessage(second)),
    };
  return second;
};
