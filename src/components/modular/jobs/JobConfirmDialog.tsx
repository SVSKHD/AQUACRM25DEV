import ResponsiveDialog from "../../ui/ResponsiveDialog";
import { AlertTriangle } from "lucide-react";

interface JobConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function JobConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "warning",
  onConfirm,
  onCancel,
}: JobConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      busy={false}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl text-white transition-all font-bold text-sm shadow-lg ${
              tone === "danger"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
          tone === "danger"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        }`}
      >
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>
      <p className="text-sm text-black dark:text-white/60 mb-6 leading-relaxed">
        {message}
      </p>
    </ResponsiveDialog>
  );
}
