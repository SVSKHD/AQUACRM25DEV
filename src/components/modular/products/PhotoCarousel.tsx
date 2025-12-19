import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package } from "lucide-react";

export interface ProductPhoto {
  id: string;
  secure_url: string;
}

export const PhotoCarousel = ({
  photos,
  autoPlay = false,
}: {
  photos: ProductPhoto[];
  autoPlay?: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!photos || photos.length <= 1 || !autoPlay) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [photos, autoPlay]);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        <Package className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={photos[currentIndex].secure_url}
          alt={`Photo ${currentIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      {photos.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
          {photos.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
