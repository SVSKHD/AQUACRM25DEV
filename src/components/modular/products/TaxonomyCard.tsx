import { motion, useReducedMotion } from "framer-motion";
import { Edit2, FolderOpen, Package, Trash2 } from "lucide-react";
import { PhotoCarousel } from "./PhotoCarousel";
import { LiquidBadge, LiquidButton, LiquidIconButton } from "../../ui/liquid";
import type { CatalogTaxonomy } from "../../../utils/productList";

/** Card for a category or subcategory. */
export default function TaxonomyCard<T extends CatalogTaxonomy>({
  item,
  index,
  kindLabel,
  parentTitle,
  productCount,
  onEdit,
  onDelete,
}: {
  item: T;
  index: number;
  kindLabel: string;
  parentTitle?: string;
  productCount: number;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  const reduceMotion = useReducedMotion();
  const keywords = (item.keywords || "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
      }
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
        delay: reduceMotion ? 0 : Math.min(index, 12) * 0.035,
      }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/40 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-xl hover:shadow-sky-500/10 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row"
    >
      <div className="relative h-40 shrink-0 overflow-hidden sm:h-auto sm:w-40">
        <PhotoCarousel photos={item.photos} alt={item.title} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-lg font-bold text-neutral-950 dark:text-white">
            {item.title}
          </h3>
          <LiquidBadge className="text-[11px]">
            <Package className="h-3 w-3" aria-hidden="true" />
            {productCount} product{productCount === 1 ? "" : "s"}
          </LiquidBadge>
        </div>
        {parentTitle && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-white/55">
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {parentTitle}
          </p>
        )}
        {item.description && (
          <p className="line-clamp-3 break-words text-sm text-neutral-600 dark:text-white/60">
            {item.description}
          </p>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-300"
              >
                {keyword}
              </span>
            ))}
            {keywords.length > 4 && (
              <span className="text-[11px] font-bold text-neutral-400">
                +{keywords.length - 4}
              </span>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <LiquidButton
            type="button"
            variant="soft"
            className="min-w-0 flex-1"
            onClick={() => onEdit(item)}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            Edit {kindLabel.toLowerCase()}
          </LiquidButton>
          <LiquidIconButton
            type="button"
            aria-label={`Delete ${kindLabel.toLowerCase()} “${item.title}”`}
            title="Delete"
            onClick={() => onDelete(item)}
            className="text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
        </div>
      </div>
    </motion.article>
  );
}
