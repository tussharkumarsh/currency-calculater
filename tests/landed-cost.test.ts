import { describe, expect, it } from "vitest";
import { formatPaise, formatPercent } from "@/lib/discount-calculations";
import { buildLandedCostSummary, calculateLandedCost, parseQuantity } from "@/lib/landed-cost";

const rupees = (n: number) => Math.round(n * 100);

describe("calculateLandedCost", () => {
  it("40 pcs, ₹13,900 goods + ₹1,250 transport", () => {
    const r = calculateLandedCost(rupees(13900), rupees(1250), 40);
    expect(formatPaise(r.totalPaise)).toBe("₹15,150");
    expect(formatPercent(r.percentOfGoods!)).toBe("8.99%");
    expect(formatPercent(r.percentOfTotal!)).toBe("8.25%");
    expect(r.perUnit).toEqual({ goodsPaise: 34750, transportPaise: 3125, totalPaise: 37875 });
  });

  it("works without a quantity", () => {
    const r = calculateLandedCost(rupees(1000), rupees(50));
    expect(r.percentOfGoods).toBe(5);
    expect(r.perUnit).toBeNull();
  });

  it("rounds per-piece figures to the nearest paisa", () => {
    const r = calculateLandedCost(rupees(100), rupees(10), 3);
    expect(r.perUnit?.totalPaise).toBe(3667);
  });

  it("handles zero goods without NaN", () => {
    const r = calculateLandedCost(0, rupees(100), 2);
    expect(r.percentOfGoods).toBeNull();
    expect(r.percentOfTotal).toBe(100);
  });

  it("handles all zero", () => {
    const r = calculateLandedCost(0, 0);
    expect(r.percentOfGoods).toBeNull();
    expect(r.percentOfTotal).toBeNull();
  });
});

describe("parseQuantity", () => {
  it("accepts whole and decimal quantities", () => {
    expect(parseQuantity("40")).toEqual({ status: "ok", value: 40 });
    expect(parseQuantity("1,000")).toEqual({ status: "ok", value: 1000 });
    expect(parseQuantity("2.5")).toEqual({ status: "ok", value: 2.5 });
  });

  it("treats blank as empty", () => {
    expect(parseQuantity(" ")).toEqual({ status: "empty" });
  });

  it.each(["0", "-3", "abc", "1.2345", "1e3"])("rejects %s", (raw) => {
    expect(parseQuantity(raw).status).toBe("invalid");
  });
});

describe("summary", () => {
  it("lists every figure", () => {
    expect(buildLandedCostSummary(calculateLandedCost(rupees(13900), rupees(1250), 40))).toBe(
      [
        "Goods Amount (40 pcs): ₹13,900",
        "Transport Charges: ₹1,250",
        "Total Cost: ₹15,150",
        "Transport %: 8.99% of goods",
        "(8.25% of total cost)",
        "Cost per piece: ₹378.75 (incl. ₹31.25 transport)",
      ].join("\n"),
    );
  });
});
