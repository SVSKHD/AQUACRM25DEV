import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { LiquidButton, LiquidPanel } from "../../ui/liquid";

interface QuotationDeleteDialogProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quotationNumber: string;
}

const QuotationDeleteDialog = ({
  show,
  onClose,
  onConfirm,
  quotationNumber,
}: QuotationDeleteDialogProps) => {
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
            className="max-w-md w-full"
          >
            <LiquidPanel className="overflow-hidden border-rose-200/50 shadow-2xl dark:border-rose-500/20">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>

              <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2">
                Delete Quotation?
              </h3>

              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Are you sure you want to delete quotation{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  "{quotationNumber}"
                </span>
                ?
                <br />
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <LiquidButton type="button" onClick={onClose} variant="soft" className="flex-1">
                  Cancel
                </LiquidButton>
                <LiquidButton type="button" onClick={onConfirm} variant="danger" className="flex-1">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </LiquidButton>
              </div>
            </div>
            </LiquidPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuotationDeleteDialog;
