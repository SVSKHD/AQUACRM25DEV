import type { ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Star, X } from "lucide-react";
import { LiquidFileButton, LiquidIconButton } from "../../ui/liquid";
import type { CatalogPhoto } from "../../../utils/productList";

const ACCEPTED_TYPES = "image/png, image/jpeg, image/jpg, image/webp";

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Photo list for catalog forms: upload (several at once), remove, and make primary.
 * The first photo is the primary image.
 */
export default function PhotoUploader({
  id,
  label = "Photos",
  photos,
  onChange,
  onError,
  maxSizeMb = 5,
  maxPhotos,
  hint,
  addLabel = "Add photos",
}: {
  id: string;
  label?: string;
  photos: CatalogPhoto[];
  onChange: (photos: CatalogPhoto[]) => void;
  onError?: (message: string) => void;
  maxSizeMb?: number;
  maxPhotos?: number;
  hint?: string;
  addLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const full = maxPhotos !== undefined && photos.length >= maxPhotos;

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const tooLarge = files.filter(
      (file) => file.size > maxSizeMb * 1024 * 1024,
    );
    if (tooLarge.length) {
      onError?.(
        `${tooLarge.map((file) => file.name).join(", ")} ${tooLarge.length === 1 ? "is" : "are"} larger than ${maxSizeMb}MB`,
      );
    }
    const room = maxPhotos === undefined ? Infinity : maxPhotos - photos.length;
    const accepted = files
      .filter((file) => !tooLarge.includes(file))
      .slice(0, Math.max(0, room));
    if (!accepted.length) return;
    try {
      const urls = await Promise.all(accepted.map(readAsDataUrl));
      onChange([
        ...photos,
        ...urls.map((secure_url) => ({
          id: Math.random().toString(36).slice(2, 11),
          secure_url,
        })),
      ]);
    } catch {
      onError?.("Could not read the selected image");
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="liquid-label mb-0">
            {label}
            {maxPhotos !== undefined
              ? ` (${photos.length}/${maxPhotos})`
              : photos.length
                ? ` (${photos.length})`
                : ""}
          </span>
          <p className="text-xs text-white/50">
            {hint ||
              `First photo is the primary image. Max ${maxSizeMb}MB each.`}
          </p>
        </div>
        <LiquidFileButton
          id={id}
          accept={ACCEPTED_TYPES}
          multiple={maxPhotos !== 1}
          variant="soft"
          disabled={full}
          onChange={(event) => void handleFiles(event)}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </LiquidFileButton>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <AnimatePresence initial={false}>
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id || `${index}-${photo.secure_url.slice(-16)}`}
                layout={!reduceMotion}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }
                }
                transition={{ duration: 0.2 }}
                className={`group relative aspect-square overflow-hidden rounded-2xl border ${
                  index === 0
                    ? "border-sky-400/70 ring-2 ring-sky-400/30"
                    : "border-white/10"
                }`}
              >
                <img
                  src={photo.secure_url}
                  alt={`${label} ${index + 1}${index === 0 ? " (primary)" : ""}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    Primary
                  </span>
                )}
                <div className="absolute right-1 top-1 flex flex-col gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                  <LiquidIconButton
                    type="button"
                    aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                    onClick={() =>
                      onChange(photos.filter((_, i) => i !== index))
                    }
                    className="bg-rose-600/85 text-white"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </LiquidIconButton>
                  {index > 0 && (
                    <LiquidIconButton
                      type="button"
                      aria-label={`Make ${label.toLowerCase()} ${index + 1} the primary image`}
                      onClick={() =>
                        onChange([
                          photo,
                          ...photos.filter((_, i) => i !== index),
                        ])
                      }
                      className="bg-slate-900/80 text-amber-300"
                    >
                      <Star className="h-4 w-4" aria-hidden="true" />
                    </LiquidIconButton>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/50">
          No photos yet.
        </p>
      )}
    </div>
  );
}
