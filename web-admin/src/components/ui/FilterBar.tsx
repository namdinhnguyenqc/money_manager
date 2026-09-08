"use client";

import React from "react";

/**
 * The row of search + filters that sits above a list.
 *
 * List screens each built their own arrangement — some in a bordered card, some
 * loose, with different gaps — so this only fixes the layout and spacing. It
 * holds no filter state and no query logic: callers pass their existing
 * controls as children and keep every handler they already had.
 */
export default function FilterBar({
  children,
  actions,
  className = "",
}: {
  /** Search box, selects, filter pills — whatever the screen already renders. */
  children: React.ReactNode;
  /** Right-aligned secondary actions (export, view toggle…). */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
