import type { MessageLanguage } from "@/types/cash-counter";

const EN_ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const EN_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** Hindi number names 0–99 are irregular, so they are listed in full. */
const HI_UNDER_100 = [
  "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
  "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस",
  "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
  "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
  "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ",
  "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
  "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उन्यासी",
  "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी",
  "नब्बे", "इक्यानबे", "बानबे", "तिरानबे", "चौरानबे", "पचानबे", "छियानबे", "सत्तानबे", "अट्ठानबे", "निन्यानबे",
];

const SCALE = {
  en: { hundred: "Hundred", thousand: "Thousand", lakh: "Lakh", crore: "Crore", zero: "Zero" },
  hi: { hundred: "सौ", thousand: "हज़ार", lakh: "लाख", crore: "करोड़", zero: "शून्य" },
} as const;

function underHundred(n: number, lang: MessageLanguage): string {
  if (lang === "hi") return HI_UNDER_100[n] ?? "";
  if (n < 20) return EN_ONES[n] ?? "";
  const ones = n % 10;
  const tens = EN_TENS[Math.floor(n / 10)] ?? "";
  return ones ? `${tens} ${EN_ONES[ones]}` : tens;
}

function integerToWords(n: number, lang: MessageLanguage): string {
  const scale = SCALE[lang];
  const parts: string[] = [];

  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const hundred = Math.floor((n % 1_000) / 100);
  const rest = n % 100;

  // 100 crore and above repeats the system: "One Hundred Twenty Crore".
  if (crore) parts.push(`${integerToWords(crore, lang)} ${scale.crore}`);
  if (lakh) parts.push(`${underHundred(lakh, lang)} ${scale.lakh}`);
  if (thousand) parts.push(`${underHundred(thousand, lang)} ${scale.thousand}`);
  if (hundred) parts.push(`${underHundred(hundred, lang)} ${scale.hundred}`);
  if (rest) parts.push(underHundred(rest, lang));

  return parts.join(" ");
}

/** Converts a whole number to words using the Indian numbering system. */
export function numberToIndianWords(value: number, lang: MessageLanguage = "en"): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("numberToIndianWords expects a non-negative safe integer");
  }
  return value === 0 ? SCALE[lang].zero : integerToWords(value, lang);
}

/** "Two Thousand Four Hundred Rupees Only" / "दो हज़ार चार सौ रुपये मात्र" */
export function amountInWords(amount: number, lang: MessageLanguage = "en"): string {
  const words = numberToIndianWords(amount, lang);
  if (lang === "hi") return `${words} ${amount === 1 ? "रुपया" : "रुपये"} मात्र`;
  return `${words} ${amount === 1 ? "Rupee" : "Rupees"} Only`;
}

/** Like `amountInWords` but takes paise: "One Thousand Five Hundred Rupees and Fifty Paise Only". */
export function paiseAmountInWords(paise: number, lang: MessageLanguage = "en"): string {
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  if (rest === 0) return amountInWords(rupees, lang);

  const hi = lang === "hi";
  const paiseWords = `${numberToIndianWords(rest, lang)} ${hi ? (rest === 1 ? "पैसा" : "पैसे") : rest === 1 ? "Paisa" : "Paise"}`;
  const only = hi ? "मात्र" : "Only";
  if (rupees === 0) return `${paiseWords} ${only}`;
  const rupeeWords = `${numberToIndianWords(rupees, lang)} ${hi ? (rupees === 1 ? "रुपया" : "रुपये") : rupees === 1 ? "Rupee" : "Rupees"}`;
  return `${rupeeWords} ${hi ? "और" : "and"} ${paiseWords} ${only}`;
}
