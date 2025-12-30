import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";

interface BlogDeleteDialogProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  blogTitle: string;
}

const BlogDeleteDialog = ({
  show,
  onClose,
  onConfirm,
  blogTitle,
}: BlogDeleteDialogProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-[200] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-md w-full overflow-hidden shadow-2xl border border-rose-200/50 dark:border-rose-500/20"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>

              <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
                Delete Blog?
              </h3>

              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  "{blogTitle}"
                </span>
                ?
                <br />
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-white/5 text-black dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-2.5 px-4 bg-rose-600 dark:bg-rose-500 text-white rounded-xl hover:bg-rose-700 dark:hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20 font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BlogDeleteDialog;
