"use client";

import React from "react";
import { cardBase, cardHover } from "./design-tokens";

type CardProps = {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
};

/**
 * Unified Card wrapper. No fixed widths â€” use grid for responsive layout.
 */
export default function Card({
  children,
  hover = false,
  className = "",
  onClick,
}: CardProps) {
  return (
    <div
      className={[hover ? cardHover : cardBase, className].join(" ")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
