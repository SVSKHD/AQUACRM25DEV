import { useState } from "react";
import { motion } from "framer-motion";
import {
  Edit2,
  Trash2,
  Tag,
  AlertCircle,
  CheckCircle,
  Layers,
} from "lucide-react";
import { PhotoCarousel, ProductPhoto } from "./PhotoCarousel";

export interface Product {
  id: string;
  _id?: string;
  title: string;
  description: string | null;
  price: number;
  discountPrice: number;
  discountPriceStatus: boolean;
  discountPricePercentage: number;
  photos: ProductPhoto[];
  category: string;
  stock: number;
  brand: string;
  ratings: number;
  numberOfReviews: number;
  slug: string;
  keywords: string;
  sku: string | null;
  is_active: boolean;
  category_id: string | null;
  subcategory_id: string | null;
  categories?: { title: string }; // Updated to title
  subcategories?: { title: string }; // Updated to title
}

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`glass-card p-5 transition-all ${
        !product.is_active ? "opacity-60" : ""
      }`}
      whileHover={{ y: -5, scale: 1.01 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-4 h-48 w-full rounded-lg overflow-hidden bg-white/30 border border-white/20">
        <PhotoCarousel photos={product.photos} autoPlay={isHovered} />
      </div>

      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-lg text-neutral-950 dark:text-white leading-tight">
          {product.title}
        </h3>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onEdit(product)}
            className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-black dark:text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(product)}
            className="p-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {product.brand && (
          <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
            <Tag className="w-4 h-4" />
            <span>{product.brand}</span>
          </div>
        )}
        {product.categories && (
          <div className="flex items-center gap-2 text-sm text-black dark:text-white/60">
            <Layers className="w-4 h-4" />
            <span>{product.categories.title}</span>
            {product.subcategories && (
              <span> / {product.subcategories.title}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <div>
          <p className="text-lg font-bold text-green-600">
            ₹{product.discountPrice}
          </p>
          {product.discountPriceStatus && (
            <p className="text-xs text-slate-500 line-through">
              ₹{product.price}
            </p>
          )}
        </div>
        <div className="text-right">
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              product.stock <= 5 ? "text-red-600" : "text-green-600"
            }`}
          >
            {product.stock <= 5 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{product.stock} in stock</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
