"use client";

import React from "react";

type PageHeaderProps = {
  /** Deprecated: kept for compatibility, no longer rendered as an eyebrow above the title. */
  subtitle?: string;
  /** Primary page title rendered inside the page content. */
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
  subtitle: _subtitle,
  title,
  description,
  actions,
  breadcrumb,
  icon: _icon,
}: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {breadcrumb && <div className="mb-2 text-sm text-slate-500">{breadcrumb}</div>}
        <h1 className="text-xl font-bold leading-7 tracking-[-0.02em] text-slate-950 sm:text-[22px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">{description}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
