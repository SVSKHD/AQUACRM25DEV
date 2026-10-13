import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { AquaToast } from "./AquaToast";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
let toastSequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timeout = timeouts.current.get(id);
    if (timeout) clearTimeout(timeout);
    timeouts.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    if (!message.trim()) return;
    const id = String(++toastSequence);
    const newToast = { id, message, type };
    setToasts((previous) => [...previous.slice(-3), newToast]);
    const timeout = setTimeout(() => removeToast(id), type === "error" ? 8000 : 4500);
    timeouts.current.set(id, timeout);
  }, [removeToast]);

  useEffect(() => {
    const pending = timeouts.current;
    return () => {
      pending.forEach((timeout) => clearTimeout(timeout));
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <div
          aria-label="Notifications"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-3 top-4 z-[10050] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-5 sm:w-[min(26rem,calc(100vw-2rem))]"
        >
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <div key={toast.id} className="w-full" role={toast.type === "error" ? "alert" : "status"}>
                <AquaToast
                  message={toast.message}
                  type={toast.type}
                  onClose={() => removeToast(toast.id)}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
