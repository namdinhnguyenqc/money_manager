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
  layout = "row",
  className = "",
}: {
  /** Search box, selects, filter pills — whatever the screen already renders. */
  children: React.ReactNode;
  /** Right-aligned secondary controls (search, selects…). */
  actions?: React.ReactNode;
  /**
   * "row" puts the two groups side by side from lg up. Use "stack" when a screen
   * has enough quick-filters that a single row would wrap mid-group — rooms has
   * six pills at 587px against 424px of inputs in a 944px column, so they never
   * fit, and forcing it just moves one pill onto a second line.
   */
  layout?: "row" | "stack";
  className?: string;
}) {
  const row = layout === "row";
  return (
    <div
      className={`mb-5 flex flex-col gap-3 ${row ? "lg:flex-row lg:items-center lg:justify-between" : ""} ${className}`}
    >
      {actions && (
        <div className={`flex flex-wrap items-center gap-2 ${row ? "order-last lg:order-none lg:ml-auto lg:shrink-0" : ""}`}>
          {actions}
        </div>
      )}
      <div className={`flex min-w-0 flex-wrap items-center gap-2 ${row ? "lg:order-first" : ""}`}>{children}</div>
    </div>
  );
}
