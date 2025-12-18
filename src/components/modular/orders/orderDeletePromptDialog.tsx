import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface AquaOrderDeletePromptDialogProps {
  open: boolean;
  type?: string;
  title?: string;
  description?: string;
  yesLabel?: string;
  noLabel?: string;
  yesClick: () => void;
  noClick: () => void;
}

const AquaOrderDeletePromptDialog = ({
  open,
  title = "Confirm Deletion",
  description = "Are you sure you want to proceed? This action cannot be undone.",
  yesLabel = "Yes, Delete",
  noLabel = "No",
  yesClick,
  noClick,
}: AquaOrderDeletePromptDialogProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-50 p-4"
          onClick={noClick}
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
              {description}
            </p>
            <div className="flex gap-3">
              <button
                onClick={noClick}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold text-sm"
              >
                {noLabel}
              </button>
              <button
                onClick={yesClick}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-all font-bold text-sm shadow-lg shadow-rose-600/20"
              >
                {yesLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AquaOrderDeletePromptDialog;
