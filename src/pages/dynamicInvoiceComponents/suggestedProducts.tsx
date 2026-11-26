import { Package } from "lucide-react";
import type { DbProduct } from "./types/invoice.types";

const money = (value: number) =>
  `₹${(Number(value) || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const SuggestedProducts = ({
  suggestedProducts,
}: {
  suggestedProducts: DbProduct[];
}) => {
  if (suggestedProducts.length === 0) return null;

  return (
    <section className="mt-8 border-t border-zinc-900/10 pt-6 print:hidden">
      <h2 className="mb-3 text-sm font-medium text-zinc-900">
        More from Aquakart
      </h2>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide">
        {suggestedProducts.map((product) => {
          const hasDiscount =
            product.discountPrice > 0 && product.discountPrice < product.price;
          return (
            <a
              key={product._id || product.id}
              href={`https://aquakart.co.in/product/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-48 shrink-0 snap-start rounded-xl border border-zinc-900/10 p-3 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#05845f]"
            >
              <div className="mb-3 h-32 overflow-hidden rounded-lg bg-zinc-100">
                {product.photos?.[0]?.secure_url ? (
                  <img
                    src={product.photos[0].secure_url}
                    alt={product.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-300">
                    <Package className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <p
                className="truncate text-sm font-medium text-zinc-900"
                title={product.title}
              >
                {product.title}
              </p>
              <p className="mt-1 flex items-baseline gap-2 text-sm tabular-nums">
                <span className="text-zinc-900">
                  {money(hasDiscount ? product.discountPrice : product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-zinc-400 line-through">
                    {money(product.price)}
                  </span>
                )}
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
};
export default SuggestedProducts;
