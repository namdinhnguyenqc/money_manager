"use client";

import React from "react";
import { inputBase, selectBase, labelBase } from "./design-tokens";

/* ── Label ──────────────────────────────────────────────────────── */
type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  children: React.ReactNode;
};

export function Label({ children, className = "", ...rest }: LabelProps) {
  return (
    <label className={`${labelBase} ${className}`} {...rest}>
      {children}
    </label>
  );
}

/* ── Input ──────────────────────────────────────────────────────── */
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  error?: string;
};

export default function Input({
  icon,
  error,
  className = "",
  ...rest
}: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <input
        className={[
          inputBase,
          icon ? "pl-10" : "",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "",
          className,
        ].join(" ")}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Select ─────────────────────────────────────────────────────── */
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
};

export function Select({
  error,
  children,
  className = "",
  ...rest
}: SelectProps) {
  return (
    <div>
      <select
        className={[
          selectBase,
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Textarea ───────────────────────────────────────────────────── */
/* Screens were reaching for a raw <textarea class="input"> and picking their
   own min-height, so multi-line fields did not match the inputs beside them. */
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export function Textarea({ error, className = "", rows = 3, ...rest }: TextareaProps) {
  return (
    <div>
      <textarea
        rows={rows}
        className={[
          inputBase,
          "resize-y leading-6",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "",
          className,
        ].join(" ")}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── FormField ──────────────────────────────────────────────────── */
/* Label + control + helper/error in one place, so the gap between a label and
   its input is the same on every form. Purely presentational: it renders the
   control it is given and never touches value, onChange or validation. */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className = "",
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
