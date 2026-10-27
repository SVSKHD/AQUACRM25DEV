import { motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  Edit2,
  Eye,
  EyeOff,
  FolderOpen,
  Send,
  Trash2,
} from "lucide-react";
import {
  LiquidBadge,
  LiquidButton,
  LiquidCheckbox,
  LiquidIconButton,
} from "../../../ui/liquid";
import {
  blogCoverUrl,
  blogExcerpt,
  blogStatus,
  referenceTitle,
  type CrmBlog,
} from "../../../../utils/blogList";

export type BlogCardLayout = "grid" | "list";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export function BlogStatusBadge({ blog }: { blog: CrmBlog }) {
  const draft = blogStatus(blog) === "draft";
  return (
    <LiquidBadge
      className={
        draft
          ? "border-amber-400/40 bg-amber-400/15 text-amber-700 dark:text-amber-200"
          : "border-emerald-400/40 bg-emerald-400/15 text-emerald-700 dark:text-emerald-200"
      }
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${draft ? "bg-amber-400" : "bg-emerald-400"}`}
      />
      {draft ? "Draft" : "Published"}
    </LiquidBadge>
  );
}

interface BlogCardProps {
  blog: CrmBlog;
  layout: BlogCardLayout;
  index: number;
  busy?: boolean;
  selected?: boolean;
  onSelectedChange?: (blog: CrmBlog, selected: boolean) => void;
  onPreview: (blog: CrmBlog) => void;
  onEdit: (blog: CrmBlog) => void;
  onDelete: (blog: CrmBlog) => void;
  onToggleStatus: (blog: CrmBlog) => void;
}

export default function BlogCard({
  blog,
  layout,
  index,
  busy = false,
  selected = false,
  onSelectedChange,
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
}: BlogCardProps) {
  const reduceMotion = useReducedMotion();
  const draft = blogStatus(blog) === "draft";
  const cover = blogCoverUrl(blog);
  const category = referenceTitle(blog.category);
  const excerpt = blogExcerpt(blog, layout === "list" ? 220 : 140);
  const created = formatDate(blog.createdAt);
  const list = layout === "list";

  return (
    <motion.article
      layout={!reduceMotion}
      initial={
        reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
      }
      transition={{
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : Math.min(index, 12) * 0.035,
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      aria-busy={busy || undefined}
      className={`group relative flex min-w-0 overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/40 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-500/10 dark:border-white/10 dark:bg-white/[0.04] ${
        selected ? "ring-2 ring-sky-400/80" : ""
      } ${list ? "flex-col sm:flex-row" : "h-full flex-col"}`}
    >
      <div
        className={`relative shrink-0 overflow-hidden ${
          list ? "h-44 sm:h-auto sm:w-56" : "h-48"
        }`}
      >
        <img
          src={cover || "/Default.png"}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
        {onSelectedChange && (
          <div className="absolute right-2 top-2 rounded-xl bg-slate-950/55 px-1.5 backdrop-blur">
            <LiquidCheckbox
              ariaLabel={`Select “${blog.title}”`}
              checked={selected}
              onChange={(event) => onSelectedChange(blog, event.target.checked)}
            />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <BlogStatusBadge blog={blog} />
          {blog.generatedBy === "ai" && (
            <LiquidBadge className="border-violet-400/40 bg-violet-500/20 text-violet-700 dark:text-violet-200">
              <Bot className="h-3 w-3" aria-hidden="true" /> AI
            </LiquidBadge>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 break-words text-lg font-bold leading-snug text-neutral-950 transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
          {blog.title || "Untitled blog"}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-neutral-500 dark:text-white/55">
          {category && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{category}</span>
            </span>
          )}
          {created && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {created}
            </span>
          )}
        </div>

        {excerpt && (
          <p
            className={`break-words text-sm leading-relaxed text-neutral-600 dark:text-white/65 ${list ? "line-clamp-3" : "line-clamp-2"}`}
          >
            {excerpt}
          </p>
        )}

        {Array.isArray(blog.tags) && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {blog.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300"
              >
                #{tag}
              </span>
            ))}
            {blog.tags.length > 4 && (
              <span className="text-[11px] font-bold text-neutral-400">
                +{blog.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <LiquidButton
            type="button"
            variant="primary"
            className="min-w-0 flex-1"
            onClick={() => onEdit(blog)}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            Edit
          </LiquidButton>
          <LiquidIconButton
            type="button"
            aria-label={`Preview “${blog.title}”`}
            title="Preview"
            onClick={() => onPreview(blog)}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
          <LiquidIconButton
            type="button"
            aria-label={
              draft
                ? `Publish “${blog.title}”`
                : `Move “${blog.title}” to drafts`
            }
            title={draft ? "Publish" : "Move to drafts"}
            disabled={busy}
            onClick={() => onToggleStatus(blog)}
            className={
              busy
                ? "animate-pulse"
                : draft
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-amber-600 dark:text-amber-300"
            }
          >
            {draft ? (
              <Send className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
          </LiquidIconButton>
          <LiquidIconButton
            type="button"
            aria-label={`Delete “${blog.title}”`}
            title="Delete"
            disabled={busy}
            onClick={() => onDelete(blog)}
            className="text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
        </div>
      </div>
    </motion.article>
  );
}

export function BlogCardSkeleton({ layout }: { layout: BlogCardLayout }) {
  const list = layout === "list";
  return (
    <div
      aria-hidden="true"
      className={`flex overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/30 dark:border-white/10 dark:bg-white/[0.03] ${
        list ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div
        className={`animate-pulse bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/10 ${list ? "h-44 sm:h-40 sm:w-56" : "h-48"}`}
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-neutral-300/50 motion-reduce:animate-none dark:bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded-lg bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/[0.07]" />
        <div className="h-3 w-full animate-pulse rounded-lg bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/[0.07]" />
        <div className="mt-2 h-11 w-full animate-pulse rounded-2xl bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/[0.07]" />
      </div>
    </div>
  );
}
