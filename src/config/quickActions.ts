import { Zap, type LucideIcon } from "lucide-react";

/** One shortcut in the quick navigation (components/QuickNav.tsx). */
export interface QuickAction {
  id: string;
  label: string;
  /** Tooltip / second line. */
  hint: string;
  to: string;
  icon: LucideIcon;
  /** Alt + this letter opens it from anywhere. */
  key?: string;
}

/** Add more shortcuts here; they appear in both the dock and the bubble. */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "quick-invoice",
    label: "Quick invoice",
    hint: "Paste details and create an invoice",
    to: "/invoice/easy",
    icon: Zap,
    key: "q",
  },
];
