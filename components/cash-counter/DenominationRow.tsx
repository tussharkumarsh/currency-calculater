"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MAX_QUANTITY, parseQuantity } from "@/lib/currency";
import { formatCount, formatINR } from "@/lib/format-currency";
import type { LineItem } from "@/types/cash-counter";

interface DenominationRowProps {
  line: LineItem;
  index: number;
  onQuantityChange: (id: string, quantity: number) => void;
  onStep: (id: string, delta: number) => void;
  onEnter: (index: number, backwards: boolean) => void;
  inputRef: (index: number, el: HTMLInputElement | null) => void;
}

const REJECT_MESSAGES = {
  invalid: "Whole numbers only",
  "too-large": `Max ${formatCount(MAX_QUANTITY)}`,
} as const;

export const DenominationRow = memo(function DenominationRow({
  line,
  index,
  onQuantityChange,
  onStep,
  onEnter,
  inputRef,
}: DenominationRowProps) {
  const { denomination, quantity, amount } = line;
  const { id, value, kind } = denomination;
  const label = formatINR(value);
  const noun = kind === "note" ? "note" : "coin";
  const inputId = `qty-${id}`;

  const [rejection, setRejection] = useState<keyof typeof REJECT_MESSAGES | null>(null);
  const rejectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(rejectionTimer.current), []);

  function flashRejection(reason: keyof typeof REJECT_MESSAGES) {
    clearTimeout(rejectionTimer.current);
    setRejection(reason);
    rejectionTimer.current = setTimeout(() => setRejection(null), 1800);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const result = parseQuantity(event.target.value);
    if (result.ok) {
      if (rejection) setRejection(null);
      onQuantityChange(id, result.value);
    } else {
      // Keep the previous valid value; the controlled input reverts automatically.
      flashRejection(result.reason);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter(index, event.shiftKey);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      onStep(id, event.key === "ArrowUp" ? step : -step);
    }
  }

  const active = quantity > 0;

  return (
    <div className="flex items-center gap-2.5 py-1.5 sm:gap-3">
      <label
        htmlFor={inputId}
        className={[
          "flex h-10 w-[4.5rem] shrink-0 items-center justify-center border text-[15px] font-semibold tabular transition-colors sm:w-20 sm:text-base",
          kind === "note" ? "rounded-lg" : "rounded-full",
          active ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink",
        ].join(" ")}
      >
        {label}
        <span className="sr-only">
          {" "}
          {noun}s, quantity
        </span>
      </label>

      <div
        className={[
          "flex h-10 shrink-0 items-stretch overflow-hidden rounded-xl border bg-surface transition-colors",
          rejection
            ? "border-danger ring-2 ring-danger-soft"
            : "border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft",
        ].join(" ")}
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onStep(id, -1)}
          disabled={quantity === 0}
          aria-label={`Remove one ${label} ${noun}`}
          className="flex w-8 items-center justify-center text-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent sm:w-9"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          ref={(el) => inputRef(index, el)}
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="next"
          autoComplete="off"
          spellCheck={false}
          placeholder="0"
          value={quantity === 0 ? "" : String(quantity)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={(event) => event.currentTarget.select()}
          aria-describedby={rejection ? `${inputId}-error` : undefined}
          aria-invalid={rejection ? true : undefined}
          className="w-14 min-w-0 border-x border-line bg-transparent text-center text-lg font-semibold tabular text-ink outline-none placeholder:font-normal placeholder:text-muted/60 sm:w-16"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onStep(id, 1)}
          disabled={quantity >= MAX_QUANTITY}
          aria-label={`Add one ${label} ${noun}`}
          className="flex w-8 items-center justify-center text-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-35 sm:w-9"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>

      <div className="min-w-0 flex-1 text-right">
        {rejection ? (
          <span id={`${inputId}-error`} role="alert" className="text-xs font-medium text-danger">
            {REJECT_MESSAGES[rejection]}
          </span>
        ) : (
          <output
            htmlFor={inputId}
            className={[
              "block truncate text-[15px] tabular transition-colors sm:text-base",
              active ? "font-semibold text-ink" : "text-muted/70",
            ].join(" ")}
          >
            {formatINR(amount)}
          </output>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  // Totals recreate line objects on every change; re-render only rows whose values moved.
  prev.line.quantity === next.line.quantity &&
  prev.line.denomination === next.line.denomination &&
  prev.index === next.index &&
  prev.onQuantityChange === next.onQuantityChange &&
  prev.onStep === next.onStep &&
  prev.onEnter === next.onEnter &&
  prev.inputRef === next.inputRef,
);
