import { AlertCircle, CheckCircle2, Coins } from "lucide-react";
import type { ChangeResult } from "@/lib/change-calculation";
import { formatPaise } from "@/lib/discount-calculations";

/** Short instruction for the cashier, e.g. "Return ₹20 to customer". */
export function changeHeadline(result: ChangeResult): string {
  if (result.status === "change") return `Return ${formatPaise(result.amountPaise)} to customer`;
  if (result.status === "due") return `Collect ${formatPaise(result.amountPaise)} more`;
  return "Exact amount received";
}

interface AmountFieldProps {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Enter moves on to the next field, like the rest of the entry form. */
  onEnter: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** One optional rupee input row (bill amount, online payment) at the top of the entry panel. */
export function AmountField({ id, label, hint, placeholder, value, onChange, error, onEnter, inputRef }: AmountFieldProps) {
  const errorId = `${id}-error`;
  return (
    // Side by side only when the panel itself is wide enough (container query), else stacked.
    <div className="@container px-3 py-2.5 sm:px-3.5">
      <div className="flex flex-col gap-1.5 @lg:flex-row @lg:items-center @lg:gap-4">
        <label htmlFor={id} className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{label}</span>
          <span className="block text-xs text-muted">{hint}</span>
        </label>
        <div
          className={[
            "flex h-11 items-center rounded-xl border bg-surface transition-colors @lg:w-64 @lg:shrink-0",
            error
              ? "border-danger ring-2 ring-danger-soft"
              : "border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft",
          ].join(" ")}
        >
          <span aria-hidden className="pl-3.5 text-base font-medium text-muted">
            ₹
          </span>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="decimal"
            enterKeyHint="next"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onEnter();
              }
            }}
            onFocus={(event) => event.currentTarget.select()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-2 pr-3.5 text-lg font-semibold tabular text-ink outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted/60"
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger @lg:justify-end">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

const TONES = {
  change: { label: "Change to Return", Icon: Coins, box: "bg-success-soft", text: "text-success" },
  due: { label: "Balance Due", Icon: AlertCircle, box: "bg-warning-soft", text: "text-warning" },
  exact: { label: "Exact Amount Received", Icon: CheckCircle2, box: "bg-surface-muted/60", text: "text-success" },
} as const;

interface ChangeSummaryProps {
  /** Null while no valid bill is entered. */
  result: ChangeResult | null;
  cashPaise: number;
  onlinePaise: number;
}

/**
 * Bill vs. payment result for the summary panel. Without a bill it still shows the
 * cash / online split once an online amount is entered; otherwise it renders nothing.
 */
export function ChangeSummary({ result, cashPaise, onlinePaise }: ChangeSummaryProps) {
  const tone = result ? TONES[result.status] : null;
  const hasOnline = onlinePaise > 0;

  return (
    <div aria-live="polite">
      {(result || hasOnline) && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line text-sm tabular">
          <dl className="space-y-0.5 px-3.5 py-2">
            {result && <Row label="Bill amount" value={result.billPaise} />}
            <Row label="Cash received" value={cashPaise} />
            {hasOnline && (
              <>
                <Row label="Online / bank received" value={onlinePaise} />
                <Row label="Total received" value={cashPaise + onlinePaise} strong />
              </>
            )}
          </dl>
          {result && tone && (
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
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-dashed border-line pt-0.5" : ""}`}>
      <dt className={strong ? "font-medium text-ink" : "text-muted"}>{label}</dt>
      <dd className={`text-ink ${strong ? "font-semibold" : "font-medium"}`}>{formatPaise(value)}</dd>
    </div>
  );
}
