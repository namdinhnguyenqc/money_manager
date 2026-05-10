"use client";

import React from "react";

export default function EmptyState({ icon, message, action }: { icon?: React.ReactNode; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[8px] bg-slate-100 text-slate-500">{icon}</div>}
      <div className="text-sm font-medium text-slate-700">{message}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
