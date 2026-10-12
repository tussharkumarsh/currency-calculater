import type { CashTotals, LineItem, MessageLanguage } from "@/types/cash-counter";
import { amountInWords } from "@/lib/amount-in-words";
import { formatCount, formatINR } from "@/lib/format-currency";
import { parseIndianMobile } from "@/lib/phone";

export type RecipientSource = "customer" | "default";

export type RecipientResult =
  | { ok: true; source: RecipientSource; international: string; display: string }
  | { ok: false; field: "customer" | "default"; error: string };

/**
 * Picks who receives the summary. A filled-in customer number always wins; if it
 * is invalid we stop rather than silently falling back to the default number.
 */
export function resolveRecipient(customerInput: string, defaultInput: string): RecipientResult {
  if (customerInput.trim() !== "") {
    const customer = parseIndianMobile(customerInput);
    return customer.ok
      ? { ok: true, source: "customer", international: customer.international, display: customer.display }
      : { ok: false, field: "customer", error: customer.error };
  }

  if (defaultInput.trim() === "") {
    return {
      ok: false,
      field: "default",
      error: "Enter a customer number, or set a default WhatsApp number in Settings.",
    };
  }

  const fallback = parseIndianMobile(defaultInput);
  return fallback.ok
    ? { ok: true, source: "default", international: fallback.international, display: fallback.display }
    : { ok: false, field: "default", error: `The default number in Settings is invalid. ${fallback.error}` };
}

const LABELS = {
  en: {
    title: "Cash Received",
    date: "Date",
    breakdown: "Denomination Breakdown:",
    notes: "Notes",
    coins: "Coins",
    totalNotes: "Total Notes",
    totalCoins: "Total Coins",
    totalPieces: "Total Pieces",
    grandTotal: "Grand Total",
    words: "Amount in Words",
    stop: ".",
    thanks: "Thank you!",
  },
  hi: {
    title: "नकद प्राप्त",
    date: "दिनांक",
    breakdown: "नोट व सिक्कों का विवरण:",
    notes: "नोट",
    coins: "सिक्के",
    totalNotes: "कुल नोट",
    totalCoins: "कुल सिक्के",
    totalPieces: "कुल नग",
    grandTotal: "कुल राशि",
    words: "शब्दों में",
    stop: "।",
    thanks: "धन्यवाद!",
  },
} as const;

export interface SummaryOptions {
  shopName?: string;
  language?: MessageLanguage;
  /** Pre-formatted local date/time; left out of the message when absent. */
  dateLabel?: string;
}

function formatLine(line: LineItem): string {
  return `${formatINR(line.denomination.value)} × ${formatCount(line.quantity)} = ${formatINR(line.amount)}`;
}

/** Builds the plain-text summary from the same totals object the UI renders. */
export function buildSummaryMessage(totals: CashTotals, options: SummaryOptions = {}): string {
  const lang = options.language ?? "en";
  const t = LABELS[lang];
  const shopName = options.shopName?.trim();
  const notes = totals.usedLines.filter((l) => l.denomination.kind === "note");
  const coins = totals.usedLines.filter((l) => l.denomination.kind === "coin");

  const out: string[] = [shopName ? `*${t.title} — ${shopName}*` : `*${t.title}*`];
  if (options.dateLabel) out.push(`${t.date}: ${options.dateLabel}`);

  out.push("", t.breakdown);
  if (notes.length) out.push(`_${t.notes}_`, ...notes.map(formatLine));
  if (coins.length) out.push(`_${t.coins}_`, ...coins.map(formatLine));

  out.push(
    "",
    `${t.totalNotes}: ${formatCount(totals.totalNotes)}`,
    `${t.totalCoins}: ${formatCount(totals.totalCoins)}`,
    `${t.totalPieces}: ${formatCount(totals.totalPieces)}`,
    "",
    `*${t.grandTotal}: ${formatINR(totals.grandTotal)}*`,
    "",
    `${t.words}: ${amountInWords(totals.grandTotal, lang)}${t.stop}`,
    "",
    t.thanks,
  );
  return out.join("\n");
}

/** Official Click to Chat format: https://wa.me/<international digits>?text=<encoded> */
export function buildWhatsAppUrl(internationalNumber: string, message: string): string {
  const digits = internationalNumber.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatMessageDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
