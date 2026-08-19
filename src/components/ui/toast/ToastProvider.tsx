"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { ToastContainer, type ToastItem, type ToastType } from "./Toast";

interface ToastContextValue {
  toast: (message: string, type?: ToastType, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "info", description?: string) => {
      idCounter.current += 1;
      const id = `toast-${idCounter.current}`;
      setToasts((prev) => [...prev, { id, type, message, description }]);

      // Auto-dismiss after 3.5s (errors stay a bit longer: 5s)
      const duration = type === "error" ? 5000 : 3500;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info", description?: string) => {
      push(message, type, description);
    },
    [push]
  );

  const success = useCallback(
    (message: string, description?: string) => push(message, "success", description),
    [push]
  );

  const error = useCallback(
    (message: string, description?: string) => push(message, "error", description),
    [push]
  );

  const info = useCallback(
    (message: string, description?: string) => push(message, "info", description),
    [push]
  );

  const value = useMemo(
    () => ({ toast, success, error, info, dismiss }),
    [toast, success, error, info, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}