import { Trash2 } from "lucide-react";
import ResizableFloatingSidebar from "../../ui/ResizableFloatingSidebar";
import { LiquidButton } from "../../ui/liquid";

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
}: AquaOrderDeletePromptDialogProps) => (
  <ResizableFloatingSidebar
    open={open}
    onClose={noClick}
    title={title}
    subtitle="This action cannot be undone."
    widthStorageKey="aquacrm:order-delete-width"
    initialWidth={420}
    minWidth={420}
    maxWidth={420}
    resizable={false}
  >
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
        <Trash2 className="h-7 w-7 text-rose-500" />
      </div>
      <p className="text-sm leading-relaxed text-white/65">{description}</p>
    </div>
    <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
      <LiquidButton type="button" onClick={noClick} variant="soft" className="flex-1">
        {noLabel}
      </LiquidButton>
      <LiquidButton type="button" onClick={yesClick} variant="danger" className="flex-1">
        {yesLabel}
      </LiquidButton>
    </div>
  </ResizableFloatingSidebar>
);

export default AquaOrderDeletePromptDialog;
