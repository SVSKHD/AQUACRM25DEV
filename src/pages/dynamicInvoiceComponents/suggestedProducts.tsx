import { Package } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "./types/invoice.types";
const suggestedProducts = ({
  suggestedProducts,
}: {
  suggestedProducts: Product[];
}) => {
  return (
    <>
      {suggestedProducts.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-400 print:hidden">
          <h3 className="text-lg font-bold text-neutral-950 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Explore More from Aquakart
          </h3>
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {suggestedProducts.map((product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                  className="min-w-[200px] w-[200px] bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all snap-center flex-shrink-0"
                >
                  <div className="h-32 bg-slate-100 rounded mb-3 overflow-hidden relative group">
                    {product.photos?.[0]?.secure_url ? (
                      <img
                        src={product.photos[0].secure_url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h4
                    className="font-medium text-sm text-neutral-950 truncate mb-1"
                    title={product.title}
                  >
                    {product.title}
                  </h4>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-green-600 font-bold text-sm">
                      ₹
                      {(
                        product.discountPrice || product.price
                      ).toLocaleString()}
                    </p>
                    {product.discountPrice > 0 && (
                      <p className="text-xs text-slate-400 line-through">
                        ₹{product.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://aquakart.co.in/product/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center text-xs font-medium bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Shop Now
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default suggestedProducts;
