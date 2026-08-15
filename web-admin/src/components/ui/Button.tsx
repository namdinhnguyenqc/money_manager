"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonVariants, buttonSizes } from "./design-tokens";

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

const baseClasses = [
  "inline-flex items-center justify-center font-semibold whitespace-nowrap",
  "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
].join(" ");

/**
 * The class string behind <Button>, for the few places that cannot render one —
 * a third-party component that only accepts a className, for instance.
 *
 * Reach for this only when <Button> genuinely will not fit. Hand-written button
 * classes are why the app ended up with buttons of a dozen different heights.
 */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return [baseClasses, buttonVariants[variant], buttonSizes[size], extra].filter(Boolean).join(" ");
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * The single button surface for the app.
 *
 * Sizes carry fixed heights (sm 32px / md 40px / lg 48px) so a row of actions
 * lines up no matter which variants it mixes — the thing that most obviously
 * broke when screens hand-rolled their own padding.
 *
 * Passing `href` renders a Next.js Link with identical styling. Navigation
 * actions used to be written as bare <Link> elements with copied Tailwind, which
 * is how "Thêm cơ sở" and "Thêm phòng" drifted to different heights despite
 * sitting in the same toolbars.
 */
export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    children,
    className = "",
    ...rest
  } = props as CommonProps & Record<string, any>;

  const classes = buttonClasses(variant, size, className);

  const content = (
    <>
      {loading ? (
        <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </>
  );

  if (typeof rest.href === "string") {
    const { href, ...anchorRest } = rest;
    // A disabled link is not a thing in HTML, so a loading/disabled navigation
    // action renders as an inert span rather than a link that still works.
    if (loading || anchorRest.disabled) {
      const { disabled: _d, ...spanRest } = anchorRest;
      return (
        <span aria-disabled className={`${classes} opacity-50 pointer-events-none`} {...spanRest}>
          {content}
        </span>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {content}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest;
  return (
    <button disabled={disabled || loading} className={classes} {...buttonRest}>
      {content}
    </button>
  );
}
