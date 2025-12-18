import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface DeletePromptProps {
  open: boolean;
  title: string;
  subtitle: string;
  onYes: () => void;
  onNo: () => void;
}

function DeletePrompt({
  open,
  title,
  subtitle,
  onYes,
  onNo,
}: DeletePromptProps) {
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
          onClick={onNo}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full p-8 shadow-2xl border-white/20 dark:border-white/5"
          >
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-black dark:text-white/60 mb-6 leading-relaxed">
              {subtitle}
            </p>
            <div className="flex gap-3">
              <button
                onClick={onNo}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold text-sm"
              >
                No, Cancel
              </button>
              <button
                onClick={onYes}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm shadow-lg shadow-rose-600/20"
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DeletePrompt;
