import { AlertTriangle, Trash2 } from "lucide-react";
import ResizableFloatingSidebar from "../../../ui/ResizableFloatingSidebar";
import { LiquidButton } from "../../../ui/liquid";

interface BlogDeleteDialogProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  blogTitle: string;
}

const BlogDeleteDialog = ({
  show,
  onClose,
  onConfirm,
  blogTitle,
}: BlogDeleteDialogProps) => (
  <ResizableFloatingSidebar
    open={show}
    onClose={onClose}
    title="Delete Blog?"
    subtitle="This action cannot be undone."
    widthStorageKey="aquacrm:blog-delete-width"
    initialWidth={420}
    minWidth={420}
    maxWidth={420}
    resizable={false}
  >
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
        <AlertTriangle className="h-7 w-7 text-rose-500" />
      </div>
      <p className="text-sm leading-relaxed text-white/65">
        Are you sure you want to delete <span className="font-bold text-white">"{blogTitle}"</span>?
      </p>
    </div>
    <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
      <LiquidButton type="button" onClick={onClose} variant="soft" className="flex-1">
        Cancel
      </LiquidButton>
      <LiquidButton type="button" onClick={onConfirm} variant="danger" className="flex-1">
        <Trash2 className="h-4 w-4" /> Delete
      </LiquidButton>
    </div>
  </ResizableFloatingSidebar>
);

export default BlogDeleteDialog;
