import { describe, expect, it } from "vitest";
import {
  DENOMINATIONS,
  MAX_QUANTITY,
  calculateTotals,
  getActiveDenominations,
  parseQuantity,
  safeQuantity,
  setQuantity,
  stepQuantity,
} from "@/lib/currency";
import { formatCount, formatINR, groupIndian } from "@/lib/format-currency";
import type { Quantities } from "@/types/cash-counter";

const standard = getActiveDenominations(false);

describe("denominations", () => {
  it("hides the legacy ₹2,000 note by default", () => {
    expect(standard.map((d) => d.id)).toEqual([
      "note-500", "note-200", "note-100", "note-50", "note-20", "note-10",
      "coin-10", "coin-5", "coin-2", "coin-1",
    ]);
    expect(getActiveDenominations(true)[0]?.id).toBe("note-2000");
  });

  it("uses unique ids", () => {
    expect(new Set(DENOMINATIONS.map((d) => d.id)).size).toBe(DENOMINATIONS.length);
  });
});

describe("calculateTotals", () => {
  it("₹500 × 4 and ₹200 × 2 produce ₹2,400 and 6 pieces", () => {
    const totals = calculateTotals(standard, { "note-500": 4, "note-200": 2 });
    expect(totals.grandTotal).toBe(2400);
    expect(totals.totalPieces).toBe(6);
    expect(totals.totalNotes).toBe(6);
    expect(totals.totalCoins).toBe(0);
    expect(totals.denominationsUsed).toBe(2);
    expect(totals.usedLines.map((l) => [l.denomination.id, l.amount])).toEqual([
      ["note-500", 2000],
      ["note-200", 400],
    ]);
  });

  it("all-empty quantities produce zero", () => {
    const totals = calculateTotals(standard, {});
    expect(totals.grandTotal).toBe(0);
    expect(totals.totalPieces).toBe(0);
    expect(totals.usedLines).toHaveLength(0);
    expect(totals.lines).toHaveLength(standard.length);
  });

  it("counts ₹10 notes and ₹10 coins separately", () => {
    const totals = calculateTotals(standard, { "note-10": 3, "coin-10": 7 });
    expect(totals.totalNotes).toBe(3);
    expect(totals.totalCoins).toBe(7);
    expect(totals.noteTotal).toBe(30);
    expect(totals.coinTotal).toBe(70);
    expect(totals.grandTotal).toBe(100);
    expect(totals.denominationsUsed).toBe(2);
  });

  it("computes notes, coins and pieces across every row", () => {
    const q: Quantities = {
      "note-500": 1, "note-200": 1, "note-100": 1, "note-50": 1, "note-20": 1, "note-10": 1,
      "coin-10": 1, "coin-5": 1, "coin-2": 1, "coin-1": 1,
    };
    const totals = calculateTotals(standard, q);
    expect(totals.grandTotal).toBe(898);
    expect(totals.totalNotes).toBe(6);
    expect(totals.totalCoins).toBe(4);
    expect(totals.totalPieces).toBe(10);
  });

  it("row amounts always add up to the grand total", () => {
    const totals = calculateTotals(standard, { "note-500": 17, "note-50": 9, "coin-2": 33 });
    const sum = totals.lines.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(totals.grandTotal);
    expect(totals.grandTotal).toBe(17 * 500 + 9 * 50 + 33 * 2);
  });

  it("ignores corrupted quantities instead of producing wrong totals", () => {
    const corrupted = {
      "note-500": -4, "note-200": 2.5, "note-100": Number.NaN, "note-50": Infinity,
      "coin-5": "3" as unknown as number, "coin-1": MAX_QUANTITY + 1, "coin-2": 2,
    };
    const totals = calculateTotals(standard, corrupted);
    expect(totals.grandTotal).toBe(4);
    expect(totals.totalPieces).toBe(2);
  });

  it("excludes hidden legacy notes from totals", () => {
    const q = { "note-2000": 5, "note-500": 1 };
    expect(calculateTotals(standard, q).grandTotal).toBe(500);
    expect(calculateTotals(getActiveDenominations(true), q).grandTotal).toBe(10500);
  });

  it("stays exact at the maximum quantity for every row", () => {
    const all = getActiveDenominations(true);
    const q = Object.fromEntries(all.map((d) => [d.id, MAX_QUANTITY]));
    const totals = calculateTotals(all, q);
    expect(totals.grandTotal).toBe(MAX_QUANTITY * 2898);
    expect(Number.isSafeInteger(totals.grandTotal)).toBe(true);
  });
});

describe("parseQuantity", () => {
  it("treats empty input as zero", () => {
    expect(parseQuantity("")).toEqual({ ok: true, value: 0 });
    expect(parseQuantity("   ")).toEqual({ ok: true, value: 0 });
  });

  it("accepts whole numbers", () => {
    expect(parseQuantity("0")).toEqual({ ok: true, value: 0 });
    expect(parseQuantity("42")).toEqual({ ok: true, value: 42 });
    expect(parseQuantity("007")).toEqual({ ok: true, value: 7 });
  });

  it.each(["-1", "2.5", "1e3", "abc", "1,000", "+5", "٣", "0x10", "1 2"])("rejects %s", (raw) => {
    expect(parseQuantity(raw)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects values above the per-row limit", () => {
    expect(parseQuantity(String(MAX_QUANTITY))).toEqual({ ok: true, value: MAX_QUANTITY });
    expect(parseQuantity(String(MAX_QUANTITY + 1))).toEqual({ ok: false, reason: "too-large" });
    expect(parseQuantity("99999999999999999999")).toEqual({ ok: false, reason: "too-large" });
  });
});

describe("quantity updates", () => {
  it("setQuantity sanitises and does not mutate", () => {
    const q: Quantities = { "note-500": 1 };
    const next = setQuantity(q, "note-500", -3);
    expect(next["note-500"]).toBe(0);
    expect(q["note-500"]).toBe(1);
  });

  it("stepQuantity clamps between 0 and the maximum", () => {
    expect(stepQuantity({}, "coin-1", -1)["coin-1"]).toBe(0);
    expect(stepQuantity({}, "coin-1", 1)["coin-1"]).toBe(1);
    expect(stepQuantity({ "coin-1": MAX_QUANTITY }, "coin-1", 1)["coin-1"]).toBe(MAX_QUANTITY);
  });

  it("safeQuantity only passes valid integers", () => {
    expect(safeQuantity(3)).toBe(3);
    expect(safeQuantity(undefined)).toBe(0);
    expect(safeQuantity(-1)).toBe(0);
    expect(safeQuantity(1.5)).toBe(0);
  });
});

describe("Indian number formatting", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1,000"],
    [2400, "2,400"],
    [99999, "99,999"],
    [125000, "1,25,000"],
    [1000000, "10,00,000"],
    [10000000, "1,00,00,000"],
    [289797102, "28,97,97,102"],
    [1234567890, "1,23,45,67,890"],
  ])("groups %i as %s", (n, expected) => {
    expect(groupIndian(n)).toBe(expected);
  });

  it("formats rupees", () => {
    expect(formatINR(2400)).toBe("₹2,400");
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(-1500)).toBe("-₹1,500");
    expect(formatCount(12345)).toBe("12,345");
  });
});
