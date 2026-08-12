"use client";

import React from "react";
import { typography } from "./design-tokens";

type PageHeaderProps = {
  /** Small eyebrow text above title */
  subtitle?: string;
  /** Main page title */
  title: string;
  /** Description paragraph below title */
  description?: string;
  /** Actions slot (buttons, etc.) — rendered on the right */
  actions?: React.ReactNode;
  /** Optional breadcrumb or extra content above subtitle */
  breadcrumb?: React.ReactNode;
  /** Optional icon next to subtitle */
  icon?: React.ReactNode;
};

/**
 * Consistent page header across all pages.
 */
export default function PageHeader({
  subtitle,
  title,
  description,
  actions,
  breadcrumb,
  icon,
}: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between h-auto">
      <div className="min-w-0 flex-1">
        {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
        {subtitle && (
          <div className="mb-0.5 flex items-center gap-1.5">
            {icon && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600">
                {icon}
              </span>
            )}
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide text-blue-600">{subtitle}</span>
          </div>
        )}
        {title && <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">{title}</h1>}
        {description && <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 leading-normal">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
