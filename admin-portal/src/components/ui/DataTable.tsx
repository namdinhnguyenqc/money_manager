"use client";

import React from "react";

type DataTableProps = {
  headers: string[];
  children: React.ReactNode;
  /** Optional: show a checkbox in the header row */
  checkbox?: React.ReactNode;
  /** Optional: footer row (e.g. totals) */
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Unified table wrapper with consistent styling:
 * - overflow-x-auto for horizontal scroll on small screens
 * - Consistent thead styling
 * - Wrapped in rounded card
 */
export default function DataTable({
  headers,
  children,
  checkbox,
  footer,
  className = "",
}: DataTableProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {checkbox && (
                <th className="w-10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {checkbox}
                </th>
              )}
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
