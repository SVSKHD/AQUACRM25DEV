import React, { useEffect, useMemo, useRef, useState } from "react";
import { History, Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import {
  categoriesService,
  productsService,
  subcategoriesService,
} from "../../../../services/apiService";
import RichTextEditor from "../../../ui/RichTextEditor";
import SidebarDialog from "../../../ui/SidebarDialog";
import FormSection from "../../../ui/FormSection";
import {
  LiquidButton,
  LiquidDropdown,
  LiquidInput,
  LiquidTextarea,
  SidebarRequestBanner,
  type RequestState,
} from "../../../ui/liquid";
import { useToast } from "../../../Toast";
import { useFormDraftSession } from "../../../../hooks/useFormDraftSession";
import {
  getBlogPrefillParams,
  hasBlogPrefill,
} from "../../../../utils/blogPrefill";
import { extractArrayPayload } from "../../../../utils/apiPayload";
import {
  blogStatus,
  findSlugConflict,
  isValidSlug,
  referenceId,
  stripHtml,
  slugify,
  type BlogStatus,
  type CrmBlog,
} from "../../../../utils/blogList";
import type { CatalogPhoto } from "../../../../utils/productList";
import { generateBlogFromTopic } from "../../../../services/blogAI";
import AIFieldAnimation, {
  AIFieldAnimationScope,
} from "../../../ai/AIFieldAnimation";
import PhotoUploader from "../PhotoUploader";
import BlogSeoPanel from "./BlogSeoPanel";
import { focusPhrase, type AutoFixProposal } from "../../../../utils/blogSeo";

type TaxonomyOption = { id: string; title: string; category_id?: string };
type RawRecord = Record<string, unknown>;

const STATUS_OPTIONS = [
  { value: "published", label: "Published — visible on the storefront" },
  { value: "draft", label: "Draft — hidden until published" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  titleImages: [] as CatalogPhoto[],
  photos: [] as CatalogPhoto[],
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
  product: "",
  status: "published" as BlogStatus,
};

type BlogForm = typeof EMPTY_FORM;

const MAX_GALLERY = 10;

// Ids we invent for images that have none; stripped before saving so the backend
// keeps assigning its own (it stores `id` verbatim for non-data URLs).
const LOCAL_ID_PREFIX = "local-";

const toPhotos = (list: unknown): CatalogPhoto[] =>
  (Array.isArray(list) ? list : [])
    .map((item) =>
      typeof item === "string" ? { secure_url: item } : (item as RawRecord),
    )
    .filter((item) => typeof item?.secure_url === "string" && item.secure_url)
    .map((item, index) => ({
      ...item,
      secure_url: String(item.secure_url),
      id: String(
        item.id ||
          item.public_id ||
          `${LOCAL_ID_PREFIX}${index}-${String(item.secure_url).slice(-16)}`,
      ),
    }));

const forSave = (photos: CatalogPhoto[]) =>
  photos.map(({ id, ...rest }) =>
    id.startsWith(LOCAL_ID_PREFIX) ? rest : { id, ...rest },
  );

const formFromBlog = (blog: CrmBlog): BlogForm => ({
  title: blog.title || "",
  description: blog.description || "",
  titleImages: toPhotos(blog.titleImages).slice(0, 1),
  photos: toPhotos(blog.photos),
  keywords: blog.keywords || "",
  keyphrases: blog.keyphrases || "",
  slug: blog.slug || "",
  shortDescription: blog.shortDescription || "",
  summary: typeof blog.summary === "string" ? blog.summary : "",
  keyHighlights: Array.isArray(blog.keyHighlights)
    ? blog.keyHighlights.join("\n")
    : "",
  tags: Array.isArray(blog.tags) ? blog.tags.join(", ") : "",
  notes: blog.notes || "",
  brand: blog.brand || "Aquakart",
  category: referenceId(blog.category),
  subCategory: referenceId(
    blog.subCategory || (blog as { subcategory?: unknown }).subcategory,
  ),
  product: referenceId(blog.product),
  status: blogStatus(blog),
});

const formFromUrlPrefill = (): BlogForm => {
  const params = getBlogPrefillParams();
  const image = params.get("imageUrl") || params.get("image");
  const title = params.get("title") || "";
  return {
    ...EMPTY_FORM,
    title,
    description: params.get("description") || params.get("content") || "",
    titleImages: image ? toPhotos([image]) : [],
    keywords: params.get("keywords") || "",
    keyphrases: params.get("keyphrases") || params.get("keyPhrases") || "",
    slug: params.get("slug") || slugify(title),
    shortDescription:
      params.get("shortDescription") || params.get("excerpt") || "",
    summary: params.get("summary") || "",
    keyHighlights:
      params.get("keyHighlights") || params.get("highlights") || "",
    tags: params.get("tags") || "",
    notes: params.get("notes") || "",
    brand: params.get("brand") || "Aquakart",
    category: params.get("category") || "",
    subCategory: params.get("subCategory") || params.get("subcategory") || "",
    product: params.get("product") || "",
    status: params.get("status") === "draft" ? "draft" : "published",
  };
};

// Drafts saved before titleImages existed stored the title image as `imageUrl`.
const upgradeDraft = (value: BlogForm): BlogForm => {
  const legacy = value as BlogForm & { imageUrl?: string };
  const titleImages =
    Array.isArray(legacy.titleImages) && legacy.titleImages.length
      ? legacy.titleImages
      : legacy.imageUrl
        ? [{ secure_url: legacy.imageUrl }]
        : [];
  const { imageUrl: _legacyImage, ...rest } = legacy;
  void _legacyImage;
  return {
    ...rest,
    titleImages: toPhotos(titleImages).slice(0, 1),
    photos: toPhotos(rest.photos),
  };
};

const hasDescriptionContent = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html || "";
  return Boolean(container.textContent?.trim());
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

interface BlogFormDialogProps {
  show: boolean;
  onClose: () => void;
  /** Rejects with an Error whose message is shown in the panel. */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Blog being edited; null creates a new one. */
  initialData: CrmBlog | null;
  /** Creates a new draft copied from this blog. */
  duplicateOf?: CrmBlog | null;
  /** Loaded blogs, for slug conflict checks. */
  existingBlogs?: CrmBlog[];
}

const BlogFormDialog = ({
  show,
  onClose,
  onSubmit,
  initialData,
  duplicateOf = null,
  existingBlogs = [],
}: BlogFormDialogProps) => {
  const { showToast } = useToast();
  const editing = Boolean(initialData);
  const urlPrefill = !initialData && !duplicateOf && show && hasBlogPrefill();

  // Stable for each open: the form starts here and "Discard changes" returns here.
  const baseline = useMemo<BlogForm>(() => {
    if (initialData) return formFromBlog(initialData);
    if (duplicateOf) {
      const copy = formFromBlog(duplicateOf);
      return {
        ...copy,
        title: `${copy.title} (copy)`.slice(0, 120),
        slug: "",
        status: "draft",
      };
    }
    return urlPrefill ? formFromUrlPrefill() : EMPTY_FORM;
    // `show` re-reads URL prefills each time the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, duplicateOf, show]);

  const draft = useFormDraftSession<BlogForm>({
    key: initialData
      ? `blogs:${initialData._id}`
      : duplicateOf
        ? `blogs:duplicate:${duplicateOf._id}`
        : "blogs:create",
    open: show,
    baseline,
    // Explicit URL prefills win over an older local create draft.
    skipRestore: urlPrefill,
    normalize: upgradeDraft,
  });
  const formData = draft.value;
  const setFormData = draft.setValue;
  const patch = (changes: Partial<BlogForm>) =>
    setFormData((current) => ({ ...current, ...changes }));

  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [subcategories, setSubcategories] = useState<TaxonomyOption[]>([]);
  const [products, setProducts] = useState<TaxonomyOption[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [requestError, setRequestError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiMessage, setAIMessage] = useState("");
  const [aiError, setAIError] = useState("");
  // Bumped whenever the dialog resets/unmounts so stale AI results are dropped.
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current += 1;
    setGenerating(false);
    setTopic("");
    setAIMessage("");
    setAIError("");
    setDescriptionError("");
    setCategoryError("");
    setRequestState("idle");
    setRequestError("");
  }, [initialData, show, baseline]);

  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const loadTaxonomy = async () => {
      setTaxonomyLoading(true);
      const [categoryResponse, subcategoryResponse, productResponse] =
        await Promise.all([
          categoriesService.getAll(),
          subcategoriesService.getAll(),
          productsService.getAll(),
        ]);
      if (cancelled) return;
      setTaxonomyLoading(false);
      const toOption = (fallback: string) => (item: RawRecord) => ({
        id: String(item._id || item.id || ""),
        title: String(item.title || item.name || fallback),
      });
      setProducts(
        extractArrayPayload<RawRecord>(productResponse.data)
          .map(toOption("Untitled product"))
          .filter((item) => item.id),
      );
      setCategories(
        extractArrayPayload<RawRecord>(categoryResponse.data)
          .map(toOption("Untitled category"))
          .filter((item) => item.id),
      );
      setSubcategories(
        extractArrayPayload<RawRecord>(subcategoryResponse.data)
          .map((item) => ({
            ...toOption("Untitled subcategory")(item),
            category_id: referenceId(item.category ?? item.category_id),
          }))
          .filter((item) => item.id),
      );
    };
    void loadTaxonomy();
    return () => {
      cancelled = true;
    };
  }, [show]);

  const slug = formData.slug.trim();
  const slugConflict = findSlugConflict(slug, existingBlogs, initialData?._id);
  const slugFormatError =
    slug && !isValidSlug(slug)
      ? "Use lowercase letters, numbers and single hyphens, e.g. water-softener-guide."
      : "";
  const slugChangedOnPublished =
    editing &&
    blogStatus(initialData!) === "published" &&
    (initialData?.slug || "") !== slug &&
    Boolean(initialData?.slug);

  // A new blog's slug follows its title while it still matches the title.
  const slugFollowsTitle = (form: BlogForm) =>
    !editing && form.slug === slugify(form.title);
  const setTitle = (title: string) =>
    setFormData((current) => ({
      ...current,
      title,
      ...(slugFollowsTitle(current) ? { slug: slugify(title) } : {}),
    }));

  // Shared context for the field robots' AI suggestions.
  const focus = focusPhrase(formData);
  const categoryName =
    categories.find((item) => item.id === formData.category)?.title || "";
  const productName =
    products.find((item) => item.id === formData.product)?.title || "";
  const blogContext = [
    formData.title && `Title: ${formData.title}`,
    focus && `Focus keyphrase: ${focus}`,
    categoryName && `Category: ${categoryName}`,
    productName && `Related product: ${productName}`,
    formData.shortDescription &&
      `Short description: ${formData.shortDescription}`,
    `Article excerpt: ${stripHtml(formData.description).slice(0, 1500) || "(not written yet)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const seoInput = useMemo(
    () => ({
      title: formData.title,
      slug: formData.slug,
      shortDescription: formData.shortDescription,
      keywords: formData.keywords,
      keyphrases: formData.keyphrases,
      tags: formData.tags,
      summary: formData.summary,
      keyHighlights: formData.keyHighlights,
      description: formData.description,
      hasTitleImage: formData.titleImages.length > 0,
    }),
    [formData],
  );

  // Auto fix: a new title still drives the slug of a new blog unless the AI
  // proposed a slug too.
  const applySeoFix = (fix: AutoFixProposal) =>
    setFormData((current) => ({
      ...current,
      ...fix,
      ...(fix.title && !fix.slug && slugFollowsTitle(current)
        ? { slug: slugify(fix.title) }
        : {}),
    }));

  const generateDraft = async () => {
    if (generating || saving || !topic.trim()) return;
    const version = ++requestVersion.current;
    setGenerating(true);
    setAIError("");
    setAIMessage("");
    try {
      const result = await generateBlogFromTopic(topic);
      if (version !== requestVersion.current) return;
      setFormData((current) => ({
        ...current,
        title: result.title,
        slug: slugFollowsTitle(current) ? slugify(result.title) : current.slug,
        description: result.description,
        titleImages: toPhotos(result.titleImages).slice(0, 1),
        photos: toPhotos(result.photos).slice(0, MAX_GALLERY),
        keywords: result.keywords,
        notes: result.notes.slice(0, 300),
        brand: result.brand || "Aquakart",
        category: result.category,
        subCategory: "",
        product: result.product,
      }));
      setDescriptionError("");
      setCategoryError("");
      setAIMessage(
        result.titleImages.length
          ? "All fields filled. Product images reused. Review the draft, then create your blog."
          : "Draft filled. The selected product has no images; add a title image and gallery photos.",
      );
    } catch (err) {
      if (version === requestVersion.current)
        setAIError(
          err instanceof Error ? err.message : "Failed to generate blog",
        );
    } finally {
      if (version === requestVersion.current) setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating || saving) return;

    const missingCategory = !formData.category;
    const missingDescription = !hasDescriptionContent(formData.description);
    setCategoryError(missingCategory ? "Choose a category." : "");
    setDescriptionError(
      missingDescription ? "Blog description is required." : "",
    );
    if (
      missingCategory ||
      missingDescription ||
      slugFormatError ||
      slugConflict
    ) {
      setRequestState("error");
      setRequestError(
        [
          missingCategory && "Choose a category.",
          missingDescription && "Write the blog description.",
          slugFormatError && `Slug: ${slugFormatError}`,
          slugConflict &&
            `Slug “${slug}” is already used by “${slugConflict.title}”.`,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return;
    }

    setSaving(true);
    setRequestState("loading");
    setRequestError("");
    try {
      const payload = {
        ...(initialData ?? {}),
        title: formData.title.trim(),
        description: formData.description,
        titleImages: forSave(formData.titleImages.slice(0, 1)),
        photos: forSave(formData.photos.slice(0, MAX_GALLERY)),
        keywords: formData.keywords,
        keyphrases: formData.keyphrases,
        slug,
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
        product: formData.product || null,
        brand: formData.brand || "Aquakart",
        status: formData.status,
      };

      await onSubmit(payload);
      await draft.clearDraft();
      setRequestState("idle");
    } catch (error) {
      setRequestState("error");
      setRequestError(
        error instanceof Error ? error.message : "Failed to save blog",
      );
    } finally {
      setSaving(false);
    }
  };

  const discardLabel = editing ? "Discard changes" : "Clear form";

  return (
    <AIFieldAnimationScope active={generating}>
      <SidebarDialog
        open={show}
        onClose={onClose}
        busy={saving}
        size="lg"
        title={
          editing
            ? "Edit blog"
            : duplicateOf
              ? "Duplicate blog"
              : "Create new blog"
        }
        description={
          editing
            ? `Editing “${initialData?.title}”.`
            : duplicateOf
              ? `New draft copied from “${duplicateOf.title}”. Nothing is saved until you create it.`
              : "Write, format, categorize, and manage blog media."
        }
        widthStorageKey="aquacrm:blog-editor-width"
        footer={
          <>
            <p
              className="mr-auto self-center text-xs font-semibold text-white/55"
              aria-live="polite"
            >
              {draft.dirty
                ? draft.savedAt
                  ? `Unsaved changes · kept on this device ${new Date(draft.savedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                  : "Unsaved changes"
                : editing
                  ? "No changes"
                  : ""}
            </p>
            <LiquidButton
              type="button"
              variant="ghost"
              onClick={draft.discard}
              disabled={!draft.dirty || saving || generating}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {discardLabel}
            </LiquidButton>
            <LiquidButton
              type="button"
              onClick={onClose}
              variant="soft"
              disabled={saving}
            >
              Close
            </LiquidButton>
            <LiquidButton
              type="submit"
              form="blog-form"
              disabled={generating || (editing && !draft.dirty)}
              variant="primary"
              requestState={requestState === "loading" ? "loading" : "idle"}
              loadingLabel={editing ? "Updating blog…" : "Creating blog…"}
            >
              {editing
                ? "Update blog"
                : formData.status === "draft"
                  ? "Save draft"
                  : "Create & publish"}
            </LiquidButton>
          </>
        }
      >
        <SidebarRequestBanner
          state={requestState}
          message={requestError}
          title={editing ? "Blog not updated" : "Blog not created"}
          onDismiss={() => {
            setRequestState("idle");
            setRequestError("");
          }}
        />
        {draft.restoredAt && draft.dirty && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
          >
            <History className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              Restored unsaved changes from {formatTime(draft.restoredAt)}.
              {editing && " The saved version may have changed since."}
            </span>
            <LiquidButton type="button" variant="ghost" onClick={draft.discard}>
              {editing ? "Use saved version" : "Start fresh"}
            </LiquidButton>
          </div>
        )}
        <form id="blog-form" onSubmit={handleSubmit} className="space-y-5">
          {!editing && (
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Create with
                AI
              </p>
              <AIFieldAnimation
                assist={{
                  value: topic,
                  onChange: setTopic,
                  context: "blog topic for the AI generator",
                  maxChars: 2000,
                  suggest: {
                    label: "Suggest a topic",
                    instruction:
                      "Suggest one specific, search-friendly blog topic for Aquakart, a Hyderabad store for water softeners, water purifiers and sand filters. Write it as one sentence describing the article",
                  },
                }}
              >
                <LiquidTextarea
                  id="blog-ai-topic"
                  aria-label="Blog topic for AI"
                  wrapperClassName="mt-3 w-full"
                  rows={2}
                  maxLength={2000}
                  disabled={generating || saving}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. How to choose a water softener for an apartment in Hyderabad"
                />
              </AIFieldAnimation>
              <p className="mt-2 text-xs text-white/60">
                Generate fills the title, description, keywords, notes, brand,
                category, product and images, replacing those fields in the
                current draft. Product and category are matched to your catalog;
                available product images are reused.
              </p>
              <LiquidButton
                type="button"
                variant="primary"
                className="mt-3"
                onClick={() => void generateDraft()}
                disabled={!topic.trim() || generating || saving}
                aria-busy={generating || undefined}
              >
                <span className="inline-flex items-center gap-2">
                  {generating ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  {generating
                    ? "Filling blog fields…"
                    : "Generate and fill all fields"}
                </span>
              </LiquidButton>
              {aiMessage && (
                <p role="status" className="mt-3 text-sm text-violet-200">
                  {aiMessage}
                </p>
              )}
              {aiError && (
                <p role="alert" className="mt-3 text-sm text-rose-300">
                  {aiError}
                </p>
              )}
            </div>
          )}
          <fieldset
            disabled={generating || saving}
            className="min-w-0 space-y-5"
          >
            <BlogSeoPanel
              key={initialData?._id || duplicateOf?._id || "new"}
              input={seoInput}
              context={{
                category: categoryName,
                product: productName,
                brand: formData.brand,
              }}
              slugLocked={editing && blogStatus(initialData!) === "published"}
              disabled={generating || saving}
              onApply={applySeoFix}
            />

            <FormSection
              title="Basics"
              description="What the article is and where it appears."
            >
              <AIFieldAnimation
                assist={{
                  value: formData.title,
                  onChange: setTitle,
                  context: "blog title",
                  maxChars: 120,
                  suggest: {
                    label: "Suggest SEO title",
                    instruction: `Write one SEO blog title of 30-65 characters${focus ? ` that starts with or contains "${focus}"` : ""}, natural and click-worthy, for this article:\n${blogContext}`,
                  },
                }}
              >
                <LiquidInput
                  label={`Title * (${formData.title.length}/120)`}
                  wrapperClassName="w-full"
                  type="text"
                  required
                  maxLength={120}
                  value={formData.title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter blog title"
                />
              </AIFieldAnimation>

              <LiquidDropdown
                label="Status"
                value={formData.status}
                options={STATUS_OPTIONS}
                onChange={(status) => patch({ status: status as BlogStatus })}
              />

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <AIFieldAnimation
                    assist={{
                      value: formData.category,
                      onChange: (category) => {
                        patch({ category, subCategory: "" });
                        setCategoryError("");
                      },
                      context: "blog category",
                      options: categories.map((category) => ({
                        value: category.id,
                        label: category.title,
                      })),
                      suggest: {
                        label: "Pick the best category",
                        instruction: `Pick the catalog category that best fits this blog:\n${blogContext}`,
                      },
                    }}
                  >
                    <LiquidDropdown
                      label="Category *"
                      value={formData.category}
                      placeholder={
                        taxonomyLoading && !categories.length
                          ? "Loading categories…"
                          : "Select category"
                      }
                      searchPlaceholder="Search categories…"
                      searchable
                      options={categories.map((category) => ({
                        value: category.id,
                        label: category.title,
                      }))}
                      onChange={(category) => {
                        patch({ category, subCategory: "" });
                        setCategoryError("");
                      }}
                    />
                  </AIFieldAnimation>
                  {categoryError && (
                    <p
                      role="alert"
                      className="mt-1 text-xs font-semibold text-rose-300"
                    >
                      {categoryError}
                    </p>
                  )}
                </div>
                <LiquidDropdown
                  label="Subcategory"
                  value={formData.subCategory}
                  disabled={!formData.category}
                  placeholder={
                    formData.category
                      ? "No subcategory"
                      : "Choose a category first"
                  }
                  searchPlaceholder="Search subcategories…"
                  options={[
                    { value: "", label: "No subcategory" },
                    ...subcategories
                      .filter((item) => item.category_id === formData.category)
                      .map((subcategory) => ({
                        value: subcategory.id,
                        label: subcategory.title,
                      })),
                  ]}
                  onChange={(subCategory) => patch({ subCategory })}
                  wrapperClassName="min-w-0"
                />
              </div>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <AIFieldAnimation
                  assist={{
                    value: formData.product,
                    onChange: (product) => patch({ product }),
                    context: "related product for the blog",
                    options: products.map((product) => ({
                      value: product.id,
                      label: product.title,
                    })),
                    suggest: {
                      label: "Pick the best product",
                      instruction: `Pick the product this blog should promote or link to:\n${blogContext}`,
                    },
                  }}
                >
                  <LiquidDropdown
                    label="Related product"
                    value={formData.product}
                    placeholder={
                      taxonomyLoading && !products.length
                        ? "Loading products…"
                        : "No product"
                    }
                    searchPlaceholder="Search products…"
                    searchable
                    options={[
                      { value: "", label: "No product" },
                      ...products.map((product) => ({
                        value: product.id,
                        label: product.title,
                      })),
                    ]}
                    onChange={(product) => patch({ product })}
                  />
                </AIFieldAnimation>
                <AIFieldAnimation
                  assist={{
                    value: formData.brand,
                    onChange: (brand) => patch({ brand }),
                    context: "brand name",
                    maxChars: 60,
                    suggest: {
                      label: "Suggest brand",
                      instruction: `Name the brand this blog is about in one or two words (e.g. Kent, Aquakart). Use Aquakart if no single brand fits:\n${blogContext}`,
                    },
                  }}
                >
                  <LiquidInput
                    label="Brand"
                    value={formData.brand}
                    onChange={(event) => patch({ brand: event.target.value })}
                  />
                </AIFieldAnimation>
              </div>
            </FormSection>

            <FormSection
              title="Search & discovery"
              description="Slug, summaries and terms used by search engines and the storefront."
            >
              <div className="min-w-0">
                <div className="flex items-end gap-2">
                  <LiquidInput
                    label="Slug"
                    wrapperClassName="min-w-0 flex-1"
                    value={formData.slug}
                    onChange={(event) => patch({ slug: event.target.value })}
                    onBlur={(event) => {
                      const cleaned = slugify(event.target.value);
                      if (cleaned !== formData.slug) patch({ slug: cleaned });
                    }}
                    placeholder="soft-water-guide"
                    aria-invalid={
                      Boolean(slugFormatError || slugConflict) || undefined
                    }
                  />
                  <LiquidButton
                    type="button"
                    variant="soft"
                    onClick={() => patch({ slug: slugify(formData.title) })}
                    disabled={!formData.title.trim()}
                    title="Generate the slug from the title"
                  >
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">From title</span>
                    <span className="sr-only sm:hidden">
                      Generate slug from title
                    </span>
                  </LiquidButton>
                </div>
                <p
                  role={slugFormatError || slugConflict ? "alert" : undefined}
                  className={`mt-1 break-words text-xs font-semibold ${
                    slugFormatError || slugConflict
                      ? "text-rose-300"
                      : slugChangedOnPublished
                        ? "text-amber-300"
                        : "text-white/50"
                  }`}
                >
                  {slugConflict
                    ? `Already used by “${slugConflict.title}”.`
                    : slugFormatError ||
                      (slugChangedOnPublished
                        ? "This blog is published: changing the slug breaks links to the old address."
                        : slug
                          ? `Storefront address: /blog/${slug}`
                          : "Without a slug the storefront uses the blog's id in its address.")}
                </p>
              </div>
              <AIFieldAnimation
                assist={{
                  value: formData.shortDescription,
                  onChange: (shortDescription) => patch({ shortDescription }),
                  context: "blog short description (search snippet)",
                  maxChars: 320,
                  suggest: {
                    label: "Suggest search snippet",
                    instruction: `Write a 120-160 character search snippet${focus ? ` that contains "${focus}"` : ""} and gives a reason to read, for this article:\n${blogContext}`,
                  },
                }}
              >
                <LiquidInput
                  label={`Short description (${formData.shortDescription.length}/320)`}
                  value={formData.shortDescription}
                  maxLength={320}
                  onChange={(event) =>
                    patch({ shortDescription: event.target.value })
                  }
                  placeholder="Short search/listing summary"
                />
              </AIFieldAnimation>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <AIFieldAnimation
                  assist={{
                    value: formData.keywords,
                    onChange: (keywords) => patch({ keywords }),
                    context: "comma-separated SEO keywords",
                    suggest: {
                      label: "Suggest keywords",
                      instruction: `Write 5-8 comma-separated SEO keywords people in India search for, based on this article:\n${blogContext}`,
                    },
                  }}
                >
                  <LiquidInput
                    label="Keywords"
                    value={formData.keywords}
                    onChange={(event) =>
                      patch({ keywords: event.target.value })
                    }
                    placeholder="softener, water treatment"
                  />
                </AIFieldAnimation>
                <AIFieldAnimation
                  assist={{
                    value: formData.keyphrases,
                    onChange: (keyphrases) => patch({ keyphrases }),
                    context: "comma-separated SEO keyphrases",
                    suggest: {
                      label: "Suggest keyphrases",
                      instruction: `Write 2-4 comma-separated search keyphrases (2-5 words each) for this article; put the main one first:\n${blogContext}`,
                    },
                  }}
                >
                  <LiquidInput
                    label="Keyphrases"
                    value={formData.keyphrases}
                    onChange={(event) =>
                      patch({ keyphrases: event.target.value })
                    }
                    placeholder="hard water solutions, water softener guide"
                  />
                </AIFieldAnimation>
              </div>

              <LiquidInput
                label="Tags (comma separated)"
                value={formData.tags}
                onChange={(event) => patch({ tags: event.target.value })}
                placeholder="guide, softeners, home care"
              />

              <LiquidTextarea
                label="Summary"
                value={formData.summary}
                onChange={(event) => patch({ summary: event.target.value })}
                rows={3}
                placeholder="Optional article summary"
              />

              <LiquidTextarea
                label="Key highlights"
                value={formData.keyHighlights}
                onChange={(event) =>
                  patch({ keyHighlights: event.target.value })
                }
                rows={4}
                placeholder={"One highlight per line"}
              />

              <AIFieldAnimation
                assist={{
                  value: formData.notes,
                  onChange: (notes) => patch({ notes }),
                  context: "internal note for the team",
                  maxChars: 300,
                  suggest: {
                    label: "Suggest review notes",
                    instruction: `Write a short internal note for the team listing what to check before publishing this blog (facts, prices, images, links):\n${blogContext}`,
                  },
                }}
              >
                <LiquidInput
                  label={`Internal notes (${formData.notes.length}/300)`}
                  value={formData.notes}
                  maxLength={300}
                  onChange={(event) => patch({ notes: event.target.value })}
                  placeholder="Optional notes for the team"
                />
              </AIFieldAnimation>
            </FormSection>

            <FormSection title="Media">
              <PhotoUploader
                id="blog-title-image"
                label="Title image"
                addLabel={
                  formData.titleImages.length ? "Replace image" : "Upload image"
                }
                maxPhotos={1}
                hint="Shown on cards and at the top of the article. Without one the AquaKart fallback is used. Max 5MB."
                photos={formData.titleImages}
                onChange={(titleImages) => patch({ titleImages })}
                onError={(message) => showToast(message, "error")}
              />
              <PhotoUploader
                id="blog-gallery-photos"
                label="Gallery photo"
                maxPhotos={MAX_GALLERY}
                hint="Shown inside the article. Max 5MB each."
                photos={formData.photos}
                onChange={(photos) => patch({ photos })}
                onError={(message) => showToast(message, "error")}
              />
            </FormSection>

            <FormSection title="Content *">
              <RichTextEditor
                label="Blog description"
                value={formData.description}
                onChange={(description) => {
                  patch({ description });
                  if (descriptionError) setDescriptionError("");
                }}
                placeholder="Write the blog description here…"
                minHeight={320}
                error={descriptionError}
                disabled={generating || saving}
              />
            </FormSection>
          </fieldset>
        </form>
      </SidebarDialog>
    </AIFieldAnimationScope>
  );
};

export default BlogFormDialog;
