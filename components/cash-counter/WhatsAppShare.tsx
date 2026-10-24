"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Copy, Info, Send, Settings2 } from "lucide-react";
import type { RecipientResult } from "@/lib/whatsapp";

export type ShareNotice =
  | { kind: "opened"; recipient: string }
  | { kind: "copied" }
  | { kind: "copy-failed" };

interface WhatsAppShareProps {
  customerNumber: string;
  onCustomerNumberChange: (value: string) => void;
  customerInputRef: React.Ref<HTMLInputElement>;
  recipient: RecipientResult;
  canShare: boolean;
  /** True after a share attempt failed validation — errors are then shown even for untouched fields. */
  showErrors: boolean;
  notice: ShareNotice | null;
  onShare: () => void;
  onCopy: () => void;
  onOpenSettings: () => void;
  /** Clears everything so the next customer's cash can be entered. */
  onNewCustomer: () => void;
}

export function WhatsAppShare({
  customerNumber,
  onCustomerNumberChange,
  customerInputRef,
  recipient,
  canShare,
  showErrors,
  notice,
  onShare,
  onCopy,
  onOpenSettings,
  onNewCustomer,
}: WhatsAppShareProps) {
  const [touched, setTouched] = useState(false);
  const customerError = !recipient.ok && recipient.field === "customer" && (touched || showErrors);
  const missingDefault = !recipient.ok && recipient.field === "default";

  return (
    <section aria-labelledby="share-heading" className="space-y-3">
      <h2 id="share-heading" className="sr-only">
        Share on WhatsApp
      </h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          onShare();
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="customer-number" className="flex items-baseline justify-between text-sm font-medium text-ink">
            Customer WhatsApp number
            <span className="text-xs font-normal text-muted">Optional</span>
          </label>
          <div className="mt-1.5">
            <input
              ref={customerInputRef}
              id="customer-number"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              enterKeyHint="send"
              maxLength={20}
              placeholder="e.g. 98765 43210"
              value={customerNumber}
              onChange={(event) => onCustomerNumberChange(event.target.value)}
              onBlur={() => setTouched(customerNumber.trim() !== "")}
              aria-invalid={customerError || undefined}
              aria-describedby="recipient-status"
              className={[
                "h-11 w-full rounded-xl border bg-surface px-3.5 text-base tabular text-ink outline-none transition-colors placeholder:text-muted/60",
                customerError
                  ? "border-danger ring-2 ring-danger-soft"
                  : "border-line-strong focus:border-accent focus:ring-2 focus:ring-accent-soft",
              ].join(" ")}
            />
          </div>
          <div id="recipient-status" aria-live="polite" className="mt-1.5 min-h-5 text-xs leading-5">
            {recipient.ok ? (
              <p className="flex items-center gap-1.5 text-ink-soft">
                <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
                <span>
                  Opens chat with <strong className="font-semibold tabular">{recipient.display}</strong>
                  <span className="text-muted">
                    {recipient.source === "customer" ? " (customer)" : " (default from Settings)"}
                  </span>
                </span>
              </p>
            ) : customerError ? (
              <p className="flex items-center gap-1.5 text-danger">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                {recipient.error}
              </p>
            ) : missingDefault ? (
              <p className={`flex flex-wrap items-center gap-x-1.5 ${showErrors ? "text-danger" : "text-muted"}`}>
                {showErrors && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
                {recipient.error}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  <Settings2 className="size-3" aria-hidden />
                  Open Settings
                </button>
              </p>
            ) : (
              <p className="text-muted">10-digit Indian mobile number.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canShare}
            className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted disabled:shadow-none"
          >
            <Send className="size-4" aria-hidden />
            Share on WhatsApp
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canShare}
            title="Copy summary text"
            aria-label={notice?.kind === "copied" ? "Summary copied" : "Copy summary text"}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
          >
            {notice?.kind === "copied" ? (
              <Check className="size-[18px] text-success" aria-hidden />
            ) : (
              <Copy className="size-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="text-xs">
        {!canShare ? (
          <p className="text-center text-muted">Enter at least one denomination or an online amount to share.</p>
        ) : notice?.kind === "opened" ? (
          <div className="rounded-lg bg-accent-soft px-3 py-2 leading-relaxed text-ink-soft">
            <p className="flex gap-2">
              <Info className="mt-px size-3.5 shrink-0 text-accent" aria-hidden />
              <span>
                WhatsApp opened for {notice.recipient}. Review the message and press <strong>Send</strong> there to
                deliver it.
              </span>
            </p>
            <button
              type="button"
              onClick={onNewCustomer}
              className="mt-1 ml-5.5 inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              Start next customer
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : notice?.kind === "copied" ? (
          <p className="text-center text-success">Summary copied to clipboard.</p>
        ) : notice?.kind === "copy-failed" ? (
          <p className="text-center text-danger">Couldn&apos;t copy automatically. Please try again.</p>
        ) : (
          <p className="text-center text-muted">Nothing is sent until you press Send in WhatsApp.</p>
        )}
      </div>
    </section>
  );
}
