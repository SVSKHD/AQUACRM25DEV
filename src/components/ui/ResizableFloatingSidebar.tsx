import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { GripVertical, X } from "lucide-react";
import { LiquidIconButton } from "./liquid";

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
  initialWidth = 480,
  minWidth = 400,
  maxWidth = 960,
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
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-[3px]"
      onMouseDown={onClose}
    >
      <aside
        className="absolute bottom-2 right-2 top-2 w-[calc(100vw-1rem)] md:w-auto"
        style={{ width: `min(calc(100vw - 1rem), ${width}px)` }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/15 bg-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-black/20 backdrop-blur-2xl">
          <button
            type="button"
            aria-label="Resize sidebar"
            title="Drag to resize"
            onPointerDown={beginResize}
            onPointerMove={resize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="group absolute inset-y-0 left-0 z-30 hidden w-6 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center md:flex"
          >
            <span className="flex h-28 w-4 items-center justify-center rounded-full border border-white/15 bg-slate-800/95 text-white/80 shadow-2xl transition group-hover:bg-sky-600 group-hover:text-white">
              <GripVertical className="h-4 w-4" />
            </span>
          </button>

          <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur-2xl">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-white sm:text-xl">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-xs leading-relaxed text-white/45">
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

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {children}
          </div>
        </div>
      </aside>
    </div>
  );
}
