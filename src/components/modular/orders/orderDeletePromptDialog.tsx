import { AnimatePresence, motion } from "framer-motion";

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
  type = "Delete",
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
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={noClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              {type}
            </p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 mb-6">{description}</p>
            <div className="flex gap-3">
              <button
                onClick={noClick}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                {noLabel}
              </button>
              <button
                onClick={yesClick}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 shadow-sm"
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
