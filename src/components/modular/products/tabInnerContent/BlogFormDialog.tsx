import ResponsiveDialog from "../../../ui/ResponsiveDialog";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../../ai/AIFieldAnimation";
import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";

import type {
  Blog,
  BlogPayload,
  BlogImage,
} from "../../../../services/blogTypes";

import { generateBlogFromTopic } from "../../../../services/blogAI";

interface BlogFormDialogProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: BlogPayload) => Promise<void>;
  initialData: Blog | null;
}

const BlogFormDialog = ({
  show,
  onClose,
  onSubmit,
  initialData,
}: BlogFormDialogProps) => {
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiMessage, setAIMessage] = useState("");
  const requestVersion = useRef(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    photos: [] as BlogImage[],
  });
  const [fields, setFields] = useState({
    keywords: "",
    notes: "",
    category: "",
    product: "",
    brand: "",
    ratings: 0,
    numberOfReviews: 0,
  });
  const [extraFields, setExtraFields] = useState("{}");
  const [error, setError] = useState("");
  const [readingImages, setReadingImages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestVersion.current += 1;
    setGenerating(false);
    setTopic("");
    setAIMessage("");
    setError("");
    setFields({
      keywords: initialData?.keywords || "",
      notes: initialData?.notes || "",
      category: initialData?.category || "",
      product: initialData?.product || "",
      brand: initialData?.brand || "",
      ratings: initialData?.ratings || 0,
      numberOfReviews: initialData?.numberOfReviews || 0,
    });
    const knownKeys = new Set([
      "_id",
      "__v",
      "createdAt",
      "updatedAt",
      "title",
      "description",
      "titleImages",
      "photos",
      "keywords",
      "notes",
      "category",
      "product",
      "brand",
      "ratings",
      "numberOfReviews",
    ]);
    setExtraFields(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(initialData || {}).filter(
            ([key]) => !knownKeys.has(key),
          ),
        ),
        null,
        2,
      ),
    );
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        imageUrl: initialData.titleImages?.[0]?.secure_url || "",
        photos: initialData.photos || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        photos: [],
      });
    }
  }, [initialData, show]);

  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );

  const generateDraft = async () => {
    if (generating || loading || readingImages || !topic.trim()) return;
    const version = ++requestVersion.current;
    setGenerating(true);
    setError("");
    setAIMessage("");
    try {
      const draft = await generateBlogFromTopic(topic);
      if (version !== requestVersion.current) return;
      setFormData({
        title: draft.title,
        description: draft.description,
        imageUrl: draft.titleImages[0]?.secure_url || "",
        photos: draft.photos,
      });
      setFields({
        keywords: draft.keywords,
        notes: draft.notes,
        category: draft.category,
        product: draft.product,
        brand: draft.brand,
        ratings: draft.ratings,
        numberOfReviews: draft.numberOfReviews,
      });
      setExtraFields("{}");
      setAIMessage(
        draft.titleImages.length
          ? "All fields filled. Product images reused; ratings and reviews start at zero. Review the draft, then create your blog."
          : "Draft filled. The selected product has no images; add a title image and gallery photos. Ratings and reviews start at zero.",
      );
    } catch (err) {
      if (version === requestVersion.current)
        setError(
          err instanceof Error ? err.message : "Failed to generate blog",
        );
    } finally {
      if (version === requestVersion.current) setGenerating(false);
    }
  };

  const readImage = (file: File): Promise<BlogImage> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ secure_url: String(reader.result) });
      reader.onerror = () =>
        reject(new Error("Could not read image. Please try again."));
      reader.readAsDataURL(file);
    });

  const uploadImages = async (
    event: React.ChangeEvent<HTMLInputElement>,
    gallery: boolean,
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setReadingImages((count) => count + 1);
    setError("");
    try {
      const images = await Promise.all(files.map(readImage));
      setFormData((previous) =>
        gallery
          ? { ...previous, photos: [...previous.photos, ...images] }
          : { ...previous, imageUrl: images[0].secure_url },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read images");
    } finally {
      setReadingImages((count) => count - 1);
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || readingImages || generating) return;
    setError("");
    setLoading(true);
    try {
      const extras: unknown = JSON.parse(extraFields);
      if (!extras || typeof extras !== "object" || Array.isArray(extras))
        throw new Error("Additional fields must be a JSON object.");
      const additional = Object.fromEntries(
        Object.entries(extras).filter(
          ([key]) => !["_id", "__v", "createdAt", "updatedAt"].includes(key),
        ),
      );
      const originalTitle = initialData?.titleImages || [];
      const titleImages = formData.imageUrl
        ? formData.imageUrl === originalTitle[0]?.secure_url
          ? originalTitle
          : [{ secure_url: formData.imageUrl }, ...originalTitle.slice(1)]
        : [];
      const payload: BlogPayload = {
        ...additional,
        ...fields,
        title: formData.title.trim(),
        description: formData.description,
        titleImages,
        photos: formData.photos,
      };
      if (!payload.title || !payload.description.trim())
        throw new Error("Title and content are required.");

      await onSubmit(payload);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save blog");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIFieldAnimationScope active={generating}>
      <ResponsiveDialog
        open={show}
        onClose={onClose}
        title={initialData ? "Edit Blog" : "Create New Blog"}
        size="md"
        busy={loading || generating || readingImages > 0}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                if (!loading && !readingImages && !generating) onClose();
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="blog-form"
              disabled={loading || readingImages > 0 || generating}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving..."
                : initialData
                  ? "Update Blog"
                  : "Create Blog"}
            </button>
          </>
        }
      >
        <form id="blog-form" onSubmit={handleSubmit} className="space-y-6">
          {!initialData && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-400/20 dark:bg-violet-500/10">
              <label
                htmlFor="blog-ai-topic"
                className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-200"
              >
                <Sparkles className="h-4 w-4" /> Create with AI
              </label>
              <AIFieldAnimation>
                <textarea
                  id="blog-ai-topic"
                  className="glass-input w-full mt-3"
                  rows={2}
                  maxLength={2000}
                  disabled={generating || loading}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. How to choose a water softener for an apartment in Hyderabad"
                />
              </AIFieldAnimation>
              <p className="mt-2 text-xs text-slate-500 dark:text-white/60">
                Generate fills the form and replaces the current draft. Product
                and category are matched to your catalog; available product
                images are reused.
              </p>
              <button
                type="button"
                onClick={() => void generateDraft()}
                disabled={
                  !topic.trim() || generating || loading || readingImages > 0
                }
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating
                  ? "Filling blog fields..."
                  : "Generate and fill all fields"}
              </button>
              {aiMessage && (
                <p
                  role="status"
                  className="mt-3 text-sm text-violet-700 dark:text-violet-200"
                >
                  {aiMessage}
                </p>
              )}
            </div>
          )}
          <fieldset
            disabled={loading || generating}
            className="space-y-6 min-w-0"
          >
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {initialData && (
              <p className="text-xs text-neutral-500">
                ID: {initialData._id}
                {initialData.createdAt
                  ? ` ? Created: ${initialData.createdAt}`
                  : ""}
                {initialData.updatedAt
                  ? ` ? Updated: ${initialData.updatedAt}`
                  : ""}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  "keywords",
                  "notes",
                  "category",
                  "product",
                  "brand",
                  "ratings",
                  "numberOfReviews",
                ] as const
              ).map((key) => (
                <label
                  key={key}
                  className="block text-sm font-medium text-black dark:text-white/70"
                >
                  {
                    {
                      keywords: "Keywords",
                      notes: "Notes",
                      category: "Category ID",
                      product: "Product ID",
                      brand: "Brand",
                      ratings: "Rating",
                      numberOfReviews: "Number of reviews",
                    }[key]
                  }
                  <AIFieldAnimation>
                    <input
                      className="glass-input w-full mt-2"
                      type={
                        key === "ratings" || key === "numberOfReviews"
                          ? "number"
                          : "text"
                      }
                      min={
                        key === "ratings" || key === "numberOfReviews"
                          ? 0
                          : undefined
                      }
                      max={key === "ratings" ? 5 : undefined}
                      step={
                        key === "ratings"
                          ? "0.1"
                          : key === "numberOfReviews"
                            ? "1"
                            : undefined
                      }
                      value={fields[key]}
                      onChange={(event) =>
                        setFields((previous) => ({
                          ...previous,
                          [key]:
                            key === "ratings" || key === "numberOfReviews"
                              ? Number(event.target.value)
                              : event.target.value,
                        }))
                      }
                    />
                  </AIFieldAnimation>
                </label>
              ))}
            </div>
            <label className="block text-sm font-medium text-black dark:text-white/70">
              Additional key/value pairs (JSON)
              <AIFieldAnimation>
                <textarea
                  className="glass-input w-full mt-2 min-h-[100px] font-mono"
                  value={extraFields}
                  onChange={(event) => setExtraFields(event.target.value)}
                />
              </AIFieldAnimation>
            </label>
            <div>
              <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                Title
              </label>
              <AIFieldAnimation>
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
              </AIFieldAnimation>
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                Title Image
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-full">
                  <AIFieldAnimation>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={loading || readingImages > 0 || generating}
                      onChange={(event) => void uploadImages(event, false)}
                      className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
                    />
                  </AIFieldAnimation>
                </div>
              </div>
              <label className="block text-sm mt-2">
                Title image URL
                <AIFieldAnimation>
                  <input
                    className="glass-input w-full mt-2"
                    value={formData.imageUrl}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        imageUrl: event.target.value,
                      }))
                    }
                  />
                </AIFieldAnimation>
              </label>
              {formData.imageUrl && (
                <div className="mt-4 relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      Preview
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                Gallery Photos
              </label>
              <div className="relative w-full mb-4">
                <AIFieldAnimation>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={loading || readingImages > 0 || generating}
                    onChange={(event) => void uploadImages(event, true)}
                    className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
                  />
                </AIFieldAnimation>
              </div>

              <label className="block text-sm mb-4">
                Gallery image URL
                <AIFieldAnimation>
                  <input
                    type="url"
                    className="glass-input w-full mt-2"
                    placeholder="Paste an image URL and press Enter"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        const input = event.currentTarget;
                        if (input.value.trim() && input.checkValidity()) {
                          const secure_url = input.value.trim();
                          setFormData((previous) => ({
                            ...previous,
                            photos: [...previous.photos, { secure_url }],
                          }));
                          input.value = "";
                        } else input.reportValidity();
                      }
                    }}
                  />
                </AIFieldAnimation>
              </label>
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

            <div>
              <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                Content (HTML)
              </label>
              <AIFieldAnimation>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="glass-input w-full min-h-[200px] font-mono text-sm"
                  placeholder="<p>Write your content here...</p>"
                />
              </AIFieldAnimation>
              <p className="mt-1 text-xs text-neutral-500">
                Supports HTML tags for formatting.
              </p>
            </div>
          </fieldset>
        </form>
      </ResponsiveDialog>
    </AIFieldAnimationScope>
  );
};

export default BlogFormDialog;
