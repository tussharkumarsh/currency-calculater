import { describe, expect, it } from "vitest";
import { formatPaise } from "@/lib/discount-calculations";
import {
  buildSellingPriceSummary,
  calculateSellingPrice,
  parsePricingPercent,
  roundingShiftedTarget,
  type PricingMethod,
} from "@/lib/margin-calculations";

const rupees = (n: number) => Math.round(n * 100);
const bp = (n: number) => Math.round(n * 100);
function price(cost: number, percent: number, method: PricingMethod = "margin") {
  const r = calculateSellingPrice(rupees(cost), bp(percent), method);
  if (!r) throw new Error("no result");
  return { selling: formatPaise(r.sellingPaise), profit: formatPaise(r.profitPaise), r };
}

describe("profit margin (default)", () => {
  it("₹90 cost at 10% margin → ₹100 selling, ₹10 profit", () => {
    const { selling, profit, r } = price(90, 10);
    expect([selling, profit]).toEqual(["₹100", "₹10"]);
    expect(r.actualMarginPercent).toBe(10);
  });

  it("₹200 cost at 20% margin → ₹250 selling, ₹50 profit", () => {
    expect(price(200, 20)).toMatchObject({ selling: "₹250", profit: "₹50" });
  });

  it("is not the same as subtracting or adding the percentage", () => {
    // 10% margin on ₹100 cost is ₹111.11+, not ₹110 (that would be a 10% markup).
    expect(price(100, 10).selling).not.toBe("₹110");
  });

  it("rounds UP to the paisa so the target margin is never missed", () => {
    const { selling, r } = price(100, 10); // exact: 111.111…
    expect(selling).toBe("₹111.12");
    expect(r.actualMarginPercent).toBeGreaterThanOrEqual(10);
    expect(roundingShiftedTarget(r)).toBe(true);
  });

  it("0% margin keeps the selling price equal to cost", () => {
    expect(price(499.5, 0)).toMatchObject({ selling: "₹499.50", profit: "₹0" });
  });

  it("handles zero cost without NaN", () => {
    const { r } = price(0, 20);
    expect(r.sellingPaise).toBe(0);
    expect(r.actualMarginPercent).toBeNull();
    expect(r.actualMarkupPercent).toBeNull();
  });

  it("supports decimals and large amounts with Indian formatting", () => {
    expect(price(1234.56, 12.5).selling).toBe("₹1,410.93"); // 1234.56 / 0.875 = 1410.9257…
    expect(price(100000, 20).selling).toBe("₹1,25,000");
    expect(Number.isSafeInteger(price(1_000_000_000, 99.99).r.sellingPaise)).toBe(true);
  });

  it("refuses 100% or more", () => {
    expect(calculateSellingPrice(rupees(100), bp(100), "margin")).toBeNull();
    expect(calculateSellingPrice(rupees(100), bp(150), "margin")).toBeNull();
  });
});

describe("cost markup", () => {
  it("₹100 cost at 10% markup → ₹110 selling, ₹10 profit", () => {
    expect(price(100, 10, "markup")).toMatchObject({ selling: "₹110", profit: "₹10" });
  });

  it("reports the equivalent margin", () => {
    const { r } = price(100, 10, "markup");
    expect(r.actualMarginPercent).toBeCloseTo(9.0909, 3);
    expect(r.actualMarkupPercent).toBe(10);
  });

  it("allows markups above 100%", () => {
    expect(price(100, 150, "markup").selling).toBe("₹250");
  });
});

describe("parsePricingPercent", () => {
  it("accepts 0 to just under 100 for margin", () => {
    expect(parsePricingPercent("0", "margin")).toEqual({ status: "ok", value: 0 });
    expect(parsePricingPercent("99.99", "margin")).toEqual({ status: "ok", value: 9999 });
    expect(parsePricingPercent("12.5%", "margin")).toEqual({ status: "ok", value: 1250 });
  });

  it("rejects 100% and above for margin with an explanation", () => {
    expect(parsePricingPercent("100", "margin").status).toBe("invalid");
    expect(parsePricingPercent("120", "margin").status).toBe("invalid");
  });

  it("accepts markups above 100% but caps extremes", () => {
    expect(parsePricingPercent("150", "markup")).toEqual({ status: "ok", value: 15000 });
    expect(parsePricingPercent("1001", "markup").status).toBe("invalid");
  });

  it.each(["-5", "abc", "1.234", "1e2"])("rejects %s", (raw) => {
    expect(parsePricingPercent(raw, "margin").status).toBe("invalid");
  });

  it("treats blank as incomplete", () => {
    expect(parsePricingPercent(" ", "margin")).toEqual({ status: "empty" });
  });
});

describe("summary", () => {
  it("labels margin and markup distinctly", () => {
    expect(buildSellingPriceSummary(price(90, 10).r)).toBe(
      "Cost Price: ₹90\nProfit Margin: 10%\nProfit: ₹10\nSelling Price: ₹100",
    );
    expect(buildSellingPriceSummary(price(100, 10, "markup").r)).toContain("Markup on Cost: 10%");
  });
});
