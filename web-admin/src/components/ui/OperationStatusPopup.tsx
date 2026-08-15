"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type OperationStatus = "loading" | "success" | "error";

export default function OperationStatusPopup({
  open,
  status,
  title,
  description,
}: {
  open: boolean;
  status: OperationStatus;
  title: string;
  description: string;
}) {
  if (!open) return null;

  const icon = status === "loading"
    ? <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    : status === "success"
      ? <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      : <XCircle className="h-7 w-7 text-red-600" />;

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/25 px-4 backdrop-blur-[2px]" role="status" aria-live="polite" aria-busy={status === "loading"}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${status === "loading" ? "bg-blue-50" : status === "success" ? "bg-emerald-50" : "bg-red-50"}`}>
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
