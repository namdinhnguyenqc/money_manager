"use client";

import React from "react";
import Card from "./Card";

type MetricTone = "default" | "primary" | "success" | "danger" | "warning";

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  tone?: MetricTone;
  className?: string;
};

const toneClasses: Record<MetricTone, { icon: string; value: string }> = {
  default: { icon: "bg-slate-100 text-slate-600", value: "text-slate-900" },
  primary: { icon: "bg-blue-50 text-blue-700", value: "text-blue-700" },
  success: { icon: "bg-emerald-50 text-emerald-700", value: "text-emerald-700" },
  danger: { icon: "bg-rose-50 text-rose-700", value: "text-rose-700" },
  warning: { icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
};

/** Shared financial and operational metric surface used across owner pages. */
export default function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
  className = "",
}: MetricCardProps) {
  const styles = toneClasses[tone];

  return (
    <Card className={`min-w-0 p-5 ${className}`}>
      {icon && (
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}>
          {icon}
        </div>
      )}
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-xl font-bold leading-7 tabular-nums ${styles.value}`} title={typeof value === "string" ? value : undefined}>
        {value}
      </div>
      {description && <div className="mt-2 min-h-5 text-xs font-medium text-slate-500">{description}</div>}
    </Card>
  );
}
