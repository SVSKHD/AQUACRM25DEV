import { X } from "lucide-react";
import { LiquidBadge, LiquidButton, LiquidIconButton } from "../../ui/liquid";

// Selected categories (or subcategories) of a product in the product drawer.
// The first entry is the primary one: the storefront, coupons and feeds that
// read a single category use it. Shown only when two or more are selected.
export default function SelectedTaxonomyList({
  noun,
  items,
  onMakePrimary,
  onRemove,
}: {
  /** "category" or "subcategory" (used in labels). */
  noun: string;
  items: { id: string; label: string }[];
  onMakePrimary: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length < 2) return null;
  return (
    <ul
      className="mt-2 space-y-1.5"
      aria-label={`Selected ${noun === "category" ? "categories" : "subcategories"}`}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-sm"
        >
          <span
            className="min-w-0 flex-1 truncate font-semibold"
            title={item.label}
          >
            {item.label}
          </span>
          {index === 0 ? (
            <LiquidBadge className="shrink-0">Primary</LiquidBadge>
          ) : (
            <LiquidButton
              type="button"
              variant="ghost"
              className="shrink-0 !px-2.5 !py-1 text-xs"
              onClick={() => onMakePrimary(item.id)}
              aria-label={`Make ${item.label} the primary ${noun}`}
            >
              Make primary
            </LiquidButton>
          )}
          <LiquidIconButton
            type="button"
            className="shrink-0"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${noun} ${item.label}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </LiquidIconButton>
        </li>
      ))}
    </ul>
  );
}
