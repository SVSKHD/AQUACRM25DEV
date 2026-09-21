import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { GripVertical, X } from "lucide-react";
import { LiquidIconButton, LiquidPanel } from "./liquid";

type ResizableFloatingSidebarProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  widthStorageKey?: string;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function ResizableFloatingSidebar({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthStorageKey = "aquacrm:floating-sidebar-width",
  initialWidth = 760,
  minWidth = 520,
  maxWidth = 1120,
}: ResizableFloatingSidebarProps) {
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  const viewportMaxWidth = () =>
    typeof window === "undefined"
      ? maxWidth
      : Math.min(maxWidth, Math.max(minWidth, window.innerWidth - 80));

  const setSidebarWidth = (next: number) => {
    widthRef.current = next;
    setWidth(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(window.localStorage.getItem(widthStorageKey));
    if (Number.isFinite(saved) && saved > 0) {
      setSidebarWidth(clamp(saved, minWidth, viewportMaxWidth()));
    }
  }, [minWidth, maxWidth, widthStorageKey]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const onResize = () => {
      setSidebarWidth(
        clamp(widthRef.current, minWidth, viewportMaxWidth()),
      );
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [open, minWidth, maxWidth, onClose]);

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (window.innerWidth < 768) return;

    resizingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = widthRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizingRef.current) return;

    // The drawer is anchored to the right, so dragging left increases width.
    const delta = startXRef.current - event.clientX;
    const next = clamp(
      startWidthRef.current + delta,
      minWidth,
      viewportMaxWidth(),
    );
    setSidebarWidth(next);
  };

  const endResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizingRef.current) return;

    resizingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        widthStorageKey,
        String(widthRef.current),
      );
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-slate-950/55 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <aside
        className="absolute inset-y-3 right-3 w-[calc(100vw-1.5rem)] md:w-auto"
        style={{ width: `min(calc(100vw - 1.5rem), ${width}px)` }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <LiquidPanel className="relative flex h-full min-h-0 flex-col overflow-hidden border-white/20 shadow-2xl">
          <button
            type="button"
            aria-label="Resize sidebar"
            title="Drag to resize"
            onPointerDown={beginResize}
            onPointerMove={resize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="group absolute inset-y-0 left-0 z-30 hidden w-5 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center md:flex"
          >
            <span className="flex h-24 w-3 items-center justify-center rounded-full border border-white/20 bg-slate-800/80 text-white shadow-xl backdrop-blur-xl transition group-hover:bg-sky-600">
              <GripVertical className="h-4 w-4" />
            </span>
          </button>

          <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-200/60 bg-white/70 px-5 py-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-neutral-950 dark:text-white sm:text-2xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
                  {subtitle}
                </p>
              )}
            </div>
            <LiquidIconButton
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </LiquidIconButton>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {children}
          </div>
        </LiquidPanel>
      </aside>
    </div>
  );
}
