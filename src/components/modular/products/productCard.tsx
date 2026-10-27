import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Layers,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { PhotoCarousel } from "./PhotoCarousel";
import { LiquidBadge, LiquidButton, LiquidIconButton } from "../../ui/liquid";
import {
  discountPercent,
  effectivePrice,
  stockState,
  type CatalogProduct,
} from "../../../utils/productList";

export type Product = CatalogProduct;

const formatInr = (value: number) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const STOCK_STYLES = {
  in: { icon: CheckCircle, text: "text-emerald-600 dark:text-emerald-300" },
  low: { icon: AlertCircle, text: "text-amber-600 dark:text-amber-300" },
  out: { icon: XCircle, text: "text-rose-600 dark:text-rose-300" },
} as const;

const ProductCard = ({
  product,
  index,
  onEdit,
  onDelete,
}: {
  product: Product;
  index: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) => {
  const reduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const price = effectivePrice(product);
  const discount = discountPercent(product);
  const stock = stockState(product.stock);
  const StockIcon = STOCK_STYLES[stock].icon;
  const inactive = product.is_active === false;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/40 shadow-sm backdrop-blur-xl transition-shadow duration-300 hover:shadow-2xl hover:shadow-sky-500/10 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <div
        className={`relative h-48 w-full shrink-0 overflow-hidden ${inactive ? "grayscale-[60%]" : ""}`}
      >
        <PhotoCarousel
          photos={product.photos}
          autoPlay={isHovered}
          alt={product.title}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {inactive && (
            <LiquidBadge className="border-slate-400/40 bg-slate-900/70 text-white">
              Inactive
            </LiquidBadge>
          )}
          {discount > 0 && (
            <LiquidBadge className="border-emerald-400/40 bg-emerald-500/85 text-white">
              {discount}% off
            </LiquidBadge>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 break-words text-lg font-bold leading-snug text-neutral-950 transition-colors group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-300">
          {product.title || "Untitled product"}
        </h3>

        <div className="space-y-1 text-sm text-neutral-600 dark:text-white/60">
          {product.brand && (
            <p className="flex min-w-0 items-center gap-2">
              <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{product.brand}</span>
              {product.sku && (
                <span className="truncate text-xs text-neutral-400">
                  · {product.sku}
                </span>
              )}
            </p>
          )}
          {product.categories && (
            <p className="flex min-w-0 items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {product.categories.title}
                {product.subcategories && ` / ${product.subcategories.title}`}
              </span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-white/10">
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
              {formatInr(price)}
            </p>
            {discount > 0 && (
              <p className="text-xs text-neutral-500 line-through dark:text-white/45">
                {formatInr(product.price)}
              </p>
            )}
          </div>
          <p
            className={`flex items-center gap-1 text-sm font-semibold ${STOCK_STYLES[stock].text}`}
          >
            <StockIcon className="h-4 w-4" aria-hidden="true" />
            {stock === "out" ? "Out of stock" : `${product.stock} in stock`}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <LiquidButton
            type="button"
            variant="primary"
            className="min-w-0 flex-1"
            onClick={() => onEdit(product)}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
            Edit
          </LiquidButton>
          <LiquidIconButton
            type="button"
            aria-label={`Delete “${product.title}”`}
            title="Delete"
            onClick={() => onDelete(product)}
            className="text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
        </div>
      </div>
    </motion.article>
  );
};

export default ProductCard;

export function CatalogCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-[1.75rem] border border-white/40 bg-white/30 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="h-48 animate-pulse bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/10" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-neutral-300/50 motion-reduce:animate-none dark:bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded-lg bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/[0.07]" />
        <div className="mt-2 h-11 w-full animate-pulse rounded-2xl bg-neutral-300/40 motion-reduce:animate-none dark:bg-white/[0.07]" />
      </div>
    </div>
  );
}
