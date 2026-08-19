import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { transitions } from "@/lib/motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
export type ToastType = "success" | "error" | "info";
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}
const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
  ),
  error: <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-blue-500" aria-hidden="true" />,
};
const ICON_BG: Record<ToastType, string> = {
  success: "bg-emerald-50",
  error: "bg-red-50",
  info: "bg-blue-50",
};
interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}
function Toast({ toast, onDismiss }: ToastProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
      transition={transitions.spring}
      className="pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-slate-200/80 bg-white/95 p-4 pr-9 shadow-lg shadow-slate-900/5 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      {" "}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          ICON_BG[toast.type],
        )}
      >
        {" "}
        {ICONS[toast.type]}{" "}
      </div>{" "}
      <div className="min-w-0 flex-1 pt-0.5">
        {" "}
        <p className="text-sm font-semibold text-slate-900">
          {" "}
          {toast.message}{" "}
        </p>{" "}
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-500"> {toast.description} </p>
        )}{" "}
      </div>{" "}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label="Dismiss notification"
      >
        {" "}
        <X className="h-3.5 w-3.5" />{" "}
      </button>{" "}
    </motion.div>
  );
}
interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9998] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      aria-label="Notifications"
      role="region"
    >
      {" "}
      <AnimatePresence initial={false}>
        {" "}
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}{" "}
      </AnimatePresence>{" "}
    </div>
  );
}
