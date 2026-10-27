import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  FilterX,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  CheckCheck,
  EyeOff,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { blogService } from "../../../../services/apiService";
import BlogFormDialog from "./BlogFormDialog";
import BlogDeleteDialog from "./BlogDeleteDialog";
import BlogCard, { BlogCardSkeleton, type BlogCardLayout } from "./BlogCard";
import CatalogEmptyState from "../CatalogEmptyState";
import CatalogSearchField from "../CatalogSearchField";
import CatalogDeleteDialog from "../CatalogDeleteDialog";
import BlogPreviewDialog from "./BlogPreviewDialog";
import { useToast } from "../../../Toast";
import { hasBlogPrefill } from "../../../../utils/blogPrefill";
import { extractArrayPayload } from "../../../../utils/apiPayload";
import {
  blogCategoryOptions,
  blogCounts,
  blogStatus,
  filterAndSortBlogs,
  referenceId,
  type BlogSort,
  type BlogStatusFilter,
  type CrmBlog,
} from "../../../../utils/blogList";
import {
  LiquidBadge,
  LiquidButton,
  LiquidCheckbox,
  LiquidDropdown,
  LiquidIconButton,
  LiquidMultiSelect,
} from "../../../ui/liquid";

const VIEW_STORAGE_KEY = "aquacrm:blogs-view";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
];

const readStoredView = (): BlogCardLayout => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

type ApiResult = { data?: unknown; error?: string; errors?: unknown };

const describeError = (response: ApiResult, fallback: string) => {
  const details = Array.isArray(response.errors)
    ? response.errors
        .map((item: { field?: string; message?: string }) =>
          [item?.field, item?.message].filter(Boolean).join(": "),
        )
        .filter(Boolean)
    : [];
  return [response.error, ...details].filter(Boolean).join(" • ") || fallback;
};

// The API populates references; send ids back like the editor does.
const toUpdatePayload = (blog: CrmBlog, overrides: Partial<CrmBlog>) => ({
  ...blog,
  category: referenceId(blog.category) || null,
  subCategory: referenceId(blog.subCategory) || null,
  product: referenceId(blog.product) || null,
  ...overrides,
});

const AquaInnerProductBlog = () => {
  const { showToast } = useToast();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [blogs, setBlogs] = useState<CrmBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<CrmBlog | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<CrmBlog | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [blogToDelete, setBlogToDelete] = useState<CrmBlog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkProgress, setBulkProgress] = useState<{
    label: string;
    done: number;
    total: number;
  } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BlogStatusFilter>("all");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<BlogSort>("newest");
  const [view, setView] = useState<BlogCardLayout>(readStoredView);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // "all" includes drafts (staff-only); the storefront default hides them.
      const response = (await blogService.getAllBlogs("all")) as ApiResult;
      if (response?.error) throw new Error(response.error);
      const body = response?.data as { blogs?: unknown } | undefined;
      setBlogs(
        Array.isArray(body?.blogs)
          ? (body.blogs as CrmBlog[])
          : extractArrayPayload<CrmBlog>(body),
      );
    } catch (fetchError) {
      console.error("Failed to fetch blogs:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch blogs",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    if (!hasBlogPrefill()) return;
    setSelectedBlog(null);
    setShowModal(true);
  }, [location.search, location.hash]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Storage can be unavailable (private mode); the view just won't persist.
    }
  }, [view]);

  const counts = useMemo(() => blogCounts(blogs), [blogs]);
  const categoryOptions = useMemo(() => blogCategoryOptions(blogs), [blogs]);
  const visibleBlogs = useMemo(
    () =>
      filterAndSortBlogs(blogs, { query, status, excludedCategories, sort }),
    [blogs, query, status, excludedCategories, sort],
  );
  const selectedCategories = categoryOptions
    .map((option) => option.value)
    .filter((value) => !excludedCategories.includes(value));
  const filtersActive =
    Boolean(query.trim()) || status !== "all" || excludedCategories.length > 0;

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setExcludedCategories([]);
  };

  const setBusy = (id: string, busy: boolean) =>
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const previewBlog = previewId
    ? blogs.find((blog) => blog._id === previewId) || null
    : null;
  const selectedBlogs = blogs.filter((blog) => selectedIds.has(blog._id));
  const selectedDrafts = selectedBlogs.filter(
    (blog) => blogStatus(blog) === "draft",
  );
  const selectedPublished = selectedBlogs.filter(
    (blog) => blogStatus(blog) === "published",
  );
  const visibleSelectedCount = visibleBlogs.filter((blog) =>
    selectedIds.has(blog._id),
  ).length;
  const allVisibleSelected =
    visibleBlogs.length > 0 && visibleSelectedCount === visibleBlogs.length;

  const setSelected = (blog: CrmBlog, selected: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(blog._id);
      else next.delete(blog._id);
      return next;
    });

  const selectAllVisible = () =>
    setSelectedIds(
      (current) =>
        new Set([...current, ...visibleBlogs.map((blog) => blog._id)]),
    );
  const deselectAll = () => setSelectedIds(new Set());

  const openEditor = (blog: CrmBlog | null) => {
    setPreviewId(null);
    setDuplicateSource(null);
    setSelectedBlog(blog);
    setShowModal(true);
  };

  const openDuplicate = (blog: CrmBlog) => {
    setPreviewId(null);
    setSelectedBlog(null);
    setDuplicateSource(blog);
    setShowModal(true);
  };

  /** Saves a new status; resolves to an error message or "". */
  const updateStatus = async (
    blog: CrmBlog,
    nextStatus: "draft" | "published",
  ) => {
    setBusy(blog._id, true);
    try {
      const response = (await blogService.updateBlog(
        blog._id,
        toUpdatePayload(blog, { status: nextStatus }),
      )) as ApiResult;
      if (response?.error)
        return describeError(response, "Failed to update blog");
      const saved = (response.data as { data?: CrmBlog } | undefined)?.data;
      setBlogs((current) =>
        current.map((item) =>
          item._id === blog._id
            ? saved?._id
              ? saved
              : { ...item, status: nextStatus }
            : item,
        ),
      );
      return "";
    } catch (updateError) {
      return updateError instanceof Error
        ? updateError.message
        : "Failed to update blog";
    } finally {
      setBusy(blog._id, false);
    }
  };

  /** Deletes a blog; resolves to an error message or "". */
  const deleteOne = async (blog: CrmBlog) => {
    setBusy(blog._id, true);
    try {
      const result = (await blogService.deleteBlog(blog._id)) as ApiResult;
      if (result?.error) return describeError(result, "Failed to delete blog");
      setBlogs((previous) => previous.filter((item) => item._id !== blog._id));
      setPreviewId((current) => (current === blog._id ? null : current));
      return "";
    } catch (deleteError) {
      return deleteError instanceof Error
        ? deleteError.message
        : "Failed to delete blog";
    } finally {
      setBusy(blog._id, false);
    }
  };

  const toggleStatus = async (blog: CrmBlog) => {
    if (busyIds.has(blog._id) || bulkProgress) return;
    const nextStatus = blogStatus(blog) === "draft" ? "published" : "draft";
    const failure = await updateStatus(blog, nextStatus);
    if (failure) showToast(failure, "error");
    else
      showToast(
        nextStatus === "published" ? "Blog published" : "Blog moved to drafts",
        "success",
      );
  };

  const confirmDelete = async () => {
    if (!blogToDelete || deleting) return;
    setDeleting(true);
    const failure = await deleteOne(blogToDelete);
    setDeleting(false);
    if (failure) {
      showToast(failure, "error");
      return;
    }
    setSelected(blogToDelete, false);
    showToast("Blog deleted", "success");
    setBlogToDelete(null);
  };

  // Runs one request at a time; failed blogs stay selected so they can be retried.
  const runBulk = async (
    label: string,
    targets: CrmBlog[],
    operation: (blog: CrmBlog) => Promise<string>,
  ) => {
    if (bulkProgress || targets.length === 0) return;
    const failures: Array<{ blog: CrmBlog; message: string }> = [];
    setBulkProgress({ label, done: 0, total: targets.length });
    for (const [index, blog] of targets.entries()) {
      const message = await operation(blog);
      if (message) failures.push({ blog, message });
      setBulkProgress({ label, done: index + 1, total: targets.length });
    }
    setBulkProgress(null);
    setSelectedIds(new Set(failures.map((failure) => failure.blog._id)));
    const succeeded = targets.length - failures.length;
    if (failures.length === 0) {
      showToast(
        `${label}: ${succeeded} blog${succeeded === 1 ? "" : "s"}`,
        "success",
      );
    } else {
      const first = failures[0];
      showToast(
        `${label}: ${succeeded} of ${targets.length} done. “${first.blog.title}” failed: ${first.message}${
          failures.length > 1
            ? ` (+${failures.length - 1} more, still selected)`
            : ""
        }`,
        "error",
      );
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const response = (
      selectedBlog
        ? await blogService.updateBlog(selectedBlog._id, data)
        : await blogService.addBlog(data)
    ) as ApiResult;

    // The editor shows this message in its own error banner.
    if (response.error)
      throw new Error(describeError(response, "Failed to save blog"));

    showToast(
      selectedBlog
        ? "Blog updated"
        : duplicateSource
          ? "Copy created"
          : "Blog created",
      "success",
    );
    setShowModal(false);
    await fetchBlogs();
  };

  const statFilters: Array<{
    value: BlogStatusFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: counts.total },
    { value: "published", label: "Published", count: counts.published },
    { value: "draft", label: "Drafts", count: counts.drafts },
  ];

  const initialLoading = loading && blogs.length === 0 && !error;

  return (
    <div className="min-w-0 p-4 sm:p-6">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-950 dark:text-white">
            <BookOpen
              className="h-6 w-6 shrink-0 text-sky-500"
              aria-hidden="true"
            />
            Product Blogs
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Write, edit and publish product articles and guides. Drafts stay off
            the storefront until you publish them.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <LiquidIconButton
            type="button"
            aria-label="Refresh blogs"
            title="Refresh"
            onClick={() => void fetchBlogs()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
          </LiquidIconButton>
          <LiquidButton
            type="button"
            variant="primary"
            onClick={() => openEditor(null)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New blog
          </LiquidButton>
        </div>
      </motion.header>

      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by status"
      >
        {statFilters.map((item) => {
          const active = status === item.value;
          return (
            <LiquidButton
              key={item.value}
              type="button"
              variant={active ? "primary" : "soft"}
              aria-pressed={active}
              onClick={() => setStatus(item.value)}
              className="min-w-0"
            >
              {item.label}
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs tabular-nums dark:bg-white/15">
                {item.count}
              </span>
            </LiquidButton>
          );
        })}
        {counts.aiDrafts > 0 && (
          <LiquidBadge className="self-center border-violet-400/40 bg-violet-500/15 text-violet-700 dark:text-violet-200">
            {counts.aiDrafts} AI draft{counts.aiDrafts === 1 ? "" : "s"} to
            review
          </LiquidBadge>
        )}
      </div>

      <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end">
        <CatalogSearchField
          value={query}
          onChange={setQuery}
          placeholder="Title, keyword, tag, product…"
          className="sm:col-span-2 lg:col-span-1"
        />
        <LiquidDropdown
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => setStatus(value as BlogStatusFilter)}
          wrapperClassName="min-w-0"
        />
        <LiquidMultiSelect
          label="Categories"
          values={selectedCategories}
          options={categoryOptions}
          onChange={(values) =>
            setExcludedCategories(
              categoryOptions
                .map((option) => option.value)
                .filter((value) => !values.includes(value)),
            )
          }
          placeholder="No categories"
          allLabel="All categories"
          searchPlaceholder="Search categories…"
          disabled={categoryOptions.length === 0}
          wrapperClassName="min-w-0"
        />
        <LiquidDropdown
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(value) => setSort(value as BlogSort)}
          wrapperClassName="min-w-0"
        />
        <div className="flex gap-2" role="group" aria-label="Layout">
          <LiquidIconButton
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className={view === "grid" ? "ring-2 ring-sky-400/60" : ""}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
          <LiquidIconButton
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={view === "list" ? "ring-2 ring-sky-400/60" : ""}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
        </div>
      </div>

      <div className="mb-3 flex min-h-[2.75rem] flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {visibleBlogs.length > 0 && (
            <LiquidCheckbox
              label={allVisibleSelected ? "Deselect all" : "Select all"}
              checked={allVisibleSelected}
              indeterminate={visibleSelectedCount > 0 && !allVisibleSelected}
              disabled={Boolean(bulkProgress)}
              onChange={() =>
                allVisibleSelected ? deselectAll() : selectAllVisible()
              }
            />
          )}
          <p
            className="text-sm font-semibold text-neutral-500 dark:text-white/55"
            aria-live="polite"
          >
            {initialLoading
              ? "Loading blogs…"
              : `Showing ${visibleBlogs.length} of ${blogs.length} blog${blogs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {filtersActive && (
          <LiquidButton type="button" variant="ghost" onClick={clearFilters}>
            <FilterX className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </LiquidButton>
        )}
      </div>

      <AnimatePresence>
        {(selectedBlogs.length > 0 || bulkProgress) && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            role="region"
            aria-label="Bulk actions"
            className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-400/30 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur-xl"
          >
            <p className="mr-auto text-sm font-bold" aria-live="polite">
              {bulkProgress
                ? `${bulkProgress.label}… ${bulkProgress.done}/${bulkProgress.total}`
                : `${selectedBlogs.length} selected`}
            </p>
            {bulkProgress ? (
              <div
                className="h-2 w-40 overflow-hidden rounded-full bg-white/10"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all"
                  style={{
                    width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                  }}
                />
              </div>
            ) : (
              <>
                {!allVisibleSelected && (
                  <LiquidButton
                    type="button"
                    variant="ghost"
                    onClick={selectAllVisible}
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    Select all {visibleBlogs.length}
                  </LiquidButton>
                )}
                <LiquidButton
                  type="button"
                  variant="ghost"
                  onClick={deselectAll}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Deselect all
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="soft"
                  disabled={selectedDrafts.length === 0}
                  onClick={() =>
                    void runBulk("Published", selectedDrafts, (blog) =>
                      updateStatus(blog, "published"),
                    )
                  }
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Publish
                  {selectedDrafts.length ? ` ${selectedDrafts.length}` : ""}
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="soft"
                  disabled={selectedPublished.length === 0}
                  onClick={() =>
                    void runBulk("Moved to drafts", selectedPublished, (blog) =>
                      updateStatus(blog, "draft"),
                    )
                  }
                >
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                  To drafts
                  {selectedPublished.length
                    ? ` ${selectedPublished.length}`
                    : ""}
                </LiquidButton>
                <LiquidButton
                  type="button"
                  variant="danger"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete {selectedBlogs.length}
                </LiquidButton>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300"
        >
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => void fetchBlogs()}
            disabled={loading}
          >
            Retry
          </LiquidButton>
        </div>
      )}

      <div
        className={
          view === "grid"
            ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
            : "grid grid-cols-1 gap-4"
        }
      >
        {initialLoading ? (
          Array.from({ length: 6 }, (_, index) => (
            <BlogCardSkeleton key={index} layout={view} />
          ))
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleBlogs.map((blog, index) => (
              <BlogCard
                key={blog._id}
                blog={blog}
                layout={view}
                index={index}
                busy={busyIds.has(blog._id)}
                selected={selectedIds.has(blog._id)}
                onSelectedChange={bulkProgress ? undefined : setSelected}
                onPreview={(item) => setPreviewId(item._id)}
                onEdit={openEditor}
                onDelete={setBlogToDelete}
                onToggleStatus={(item) => void toggleStatus(item)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {!initialLoading &&
        !error &&
        visibleBlogs.length === 0 &&
        (blogs.length === 0 ? (
          <CatalogEmptyState
            icon={BookOpen}
            title="No blogs yet"
            description="Write your first article, or start from a topic with Create with AI."
            action={
              <LiquidButton
                type="button"
                variant="primary"
                onClick={() => openEditor(null)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New blog
              </LiquidButton>
            }
          />
        ) : (
          <CatalogEmptyState
            icon={BookOpen}
            title="No blogs match these filters"
            action={
              <LiquidButton type="button" variant="soft" onClick={clearFilters}>
                <FilterX className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </LiquidButton>
            }
          />
        ))}

      <BlogFormDialog
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedBlog}
        duplicateOf={duplicateSource}
        existingBlogs={blogs}
      />

      <BlogPreviewDialog
        blog={previewBlog}
        open={Boolean(previewBlog)}
        busy={previewBlog ? busyIds.has(previewBlog._id) : false}
        onClose={() => setPreviewId(null)}
        onEdit={openEditor}
        onDuplicate={openDuplicate}
        onToggleStatus={(blog) => void toggleStatus(blog)}
        onDelete={setBlogToDelete}
      />

      <CatalogDeleteDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedBlogs.length} blog${selectedBlogs.length === 1 ? "" : "s"}?`}
        widthStorageKey="aquacrm:blog-bulk-delete-width"
        loading={Boolean(bulkProgress)}
        loadingLabel={
          bulkProgress
            ? `Deleting ${bulkProgress.done}/${bulkProgress.total}…`
            : "Deleting…"
        }
        confirmLabel={`Delete ${selectedBlogs.length}`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() =>
          void runBulk("Deleted", selectedBlogs, deleteOne).then(() =>
            setBulkDeleteOpen(false),
          )
        }
        message={
          <div className="space-y-2">
            <p>These blogs will be permanently deleted:</p>
            <ul className="list-disc space-y-0.5 pl-5 text-white/80">
              {selectedBlogs.slice(0, 8).map((blog) => (
                <li key={blog._id} className="break-words">
                  {blog.title}
                </li>
              ))}
            </ul>
            {selectedBlogs.length > 8 && (
              <p>…and {selectedBlogs.length - 8} more.</p>
            )}
            {selectedPublished.length > 0 && (
              <p className="text-amber-300">
                {selectedPublished.length} of them{" "}
                {selectedPublished.length === 1 ? "is" : "are"} live on the
                storefront.
              </p>
            )}
          </div>
        }
      />

      <BlogDeleteDialog
        show={Boolean(blogToDelete)}
        loading={deleting}
        onClose={() => {
          if (!deleting) setBlogToDelete(null);
        }}
        onConfirm={confirmDelete}
        blogTitle={blogToDelete?.title || ""}
      />
    </div>
  );
};

export default AquaInnerProductBlog;
