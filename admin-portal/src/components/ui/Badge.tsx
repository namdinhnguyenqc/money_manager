"use client";

import React from "react";
import { badgeVariants } from "./design-tokens";

export type BadgeVariant = keyof typeof badgeVariants;

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

/**
 * Unified Badge / pill component.
 */
export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap leading-5",
        badgeVariants[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
