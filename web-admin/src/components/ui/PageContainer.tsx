"use client";

import React from "react";
import { pageWidth } from "./design-tokens";

/**
 * Centres a screen's content at one of three widths.
 *
 * Screens had drifted across max-w-lg / xl / 2xl / 3xl / 4xl / 5xl / 6xl / 7xl
 * with no pattern. They are not all meant to be the same width — a form should
 * stay readable rather than stretch to 1280px — so this offers the three tiers
 * that actually exist rather than forcing one.
 *
 * Deliberately applies no padding: OwnerWorkspaceShell's <main> already pads
 * the content area, and adding more here would inset every screen twice.
 */
export default function PageContainer({
  width = "wide",
  children,
  className = "",
}: {
  width?: keyof typeof pageWidth;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${pageWidth[width]} ${className}`}>{children}</div>;
}
