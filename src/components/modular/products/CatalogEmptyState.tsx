import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/** Empty or no-results state for catalog lists. */
export default function CatalogEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-neutral-300 px-6 py-14 text-center dark:border-white/15"
    >
      <Icon className="h-10 w-10 text-sky-500/70" aria-hidden="true" />
      <p className="text-lg font-bold text-neutral-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-neutral-500 dark:text-white/55">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  );
}
