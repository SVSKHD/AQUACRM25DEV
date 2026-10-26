import type { ReactNode } from "react";
import ResizableFloatingSidebar from "./ResizableFloatingSidebar";

/*
 * ResizableFloatingSidebar with the common dialog extras: an optional sticky
 * footer (the same bar CRM forms use) and a busy flag that blocks closing
 * while a request is running.
 */

const WIDTHS = { sm: 420, md: 560, lg: 720 } as const;

export default function SidebarDialog({
  open,
  onClose,
  title,
  description,
  footer,
  busy = false,
  size = "md",
  widthStorageKey,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  size?: keyof typeof WIDTHS;
  widthStorageKey: string;
  children: ReactNode;
}) {
  const width = WIDTHS[size];
  return (
    <ResizableFloatingSidebar
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      subtitle={description}
      widthStorageKey={widthStorageKey}
      initialWidth={width}
      minWidth={Math.min(width, 420)}
      resizable={size !== "sm"}
    >
      <div aria-busy={busy || undefined}>{children}</div>
      {footer && (
        <div className="sticky bottom-0 z-20 -mx-5 mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur-2xl">
          {footer}
        </div>
      )}
    </ResizableFloatingSidebar>
  );
}
