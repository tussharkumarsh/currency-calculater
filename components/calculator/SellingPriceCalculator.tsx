"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw, TrendingUp } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { formatBasisPoints, formatPaise, formatPercent, parseAmount } from "@/lib/discount-calculations";
import {
  MARGIN_PRESETS,
  buildSellingPriceSummary,
  calculateSellingPrice,
  parsePricingPercent,
  roundingShiftedTarget,
  type PricingMethod,
} from "@/lib/margin-calculations";
import { PresetButton, ResultRow as Row } from "./controls";
import { NumberField } from "./NumberField";

const METHOD_COPY: Record<PricingMethod, { option: string; field: string; row: string; explainer: string }> = {
  margin: {
    option: "Profit margin",
    field: "Profit margin",
    row: "Target margin",
    explainer: "Margin is profit as a share of the selling price.",
  },
  markup: {
    option: "Cost markup",
    field: "Markup on cost",
    row: "Markup on cost",
    explainer: "Markup is profit as a share of the cost price.",
  },
};

/** Works out the selling price needed for a target profit margin (default) or cost markup. */
export function SellingPriceCalculator() {
  const [costRaw, setCostRaw] = useState("");
  const [percentRaw, setPercentRaw] = useState("");
  const [method, setMethod] = useState<PricingMethod>("margin");
  const [customActive, setCustomActive] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const costInputRef = useRef<HTMLInputElement>(null);
  const percentInputRef = useRef<HTMLInputElement>(null);

  const cost = parseAmount(costRaw);
  const percent = parsePricingPercent(percentRaw, method);
  const result =
    cost.status === "ok" && percent.status === "ok" ? calculateSellingPrice(cost.value, percent.value, method) : null;
  const text = METHOD_COPY[method];

  const selectedPreset =
    !customActive && percent.status === "ok" ? (MARGIN_PRESETS.find((p) => p * 100 === percent.value) ?? null) : null;
  const customSelected = customActive || (percent.status === "ok" && selectedPreset === null);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  function handlePercentChange(value: string) {
    setPercentRaw(value);
    const parsed = parsePricingPercent(value, method);
    setCustomActive(!(parsed.status === "ok" && MARGIN_PRESETS.some((p) => p * 100 === parsed.value)));
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
    setCostRaw("");
    setPercentRaw("");
    setCustomActive(false);
    setCopyState("idle");
    costInputRef.current?.focus();
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(buildSellingPriceSummary(result));
    setCopyState(ok ? "copied" : "failed");
  }

  // The "other" view of the same price helps tell margin and markup apart.
  const crossCheck =
    result === null
      ? null
      : method === "margin"
        ? { label: "Equals markup on cost", value: result.actualMarkupPercent }
        : { label: "Equals profit margin", value: result.actualMarginPercent };

  return (
    <section aria-labelledby="selling-heading" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="mb-3.5 flex items-center gap-2">
        <h2 id="selling-heading" className="sr-only">
          Selling price
        </h2>
        <fieldset className="min-w-0 flex-1">
          <legend className="sr-only">Pricing method</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
            {(Object.keys(METHOD_COPY) as PricingMethod[]).map((value) => (
              <label
                key={value}
                className={[
                  "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  method === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="pricing-method"
                  value={value}
                  checked={method === value}
                  onChange={() => {
                    setMethod(value);
                    setCopyState("idle");
                  }}
                  className="sr-only"
                />
                {value === "margin" && <TrendingUp className="hidden size-3.5 sm:block" aria-hidden />}
                {METHOD_COPY[value].option}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            aria-label={copyState === "copied" ? "Copied" : "Copy result"}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs sm:px-3 font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            {copyState === "copied" ? (
              <>
                <Check className="size-3.5 text-success" aria-hidden />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{copyState === "failed" ? "Copy failed" : "Copy result"}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!costRaw && !percentRaw}
            aria-label="Clear"
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs sm:px-3 font-medium text-ink-soft transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      <div className="space-y-3.5">

        <NumberField
          ref={costInputRef}
          id="selling-cost"
          label="Cost price"
          prefix="₹"
          size="lg"
          value={costRaw}
          onChange={(value) => {
            setCostRaw(value);
            setCopyState("idle");
          }}
          error={cost.status === "invalid" ? cost.error : null}
        />

        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <NumberField
              ref={percentInputRef}
              id="selling-percent"
              label={text.field}
              suffix="%"
              value={percentRaw}
              onChange={handlePercentChange}
              className="w-full shrink-0 sm:w-32"
            />
            <div role="group" aria-label={`Quick ${text.option.toLowerCase()}`} className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 sm:grid-cols-6">
              {MARGIN_PRESETS.map((preset) => (
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
          <p className="text-sm font-medium text-muted">Recommended selling price</p>
          <p
            className={[
              "mt-0.5 text-[2.5rem] leading-[1.1] font-semibold tracking-tight break-all tabular sm:text-5xl",
              result ? "text-ink" : "text-muted/50",
            ].join(" ")}
          >
            {result ? formatPaise(result.sellingPaise) : "—"}
          </p>
          {result ? (
            <p className="mt-2 text-sm">
              <span className="rounded-full bg-success/12 px-2 py-0.5 font-medium text-success">
                Profit {formatPaise(result.profitPaise)}
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-muted">Enter the cost price and {text.field.toLowerCase()}.</p>
          )}

          <dl className="mt-3 divide-y divide-line border-t border-line text-sm">
            <Row label="Cost price" value={result ? formatPaise(result.costPaise) : "—"} />
            <Row label={text.row} value={result ? formatBasisPoints(result.percentBp) : "—"} />
            <Row label="Profit amount" value={result ? formatPaise(result.profitPaise) : "—"} />
            {crossCheck && crossCheck.value !== null && (
              <Row label={crossCheck.label} value={formatPercent(crossCheck.value)} />
            )}
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {text.explainer}
            {result && roundingShiftedTarget(result) && (
              <>
                {" "}
                Rounded up to the next paisa so the {method === "margin" ? "margin" : "markup"} is at least{" "}
                {formatBasisPoints(result.percentBp)}.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
