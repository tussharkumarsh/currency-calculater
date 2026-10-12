import type { ParsedValue } from "@/lib/discount-calculations";
import { formatBasisPoints, formatPaise, formatPercent } from "@/lib/discount-calculations";

/**
 * Selling-price maths for a target profit. Money is in paise and percentages in
 * basis points (1% = 100 bp). BigInt keeps every intermediate product exact.
 *
 *   Profit margin = profit ÷ SELLING price  → selling = cost ÷ (1 − margin)
 *   Cost markup   = profit ÷ COST price     → selling = cost × (1 + markup)
 */
export type PricingMethod = "margin" | "markup";

export const MARGIN_PRESETS = [5, 10, 15, 20, 25] as const;
/** Markup has no natural ceiling; 1000% (11× cost) is far beyond normal retail. */
export const MAX_MARKUP_PERCENT = 1000;

const PERCENT_PATTERN = /^(\d+\.?\d*|\.\d+)$/;

/** Parses the margin or markup field into basis points, with method-specific limits. */
export function parsePricingPercent(raw: string, method: PricingMethod): ParsedValue {
  const label = method === "margin" ? "Profit margin" : "Markup";
  const cleaned = raw.replace(/[%\s]/g, "");
  if (cleaned === "") return { status: "empty" };
  if (cleaned.startsWith("-")) return { status: "invalid", error: `${label} can't be negative.` };
  if (!PERCENT_PATTERN.test(cleaned)) return { status: "invalid", error: "Enter a percentage, e.g. 10 or 12.5." };
  const [, fraction = ""] = cleaned.split(".");
  if (fraction.length > 2) return { status: "invalid", error: "Use at most 2 decimal places." };
  const percent = Number(cleaned);
  if (method === "margin" && percent >= 100) {
    return {
      status: "invalid",
      error: "Profit margin must be below 100% — at 100% the cost would have to be zero.",
    };
  }
  if (method === "markup" && percent > MAX_MARKUP_PERCENT) {
    return { status: "invalid", error: `Markup can be at most ${MAX_MARKUP_PERCENT}%.` };
  }
  return { status: "ok", value: Math.round(percent * 100) };
}

export interface SellingPriceResult {
  method: PricingMethod;
  costPaise: number;
  percentBp: number;
  /** Rounded UP to the paisa so the target margin/markup is always met, never missed by rounding. */
  sellingPaise: number;
  profitPaise: number;
  /** Profit ÷ selling × 100 at the rounded price; null when the price is zero. */
  actualMarginPercent: number | null;
  /** Profit ÷ cost × 100 at the rounded price; null when the cost is zero. */
  actualMarkupPercent: number | null;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function calculateSellingPrice(
  costPaise: number,
  percentBp: number,
  method: PricingMethod,
): SellingPriceResult | null {
  if (!Number.isSafeInteger(costPaise) || costPaise < 0 || !Number.isSafeInteger(percentBp) || percentBp < 0) {
    return null;
  }
  if (method === "margin" && percentBp >= 10_000) return null;

  const cost = BigInt(costPaise);
  const bp = BigInt(percentBp);
  const selling =
    method === "margin" ? ceilDiv(cost * 10_000n, 10_000n - bp) : ceilDiv(cost * (10_000n + bp), 10_000n);
  const sellingPaise = Number(selling);
  if (!Number.isSafeInteger(sellingPaise)) return null;
  const profitPaise = sellingPaise - costPaise;

  return {
    method,
    costPaise,
    percentBp,
    sellingPaise,
    profitPaise,
    actualMarginPercent: sellingPaise > 0 ? (profitPaise / sellingPaise) * 100 : null,
    actualMarkupPercent: costPaise > 0 ? (profitPaise / costPaise) * 100 : null,
  };
}

export function buildSellingPriceSummary(result: SellingPriceResult): string {
  return [
    `Cost Price: ${formatPaise(result.costPaise)}`,
    `${result.method === "margin" ? "Profit Margin" : "Markup on Cost"}: ${formatBasisPoints(result.percentBp)}`,
    `Profit: ${formatPaise(result.profitPaise)}`,
    `Selling Price: ${formatPaise(result.sellingPaise)}`,
  ].join("\n");
}

/** True when rounding to the paisa moved the achieved percentage visibly away from the target. */
export function roundingShiftedTarget(result: SellingPriceResult): boolean {
  const achieved = result.method === "margin" ? result.actualMarginPercent : result.actualMarkupPercent;
  return achieved !== null && formatPercent(achieved) !== formatBasisPoints(result.percentBp);
}
