import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { LiquidButton, LiquidPanel } from "../../ui/liquid";

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
            className="max-w-md w-full"
          >
            <LiquidPanel className="p-8 shadow-2xl">
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
              <LiquidButton type="button" onClick={noClick} variant="soft" className="flex-1">
                {noLabel}
              </LiquidButton>
              <LiquidButton type="button" onClick={yesClick} variant="danger" className="flex-1">
                {yesLabel}
              </LiquidButton>
            </div>
            </LiquidPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AquaOrderDeletePromptDialog;
