import type { CashTotals, Denomination, LineItem, Quantities } from "@/types/cash-counter";

/** Upper bound per denomination row. Keeps every total far below Number.MAX_SAFE_INTEGER. */
export const MAX_QUANTITY = 99_999;
export const MAX_QUANTITY_DIGITS = String(MAX_QUANTITY).length;

export const DENOMINATIONS: readonly Denomination[] = [
  { id: "note-2000", value: 2000, kind: "note", legacy: true },
  { id: "note-500", value: 500, kind: "note" },
  { id: "note-200", value: 200, kind: "note" },
  { id: "note-100", value: 100, kind: "note" },
  { id: "note-50", value: 50, kind: "note" },
  { id: "note-20", value: 20, kind: "note" },
  { id: "note-10", value: 10, kind: "note" },
  { id: "coin-10", value: 10, kind: "coin" },
  { id: "coin-5", value: 5, kind: "coin" },
  { id: "coin-2", value: 2, kind: "coin" },
  { id: "coin-1", value: 1, kind: "coin" },
];

export function getActiveDenominations(includeLegacy: boolean): Denomination[] {
  return DENOMINATIONS.filter((d) => includeLegacy || !d.legacy);
}

export type QuantityParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "invalid" | "too-large" };

/**
 * Parses raw text from a quantity field. Empty input is zero; only plain
 * whole numbers are accepted — no signs, decimals, exponents or separators.
 */
export function parseQuantity(raw: string): QuantityParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: 0 };
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "invalid" };
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > MAX_QUANTITY) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true, value };
}

/** Defensive guard so a corrupted value can never leak into the totals. */
export function safeQuantity(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_QUANTITY
    ? value
    : 0;
}

/** Single source of truth for every amount and count shown in the app and the message. */
export function calculateTotals(
  denominations: readonly Denomination[],
  quantities: Quantities,
): CashTotals {
  const lines: LineItem[] = denominations.map((denomination) => {
    const quantity = safeQuantity(quantities[denomination.id]);
    return { denomination, quantity, amount: denomination.value * quantity };
  });

  const totals: CashTotals = {
    lines,
    usedLines: lines.filter((line) => line.quantity > 0),
    grandTotal: 0,
    noteTotal: 0,
    coinTotal: 0,
    totalNotes: 0,
    totalCoins: 0,
    totalPieces: 0,
    denominationsUsed: 0,
  };

  for (const line of lines) {
    if (line.denomination.kind === "note") {
      totals.totalNotes += line.quantity;
      totals.noteTotal += line.amount;
    } else {
      totals.totalCoins += line.quantity;
      totals.coinTotal += line.amount;
    }
  }
  totals.grandTotal = totals.noteTotal + totals.coinTotal;
  totals.totalPieces = totals.totalNotes + totals.totalCoins;
  totals.denominationsUsed = totals.usedLines.length;
  return totals;
}

export function setQuantity(quantities: Quantities, id: string, value: number): Quantities {
  return { ...quantities, [id]: safeQuantity(value) };
}

export function stepQuantity(quantities: Quantities, id: string, delta: number): Quantities {
  const next = Math.min(MAX_QUANTITY, Math.max(0, safeQuantity(quantities[id]) + delta));
  return { ...quantities, [id]: next };
}

/** Example data for first-time users: ₹2,400 in notes plus a few coins. */
export const SAMPLE_QUANTITIES: Quantities = {
  "note-500": 4,
  "note-200": 2,
  "note-10": 3,
  "coin-10": 2,
  "coin-5": 1,
  "coin-1": 3,
};
