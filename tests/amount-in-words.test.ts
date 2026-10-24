import { describe, expect, it } from "vitest";
import { amountInWords, numberToIndianWords, paiseAmountInWords } from "@/lib/amount-in-words";

describe("numberToIndianWords (English)", () => {
  it.each([
    [0, "Zero"],
    [1, "One"],
    [15, "Fifteen"],
    [20, "Twenty"],
    [45, "Forty Five"],
    [100, "One Hundred"],
    [101, "One Hundred One"],
    [999, "Nine Hundred Ninety Nine"],
    [1000, "One Thousand"],
    [2400, "Two Thousand Four Hundred"],
    [100000, "One Lakh"],
    [125000, "One Lakh Twenty Five Thousand"],
    [1010101, "Ten Lakh Ten Thousand One Hundred One"],
    [10000000, "One Crore"],
    [289797102, "Twenty Eight Crore Ninety Seven Lakh Ninety Seven Thousand One Hundred Two"],
    [1200000000, "One Hundred Twenty Crore"],
  ])("%i → %s", (n, words) => {
    expect(numberToIndianWords(n)).toBe(words);
  });

  it("rejects invalid input", () => {
    expect(() => numberToIndianWords(-1)).toThrow(RangeError);
    expect(() => numberToIndianWords(1.5)).toThrow(RangeError);
  });
});

describe("numberToIndianWords (Hindi)", () => {
  it.each([
    [0, "शून्य"],
    [5, "पाँच"],
    [99, "निन्यानबे"],
    [2400, "दो हज़ार चार सौ"],
    [125000, "एक लाख पच्चीस हज़ार"],
    [10000000, "एक करोड़"],
  ])("%i → %s", (n, words) => {
    expect(numberToIndianWords(n, "hi")).toBe(words);
  });
});

describe("amountInWords", () => {
  it("adds the rupee suffix", () => {
    expect(amountInWords(2400)).toBe("Two Thousand Four Hundred Rupees Only");
    expect(amountInWords(1)).toBe("One Rupee Only");
    expect(amountInWords(0)).toBe("Zero Rupees Only");
    expect(amountInWords(2400, "hi")).toBe("दो हज़ार चार सौ रुपये मात्र");
    expect(amountInWords(1, "hi")).toBe("एक रुपया मात्र");
  });

  it("produces words for every value from 1 to 99,999 without gaps", () => {
    for (let n = 1; n < 100_000; n += 1) {
      const en = numberToIndianWords(n);
      const hi = numberToIndianWords(n, "hi");
      if (!en || en.includes("undefined") || en.includes("  ")) throw new Error(`Bad English words for ${n}`);
      if (!hi || hi.includes("undefined") || hi.includes("  ")) throw new Error(`Bad Hindi words for ${n}`);
    }
  });
});

describe("paiseAmountInWords", () => {
  it.each([
    [150_000, "en", "One Thousand Five Hundred Rupees Only"],
    [150_050, "en", "One Thousand Five Hundred Rupees and Fifty Paise Only"],
    [101, "en", "One Rupee and One Paisa Only"],
    [75, "en", "Seventy Five Paise Only"],
    [150_050, "hi", "एक हज़ार पाँच सौ रुपये और पचास पैसे मात्र"],
    [50, "hi", "पचास पैसे मात्र"],
  ] as const)("%i paise (%s) → %s", (paise, lang, words) => {
    expect(paiseAmountInWords(paise, lang)).toBe(words);
  });
});
