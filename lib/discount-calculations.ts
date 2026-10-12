import { groupIndian } from "@/lib/format-currency";

/**
 * All money maths runs in whole paise and all percentages in basis points
 * (1% = 100 bp), so results are exact integers and never show float noise.
 */

/** ₹100 crore — far above any counter sale, and keeps paise × basis points within safe integers. */
export const MAX_AMOUNT_RUPEES = 1_000_000_000;
export const DISCOUNT_PRESETS = [5, 10, 15, 20] as const;

export type ParsedValue = { status: "empty" } | { status: "invalid"; error: string } | { status: "ok"; value: number };

/** Parses a rupee amount in paise. Accepts "2000", "2,000", "₹ 1,999.50". */
export function parseAmount(raw: string): ParsedValue {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (cleaned === "") return { status: "empty" };
  if (cleaned.startsWith("-")) return { status: "invalid", error: "Amount can't be negative." };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { status: "invalid", error: "Enter a valid amount, e.g. 2000 or 499.50." };
  const [, fraction = ""] = cleaned.split(".");
  if (fraction.length > 2) return { status: "invalid", error: "Use at most 2 decimal places (paise)." };
  const rupees = Number(cleaned);
  if (rupees > MAX_AMOUNT_RUPEES) return { status: "invalid", error: `Maximum amount is ₹${groupIndian(MAX_AMOUNT_RUPEES)}.` };
  return { status: "ok", value: Math.round(rupees * 100) };
}

/** Parses a discount percentage (0–100, up to 2 decimals) in basis points. */
export function parsePercent(raw: string, { allowHundred = true } = {}): ParsedValue {
  const cleaned = raw.replace(/[%\s]/g, "");
  if (cleaned === "") return { status: "empty" };
  if (cleaned.startsWith("-")) return { status: "invalid", error: "Discount can't be negative." };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { status: "invalid", error: "Enter a percentage, e.g. 15 or 12.5." };
  const [, fraction = ""] = cleaned.split(".");
  if (fraction.length > 2) return { status: "invalid", error: "Use at most 2 decimal places." };
  const percent = Number(cleaned);
  if (percent > 100) return { status: "invalid", error: "Discount must be between 0% and 100%." };
  if (!allowHundred && percent === 100) {
    return { status: "invalid", error: "A 100% discount has no original price to work back to." };
  }
  return { status: "ok", value: Math.round(percent * 100) };
}

export interface DiscountResult {
  originalPaise: number;
  percentBp: number;
  discountPaise: number;
  payablePaise: number;
  /** Discount ÷ original × 100, after rounding to paise. Null when the original is zero. */
  effectivePercent: number | null;
}

function roundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
}

/** Discount = original × % ÷ 100; payable = original − discount (rounded to the nearest paisa). */
export function calculateDiscount(originalPaise: number, percentBp: number): DiscountResult {
  const discountPaise = roundHalfUp(originalPaise * percentBp, 10_000);
  return {
    originalPaise,
    percentBp,
    discountPaise,
    payablePaise: originalPaise - discountPaise,
    effectivePercent: originalPaise > 0 ? (discountPaise / originalPaise) * 100 : null,
  };
}

export interface ReverseDiscountResult {
  finalPaise: number;
  percentBp: number;
  originalPaise: number;
  discountPaise: number;
}

/** Original = final ÷ (1 − % ÷ 100). Percent must be below 100%. */
export function calculateOriginalFromFinal(finalPaise: number, percentBp: number): ReverseDiscountResult | null {
  if (percentBp >= 10_000) return null;
  const originalPaise = roundHalfUp(finalPaise * 10_000, 10_000 - percentBp);
  return { finalPaise, percentBp, originalPaise, discountPaise: originalPaise - finalPaise };
}

/** "₹1,700" for whole rupees, "₹1,699.50" when paise are present. */
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}₹${groupIndian(rupees)}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/** "15%", "12.5%", "33.33%". */
export function formatPercent(percent: number): string {
  return `${Number(percent.toFixed(2))}%`;
}

export function formatBasisPoints(bp: number): string {
  return formatPercent(bp / 100);
}

export function buildDiscountSummary(result: DiscountResult): string {
  return [
    `Original Amount: ${formatPaise(result.originalPaise)}`,
    `Discount: ${formatBasisPoints(result.percentBp)}`,
    `Discount Amount: ${formatPaise(result.discountPaise)}`,
    `Final Payable: ${formatPaise(result.payablePaise)}`,
  ].join("\n");
}
