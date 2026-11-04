import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
} from "lucide-react";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type LiquidButtonVariant = "primary" | "soft" | "danger" | "ghost";

export type RequestState = "idle" | "loading" | "error" | "success";

export type LiquidDropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  listMax: number;
  openUp: boolean;
};

export function LiquidButton({
  children,
  className = "",
  variant = "soft",
  requestState = "idle",
  loadingLabel,
  errorLabel,
  successLabel,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LiquidButtonVariant;
  requestState?: RequestState;
  loadingLabel?: ReactNode;
  errorLabel?: ReactNode;
  successLabel?: ReactNode;
}) {
  const stateContent =
    requestState === "loading"
      ? {
          icon: (
            <Loader2
              className="h-4 w-4 animate-spin text-emerald-300"
              aria-hidden="true"
            />
          ),
          label: loadingLabel || children,
        }
      : requestState === "error"
        ? {
            icon: (
              <Loader2
                className="h-4 w-4 animate-spin text-rose-300"
                aria-hidden="true"
              />
            ),
            label: errorLabel || "Failed — retry",
          }
        : requestState === "success"
          ? {
              icon: (
                <CheckCircle2
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
              ),
              label: successLabel || children,
            }
          : null;

  return (
    <button
      {...props}
      disabled={disabled || requestState === "loading"}
      aria-busy={requestState === "loading" || undefined}
      data-request-state={requestState}
      className={joinClasses(
        "liquid-button",
        variant === "primary" && "liquid-button-primary",
        variant === "soft" && "liquid-button-soft",
        variant === "danger" && "liquid-button-danger",
        variant === "ghost" && "liquid-button-ghost",
        requestState === "error" && "ring-2 ring-rose-400/50",
        requestState === "success" && "ring-2 ring-emerald-400/40",
        className,
      )}
    >
      {stateContent ? (
        <span className="inline-flex items-center justify-center gap-2">
          {stateContent.icon}
          <span>{stateContent.label}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function SidebarRequestBanner({
  state,
  message,
  title,
  onDismiss,
}: {
  state: RequestState;
  message?: string | null;
  title?: string;
  onDismiss?: () => void;
}) {
  if ((state !== "error" && state !== "success") || !message) return null;
  const isError = state === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={joinClasses(
        "mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg",
        isError
          ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
          : "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {title || (isError ? "Action failed" : "Changes saved")}
        </p>
        <p className="mt-1 break-words text-sm leading-relaxed">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 transition hover:bg-white/10"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function LiquidIconButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={joinClasses("liquid-icon-button", className)}>
      {children}
    </button>
  );
}

export function LiquidFileButton({
  id,
  children,
  className = "",
  variant = "primary",
  disabled,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  id: string;
  children: ReactNode;
  className?: string;
  variant?: LiquidButtonVariant;
}) {
  return (
    <label
      htmlFor={id}
      className={joinClasses(
        "liquid-button",
        variant === "primary" && "liquid-button-primary",
        variant === "soft" && "liquid-button-soft",
        variant === "danger" && "liquid-button-danger",
        variant === "ghost" && "liquid-button-ghost",
        className,
      )}
      aria-disabled={disabled || undefined}
    >
      {children}
      <input
        {...props}
        id={id}
        type="file"
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}

export function LiquidInput({
  label,
  className = "",
  wrapperClassName = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  wrapperClassName?: string;
}) {
  return (
    <label className={joinClasses("block", wrapperClassName)}>
      {label && <span className="liquid-label">{label}</span>}
      <input {...props} className={joinClasses("liquid-field", className)} />
    </label>
  );
}

export function LiquidTextarea({
  label,
  className = "",
  wrapperClassName = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  wrapperClassName?: string;
}) {
  return (
    <label className={joinClasses("block", wrapperClassName)}>
      {label && <span className="liquid-label">{label}</span>}
      <textarea
        {...props}
        className={joinClasses("liquid-textarea", className)}
      />
    </label>
  );
}

export function LiquidCheckbox({
  label,
  ariaLabel,
  indeterminate = false,
  className = "",
  wrapperClassName = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "aria-label"> & {
  label?: ReactNode;
  ariaLabel?: string;
  indeterminate?: boolean;
  wrapperClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={joinClasses("liquid-checkbox", wrapperClassName)}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        aria-label={ariaLabel}
        className={joinClasses("liquid-checkbox-input", className)}
      />
      <span className="liquid-checkbox-control" aria-hidden="true" />
      {label !== undefined && (
        <span className="liquid-checkbox-label">{label}</span>
      )}
    </label>
  );
}

export function LiquidSelect({
  label,
  children,
  className = "",
  wrapperClassName = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  wrapperClassName?: string;
  children: ReactNode;
}) {
  return (
    <label className={joinClasses("block", wrapperClassName)}>
      {label && <span className="liquid-label">{label}</span>}
      <span className="liquid-select-shell">
        <select {...props} className={joinClasses("liquid-select", className)}>
          {children}
        </select>
        <ChevronDown className="liquid-select-icon" />
      </span>
    </label>
  );
}

// Menus with this many options or more get a search box unless `searchable` says otherwise.
const DROPDOWN_SEARCH_THRESHOLD = 7;
const DROPDOWN_VIEWPORT_MARGIN = 12;
const DROPDOWN_GAP = 8;
const DROPDOWN_LIST_MAX = 264;
const DROPDOWN_LIST_MIN = 120;

const filterDropdownOptions = (
  options: LiquidDropdownOption[],
  query: string,
) => {
  const needle = query.trim().toLowerCase();
  return needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;
};

const firstEnabledIndex = (options: LiquidDropdownOption[]) =>
  options.findIndex((option) => !option.disabled);

const highlightMatch = (label: string, query: string) => {
  const needle = query.trim();
  if (!needle) return label;
  const at = label.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark className="liquid-dropdown-mark">
        {label.slice(at, at + needle.length)}
      </mark>
      {label.slice(at + needle.length)}
    </>
  );
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type ListboxMenuProps = {
  anchorRef: RefObject<HTMLDivElement | null>;
  listboxId: string;
  label: string;
  options: LiquidDropdownOption[];
  searchable: boolean;
  searchPlaceholder: string;
  multiple?: boolean;
  minMenuWidth?: number;
  isSelected: (value: string) => boolean;
  onPick: (option: LiquidDropdownOption) => void;
  onClose: (restoreFocus: boolean) => void;
  renderActions?: (
    visible: LiquidDropdownOption[],
    filtered: boolean,
  ) => ReactNode;
};

// Shared popover for LiquidDropdown and LiquidMultiSelect. Mounted only while open,
// so the search text and active option reset on every open.
function LiquidListboxMenu({
  anchorRef,
  listboxId,
  label,
  options,
  searchable,
  searchPlaceholder,
  multiple = false,
  minMenuWidth = 0,
  isSelected,
  onPick,
  onClose,
  renderActions,
}: ListboxMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => filterDropdownOptions(options, query),
    [options, query],
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const selected = options.findIndex(
      (option) => !option.disabled && isSelected(option.value),
    );
    return selected >= 0 ? selected : firstEnabledIndex(options);
  });
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [scrollEdges, setScrollEdges] = useState({ up: false, down: false });

  const syncScrollEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const up = list.scrollTop > 2;
    const down = list.scrollTop + list.clientHeight < list.scrollHeight - 2;
    setScrollEdges((current) =>
      current.up === up && current.down === down ? current : { up, down },
    );
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    const list = listRef.current;
    if (!anchor || !menu || !list) return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, minMenuWidth),
      viewportWidth - DROPDOWN_VIEWPORT_MARGIN * 2,
    );
    const left = Math.min(
      Math.max(rect.left, DROPDOWN_VIEWPORT_MARGIN),
      viewportWidth - DROPDOWN_VIEWPORT_MARGIN - width,
    );
    const chrome = menu.offsetHeight - list.offsetHeight;
    const below =
      viewportHeight - rect.bottom - DROPDOWN_GAP - DROPDOWN_VIEWPORT_MARGIN;
    const above = rect.top - DROPDOWN_GAP - DROPDOWN_VIEWPORT_MARGIN;
    const wanted = chrome + Math.min(list.scrollHeight, DROPDOWN_LIST_MAX);
    const openUp = below < wanted && above > below;
    const room = openUp ? above : below;
    const listMax = Math.max(
      DROPDOWN_LIST_MIN,
      Math.min(DROPDOWN_LIST_MAX, room - chrome),
    );
    const height = chrome + Math.min(list.scrollHeight, listMax);
    setPosition({
      left,
      width,
      listMax,
      openUp,
      top: openUp
        ? Math.max(DROPDOWN_VIEWPORT_MARGIN, rect.top - DROPDOWN_GAP - height)
        : rect.bottom + DROPDOWN_GAP,
    });
  }, [anchorRef, minMenuWidth]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, visible.length]);

  useLayoutEffect(() => {
    syncScrollEdges();
  }, [syncScrollEdges, position, visible.length]);

  useEffect(() => {
    (searchable ? searchRef.current : listRef.current)?.focus({
      preventScroll: true,
    });
  }, [searchable]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !anchorRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        onCloseRef.current(false);
      }
    };
    const handleReposition = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      updatePosition();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [anchorRef, updatePosition]);

  const stopAutoScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
  }, []);

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const startAutoScroll = (direction: 1 | -1) => {
    stopAutoScroll();
    const step = () => {
      const list = listRef.current;
      if (!list) return;
      list.scrollTop += direction * 6;
      scrollFrame.current = requestAnimationFrame(step);
    };
    scrollFrame.current = requestAnimationFrame(step);
  };

  const scrollPage = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      top: direction * list.clientHeight * 0.8,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  // Moves the active option by `delta`, skipping disabled options; stops at the ends.
  const step = (from: number, delta: number) => {
    if (!visible.length) return -1;
    const direction = delta > 0 ? 1 : -1;
    const origin = from < 0 ? (direction > 0 ? -1 : visible.length) : from;
    let index = Math.min(Math.max(origin + delta, 0), visible.length - 1);
    while (index >= 0 && index < visible.length && visible[index].disabled)
      index += direction;
    return index >= 0 && index < visible.length ? index : from;
  };

  const pickActive = () => {
    const option = visible[activeIndex];
    if (option && !option.disabled) onPick(option);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const inSearch = event.target === searchRef.current;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => step(index, 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => step(index, -1));
        return;
      case "PageDown":
        event.preventDefault();
        setActiveIndex((index) => step(index, 6));
        return;
      case "PageUp":
        event.preventDefault();
        setActiveIndex((index) => step(index, -6));
        return;
      case "Home":
      case "End":
        if (inSearch) return;
        event.preventDefault();
        setActiveIndex(
          event.key === "Home" ? step(-1, 1) : step(visible.length, -1),
        );
        return;
      case "Enter":
        event.preventDefault();
        pickActive();
        return;
      case " ":
        if (inSearch) return;
        event.preventDefault();
        pickActive();
        return;
      case "Escape":
        // Keep Escape from also closing the panel or sidebar that hosts this control.
        event.preventDefault();
        event.nativeEvent.stopPropagation();
        onClose(true);
        return;
      case "Tab":
        onClose(false);
        return;
      default:
        if (
          inSearch ||
          event.key.length !== 1 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        {
          const now = Date.now();
          const text =
            now - typeahead.current.at > 600
              ? event.key
              : typeahead.current.text + event.key;
          typeahead.current = { text, at: now };
          const match = visible.findIndex(
            (option) =>
              !option.disabled &&
              option.label.toLowerCase().startsWith(text.toLowerCase()),
          );
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  const activeId =
    activeIndex >= 0 && visible[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;
  const filtered = visible.length !== options.length;

  return createPortal(
    <div
      ref={menuRef}
      className={joinClasses(
        "liquid-dropdown-menu liquid-dropdown-menu-portal",
        position?.openUp && "liquid-dropdown-menu-up",
      )}
      style={
        {
          position: "fixed",
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          width: position?.width ?? anchorRef.current?.offsetWidth,
          opacity: position ? undefined : 0,
          "--liquid-dropdown-list-max": `${position?.listMax ?? DROPDOWN_LIST_MAX}px`,
        } as CSSProperties
      }
      onKeyDown={handleKeyDown}
    >
      {searchable && (
        <div className="liquid-dropdown-search">
          <Search className="liquid-dropdown-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-label={`Search ${label}`}
            autoComplete="off"
            spellCheck={false}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(
                firstEnabledIndex(
                  filterDropdownOptions(options, event.target.value),
                ),
              );
            }}
            className="liquid-dropdown-search-input"
          />
          {query && (
            <button
              type="button"
              className="liquid-dropdown-search-clear"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setActiveIndex(firstEnabledIndex(options));
                searchRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {renderActions?.(visible, filtered)}
      <div className="liquid-dropdown-list-frame">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll options up"
          className={joinClasses(
            "liquid-dropdown-scroll liquid-dropdown-scroll-up",
            scrollEdges.up && "is-visible",
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => scrollPage(-1)}
          onPointerEnter={(event) =>
            event.pointerType === "mouse" && startAutoScroll(-1)
          }
          onPointerLeave={stopAutoScroll}
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-multiselectable={multiple || undefined}
          aria-activedescendant={searchable ? undefined : activeId}
          className="liquid-dropdown-list"
          onScroll={syncScrollEdges}
        >
          {visible.map((option, index) => {
            const selected = isSelected(option.value);
            return (
              <div
                key={option.value}
                id={`${listboxId}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (!option.disabled && index !== activeIndex)
                    setActiveIndex(index);
                }}
                onClick={() => {
                  if (!option.disabled) onPick(option);
                }}
                className={joinClasses(
                  "liquid-dropdown-option",
                  multiple && "liquid-dropdown-option-multi",
                  selected && "liquid-dropdown-option-selected",
                  index === activeIndex && "liquid-dropdown-option-active",
                  option.disabled && "liquid-dropdown-option-disabled",
                )}
              >
                {multiple && (
                  <span className="liquid-dropdown-check" aria-hidden="true">
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                )}
                <span className="liquid-dropdown-option-label">
                  {highlightMatch(option.label, query)}
                </span>
                {!multiple && selected && (
                  <Check
                    className="liquid-dropdown-option-tick"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="liquid-dropdown-empty" role="status">
              {query ? `No matches for “${query.trim()}”` : "No options"}
            </div>
          )}
        </div>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll options down"
          className={joinClasses(
            "liquid-dropdown-scroll liquid-dropdown-scroll-down",
            scrollEdges.down && "is-visible",
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => scrollPage(1)}
          onPointerEnter={(event) =>
            event.pointerType === "mouse" && startAutoScroll(1)
          }
          onPointerLeave={stopAutoScroll}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

const openOnArrowKeys = (
  event: KeyboardEvent<HTMLButtonElement>,
  open: boolean,
  setOpen: (open: boolean) => void,
) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    setOpen(true);
  } else if (event.key === "Escape" && open) {
    event.preventDefault();
    event.nativeEvent.stopPropagation();
    setOpen(false);
  }
};

export function LiquidDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  className = "",
  wrapperClassName = "",
  disabled = false,
  ariaLabel,
  searchable,
  searchPlaceholder = "Search…",
}: {
  label?: string;
  value: string;
  options: LiquidDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Show a search box in the menu. Defaults to on for 7 or more options. */
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const activeOption = options.find((option) => option.value === value);
  const accessibleLabel = ariaLabel || label || placeholder;

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className={joinClasses("liquid-dropdown-root", wrapperClassName)}
    >
      {label && <span className="liquid-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={
          activeOption
            ? `${accessibleLabel}: ${activeOption.label}`
            : accessibleLabel
        }
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) =>
          !disabled && openOnArrowKeys(event, open, setOpen)
        }
        className={joinClasses(
          "liquid-dropdown-trigger",
          open && "liquid-dropdown-trigger-open",
          className,
        )}
      >
        <span
          className={joinClasses(
            "truncate",
            !activeOption && "liquid-dropdown-placeholder",
          )}
        >
          {activeOption?.label || placeholder}
        </span>
        <ChevronDown className="liquid-dropdown-icon" aria-hidden="true" />
      </button>
      {open && (
        <LiquidListboxMenu
          anchorRef={containerRef}
          listboxId={listboxId}
          label={accessibleLabel}
          options={options}
          searchable={searchable ?? options.length >= DROPDOWN_SEARCH_THRESHOLD}
          searchPlaceholder={searchPlaceholder}
          isSelected={(optionValue) => optionValue === value}
          onPick={(option) => {
            onChange(option.value);
            close(true);
          }}
          onClose={close}
        />
      )}
    </div>
  );
}

export function LiquidMultiSelect({
  label,
  values,
  options,
  onChange,
  placeholder = "Select",
  allLabel,
  className = "",
  wrapperClassName = "",
  disabled = false,
  ariaLabel,
  searchable,
  searchPlaceholder = "Search…",
}: {
  label?: string;
  values: string[];
  options: LiquidDropdownOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Trigger text when every enabled option is selected, e.g. "All categories". */
  allLabel?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Show a search box in the menu. Defaults to on for 7 or more options. */
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const accessibleLabel = ariaLabel || label || placeholder;
  const selectedSet = useMemo(() => new Set(values), [values]);
  const selectedOptions = options.filter((option) =>
    selectedSet.has(option.value),
  );
  const enabledOptions = options.filter((option) => !option.disabled);
  const everySelected =
    enabledOptions.length > 0 &&
    enabledOptions.every((option) => selectedSet.has(option.value));

  // Keeps option order stable and preserves selected values that are not in `options`.
  const commit = (next: Set<string>) => {
    const known = new Set(options.map((option) => option.value));
    onChange([
      ...options
        .filter((option) => next.has(option.value))
        .map((option) => option.value),
      ...values.filter((value) => !known.has(value) && next.has(value)),
    ]);
  };

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : everySelected && allLabel
        ? allLabel
        : selectedOptions.length <= 2
          ? selectedOptions.map((option) => option.label).join(", ")
          : `${selectedOptions[0].label}, ${selectedOptions[1].label}`;
  const overflow =
    everySelected && allLabel ? 0 : Math.max(0, selectedOptions.length - 2);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className={joinClasses("liquid-dropdown-root", wrapperClassName)}
    >
      {label && <span className="liquid-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${accessibleLabel}: ${selectedOptions.length ? `${selectedOptions.length} selected` : "none selected"}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) =>
          !disabled && openOnArrowKeys(event, open, setOpen)
        }
        className={joinClasses(
          "liquid-dropdown-trigger",
          open && "liquid-dropdown-trigger-open",
          className,
        )}
      >
        <span
          className={joinClasses(
            "min-w-0 flex-1 truncate text-left",
            !selectedOptions.length && "liquid-dropdown-placeholder",
          )}
        >
          {summary}
        </span>
        {overflow > 0 && (
          <span className="liquid-dropdown-count-pill">+{overflow}</span>
        )}
        <ChevronDown className="liquid-dropdown-icon" aria-hidden="true" />
      </button>
      {open && (
        <LiquidListboxMenu
          anchorRef={containerRef}
          listboxId={listboxId}
          label={accessibleLabel}
          options={options}
          multiple
          minMenuWidth={240}
          searchable={searchable ?? options.length >= DROPDOWN_SEARCH_THRESHOLD}
          searchPlaceholder={searchPlaceholder}
          isSelected={(value) => selectedSet.has(value)}
          onPick={(option) => {
            const next = new Set(selectedSet);
            if (next.has(option.value)) next.delete(option.value);
            else next.add(option.value);
            commit(next);
          }}
          onClose={close}
          renderActions={(visible, filtered) => {
            const targets = visible
              .filter((option) => !option.disabled)
              .map((option) => option.value);
            const allOn =
              targets.length > 0 &&
              targets.every((value) => selectedSet.has(value));
            const anyOn = targets.some((value) => selectedSet.has(value));
            return (
              <div className="liquid-dropdown-actions">
                <button
                  type="button"
                  className="liquid-dropdown-action"
                  disabled={allOn || targets.length === 0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(new Set([...values, ...targets]))}
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {filtered ? "Select matches" : "Select all"}
                </button>
                <button
                  type="button"
                  className="liquid-dropdown-action"
                  disabled={!anyOn}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const next = new Set(selectedSet);
                    targets.forEach((value) => next.delete(value));
                    commit(next);
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {filtered ? "Deselect matches" : "Deselect all"}
                </button>
                <span
                  className="liquid-dropdown-action-count"
                  aria-live="polite"
                >
                  {selectedOptions.length}/{options.length}
                </span>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

export function LiquidPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClasses("liquid-panel", className)}>{children}</div>
  );
}

export function LiquidBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={joinClasses("liquid-badge", className)}>{children}</span>
  );
}
