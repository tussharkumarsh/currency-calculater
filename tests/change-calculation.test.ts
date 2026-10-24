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
      cashPaise: 100_000,
      onlinePaise: 0,
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

describe("calculateChange with an online / bank transfer part", () => {
  it("adds the online amount to the cash received", () => {
    // ₹1,000 cash + ₹500 online against a ₹1,480 bill → ₹20 change.
    expect(calculateChange(bill("1480"), thousand.grandTotal, bill("500"))).toEqual({
      billPaise: 148_000,
      cashPaise: 100_000,
      onlinePaise: 50_000,
      receivedPaise: 150_000,
      status: "change",
      amountPaise: 2_000,
    });
  });

  it("reports what is still due after cash and online", () => {
    expect(calculateChange(bill("2000"), thousand.grandTotal, bill("750.50"))).toMatchObject({
      status: "due",
      amountPaise: 24_950,
    });
  });

  it("recognises an exact split payment, including all-online", () => {
    expect(calculateChange(bill("1500"), thousand.grandTotal, bill("500"))).toMatchObject({ status: "exact" });
    expect(calculateChange(bill("300"), 0, bill("300"))).toMatchObject({ status: "exact", amountPaise: 0 });
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

  it("adds the online part to the grand total for a split payment", () => {
    const message = buildSummaryMessage(thousand, {
      payment: calculateChange(bill("1480"), thousand.grandTotal, bill("500")),
      onlinePaise: bill("500"),
    });
    expect(message.startsWith("*Payment Received*")).toBe(true);
    expect(message).toContain("_Notes_");
    expect(message).toContain(
      [
        "Cash Total: ₹1,000",
        "Online / Bank Received: ₹500",
        "*Grand Total: ₹1,500*",
        "",
        "Bill Amount: ₹1,480",
        "*Change to Return: ₹20*",
      ].join("\n"),
    );
    expect(message).toContain("Amount in Words: One Thousand Five Hundred Rupees Only.");
  });

  it("shows the cash / online split even without a bill", () => {
    const message = buildSummaryMessage(thousand, { onlinePaise: bill("500.50") });
    expect(message).toContain(
      ["Cash Total: ₹1,000", "Online / Bank Received: ₹500.50", "*Grand Total: ₹1,500.50*"].join("\n"),
    );
    expect(message).toContain("One Thousand Five Hundred Rupees and Fifty Paise Only.");
    expect(message).not.toContain("Bill Amount");
    expect(buildSummaryMessage(thousand, { onlinePaise: 0 })).toBe(buildSummaryMessage(thousand));
  });

  it("shares a payment made entirely online, without a denomination breakdown", () => {
    const none = calculateTotals(denominations, {});
    const message = buildSummaryMessage(none, {
      payment: calculateChange(bill("750"), none.grandTotal, bill("750")),
      onlinePaise: bill("750"),
    });
    expect(message).not.toContain("Denomination Breakdown");
    expect(message).not.toContain("Total Pieces");
    expect(message).toContain(
      ["Cash Total: ₹0", "Online / Bank Received: ₹750", "*Grand Total: ₹750*"].join("\n"),
    );
    expect(message).toContain("*Change to Return: ₹0 (exact amount)*");
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
