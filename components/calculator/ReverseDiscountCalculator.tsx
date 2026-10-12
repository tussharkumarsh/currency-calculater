"use client";

import { useState } from "react";
import {
  calculateOriginalFromFinal,
  formatBasisPoints,
  formatPaise,
  parseAmount,
  parsePercent,
} from "@/lib/discount-calculations";
import { NumberField } from "./NumberField";

/** Works back from a discounted selling price to the original price. Has its own independent state. */
export function ReverseDiscountCalculator() {
  const [finalRaw, setFinalRaw] = useState("");
  const [percentRaw, setPercentRaw] = useState("");

  const finalPrice = parseAmount(finalRaw);
  const percent = parsePercent(percentRaw, { allowHundred: false });
  const result =
    finalPrice.status === "ok" && percent.status === "ok"
      ? calculateOriginalFromFinal(finalPrice.value, percent.value)
      : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
        <NumberField
          id="reverse-final"
          label="Selling price"
          prefix="₹"
          value={finalRaw}
          onChange={setFinalRaw}
          error={finalPrice.status === "invalid" ? finalPrice.error : null}
        />
        <NumberField
          id="reverse-percent"
          label="Discount"
          suffix="%"
          value={percentRaw}
          onChange={setPercentRaw}
          error={percent.status === "invalid" ? percent.error : null}
        />
      </div>

      <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm">
        {result ? (
          <>
            <span className="text-muted">
              Original price
              <span className="ml-1.5 text-xs">
                (saved {formatPaise(result.discountPaise)} at {formatBasisPoints(result.percentBp)})
              </span>
            </span>
            <span className="text-lg font-semibold tabular text-ink">{formatPaise(result.originalPaise)}</span>
          </>
        ) : (
          <span className="text-muted">Enter the selling price and discount to find the original price.</span>
        )}
      </div>

      {(finalRaw || percentRaw) && (
        <button
          type="button"
          onClick={() => {
            setFinalRaw("");
            setPercentRaw("");
          }}
          className="text-xs font-medium text-muted hover:text-ink hover:underline"
        >
          Clear these fields
        </button>
      )}
    </div>
  );
}
