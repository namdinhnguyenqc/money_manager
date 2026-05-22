"use client";

import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

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
  confirmLabel = "XÃ¡c nháº­n",
  cancelLabel = "Há»§y",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)]">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">{title || "XÃ¡c nháº­n hÃ nh Ä‘á»™ng"}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
