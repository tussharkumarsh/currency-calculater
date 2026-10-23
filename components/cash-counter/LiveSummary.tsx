import { Sparkles } from "lucide-react";
import { amountInWords } from "@/lib/amount-in-words";
import { formatCount, formatINR } from "@/lib/format-currency";
import type { CashTotals, MessageLanguage } from "@/types/cash-counter";

interface LiveSummaryProps {
  totals: CashTotals;
  language: MessageLanguage;
  onLoadExample: () => void;
  /** Rendered between the totals and the breakdown (the bill / change section). */
  children?: React.ReactNode;
}

export function LiveSummary({ totals, language, onLoadExample, children }: LiveSummaryProps) {
  const empty = totals.grandTotal === 0;

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-sm font-medium text-muted">
        Grand total
      </h2>
      <p
        className={[
          "mt-0.5 break-all text-[2.75rem] leading-[1.1] font-semibold tracking-tight tabular transition-colors sm:text-5xl md:text-[2.5rem] lg:text-5xl",
          empty ? "text-muted/60" : "text-ink",
        ].join(" ")}
      >
        {formatINR(totals.grandTotal)}
      </p>
      <p className="mt-1.5 min-h-5 text-sm leading-snug text-muted" lang={language === "hi" ? "hi" : "en"}>
        {empty ? "Totals update as you type." : amountInWords(totals.grandTotal, language)}
      </p>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface-muted/60">
        <Stat label="Notes" value={totals.totalNotes} />
        <Stat label="Coins" value={totals.totalCoins} />
        <Stat label="Pieces" value={totals.totalPieces} />
      </dl>

      {children}

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">Breakdown</h3>
          <p className="text-xs text-muted">
            {totals.denominationsUsed} {totals.denominationsUsed === 1 ? "denomination" : "denominations"} used
          </p>
        </div>

        {empty ? (
          <div className="mt-2 flex flex-col items-start gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3.5">
            <p className="text-sm text-muted">
              Enter how many of each note and coin you received. Press <Kbd>Enter</Kbd> to jump to the next one.
            </p>
            <button
              type="button"
              onClick={onLoadExample}
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-accent hover:underline"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Try an example
            </button>
          </div>
        ) : (
          <ul className="mt-1 divide-y divide-line text-sm">
            {totals.usedLines.map(({ denomination, quantity, amount }) => (
              <li key={denomination.id} className="flex items-center justify-between gap-3 py-1 tabular">
                <span className="min-w-0 text-ink-soft">
                  <span className="font-medium text-ink">{formatINR(denomination.value)}</span>
                  <span className="ml-1.5 text-xs text-muted">{denomination.kind}</span>
                  <span className="mx-1.5 text-muted">×</span>
                  {formatCount(quantity)}
                </span>
                <span className="shrink-0 font-medium text-ink">{formatINR(amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-center gap-1.5 px-2 py-2">
      <dt className="order-last text-xs text-muted">{label}</dt>
      <dd className="text-base font-semibold tabular text-ink">{formatCount(value)}</dd>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface px-1 py-px font-sans text-[11px] font-medium text-ink-soft">
      {children}
    </kbd>
  );
}
