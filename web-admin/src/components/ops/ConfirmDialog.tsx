"use client";

import { Loader2 } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
  isLoading = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button 
            disabled={isLoading} 
            onClick={onCancel} 
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
          >
            Hủy
          </button>
          <button 
            disabled={isLoading} 
            onClick={onConfirm} 
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
