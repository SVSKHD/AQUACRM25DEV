import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { QUICK_ACTIONS, type QuickAction } from "../config/quickActions";
import "../styles/quickNav.css";

/*
 * Quick navigation, on every signed-in CRM screen.
 * Touch screens: a floating bubble you can drag to either edge; tap it to
 * expand the actions (labels shown, since touch has no hover).
 * Desktop (mouse/trackpad): a dock on the right edge; hover or click to
 * expand, icons have tooltips; keyboard shortcuts work anywhere.
 */

const POSITION_KEY = "aquacrm:quicknav-position";
const DRAG_THRESHOLD = 6;
const BUBBLE = 56;

type Position = { side: "left" | "right"; y: number };

const loadPosition = (): Position => {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    if (
      saved &&
      (saved.side === "left" || saved.side === "right") &&
      typeof saved.y === "number"
    )
      return { side: saved.side, y: Math.min(0.9, Math.max(0.1, saved.y)) };
  } catch {
    /* default below */
  }
  return { side: "right", y: 0.72 };
};

/** True with a mouse or trackpad (hover + fine pointer); false on touch. */
function useFinePointer() {
  const query = "(hover: hover) and (pointer: fine)";
  const [fine, setFine] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setFine(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return fine;
}

const shortcutText = (action: QuickAction) =>
  action.key ? `Alt+${action.key.toUpperCase()}` : "";

export default function QuickNav({
  actions = QUICK_ACTIONS,
}: {
  actions?: QuickAction[];
}) {
  const fine = useFinePointer();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (action: QuickAction) => {
      setOpen(false);
      if (location.pathname !== action.to) navigate(action.to);
    },
    [location.pathname, navigate],
  );

  // Close when the page changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Alt+<key> shortcuts anywhere; Escape and outside clicks close the menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const action = actions.find(
        (entry) => entry.key && event.code === `Key${entry.key.toUpperCase()}`,
      );
      if (!action) return;
      event.preventDefault();
      go(action);
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [actions, go]);

  if (!actions.length) return null;

  return fine ? (
    <DesktopDock
      rootRef={rootRef}
      actions={actions}
      open={open}
      setOpen={setOpen}
      current={location.pathname}
      onPick={go}
    />
  ) : (
    <TouchBubble
      rootRef={rootRef}
      actions={actions}
      open={open}
      setOpen={setOpen}
      current={location.pathname}
      onPick={go}
    />
  );
}

type PartProps = {
  rootRef: RefObject<HTMLDivElement | null>;
  actions: QuickAction[];
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  current: string;
  onPick: (action: QuickAction) => void;
};

/* ---------- desktop: right-edge dock with tooltips ---------- */

function DesktopDock({
  rootRef,
  actions,
  open,
  setOpen,
  current,
  onPick,
}: PartProps) {
  const id = useId();
  const closeTimer = useRef<number | undefined>(undefined);
  const hoverOpen = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 350);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      ref={rootRef}
      className={`qn-dock${open ? " qn-open" : ""}`}
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
    >
      <button
        type="button"
        className="qn-dock-handle"
        aria-label="Quick actions"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-describedby={`${id}-handle-tip`}
        onClick={() => setOpen((value) => !value)}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span id={`${id}-handle-tip`} role="tooltip" className="qn-tip">
          Quick actions
        </span>
      </button>
      <ul id={`${id}-menu`} className="qn-dock-menu" role="menu" hidden={!open}>
        {actions.map((action) => {
          const Icon = action.icon;
          const active = current === action.to;
          return (
            <li key={action.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={`qn-dock-item${active ? " qn-active" : ""}`}
                aria-label={action.label}
                aria-describedby={`${id}-${action.id}-tip`}
                aria-current={active ? "page" : undefined}
                onClick={() => onPick(action)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span
                  id={`${id}-${action.id}-tip`}
                  role="tooltip"
                  className="qn-tip"
                >
                  <strong>{action.label}</strong>
                  <span>{action.hint}</span>
                  {action.key && <kbd>{shortcutText(action)}</kbd>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- touch: draggable floating bubble ---------- */

function TouchBubble({
  rootRef,
  actions,
  open,
  setOpen,
  current,
  onPick,
}: PartProps) {
  const id = useId();
  const [position, setPosition] = useState<Position>(loadPosition);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    start.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin) return;
    if (
      !origin.moved &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <
        DRAG_THRESHOLD
    )
      return;
    origin.moved = true;
    setOpen(false);
    setDrag({ x: event.clientX, y: event.clientY });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    start.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (!origin?.moved) {
      setOpen((value) => !value);
      return;
    }
    // Snap to the nearer edge and remember it.
    const next: Position = {
      side: event.clientX < window.innerWidth / 2 ? "left" : "right",
      y: Math.min(0.9, Math.max(0.1, event.clientY / window.innerHeight)),
    };
    setDrag(null);
    setPosition(next);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      /* position just isn't remembered */
    }
  };

  const style: CSSProperties = drag
    ? { left: drag.x - BUBBLE / 2, top: drag.y - BUBBLE / 2 }
    : {
        [position.side]:
          "max(0.75rem, env(safe-area-inset-" + position.side + "))",
        top: `calc(${position.y * 100}% - ${BUBBLE / 2}px)`,
      };
  const opensUp = position.y > 0.5;

  return (
    <div
      ref={rootRef}
      className={`qn-touch qn-${position.side}${opensUp ? " qn-up" : ""}${open ? " qn-open" : ""}${drag ? " qn-dragging" : ""}`}
      style={style}
    >
      <button
        type="button"
        className="qn-bubble"
        aria-label={open ? "Close quick actions" : "Quick actions"}
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
      <ul
        id={`${id}-menu`}
        className="qn-touch-menu"
        role="menu"
        hidden={!open}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const active = current === action.to;
          return (
            <li key={action.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={`qn-touch-item${active ? " qn-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onPick(action)}
              >
                <span className="qn-touch-icon">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="qn-touch-label">
                  <strong>{action.label}</strong>
                  <span>{active ? "You're here" : action.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
