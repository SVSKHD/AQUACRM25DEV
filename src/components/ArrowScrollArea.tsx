import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ArrowScrollArea({
  children,
  className = "",
  viewportClassName = "",
  contentClassName = "",
  label = "content",
  horizontal = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  label?: string;
  horizontal?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ before: false, after: false });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => {
      const offset = horizontal ? element.scrollLeft : element.scrollTop;
      const remaining = horizontal
        ? element.scrollWidth - element.clientWidth
        : element.scrollHeight - element.clientHeight;
      setPosition({ before: offset > 1, after: offset < remaining - 1 });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (content.current) observer.observe(content.current);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [horizontal]);
  const move = (direction: number) => {
    const element = viewport.current;
    if (!element) return;
    const distance =
      Math.max(
        80,
        (horizontal ? element.clientWidth : element.clientHeight) * 0.65,
      ) * direction;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "instant"
      : "smooth";
    element.scrollBy(
      horizontal ? { left: distance, behavior } : { top: distance, behavior },
    );
  };
  const Previous = horizontal ? ChevronLeft : ChevronUp;
  const Next = horizontal ? ChevronRight : ChevronDown;
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${className}`}
    >
      <div
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label={label}
        className={`arrow-scroll-viewport scrollbar-hide min-h-0 min-w-0 ${horizontal ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto overflow-x-hidden"} ${viewportClassName}`}
      >
        <div ref={content} className={contentClassName}>
          {children}
        </div>
      </div>
      {(position.before || position.after) && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200/60 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-900/80">
          <button
            type="button"
            disabled={!position.before}
            onClick={() => move(-1)}
            aria-label={`Scroll ${label} ${horizontal ? "left" : "up"}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            <Previous className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!position.after}
            onClick={() => move(1)}
            aria-label={`Scroll ${label} ${horizontal ? "right" : "down"}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-30 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            <Next className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
