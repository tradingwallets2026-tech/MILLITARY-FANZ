"use client";
import { useState, useCallback } from "react";
import styles from "./toast.module.css";

export type ToastType = "success" | "warning" | "error" | "info";

interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
  icon?:   string;
}

interface UseToastReturn {
  toasts:         Toast[];
  success:        (msg: string, icon?: string) => void;
  warning:        (msg: string, icon?: string) => void;
  error:          (msg: string, icon?: string) => void;
  info:           (msg: string, icon?: string) => void;
  dismiss:        (id: string) => void;
  ToastContainer: React.FC;
}

let _setToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

function addToast(type: ToastType, message: string, icon?: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  _setToasts?.((prev) => [...prev, { id, type, message, icon }]);
  setTimeout(() => {
    _setToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, 4500);
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  _setToasts = setToasts;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ICONS: Record<ToastType, string> = {
    success: "✅", warning: "⚠️", error: "❌", info: "ℹ️"
  };

  const ToastContainer: React.FC = () => (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.toastIcon}>{t.icon ?? ICONS[t.type]}</span>
          <span className={styles.toastMsg}>{t.message}</span>
          <button className={styles.close} onClick={() => dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );

  return {
    toasts,
    success: (m, i) => addToast("success", m, i),
    warning: (m, i) => addToast("warning", m, i),
    error:   (m, i) => addToast("error",   m, i),
    info:    (m, i) => addToast("info",    m, i),
    dismiss,
    ToastContainer,
  };
}
