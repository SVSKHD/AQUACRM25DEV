import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type LiquidButtonVariant = "primary" | "soft" | "danger" | "ghost";

export type LiquidDropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

export function LiquidButton({
  children,
  className = "",
  variant = "soft",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LiquidButtonVariant;
}) {
  return (
    <button
      {...props}
      className={joinClasses(
        "liquid-button",
        variant === "primary" && "liquid-button-primary",
        variant === "soft" && "liquid-button-soft",
        variant === "danger" && "liquid-button-danger",
        variant === "ghost" && "liquid-button-ghost",
        className,
      )}
    >
      {children}
    </button>
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

export function LiquidDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  className = "",
  wrapperClassName = "",
  disabled = false,
}: {
  label?: string;
  value: string;
  options: LiquidDropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeOption = options.find((option) => option.value === value);

  const updatePosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(options.length * 48 + 12, 256);
    const shouldOpenUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: shouldOpenUp ? rect.top - estimatedHeight - 8 : rect.bottom + 8,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, options.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="liquid-dropdown-menu liquid-dropdown-menu-portal"
          role="listbox"
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={joinClasses(
                  "liquid-dropdown-option",
                  selected && "liquid-dropdown-option-selected",
                  option.disabled && "liquid-dropdown-option-disabled",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={containerRef} className={joinClasses("liquid-dropdown-root", wrapperClassName)}>
      {label && <span className="liquid-label">{label}</span>}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={joinClasses("liquid-dropdown-trigger", open && "liquid-dropdown-trigger-open", className)}
      >
        <span className="truncate">{activeOption?.label || placeholder}</span>
        <ChevronDown className="liquid-dropdown-icon" />
      </button>
      {menu}
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
  return <div className={joinClasses("liquid-panel", className)}>{children}</div>;
}

export function LiquidBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={joinClasses("liquid-badge", className)}>{children}</span>;
}
