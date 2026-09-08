"use client";

import React from "react";
import { pageContainer } from "./design-tokens";

/**
 * One container width and padding for every owner screen.
 *
 * Screens had drifted between max-w-4xl / 6xl / 7xl and p-4 / p-6 / p-8, so
 * moving between them shifted the content edge. Purely a wrapper — it renders
 * children and nothing else.
 */
export default function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${pageContainer} ${className}`}>{children}</div>;
}
