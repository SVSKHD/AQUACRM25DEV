import { Trash2 } from "lucide-react";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import { LiquidButton } from "../../ui/liquid";

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
  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={onNo}
      title={title}
      subtitle="This action cannot be undone."
      widthStorageKey="aquacrm:stock-delete-width"
      initialWidth={420}
      minWidth={420}
      maxWidth={420}
      resizable={false}
    >
      <div className="space-y-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
          <Trash2 className="h-7 w-7 text-rose-500" />
        </div>
        <p className="text-sm leading-relaxed text-white/65">{subtitle}</p>
      </div>
      <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
        <LiquidButton type="button" onClick={onNo} variant="soft" className="flex-1">
          No, Cancel
        </LiquidButton>
        <LiquidButton type="button" onClick={onYes} variant="danger" className="flex-1">
          Yes, Delete
        </LiquidButton>
      </div>
    </ResizableFloatingSidebar>
  );
}

export default DeletePrompt;
