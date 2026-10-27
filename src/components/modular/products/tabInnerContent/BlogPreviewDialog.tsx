import { useMemo } from "react";
import {
  Bot,
  CalendarDays,
  Copy,
  CopyPlus,
  Edit2,
  ExternalLink,
  EyeOff,
  FolderOpen,
  Package,
  Send,
  Tag,
  Trash2,
} from "lucide-react";
import SidebarDialog from "../../../ui/SidebarDialog";
import { LiquidBadge, LiquidButton, LiquidPanel } from "../../../ui/liquid";
import { useToast } from "../../../Toast";
import { STOREFRONT_ORIGIN } from "../../../../config/api";
import { sanitizeHtml } from "../../../../utils/sanitizeHtml";
import {
  blogCoverUrl,
  blogPublicPath,
  blogStatus,
  referenceTitle,
  type CrmBlog,
} from "../../../../utils/blogList";
import { BlogStatusBadge } from "./BlogCard";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const Chips = ({ label, items }: { label: string; items: string[] }) =>
  items.length ? (
    <div>
      <p className="liquid-label">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  ) : null;

const splitList = (value?: string) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Read-only view of a blog with every blog action in the footer. */
export default function BlogPreviewDialog({
  blog,
  open,
  busy = false,
  onClose,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: {
  blog: CrmBlog | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onEdit: (blog: CrmBlog) => void;
  onDuplicate: (blog: CrmBlog) => void;
  onToggleStatus: (blog: CrmBlog) => void;
  onDelete: (blog: CrmBlog) => void;
}) {
  const { showToast } = useToast();
  const html = useMemo(
    () => sanitizeHtml(blog?.description || ""),
    [blog?.description],
  );

  if (!blog) return null;

  const draft = blogStatus(blog) === "draft";
  const publicUrl = `${STOREFRONT_ORIGIN}${blogPublicPath(blog)}`;
  const cover = blogCoverUrl(blog);
  const category = referenceTitle(blog.category);
  const subcategory = referenceTitle(blog.subCategory);
  const product = referenceTitle(blog.product);
  const highlights = Array.isArray(blog.keyHighlights)
    ? (blog.keyHighlights as string[]).filter(Boolean)
    : [];
  const gallery = (blog.photos || []).filter((photo) => photo?.secure_url);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast("Link copied", "success");
    } catch {
      showToast(`Copy failed. Link: ${publicUrl}`, "error");
    }
  };

  return (
    <SidebarDialog
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title="Blog preview"
      description={
        draft
          ? "Draft — not visible on the storefront."
          : "Published on the storefront."
      }
      widthStorageKey="aquacrm:blog-preview-width"
      footer={
        <>
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => onDelete(blog)}
            disabled={busy}
            className="mr-auto text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => onDuplicate(blog)}
            disabled={busy}
          >
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => onToggleStatus(blog)}
            requestState={busy ? "loading" : "idle"}
            loadingLabel={draft ? "Publishing…" : "Moving…"}
          >
            {draft ? (
              <Send className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
            {draft ? "Publish" : "Move to drafts"}
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="primary"
            onClick={() => onEdit(blog)}
            disabled={busy}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            Edit
          </LiquidButton>
        </>
      }
    >
      <article className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <img
            src={cover || "/Default.png"}
            alt=""
            className="h-56 w-full object-cover sm:h-72"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <BlogStatusBadge blog={blog} />
            {blog.generatedBy === "ai" && (
              <LiquidBadge className="border-violet-400/40 bg-violet-500/30 text-violet-100">
                <Bot className="h-3 w-3" aria-hidden="true" /> AI draft
              </LiquidBadge>
            )}
          </div>
        </div>

        <header className="space-y-2">
          <h2 className="break-words text-2xl font-bold leading-tight text-white">
            {blog.title}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-white/60">
            {category && (
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {category}
                {subcategory && ` / ${subcategory}`}
              </span>
            )}
            {product && (
              <span className="inline-flex items-center gap-1">
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                {product}
              </span>
            )}
            {blog.brand && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                {blog.brand}
              </span>
            )}
            {formatDate(blog.createdAt) && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(blog.createdAt)}
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <code className="min-w-0 flex-1 break-all text-xs text-sky-200">
            {publicUrl}
          </code>
          <LiquidButton
            type="button"
            variant="ghost"
            onClick={() => void copyLink()}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy link
          </LiquidButton>
          {!draft && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-button liquid-button-ghost"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open
            </a>
          )}
        </div>
        {!blog.slug && (
          <p className="text-xs font-semibold text-amber-300">
            No slug yet — the address uses the blog's id. Edit the blog to add a
            readable slug.
          </p>
        )}

        {blog.shortDescription && (
          <p className="text-base leading-relaxed text-white/80">
            {blog.shortDescription}
          </p>
        )}

        {highlights.length > 0 && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="liquid-label">Key highlights</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-50">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <LiquidPanel className="p-4 sm:p-5">
          {html ? (
            <div
              className="rich-text-editor-content text-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-white/50">No description.</p>
          )}
        </LiquidPanel>

        {gallery.length > 0 && (
          <div>
            <p className="liquid-label">Gallery ({gallery.length})</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((photo, index) => (
                <img
                  key={`${photo.secure_url.slice(-24)}-${index}`}
                  src={photo.secure_url}
                  alt={`Gallery photo ${index + 1}`}
                  loading="lazy"
                  className="aspect-video w-full rounded-2xl border border-white/10 object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {typeof blog.summary === "string" && blog.summary.trim() && (
          <div>
            <p className="liquid-label">Summary</p>
            <p className="text-sm leading-relaxed text-white/75">
              {blog.summary}
            </p>
          </div>
        )}

        <Chips label="Tags" items={Array.isArray(blog.tags) ? blog.tags : []} />
        <Chips label="Keywords" items={splitList(blog.keywords)} />
        <Chips label="Keyphrases" items={splitList(blog.keyphrases)} />

        {blog.notes && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="liquid-label">Internal notes</p>
            <p className="text-sm text-amber-50">{blog.notes}</p>
          </div>
        )}
      </article>
    </SidebarDialog>
  );
}
