"use client";

import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown inside the field before the value, e.g. "₹". */
  prefix?: string;
  /** Shown inside the field after the value, e.g. "%". */
  suffix?: string;
  placeholder?: string;
  error?: string | null;
  size?: "lg" | "md";
  className?: string;
}

/** Decimal input with a fixed prefix/suffix and inline validation, used by the discount tools. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { id, label, value, onChange, prefix, suffix, placeholder = "0", error, size = "md", className },
  ref,
) {
  const large = size === "lg";
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={[
          "mt-1.5 flex items-center rounded-xl border bg-surface transition-colors",
          large ? "h-14" : "h-11",
          error
            ? "border-danger ring-2 ring-danger-soft"
            : "border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft",
        ].join(" ")}
      >
        {prefix && (
          <span aria-hidden className={`pl-3.5 font-medium text-muted ${large ? "text-xl" : "text-base"}`}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            "h-full min-w-0 flex-1 bg-transparent px-2 font-semibold tabular text-ink outline-none placeholder:font-normal placeholder:text-muted/60",
            large ? "text-2xl" : "text-lg",
            prefix ? "" : "pl-3.5",
            suffix ? "" : "pr-3.5",
          ].join(" ")}
        />
        {suffix && (
          <span aria-hidden className={`pr-3.5 font-medium text-muted ${large ? "text-xl" : "text-base"}`}>
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
});
