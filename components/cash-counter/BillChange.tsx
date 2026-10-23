import { AlertCircle, CheckCircle2, Coins } from "lucide-react";
import { NumberField } from "@/components/calculator/NumberField";
import type { ChangeResult } from "@/lib/change-calculation";
import { formatPaise } from "@/lib/discount-calculations";

interface BillChangeProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Null while the bill field is empty or invalid — the counter then works exactly as before. */
  result: ChangeResult | null;
}

/** Short instruction for the cashier, e.g. "Return ₹20 to customer". */
export function changeHeadline(result: ChangeResult): string {
  if (result.status === "change") return `Return ${formatPaise(result.amountPaise)} to customer`;
  if (result.status === "due") return `Collect ${formatPaise(result.amountPaise)} more`;
  return "Exact amount received";
}

const TONES = {
  change: { label: "Change to Return", Icon: Coins, box: "bg-success-soft", text: "text-success" },
  due: { label: "Balance Due", Icon: AlertCircle, box: "bg-warning-soft", text: "text-warning" },
  exact: { label: "Exact Amount Received", Icon: CheckCircle2, box: "bg-surface-muted/60", text: "text-success" },
} as const;

export function BillChange({ value, onChange, error, result }: BillChangeProps) {
  const tone = result ? TONES[result.status] : null;

  return (
    <div className="mt-3">
      <NumberField
        id="bill-amount"
        label="Bill Amount / Amount Due"
        prefix="₹"
        placeholder="Enter bill amount (optional)"
        value={value}
        onChange={onChange}
        error={error}
      />

      <div aria-live="polite">
        {result && tone && (
          <div className="mt-2 overflow-hidden rounded-xl border border-line text-sm tabular">
            <dl className="space-y-0.5 px-3.5 py-2">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Bill amount</dt>
                <dd className="font-medium text-ink">{formatPaise(result.billPaise)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Cash received</dt>
                <dd className="font-medium text-ink">{formatPaise(result.receivedPaise)}</dd>
              </div>
            </dl>
            <div className={`flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 ${tone.box}`}>
              <div className="min-w-0">
                <p className={`flex items-center gap-1.5 text-xs font-semibold ${tone.text}`}>
                  <tone.Icon className="size-3.5 shrink-0" aria-hidden />
                  {tone.label}
                </p>
                <p className="mt-0.5 text-ink-soft">{changeHeadline(result)}</p>
              </div>
              <p className="shrink-0 text-2xl leading-tight font-semibold tracking-tight text-ink">
                {formatPaise(result.amountPaise)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
