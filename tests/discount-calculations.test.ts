import { describe, expect, it } from "vitest";
import {
  buildDiscountSummary,
  calculateDiscount,
  calculateOriginalFromFinal,
  formatBasisPoints,
  formatPaise,
  parseAmount,
  parsePercent,
} from "@/lib/discount-calculations";

const rupees = (n: number) => Math.round(n * 100);
const bp = (n: number) => Math.round(n * 100);

describe("calculateDiscount", () => {
  it("₹2,000 at 15% → ₹300 off, ₹1,700 payable", () => {
    const r = calculateDiscount(rupees(2000), bp(15));
    expect(formatPaise(r.discountPaise)).toBe("₹300");
    expect(formatPaise(r.payablePaise)).toBe("₹1,700");
    expect(r.effectivePercent).toBe(15);
  });

  it("₹1,000 at 10% → ₹100 off, ₹900 payable", () => {
    const r = calculateDiscount(rupees(1000), bp(10));
    expect([r.discountPaise, r.payablePaise]).toEqual([rupees(100), rupees(900)]);
  });

  it("0% leaves the amount unchanged", () => {
    const r = calculateDiscount(rupees(1234.5), 0);
    expect(r.discountPaise).toBe(0);
    expect(r.payablePaise).toBe(rupees(1234.5));
  });

  it("100% makes the payable amount zero", () => {
    const r = calculateDiscount(rupees(999), bp(100));
    expect(r.payablePaise).toBe(0);
    expect(r.discountPaise).toBe(rupees(999));
  });

  it("rounds to the nearest paisa and keeps discount + payable = original", () => {
    const r = calculateDiscount(rupees(99.99), bp(12.5));
    expect(r.discountPaise).toBe(1250); // 12.49875 → ₹12.50
    expect(r.payablePaise).toBe(8749);
    expect(r.discountPaise + r.payablePaise).toBe(r.originalPaise);
    expect(formatPaise(r.payablePaise)).toBe("₹87.49");
  });

  it("reports no effective percentage for a zero amount", () => {
    expect(calculateDiscount(0, bp(10)).effectivePercent).toBeNull();
  });

  it("stays exact at the maximum amount", () => {
    const r = calculateDiscount(rupees(1_000_000_000), bp(33.33));
    expect(Number.isSafeInteger(r.discountPaise)).toBe(true);
    expect(formatPaise(r.payablePaise)).toBe("₹66,67,00,000");
  });
});

describe("calculateOriginalFromFinal", () => {
  it("₹850 after 15% → original ₹1,000, discount ₹150", () => {
    const r = calculateOriginalFromFinal(rupees(850), bp(15));
    expect(r && [formatPaise(r.originalPaise), formatPaise(r.discountPaise)]).toEqual(["₹1,000", "₹150"]);
  });

  it("0% returns the same price; 100% is impossible", () => {
    expect(calculateOriginalFromFinal(rupees(500), 0)?.originalPaise).toBe(rupees(500));
    expect(calculateOriginalFromFinal(rupees(500), bp(100))).toBeNull();
  });
});

describe("parseAmount", () => {
  it.each([
    ["2000", 200000],
    ["2,000", 200000],
    ["₹ 1,25,000", 12500000],
    ["499.5", 49950],
    ["499.50", 49950],
    [".75", 75],
    ["0", 0],
  ])("accepts %s", (raw, paise) => {
    expect(parseAmount(raw)).toEqual({ status: "ok", value: paise });
  });

  it("treats blank as empty, not zero", () => {
    expect(parseAmount("  ")).toEqual({ status: "empty" });
  });

  it.each(["-5", "abc", "1.234", "1e5", "12..5", "10000000001"])("rejects %s", (raw) => {
    expect(parseAmount(raw).status).toBe("invalid");
  });
});

describe("parsePercent", () => {
  it.each([
    ["0", 0],
    ["15", 1500],
    ["12.5", 1250],
    ["100", 10000],
    ["15%", 1500],
  ])("accepts %s", (raw, value) => {
    expect(parsePercent(raw)).toEqual({ status: "ok", value });
  });

  it("rejects out-of-range and malformed input with a message", () => {
    expect(parsePercent("-5")).toEqual({ status: "invalid", error: "Discount can't be negative." });
    expect(parsePercent("101")).toEqual({ status: "invalid", error: "Discount must be between 0% and 100%." });
    expect(parsePercent("1.234").status).toBe("invalid");
    expect(parsePercent("x").status).toBe("invalid");
    expect(parsePercent("")).toEqual({ status: "empty" });
  });

  it("can disallow exactly 100% for reverse calculations", () => {
    expect(parsePercent("100", { allowHundred: false }).status).toBe("invalid");
  });
});

describe("formatting and summary", () => {
  it("formats money and percentages", () => {
    expect(formatPaise(12500000)).toBe("₹1,25,000");
    expect(formatPaise(150)).toBe("₹1.50");
    expect(formatPaise(5)).toBe("₹0.05");
    expect(formatBasisPoints(1250)).toBe("12.5%");
    expect(formatBasisPoints(3333)).toBe("33.33%");
  });

  it("builds the copy summary", () => {
    expect(buildDiscountSummary(calculateDiscount(rupees(2000), bp(15)))).toBe(
      "Original Amount: ₹2,000\nDiscount: 15%\nDiscount Amount: ₹300\nFinal Payable: ₹1,700",
    );
  });
});
