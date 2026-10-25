import ResponsiveDialog from "../../ui/ResponsiveDialog";
import { AlertTriangle, Trash2 } from "lucide-react";

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
    <ResponsiveDialog
      open={show}
      onClose={onClose}
      title={"Delete Quotation?"}
      size="sm"
      busy={false}
      footer={
        <>
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
        </>
      }
    >
      <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-neutral-600 dark:text-neutral-300 mb-6">
        Are you sure you want to delete quotation{" "}
        <span className="font-semibold text-neutral-900 dark:text-white">
          "{quotationNumber}"
        </span>
        ?
        <br />
        This action cannot be undone.
      </p>
    </ResponsiveDialog>
  );
};

export default QuotationDeleteDialog;
