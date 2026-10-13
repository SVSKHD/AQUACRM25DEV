import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  resizable?: boolean;
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
  resizable = true,
}: ResizableFloatingSidebarProps) {
  const [width, setWidth] = useState(initialWidth);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const widthRef = useRef(initialWidth);
  const resizingRef = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
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

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus());
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || []).filter((element) => element.getClientRects().length > 0);
        if (!focusable.length) {
          event.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const onResize = () => {
      setSidebarWidth(
        clamp(widthRef.current, minWidth, viewportMaxWidth()),
      );
    };

    const updateMobileViewportHeight = () => {
      const viewport = window.visualViewport;
      setMobileViewportHeight(viewport?.height || window.innerHeight);
    };

    updateMobileViewportHeight();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", updateMobileViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateMobileViewportHeight);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      previouslyFocusedRef.current?.focus();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", updateMobileViewportHeight);
      window.visualViewport?.removeEventListener("scroll", updateMobileViewportHeight);
      setMobileViewportHeight(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [open, minWidth, maxWidth]);

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizable || window.innerWidth < 768) return;

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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="aquacrm-dialog-overlay fixed inset-0 z-[9999] bg-black/70 md:backdrop-blur-[3px]"
      onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}
    >
      <aside
        ref={dialogRef}
        tabIndex={-1}
        className="aquacrm-dialog-shell fixed inset-0 w-full md:inset-y-2 md:left-auto md:right-2 md:w-auto"
        style={{
          width: window.innerWidth < 768 ? "100%" : `min(calc(100vw - 1rem), ${width}px)`,
          ...(mobileViewportHeight && typeof window !== "undefined" && window.innerWidth < 768
            ? { height: `${mobileViewportHeight}px`, maxHeight: "100dvh" }
            : {}),
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Details"}
      >
        <div className="aquacrm-dialog-surface relative flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-white/15 bg-slate-950 shadow-xl md:rounded-[20px] md:bg-slate-950/95 md:shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:backdrop-blur-2xl">
          {resizable && (
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
          )}

          <header className="aquacrm-dialog-header flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-slate-950 px-4 py-3 sm:px-5 sm:py-4">
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

          <div className="aquacrm-dialog-scroll custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] touch-pan-y sm:px-5 sm:py-5">
            {children}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
