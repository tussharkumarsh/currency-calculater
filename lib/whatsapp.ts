import type { CashTotals, LineItem, MessageLanguage } from "@/types/cash-counter";
import { amountInWords, paiseAmountInWords } from "@/lib/amount-in-words";
import type { ChangeResult } from "@/lib/change-calculation";
import { formatPaise } from "@/lib/discount-calculations";
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
    paymentTitle: "Payment Received",
    cashTotal: "Cash Total",
    date: "Date",
    breakdown: "Denomination Breakdown:",
    notes: "Notes",
    coins: "Coins",
    totalNotes: "Total Notes",
    totalCoins: "Total Coins",
    totalPieces: "Total Pieces",
    grandTotal: "Grand Total",
    words: "Amount in Words",
    bill: "Bill Amount",
    received: "Cash Received",
    online: "Online / Bank Received",
    change: "Change to Return",
    due: "Balance Due",
    exact: "exact amount",
    stop: ".",
    thanks: "Thank you!",
  },
  hi: {
    title: "नकद प्राप्त",
    paymentTitle: "भुगतान प्राप्त",
    cashTotal: "कुल नकद",
    date: "दिनांक",
    breakdown: "नोट व सिक्कों का विवरण:",
    notes: "नोट",
    coins: "सिक्के",
    totalNotes: "कुल नोट",
    totalCoins: "कुल सिक्के",
    totalPieces: "कुल नग",
    grandTotal: "कुल राशि",
    words: "शब्दों में",
    bill: "बिल राशि",
    received: "प्राप्त नकद",
    online: "ऑनलाइन / बैंक प्राप्त",
    change: "लौटाने की राशि",
    due: "बकाया राशि",
    exact: "सही राशि",
    stop: "।",
    thanks: "धन्यवाद!",
  },
} as const;

export interface SummaryOptions {
  shopName?: string;
  language?: MessageLanguage;
  /** Pre-formatted local date/time; left out of the message when absent. */
  dateLabel?: string;
  /** Bill vs. cash comparison; only added to the message when a bill amount was entered. */
  payment?: ChangeResult;
  /**
   * Amount paid by UPI / bank transfer. When above zero it is added to the grand total and the
   * message lists the cash / online split; a payment made entirely online can be shared too.
   */
  onlinePaise?: number;
}

function formatLine(line: LineItem): string {
  return `${formatINR(line.denomination.value)} × ${formatCount(line.quantity)} = ${formatINR(line.amount)}`;
}

function formatPayment(payment: ChangeResult, t: (typeof LABELS)[MessageLanguage]): string[] {
  const result =
    payment.status === "due"
      ? `${t.due}: ${formatPaise(payment.amountPaise)}`
      : payment.status === "change"
        ? `${t.change}: ${formatPaise(payment.amountPaise)}`
        : `${t.change}: ${formatPaise(0)} (${t.exact})`;
  return [
    `${t.bill}: ${formatPaise(payment.billPaise)}`,
    // With an online part, the cash / online split and the total are already listed above.
    ...(payment.onlinePaise > 0 ? [] : [`${t.received}: ${formatPaise(payment.receivedPaise)}`]),
    `*${result}*`,
  ];
}

/** Builds the plain-text summary from the same totals object the UI renders. */
export function buildSummaryMessage(totals: CashTotals, options: SummaryOptions = {}): string {
  const lang = options.language ?? "en";
  const t = LABELS[lang];
  const shopName = options.shopName?.trim();
  const onlinePaise = Math.max(options.onlinePaise ?? 0, 0);
  const hasOnline = onlinePaise > 0;
  const grandPaise = totals.grandTotal * 100 + onlinePaise;
  const notes = totals.usedLines.filter((l) => l.denomination.kind === "note");
  const coins = totals.usedLines.filter((l) => l.denomination.kind === "coin");

  const title = hasOnline ? t.paymentTitle : t.title;
  const out: string[] = [shopName ? `*${title} — ${shopName}*` : `*${title}*`];
  if (options.dateLabel) out.push(`${t.date}: ${options.dateLabel}`);

  // A payment made entirely online has no denominations to list.
  if (!hasOnline || totals.usedLines.length > 0) {
    out.push("", t.breakdown);
    if (notes.length) out.push(`_${t.notes}_`, ...notes.map(formatLine));
    if (coins.length) out.push(`_${t.coins}_`, ...coins.map(formatLine));
    out.push(
      "",
      `${t.totalNotes}: ${formatCount(totals.totalNotes)}`,
      `${t.totalCoins}: ${formatCount(totals.totalCoins)}`,
      `${t.totalPieces}: ${formatCount(totals.totalPieces)}`,
    );
  }

  out.push("");
  if (hasOnline) {
    out.push(`${t.cashTotal}: ${formatINR(totals.grandTotal)}`, `${t.online}: ${formatPaise(onlinePaise)}`);
  }
  out.push(`*${t.grandTotal}: ${formatPaise(grandPaise)}*`);
  if (options.payment) out.push("", ...formatPayment(options.payment, t));
  const words = hasOnline ? paiseAmountInWords(grandPaise, lang) : amountInWords(totals.grandTotal, lang);
  out.push("", `${t.words}: ${words}${t.stop}`, "", t.thanks);
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
