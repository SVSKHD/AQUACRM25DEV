import SidebarDialog from "../../ui/SidebarDialog";
import { AlertTriangle } from "lucide-react";
import { LiquidButton } from "../../ui/liquid";

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
    <SidebarDialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      widthStorageKey="aquacrm:job-confirm-width"
      busy={false}
      footer={
        <>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={onCancel}
            className="flex-1 text-sm"
          >
            Cancel
          </LiquidButton>
          <LiquidButton
            type="button"
            autoFocus
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
            className={`flex-1 text-sm ${
              tone === "danger"
                ? ""
                : "!bg-none !bg-amber-600 hover:!bg-amber-700"
            }`}
          >
            {confirmLabel}
          </LiquidButton>
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
    </SidebarDialog>
  );
}
