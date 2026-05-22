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
  /** Actions slot (buttons, etc.) â€” rendered on the right */
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
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 flex-1">
        {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
        {subtitle && (
          <div className="mb-0.5 flex items-center gap-2">
            {icon && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                {icon}
              </span>
            )}
            <p className={typography.pageSubtitle}>{subtitle}</p>
          </div>
        )}
        <h1 className={typography.pageTitle}>{title}</h1>
        {description && <p className={typography.pageDescription}>{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
