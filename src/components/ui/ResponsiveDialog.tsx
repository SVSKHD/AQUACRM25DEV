import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import ArrowScrollArea from "../ArrowScrollArea";

const dialogStack: string[] = [];
let originalOverflow = "";

/** Shared dialog/drawer: one scroll region, reachable actions and consistent keyboard behavior. */
export default function ResponsiveDialog({
  open,
  onClose,
  title,
  description,
  children,
  header,
  footer,
  size = "lg",
  busy = false,
  drawer = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  busy?: boolean;
  drawer?: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialogStack.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialogStack.push(id);
    const viewport = window.visualViewport;
    const resize = () => {
      if (!overlay.current || !viewport) return;
      overlay.current.style.height = `${viewport.height}px`;
      overlay.current.style.top = `${viewport.offsetTop}px`;
      overlay.current.style.setProperty(
        "--crm-viewport-height",
        `${viewport.height}px`,
      );
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    const frame = requestAnimationFrame(() => panel.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return;
      // Portaled AI assistants and dropdowns handle their own keys first.
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target)
      )
        return;
      if (
        event.key === "Escape" &&
        panel.current?.querySelector('[aria-expanded="true"]')
      )
        return;
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) || [],
      ).filter(
        (element) =>
          element.getClientRects().length > 0 && !element.closest("[inert]"),
      );
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      const index = dialogStack.indexOf(id);
      if (index >= 0) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, id]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlay}
          className={`crm-dialog-overlay ${drawer ? "crm-dialog-overlay-drawer" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.16 }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-description` : undefined}
            tabIndex={-1}
            aria-busy={busy || undefined}
            className={`crm-dialog crm-dialog-${size} ${drawer ? "crm-dialog-drawer" : ""}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          >
            <div className="crm-dialog-header">
              <div className="crm-dialog-heading">
                <div className="min-w-0">
                  <h2 id={`${id}-title`} className="crm-dialog-title">
                    {title}
                  </h2>
                  {description && (
                    <p
                      id={`${id}-description`}
                      className="crm-dialog-description"
                    >
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="crm-dialog-close"
                  aria-label={`Close ${title}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {header}
            </div>
            <ArrowScrollArea
              className="crm-dialog-scroll"
              contentClassName="crm-dialog-body"
              label={`${title} content`}
            >
              {children}
            </ArrowScrollArea>
            {footer && <div className="crm-dialog-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
