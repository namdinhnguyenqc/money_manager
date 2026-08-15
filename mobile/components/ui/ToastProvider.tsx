import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from './Toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastState = { message: string; title?: string; type: ToastType } | null;

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    setToast({ message, type, title });
  }, []);
  const showSuccess = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const showError = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const showInfo = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <Toast
        visible={Boolean(toast)}
        message={toast?.message || ''}
        title={toast?.title}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useAppToast must be used inside ToastProvider');
  return context;
}
