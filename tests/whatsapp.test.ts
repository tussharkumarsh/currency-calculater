import { describe, expect, it } from "vitest";
import { calculateTotals, getActiveDenominations } from "@/lib/currency";
import { parseIndianMobile } from "@/lib/phone";
import { DEFAULT_SETTINGS, sanitizeSettings } from "@/lib/settings";
import { buildSummaryMessage, buildWhatsAppUrl, resolveRecipient } from "@/lib/whatsapp";

const denominations = getActiveDenominations(false);

describe("parseIndianMobile", () => {
  it.each([
    "9876543210",
    "98765 43210",
    "98765-43210",
    "+919876543210",
    "+91 98765 43210",
    "+91-98765-43210",
    "919876543210",
    "09876543210",
    "0091 98765 43210",
    "(+91) 98765.43210",
  ])("accepts %s", (input) => {
    expect(parseIndianMobile(input)).toEqual({
      ok: true,
      international: "919876543210",
      display: "+91 98765 43210",
    });
  });

  it.each([
    ["", "Enter a mobile number."],
    ["12345", "An Indian mobile number has 10 digits."],
    ["5876543210", "Indian mobile numbers start with 6, 7, 8 or 9."],
    ["+1 202 555 0143", "Only Indian (+91) mobile numbers are supported."],
    ["98765abc10", "Use digits only, with an optional +91 prefix."],
    ["98765432101", "An Indian mobile number has 10 digits."],
    ["+91 0987654321", "Indian mobile numbers start with 6, 7, 8 or 9."],
  ])("rejects %j", (input, error) => {
    expect(parseIndianMobile(input)).toEqual({ ok: false, error });
  });
});

describe("resolveRecipient", () => {
  it("prefers a valid customer number over the default", () => {
    expect(resolveRecipient("+91 70000 11111", "9876543210")).toMatchObject({
      ok: true,
      source: "customer",
      international: "917000011111",
    });
  });

  it("uses the default number when the customer field is blank", () => {
    expect(resolveRecipient("   ", "98765 43210")).toMatchObject({
      ok: true,
      source: "default",
      international: "919876543210",
    });
  });

  it("never falls back to the default when the customer number is invalid", () => {
    const result = resolveRecipient("12345", "9876543210");
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ field: "customer" });
  });

  it("explains that a default number is required when nothing is configured", () => {
    expect(resolveRecipient("", "")).toMatchObject({
      ok: false,
      field: "default",
      error: "Enter a customer number, or set a default WhatsApp number in Settings.",
    });
  });

  it("flags an invalid configured default", () => {
    expect(resolveRecipient("", "123")).toMatchObject({ ok: false, field: "default" });
  });
});

describe("buildSummaryMessage", () => {
  it("matches the live breakdown exactly", () => {
    const totals = calculateTotals(denominations, { "note-500": 4, "note-200": 2 });
    const message = buildSummaryMessage(totals, { shopName: "Sharma Stores", dateLabel: "12 Oct 2026, 2:30 pm" });
    expect(message).toBe(
      [
        "*Cash Received — Sharma Stores*",
        "Date: 12 Oct 2026, 2:30 pm",
        "",
        "Denomination Breakdown:",
        "_Notes_",
        "₹500 × 4 = ₹2,000",
        "₹200 × 2 = ₹400",
        "",
        "Total Notes: 6",
        "Total Coins: 0",
        "Total Pieces: 6",
        "",
        "*Grand Total: ₹2,400*",
        "",
        "Amount in Words: Two Thousand Four Hundred Rupees Only.",
        "",
        "Thank you!",
      ].join("\n"),
    );
  });

  it("lists ₹10 notes and ₹10 coins under separate headings and skips zero rows", () => {
    const totals = calculateTotals(denominations, { "note-10": 2, "coin-10": 3, "coin-1": 0 });
    const message = buildSummaryMessage(totals);
    expect(message.startsWith("*Cash Received*\n\n")).toBe(true);
    expect(message).toContain("_Notes_\n₹10 × 2 = ₹20\n_Coins_\n₹10 × 3 = ₹30");
    expect(message).not.toContain("₹1 ×");
    expect(message).not.toContain("Date:");
    expect(message).toContain("*Grand Total: ₹50*");
  });

  it("supports Hindi", () => {
    const totals = calculateTotals(denominations, { "note-500": 4, "note-200": 2 });
    const message = buildSummaryMessage(totals, { language: "hi" });
    expect(message).toContain("*नकद प्राप्त*");
    expect(message).toContain("*कुल राशि: ₹2,400*");
    expect(message).toContain("शब्दों में: दो हज़ार चार सौ रुपये मात्र।");
  });

  it("uses Indian grouping for large amounts", () => {
    const totals = calculateTotals(denominations, { "note-500": 250 });
    expect(buildSummaryMessage(totals)).toContain("₹500 × 250 = ₹1,25,000");
  });
});

describe("buildWhatsAppUrl", () => {
  it("uses the wa.me format with an encoded message", () => {
    const message = "*Cash Received — Shop & Co*\n₹500 × 4 = ₹2,000\nWhat? #1";
    const url = buildWhatsAppUrl("919876543210", message);
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(url).not.toMatch(/[\s₹×—\n]/);
    expect(url).toContain("%E2%82%B9500"); // ₹
    expect(url).toContain("%0A"); // newline
    expect(url).toContain("%20%26%20"); // " & "
    expect(url).toContain("%23"); // #
    const decoded = decodeURIComponent(new URL(url).search.replace(/^\?text=/, ""));
    expect(decoded).toBe(message);
    expect(new URL(url).searchParams.get("text")).toBe(message);
  });

  it("strips any non-digits from the number", () => {
    expect(buildWhatsAppUrl("+91 98765-43210", "hi")).toBe("https://wa.me/919876543210?text=hi");
  });
});

describe("sanitizeSettings", () => {
  it("falls back to defaults for unknown data", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ language: "fr", showLegacy2000: "yes", shopName: 5 })).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps only known configuration keys", () => {
    const result = sanitizeSettings({ shopName: "A", defaultNumber: "9876543210", language: "hi", includeDate: false, quantities: { x: 1 } });
    expect(result).toEqual({ shopName: "A", defaultNumber: "9876543210", language: "hi", includeDate: false, showLegacy2000: false });
  });
});
