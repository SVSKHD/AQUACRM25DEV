import ResponsiveDialog from "../../ui/ResponsiveDialog";
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
    <ResponsiveDialog
      open={open}
      onClose={onNo}
      title={title}
      size="sm"
      busy={false}
      footer={
        <>
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
        </>
      }
    >
      <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
        <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-sm text-black dark:text-white/60 mb-6 leading-relaxed">
        {subtitle}
      </p>
    </ResponsiveDialog>
  );
}

export default DeletePrompt;
