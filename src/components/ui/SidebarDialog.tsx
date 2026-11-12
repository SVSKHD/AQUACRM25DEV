import type { ReactNode } from "react";
import ResizableFloatingSidebar from "./ResizableFloatingSidebar";

/*
 * ResizableFloatingSidebar with the common dialog extras: an optional footer
 * pinned below the scrolling content and a busy flag that blocks closing
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
      footer={
        footer ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {footer}
          </div>
        ) : undefined
      }
    >
      <div aria-busy={busy || undefined}>{children}</div>
    </ResizableFloatingSidebar>
  );
}
