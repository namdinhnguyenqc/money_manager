"use client";

import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[8px] border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)]">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">{title || "Xác nhận hành động"}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[8px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
