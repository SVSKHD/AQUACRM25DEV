import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { LiquidButton, LiquidPanel } from "../../ui/liquid";

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
          className="overlay-blur fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onNo}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md"
          >
            <LiquidPanel className="p-8 shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10">
                <Trash2 className="h-8 w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="mb-2 text-xl font-black text-neutral-950 dark:text-white">
                {title}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-black dark:text-white/60">
                {subtitle}
              </p>
              <div className="flex gap-3">
                <LiquidButton
                  type="button"
                  onClick={onNo}
                  variant="soft"
                  className="flex-1"
                >
                  No, Cancel
                </LiquidButton>
                <LiquidButton
                  type="button"
                  onClick={onYes}
                  variant="danger"
                  className="flex-1"
                >
                  Yes, Delete
                </LiquidButton>
              </div>
            </LiquidPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DeletePrompt;
