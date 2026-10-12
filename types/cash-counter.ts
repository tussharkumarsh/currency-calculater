export type DenominationKind = "note" | "coin";

export interface Denomination {
  /** Stable key, e.g. "note-10" vs "coin-10" — same value, independent quantity. */
  id: string;
  value: number;
  kind: DenominationKind;
  /** Legacy denominations (₹2,000) are hidden unless enabled in settings. */
  legacy?: boolean;
}

/** Quantity per denomination id. Missing keys are treated as zero. */
export type Quantities = Readonly<Record<string, number>>;

export interface LineItem {
  denomination: Denomination;
  quantity: number;
  amount: number;
}

export interface CashTotals {
  lines: LineItem[];
  usedLines: LineItem[];
  grandTotal: number;
  noteTotal: number;
  coinTotal: number;
  totalNotes: number;
  totalCoins: number;
  totalPieces: number;
  denominationsUsed: number;
}

export type MessageLanguage = "en" | "hi";

export interface CounterSettings {
  shopName: string;
  defaultNumber: string;
  language: MessageLanguage;
  includeDate: boolean;
  showLegacy2000: boolean;
}
