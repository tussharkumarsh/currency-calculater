import { Banknote, Coins } from "lucide-react";
import { formatCount, formatINR } from "@/lib/format-currency";
import type { DenominationKind, LineItem } from "@/types/cash-counter";
import { DenominationRow } from "./DenominationRow";

interface DenominationSectionProps {
  kind: DenominationKind;
  lines: LineItem[];
  /** Index of this section's first row within the whole entry list, for Enter navigation. */
  startIndex: number;
  pieces: number;
  amount: number;
  onQuantityChange: (id: string, quantity: number) => void;
  onStep: (id: string, delta: number) => void;
  onEnter: (index: number, backwards: boolean) => void;
  inputRef: (index: number, el: HTMLInputElement | null) => void;
}

export function DenominationSection({
  kind,
  lines,
  startIndex,
  pieces,
  amount,
  ...rowHandlers
}: DenominationSectionProps) {
  const title = kind === "note" ? "Notes" : "Coins";
  const Icon = kind === "note" ? Banknote : Coins;
  const headingId = `section-${kind}`;

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon className="size-4 text-muted" aria-hidden />
          {title}
        </h2>
        <p className="text-xs text-muted tabular">
          {formatCount(pieces)} {pieces === 1 ? "pc" : "pcs"}
          <span className="mx-1.5 text-line-strong" aria-hidden>
            ·
          </span>
          <span className={amount > 0 ? "font-medium text-ink-soft" : undefined}>{formatINR(amount)}</span>
        </p>
      </div>
      <div>
        {lines.map((line, i) => (
          <DenominationRow key={line.denomination.id} line={line} index={startIndex + i} {...rowHandlers} />
        ))}
      </div>
    </section>
  );
}
