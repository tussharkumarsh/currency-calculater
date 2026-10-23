import { describe, expect, it } from "vitest";
import { calculateChange } from "@/lib/change-calculation";
import { calculateTotals, getActiveDenominations } from "@/lib/currency";
import { formatPaise, parseAmount } from "@/lib/discount-calculations";
import { buildSummaryMessage } from "@/lib/whatsapp";

const denominations = getActiveDenominations(false);
// ₹500 × 1 + ₹200 × 1 + ₹100 × 2 + ₹50 × 2 = ₹1,000
const thousand = calculateTotals(denominations, { "note-500": 1, "note-200": 1, "note-100": 2, "note-50": 2 });

function bill(raw: string): number {
  const parsed = parseAmount(raw);
  if (parsed.status !== "ok") throw new Error(`unexpected ${parsed.status}`);
  return parsed.value;
}

describe("calculateChange", () => {
  it("returns change when the customer pays more", () => {
    expect(thousand.grandTotal).toBe(1000);
    expect(calculateChange(bill("980"), thousand.grandTotal)).toEqual({
      billPaise: 98_000,
      receivedPaise: 100_000,
      status: "change",
      amountPaise: 2_000,
    });
  });

  it("reports the balance due when the customer pays less", () => {
    expect(calculateChange(bill("980"), 950)).toMatchObject({ status: "due", amountPaise: 3_000 });
  });

  it("recognises an exact payment", () => {
    expect(calculateChange(bill("980"), 980)).toMatchObject({ status: "exact", amountPaise: 0 });
  });

  it("handles decimal bills exactly in paise", () => {
    const result = calculateChange(bill("979.90"), 1000);
    expect(result).toMatchObject({ status: "change", amountPaise: 2_010 });
    expect(formatPaise(result.amountPaise)).toBe("₹20.10");
    expect(calculateChange(bill("0.1"), 0)).toMatchObject({ status: "due", amountPaise: 10 });
    expect(formatPaise(calculateChange(bill("1,000.55"), 1000).amountPaise)).toBe("₹0.55");
  });

  it("follows the counted cash as quantities change", () => {
    const more = calculateTotals(denominations, { "note-500": 2 });
    expect(calculateChange(bill("980"), more.grandTotal)).toMatchObject({ status: "change", amountPaise: 2_000 });
    const less = calculateTotals(denominations, { "note-500": 1 });
    expect(calculateChange(bill("980"), less.grandTotal)).toMatchObject({ status: "due", amountPaise: 48_000 });
  });
});

describe("bill amount input", () => {
  it("treats an empty field as no bill, not ₹0", () => {
    expect(parseAmount("")).toEqual({ status: "empty" });
    expect(parseAmount("   ")).toEqual({ status: "empty" });
  });

  it.each(["-5", "abc", "12.345", "1e3", "Infinity", "NaN", "5..0"])("rejects %j", (raw) => {
    expect(parseAmount(raw).status).toBe("invalid");
  });

  it("accepts a zero bill when typed explicitly", () => {
    expect(parseAmount("0")).toEqual({ status: "ok", value: 0 });
  });
});

describe("buildSummaryMessage with a bill", () => {
  it("adds bill, cash received and change after the grand total", () => {
    const message = buildSummaryMessage(thousand, { payment: calculateChange(bill("980"), thousand.grandTotal) });
    expect(message).toContain(
      ["*Grand Total: ₹1,000*", "", "Bill Amount: ₹980", "Cash Received: ₹1,000", "*Change to Return: ₹20*"].join(
        "\n",
      ),
    );
    expect(message).not.toMatch(/returned/i);
  });

  it("shows the balance due when short", () => {
    const totals = calculateTotals(denominations, { "note-500": 1, "note-200": 2, "note-50": 1 });
    expect(buildSummaryMessage(totals, { payment: calculateChange(bill("980"), totals.grandTotal) })).toContain(
      "*Balance Due: ₹30*",
    );
  });

  it("marks an exact payment", () => {
    const message = buildSummaryMessage(thousand, { payment: calculateChange(bill("1000"), thousand.grandTotal) });
    expect(message).toContain("*Change to Return: ₹0 (exact amount)*");
  });

  it("keeps the message byte-for-byte unchanged without a bill", () => {
    expect(buildSummaryMessage(thousand, { payment: undefined })).toBe(buildSummaryMessage(thousand));
    expect(buildSummaryMessage(thousand)).not.toContain("Bill Amount");
  });

  it("translates the payment lines to Hindi", () => {
    const message = buildSummaryMessage(thousand, {
      language: "hi",
      payment: calculateChange(bill("980"), thousand.grandTotal),
    });
    expect(message).toContain("बिल राशि: ₹980");
    expect(message).toContain("*लौटाने की राशि: ₹20*");
  });
});
