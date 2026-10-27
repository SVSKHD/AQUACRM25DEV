import type { ReactNode } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import { LiquidButton } from "../../ui/liquid";

/** Confirmation panel for destructive catalog actions (delete product, category, draft…). */
export default function CatalogDeleteDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loadingLabel = "Deleting…",
  loading = false,
  widthStorageKey = "aquacrm:catalog-delete-width",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  widthStorageKey?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={title}
      subtitle="This action cannot be undone."
      widthStorageKey={widthStorageKey}
      initialWidth={420}
      minWidth={420}
      maxWidth={420}
      resizable={false}
    >
      <div className="space-y-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" aria-hidden="true" />
        </div>
        <div className="text-sm leading-relaxed text-white/65">{message}</div>
      </div>
      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        <LiquidButton
          type="button"
          onClick={onClose}
          variant="soft"
          className="flex-1"
          disabled={loading}
        >
          Cancel
        </LiquidButton>
        <LiquidButton
          type="button"
          onClick={onConfirm}
          variant="danger"
          className="flex-1"
          requestState={loading ? "loading" : "idle"}
          loadingLabel={loadingLabel}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> {confirmLabel}
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
}
