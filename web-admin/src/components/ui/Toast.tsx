"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastBubble key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const colorMap: Record<ToastType, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  };

  const IconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} className="shrink-0" />,
    error: <XCircle size={16} className="shrink-0" />,
    info: <Info size={16} className="shrink-0" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 ${colorMap[toast.type]} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {IconMap[toast.type]}
      <span className="text-sm font-semibold">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="ml-1 rounded-full p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Đóng"
      >
        <X size={14} />
      </button>
    </div>
  );
}
