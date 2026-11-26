import type { ParsedValue } from "@/lib/discount-calculations";
import { formatPaise, formatPercent } from "@/lib/discount-calculations";

/**
 * Landed cost: how much the transport (freight) adds to a purchase.
 * Money is in paise. Example: 40 pcs for ₹13,900 + ₹1,250 transport
 *   → transport is 8.99% of the goods (8.25% of the total), ₹378.75 per piece.
 */

export const MAX_QUANTITY = 10_000_000;

/** Parses a quantity (pieces, kg, metres…): greater than zero, up to 3 decimals. */
export function parseQuantity(raw: string): ParsedValue {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return { status: "empty" };
  if (cleaned.startsWith("-")) return { status: "invalid", error: "Quantity can't be negative." };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { status: "invalid", error: "Enter a quantity, e.g. 40." };
  const [, fraction = ""] = cleaned.split(".");
  if (fraction.length > 3) return { status: "invalid", error: "Use at most 3 decimal places." };
  const quantity = Number(cleaned);
  if (quantity === 0) return { status: "invalid", error: "Quantity must be more than 0." };
  if (quantity > MAX_QUANTITY) return { status: "invalid", error: "Quantity is too large." };
  return { status: "ok", value: quantity };
}

export interface LandedCostResult {
  goodsPaise: number;
  transportPaise: number;
  totalPaise: number;
  /** Transport ÷ goods × 100; null when the goods amount is zero. */
  percentOfGoods: number | null;
  /** Transport ÷ (goods + transport) × 100; null when the total is zero. */
  percentOfTotal: number | null;
  quantity: number | null;
  /** Per-unit figures, rounded to the nearest paisa; null without a quantity. */
  perUnit: { goodsPaise: number; transportPaise: number; totalPaise: number } | null;
}

export function calculateLandedCost(
  goodsPaise: number,
  transportPaise: number,
  quantity: number | null = null,
): LandedCostResult {
  const totalPaise = goodsPaise + transportPaise;
  const perUnit =
    quantity !== null && quantity > 0
      ? {
          goodsPaise: Math.round(goodsPaise / quantity),
          transportPaise: Math.round(transportPaise / quantity),
          totalPaise: Math.round(totalPaise / quantity),
        }
      : null;
  return {
    goodsPaise,
    transportPaise,
    totalPaise,
    percentOfGoods: goodsPaise > 0 ? (transportPaise / goodsPaise) * 100 : null,
    percentOfTotal: totalPaise > 0 ? (transportPaise / totalPaise) * 100 : null,
    quantity,
    perUnit,
  };
}

export function formatQuantity(quantity: number): string {
  return String(Number(quantity.toFixed(3)));
}

export function buildLandedCostSummary(result: LandedCostResult): string {
  const lines = [
    `Goods Amount${result.quantity !== null ? ` (${formatQuantity(result.quantity)} pcs)` : ""}: ${formatPaise(result.goodsPaise)}`,
    `Transport Charges: ${formatPaise(result.transportPaise)}`,
    `Total Cost: ${formatPaise(result.totalPaise)}`,
  ];
  if (result.percentOfGoods !== null) lines.push(`Transport %: ${formatPercent(result.percentOfGoods)} of goods`);
  if (result.percentOfTotal !== null) lines.push(`(${formatPercent(result.percentOfTotal)} of total cost)`);
  if (result.perUnit) {
    lines.push(
      `Cost per piece: ${formatPaise(result.perUnit.totalPaise)} (incl. ${formatPaise(result.perUnit.transportPaise)} transport)`,
    );
  }
  return lines.join("\n");
}
