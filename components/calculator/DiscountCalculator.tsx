"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, RotateCcw, Tag } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import {
  DISCOUNT_PRESETS,
  buildDiscountSummary,
  calculateDiscount,
  formatBasisPoints,
  formatPaise,
  formatPercent,
  parseAmount,
  parsePercent,
} from "@/lib/discount-calculations";
import { NumberField } from "./NumberField";
import { ReverseDiscountCalculator } from "./ReverseDiscountCalculator";

export function DiscountCalculator() {
  const [amountRaw, setAmountRaw] = useState("");
  const [percentRaw, setPercentRaw] = useState("");
  const [customActive, setCustomActive] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [reverseOpen, setReverseOpen] = useState(false);
  const percentInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const amount = parseAmount(amountRaw);
  const percent = parsePercent(percentRaw);
  const result = amount.status === "ok" && percent.status === "ok" ? calculateDiscount(amount.value, percent.value) : null;

  const selectedPreset =
    !customActive && percent.status === "ok" ? (DISCOUNT_PRESETS.find((p) => p * 100 === percent.value) ?? null) : null;
  const customSelected = customActive || (percent.status === "ok" && selectedPreset === null);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  function handlePercentChange(value: string) {
    setPercentRaw(value);
    const parsed = parsePercent(value);
    setCustomActive(!(parsed.status === "ok" && DISCOUNT_PRESETS.some((p) => p * 100 === parsed.value)));
    setCopyState("idle");
  }

  function choosePreset(preset: number) {
    setPercentRaw(String(preset));
    setCustomActive(false);
    setCopyState("idle");
  }

  function chooseCustom() {
    setCustomActive(true);
    percentInputRef.current?.focus();
  }

  function handleClear() {
    setAmountRaw("");
    setPercentRaw("");
    setCustomActive(false);
    setCopyState("idle");
    amountInputRef.current?.focus();
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(buildDiscountSummary(result));
    setCopyState(ok ? "copied" : "failed");
  }

  const showEffective =
    result !== null &&
    result.effectivePercent !== null &&
    Math.abs(result.effectivePercent - result.percentBp / 100) >= 0.005;

  return (
    <section aria-labelledby="discount-heading" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-muted" aria-hidden />
          <h2 id="discount-heading" className="text-sm font-semibold text-ink">
            Discount
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            {copyState === "copied" ? (
              <>
                <Check className="size-3.5 text-success" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden />
                {copyState === "failed" ? "Copy failed" : "Copy result"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!amountRaw && !percentRaw}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-medium text-ink-soft transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Clear
          </button>
        </div>
      </header>

      <div className="space-y-3.5">
        <NumberField
          ref={amountInputRef}
          id="discount-amount"
          label="Original amount"
          prefix="₹"
          size="lg"
          value={amountRaw}
          onChange={(value) => {
            setAmountRaw(value);
            setCopyState("idle");
          }}
          error={amount.status === "invalid" ? amount.error : null}
        />

        <div>
          <div className="flex flex-wrap items-end gap-2">
            <NumberField
              ref={percentInputRef}
              id="discount-percent"
              label="Discount"
              suffix="%"
              value={percentRaw}
              onChange={handlePercentChange}
              className="w-28 shrink-0"
            />
            <div role="group" aria-label="Quick discount" className="flex min-w-[15rem] flex-1 gap-1.5">
              {DISCOUNT_PRESETS.map((preset) => (
                <PresetButton key={preset} selected={selectedPreset === preset} onClick={() => choosePreset(preset)}>
                  {preset}%
                </PresetButton>
              ))}
              <PresetButton selected={customSelected} onClick={chooseCustom}>
                Custom
              </PresetButton>
            </div>
          </div>
          {percent.status === "invalid" && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {percent.error}
            </p>
          )}
        </div>

        <div aria-live="polite" className="rounded-2xl bg-surface-muted p-4">
          <p className="text-sm font-medium text-muted">Customer pays</p>
          <p
            className={[
              "mt-0.5 text-[2.5rem] leading-[1.1] font-semibold tracking-tight break-all tabular sm:text-5xl",
              result ? "text-ink" : "text-muted/50",
            ].join(" ")}
          >
            {result ? formatPaise(result.payablePaise) : "—"}
          </p>
          {result ? (
            <p className="mt-2 text-sm">
              <span className="rounded-full bg-success/12 px-2 py-0.5 font-medium text-success">
                You save {formatPaise(result.discountPaise)}
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-muted">Enter the amount and a discount to see the final price.</p>
          )}

          <dl className="mt-3 divide-y divide-line border-t border-line text-sm">
            <Row label="Original amount" value={result ? formatPaise(result.originalPaise) : "—"} />
            <Row label="Discount" value={result ? formatBasisPoints(result.percentBp) : "—"} />
            {showEffective && result?.effectivePercent != null && (
              <Row label="Effective discount" value={formatPercent(result.effectivePercent)} />
            )}
            <Row label="You save" value={result ? formatPaise(result.discountPaise) : "—"} />
          </dl>
        </div>

        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setReverseOpen((open) => !open)}
            aria-expanded={reverseOpen}
            aria-controls="reverse-discount"
            className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-ink-soft hover:text-ink"
          >
            Find the original price from a selling price
            <ChevronDown className={`size-4 shrink-0 transition-transform ${reverseOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {/* Kept mounted while collapsed so its values survive toggling. */}
          <div id="reverse-discount" hidden={!reverseOpen} className="pt-3">
            <ReverseDiscountCalculator />
          </div>
        </div>
      </div>
    </section>
  );
}

function PresetButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "h-11 min-w-0 flex-1 rounded-xl border px-1 text-sm font-medium tabular transition-colors",
        selected
          ? "border-ink bg-ink text-surface"
          : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular text-ink-soft">{value}</dd>
    </div>
  );
}
