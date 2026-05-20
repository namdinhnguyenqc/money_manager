"use client";

import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

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
      <div className="w-full max-w-[380px] rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            size="md"
            disabled={isLoading}
            onClick={onCancel}
          >
            Hủy
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={isLoading}
            loading={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
