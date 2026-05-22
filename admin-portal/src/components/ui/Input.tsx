"use client";

import React from "react";
import { inputBase, selectBase, labelBase } from "./design-tokens";

/* â”€â”€ Label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ Select â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
