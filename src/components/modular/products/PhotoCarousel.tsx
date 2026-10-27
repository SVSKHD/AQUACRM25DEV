import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Package } from "lucide-react";
import type { CatalogPhoto } from "../../../utils/productList";

export type ProductPhoto = CatalogPhoto;

export const PhotoCarousel = ({
  photos,
  autoPlay = false,
  alt = "",
}: {
  photos: ProductPhoto[];
  autoPlay?: boolean;
  alt?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = photos?.length || 0;
  const index = count ? currentIndex % count : 0;

  useEffect(() => {
    if (count <= 1 || !autoPlay || reduceMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count);
    }, 1500);
    return () => clearInterval(interval);
  }, [count, autoPlay, reduceMotion]);

  if (!count) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30">
        <Package className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={index}
          src={photos[index].secure_url}
          alt={alt ? `${alt} – photo ${index + 1}` : `Photo ${index + 1}`}
          loading="lazy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4 }}
          className="h-full w-full object-cover"
        />
      </AnimatePresence>
      {count > 1 && (
        <div
          className="absolute bottom-2 left-0 right-0 flex justify-center gap-1"
          aria-hidden="true"
        >
          {photos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === index ? "w-4 bg-white" : "w-1.5 bg-white/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
