import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type LiquidButtonVariant = "primary" | "soft" | "danger" | "ghost";

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
