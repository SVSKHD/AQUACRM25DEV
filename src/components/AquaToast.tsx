import { motion } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type AquaToastType = "success" | "error" | "info";

interface AquaToastProps {
  message: string;
  type?: AquaToastType;
  onClose?: () => void;
  className?: string;
  showClose?: boolean;
  animate?: boolean;
}

const typeStyles: Record<AquaToastType, string> = {
  success: "bg-emerald-600 text-white border-emerald-500/60",
  error: "bg-rose-600 text-white border-rose-500/60",
  info: "bg-slate-900 text-white border-slate-700",
};

export function AquaToast({
  message,
  type = "info",
  onClose,
  className = "",
  showClose = true,
  animate = true,
}: AquaToastProps) {
  const icon =
    type === "success" ? (
      <CheckCircle className="w-5 h-5 flex-shrink-0" />
    ) : type === "error" ? (
      <XCircle className="w-5 h-5 flex-shrink-0" />
    ) : (
      <Info className="w-5 h-5 flex-shrink-0" />
    );

  const content = (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border pointer-events-auto max-w-md ${typeStyles[type]} ${className}`}
    >
      {icon}
      <p className="text-sm font-medium flex-1">{message}</p>
      {showClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="Close toast"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  );
}
