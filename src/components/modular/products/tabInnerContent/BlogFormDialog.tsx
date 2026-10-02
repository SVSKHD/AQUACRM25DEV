import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  categoriesService,
  subcategoriesService,
} from "../../../../services/apiService";
import RichTextEditor from "../../../ui/RichTextEditor";
import ResizableFloatingSidebar from "../../../ui/ResizableFloatingSidebar";
import { LiquidButton, SidebarRequestBanner, type RequestState } from "../../../ui/liquid";
import { usePersistentFormDraft } from "../../../../hooks/usePersistentFormDraft";

type TaxonomyOption = { id: string; title: string; category_id?: string };

const referenceId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "object") {
    const reference = value as { _id?: string; id?: string };
    return String(reference._id || reference.id || "");
  }
  return String(value);
};

interface Blog {
  _id?: string;
  title: string;
  description: string;
  titleImages: { secure_url: string }[];
  photos: { secure_url: string }[];
  keywords?: string;
  keyphrases?: string;
  slug?: string;
  shortDescription?: string;
  summary?: string;
  keyHighlights?: string[];
  tags?: string[];
  notes?: string;
  brand?: string;
  category?: unknown;
  subCategory?: unknown;
  product?: unknown;
}

interface BlogFormDialogProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData: Blog | null;
}

const BlogFormDialog = ({
  show,
  onClose,
  onSubmit,
  initialData,
}: BlogFormDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    photos: [] as { secure_url: string }[],
    keywords: "",
    keyphrases: "",
    slug: "",
    shortDescription: "",
    summary: "",
    keyHighlights: "",
    tags: "",
    notes: "",
    brand: "Aquakart",
    category: "",
    subCategory: "",
  });
  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const blogDraft = usePersistentFormDraft({
    key: `blogs:${initialData?._id || "create"}`,
    value: formData,
    onRestore: setFormData,
    enabled: show,
  });

  useEffect(() => {
    setDescriptionError("");
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        imageUrl: initialData.titleImages?.[0]?.secure_url || "",
        photos: initialData.photos || [],
        keywords: initialData.keywords || "",
        keyphrases: initialData.keyphrases || "",
        slug: initialData.slug || "",
        shortDescription: initialData.shortDescription || "",
        summary: initialData.summary || "",
        keyHighlights: Array.isArray(initialData.keyHighlights)
          ? initialData.keyHighlights.join("\n")
          : "",
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(", ") : "",
        notes: initialData.notes || "",
        brand: initialData.brand || "Aquakart",
        category: referenceId(initialData.category),
        subCategory: referenceId(
          initialData.subCategory || (initialData as any).subcategory,
        ),
      });
    } else {
      setFormData({
        title:
          new URLSearchParams(window.location.search).get("title") || "",
        description:
          new URLSearchParams(window.location.search).get("description") ||
          new URLSearchParams(window.location.search).get("content") ||
          "",
        imageUrl:
          new URLSearchParams(window.location.search).get("imageUrl") ||
          new URLSearchParams(window.location.search).get("image") ||
          "",
        photos: [],
        keywords:
          new URLSearchParams(window.location.search).get("keywords") || "",
        keyphrases:
          new URLSearchParams(window.location.search).get("keyphrases") ||
          new URLSearchParams(window.location.search).get("keyPhrases") ||
          "",
        slug: new URLSearchParams(window.location.search).get("slug") || "",
        shortDescription:
          new URLSearchParams(window.location.search).get("shortDescription") ||
          new URLSearchParams(window.location.search).get("excerpt") ||
          "",
        summary: new URLSearchParams(window.location.search).get("summary") || "",
        keyHighlights:
          new URLSearchParams(window.location.search).get("keyHighlights") ||
          new URLSearchParams(window.location.search).get("highlights") ||
          "",
        tags: new URLSearchParams(window.location.search).get("tags") || "",
        notes: new URLSearchParams(window.location.search).get("notes") || "",
        brand:
          new URLSearchParams(window.location.search).get("brand") || "Aquakart",
        category:
          new URLSearchParams(window.location.search).get("category") || "",
        subCategory:
          new URLSearchParams(window.location.search).get("subCategory") ||
          new URLSearchParams(window.location.search).get("subcategory") ||
          "",
      });
    }
  }, [initialData, show]);

  useEffect(() => {
    if (!show) return;
    const loadTaxonomy = async () => {
      const [categoryResponse, subcategoryResponse] = await Promise.all([
        categoriesService.getAll(),
        subcategoriesService.getAll(),
      ]);
      setCategories(
        (categoryResponse.data?.data || []).map((item: any) => ({
          id: String(item._id || item.id),
          title: item.title || item.name || "Untitled category",
        })),
      );
      setSubcategories(
        (subcategoryResponse.data?.data || []).map((item: any) => ({
          id: String(item._id || item.id),
          title: item.title || item.name || "Untitled subcategory",
          category_id: referenceId(item.category ?? item.category_id),
        })),
      );
    };
    loadTaxonomy();
  }, [show]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, { secure_url: reader.result as string }],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const hasDescriptionContent = (html: string) => {
    const container = document.createElement("div");
    container.innerHTML = html || "";
    return Boolean(
      container.textContent?.replace(/\u00a0/g, " ").trim(),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasDescriptionContent(formData.description)) {
      setDescriptionError("Blog description is required.");
      return;
    }

    setDescriptionError("");
    setLoading(true);
    setRequestState("loading");
    setRequestError("");
    try {
      const payload = {
        ...initialData,
        title: formData.title,
        description: formData.description,
        titleImages: formData.imageUrl.trim()
          ? [{ secure_url: formData.imageUrl.trim() }]
          : [],
        photos: formData.photos,
        keywords: formData.keywords,
        keyphrases: formData.keyphrases,
        slug: formData.slug,
        shortDescription: formData.shortDescription,
        summary: formData.summary,
        keyHighlights: formData.keyHighlights
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
        tags: formData.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notes: formData.notes,
        category: formData.category || null,
        subCategory: formData.subCategory || null,
        product: referenceId(initialData?.product) || null,
        brand: formData.brand || "Aquakart",
      };

      await onSubmit(payload);
      await blogDraft.clearDraft();
      setRequestState("success");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save blog";
      setRequestState("error");
      setRequestError(message);
      console.error("Error submitting blog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResizableFloatingSidebar
      open={show}
      onClose={onClose}
      title={initialData ? "Edit Blog" : "Create New Blog"}
      subtitle="Write, format, categorize, and manage blog media."
      widthStorageKey="aquacrm:blog-editor-width"
      initialWidth={620}
      minWidth={460}
      maxWidth={1040}
    >
      <SidebarRequestBanner
        state={requestState}
        message={requestError}
        title={initialData ? "Blog update failed" : "Blog creation failed"}
        onDismiss={() => {
          setRequestState("idle");
          setRequestError("");
        }}
      />
<form
        id="blog-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs font-semibold text-emerald-100">
          Draft auto-saves locally. Closing keeps your work.
        </div>
        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
      setFormData({ ...formData, title: e.target.value })
            }
            className="glass-input w-full"
            placeholder="Enter blog title"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
      Category
            </label>
            <select
      required
      value={formData.category}
      onChange={(event) =>
        setFormData({
          ...formData,
          category: event.target.value,
          subCategory: "",
        })
      }
      className="glass-input w-full"
            >
      <option value="">Select category</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.title}
        </option>
      ))}
            </select>
            {formData.category && (
      <p className="mt-1 text-xs text-emerald-600">
        Selected:{" "}
        {
          categories.find(
            (item) => item.id === formData.category,
          )?.title
        }
      </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
      Subcategory
            </label>
            <select
      value={formData.subCategory}
      disabled={!formData.category}
      onChange={(event) =>
        setFormData({
          ...formData,
          subCategory: event.target.value,
        })
      }
      className="glass-input w-full disabled:opacity-50"
            >
      <option value="">No subcategory</option>
      {subcategories
        .filter(
          (item) => item.category_id === formData.category,
        )
        .map((subcategory) => (
          <option key={subcategory.id} value={subcategory.id}>
            {subcategory.title}
          </option>
        ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
              Slug
            </label>
            <input
              value={formData.slug}
              onChange={(event) =>
                setFormData({ ...formData, slug: event.target.value })
              }
              className="glass-input w-full"
              placeholder="soft-water-guide"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
              Short description
            </label>
            <input
              value={formData.shortDescription}
              maxLength={320}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  shortDescription: event.target.value,
                })
              }
              className="glass-input w-full"
              placeholder="Short search/listing summary"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
      Brand
            </label>
            <input
      value={formData.brand}
      onChange={(event) =>
        setFormData({ ...formData, brand: event.target.value })
      }
      className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
      Keywords
            </label>
            <input
      value={formData.keywords}
      onChange={(event) =>
        setFormData({
          ...formData,
          keywords: event.target.value,
        })
      }
      className="glass-input w-full"
      placeholder="softener, water treatment"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
              Keyphrases
            </label>
            <input
              value={formData.keyphrases}
              onChange={(event) =>
                setFormData({ ...formData, keyphrases: event.target.value })
              }
              className="glass-input w-full"
              placeholder="hard water solutions, water softener guide"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
              Tags
            </label>
            <input
              value={formData.tags}
              onChange={(event) =>
                setFormData({ ...formData, tags: event.target.value })
              }
              className="glass-input w-full"
              placeholder="guide, softeners, home care"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
            Summary
          </label>
          <textarea
            value={formData.summary}
            onChange={(event) =>
              setFormData({ ...formData, summary: event.target.value })
            }
            rows={3}
            className="glass-input w-full"
            placeholder="Optional article summary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
            Key highlights
          </label>
          <textarea
            value={formData.keyHighlights}
            onChange={(event) =>
              setFormData({ ...formData, keyHighlights: event.target.value })
            }
            rows={4}
            className="glass-input w-full"
            placeholder={"One highlight per line"}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white/70">
            Internal notes
          </label>
          <input
            value={formData.notes}
            maxLength={300}
            onChange={(event) =>
      setFormData({ ...formData, notes: event.target.value })
            }
            className="glass-input w-full"
            placeholder="Optional notes for the team"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Title Image
          </label>
          <div className="flex items-center gap-4">
            <div className="relative w-full">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
      />
            </div>
          </div>
          <div className="mt-4 relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group">
            <img
              src={formData.imageUrl || "/Default.png"}
              alt={formData.imageUrl ? "Blog image preview" : "Aquakart fallback"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-xs font-semibold text-white">
              {formData.imageUrl
                ? "Blog image preview"
                : "No image supplied — AquaKart fallback will be used"}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
            Gallery Photos
          </label>
          <div className="relative w-full mb-4">
            <input
      type="file"
      accept="image/*"
      multiple
      onChange={handlePhotosUpload}
      className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
            />
          </div>

          {formData.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {formData.photos.map((photo, index) => (
        <div
          key={index}
          className="relative h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group"
        >
          <img
            src={photo.secure_url}
            alt={`Gallery ${index}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => removePhoto(index)}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
            </div>
          )}
        </div>

        <RichTextEditor
          label="Blog Description"
          value={formData.description}
          onChange={(description) => {
            setFormData((current) => ({
      ...current,
      description,
            }));
            if (descriptionError) setDescriptionError("");
          }}
          placeholder="Write the blog description here…"
          minHeight={320}
          error={descriptionError}
        />
      </form>

      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex justify-end gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        <LiquidButton type="button" onClick={onClose} variant="soft">
          Close
        </LiquidButton>
        <LiquidButton
          type="button"
          variant="danger"
          onClick={() => {
            void blogDraft.clearDraft().then(() => {
              setFormData({
                title: "",
                description: "",
                imageUrl: "",
                photos: [],
                keywords: "",
                keyphrases: "",
                slug: "",
                shortDescription: "",
                summary: "",
                keyHighlights: "",
                tags: "",
                notes: "",
                brand: "Aquakart",
                category: "",
                subCategory: "",
              });
            });
          }}
        >
          Clear draft
        </LiquidButton>
        <LiquidButton
          type="submit"
          form="blog-form"
          disabled={loading}
          variant="primary"
          requestState={requestState}
          loadingLabel={initialData ? "Updating blog…" : "Creating blog…"}
          errorLabel="Failed — retry"
        >
          {initialData ? "Update Blog" : "Create Blog"}
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
};

export default BlogFormDialog;
