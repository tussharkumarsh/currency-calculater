"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { formatPaise, formatPercent, parseAmount } from "@/lib/discount-calculations";
import { buildLandedCostSummary, calculateLandedCost, formatQuantity, parseQuantity } from "@/lib/landed-cost";
import { ResultRow as Row } from "./controls";
import { NumberField } from "./NumberField";

/** Works out what share of a purchase went on transport, and the landed cost per piece. */
export function LandedCostCalculator() {
  const [quantityRaw, setQuantityRaw] = useState("");
  const [goodsRaw, setGoodsRaw] = useState("");
  const [transportRaw, setTransportRaw] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const firstInputRef = useRef<HTMLInputElement>(null);

  const quantity = parseQuantity(quantityRaw);
  const goods = parseAmount(goodsRaw);
  const transport = parseAmount(transportRaw);
  const result =
    goods.status === "ok" && transport.status === "ok" && quantity.status !== "invalid"
      ? calculateLandedCost(goods.value, transport.value, quantity.status === "ok" ? quantity.value : null)
      : null;

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  function update(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setCopyState("idle");
    };
  }

  function handleClear() {
    setQuantityRaw("");
    setGoodsRaw("");
    setTransportRaw("");
    setCopyState("idle");
    firstInputRef.current?.focus();
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyText(buildLandedCostSummary(result));
    setCopyState(ok ? "copied" : "failed");
  }

  return (
    <section aria-labelledby="landed-heading" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="mb-3.5 flex items-center gap-2">
        <h2 id="landed-heading" className="min-w-0 flex-1 text-base font-semibold text-ink">
          Transport cost %
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            aria-label={copyState === "copied" ? "Copied" : "Copy result"}
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40 sm:px-3"
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
            disabled={!quantityRaw && !goodsRaw && !transportRaw}
            aria-label="Clear"
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs font-medium text-ink-soft transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40 sm:px-3"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      <div className="space-y-3.5">
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
          <NumberField
            ref={firstInputRef}
            id="landed-quantity"
            label="Quantity"
            suffix="pcs"
            value={quantityRaw}
            onChange={update(setQuantityRaw)}
            error={quantity.status === "invalid" ? quantity.error : null}
          />
          <NumberField
            id="landed-goods"
            label="Goods amount"
            prefix="₹"
            value={goodsRaw}
            onChange={update(setGoodsRaw)}
            error={goods.status === "invalid" ? goods.error : null}
          />
        </div>
        <NumberField
          id="landed-transport"
          label="Transport charges"
          prefix="₹"
          value={transportRaw}
          onChange={update(setTransportRaw)}
          error={transport.status === "invalid" ? transport.error : null}
        />

        <div aria-live="polite" className="rounded-2xl bg-surface-muted p-4">
          <p className="text-sm font-medium text-muted">Transport cost on goods</p>
          <p
            className={[
              "mt-0.5 text-[2.5rem] leading-[1.1] font-semibold tracking-tight break-all tabular sm:text-5xl",
              result?.percentOfGoods != null ? "text-ink" : "text-muted/50",
            ].join(" ")}
          >
            {result?.percentOfGoods != null ? formatPercent(result.percentOfGoods) : "—"}
          </p>
          {result ? (
            result.percentOfTotal !== null && (
              <p className="mt-1.5 text-sm text-muted">
                {formatPercent(result.percentOfTotal)} of the total cost (goods + transport)
              </p>
            )
          ) : (
            <p className="mt-1.5 text-sm text-muted">Enter the goods amount and transport charges.</p>
          )}

          <dl className="mt-3 divide-y divide-line border-t border-line text-sm">
            <Row label="Goods amount" value={result ? formatPaise(result.goodsPaise) : "—"} />
            <Row label="Transport charges" value={result ? formatPaise(result.transportPaise) : "—"} />
            <Row label="Total cost" value={result ? formatPaise(result.totalPaise) : "—"} />
          </dl>

          {result?.perUnit && result.quantity !== null && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <p className="text-sm text-muted">Cost per piece ({formatQuantity(result.quantity)} pcs)</p>
              <p className="mt-0.5 text-2xl font-semibold tabular text-ink">{formatPaise(result.perUnit.totalPaise)}</p>
              <p className="mt-1 text-xs text-muted">
                {formatPaise(result.perUnit.goodsPaise)} goods + {formatPaise(result.perUnit.transportPaise)} transport
              </p>
            </div>
          )}
          {result && !result.perUnit && (
            <p className="mt-2 text-xs text-muted">Add the quantity to see the cost per piece.</p>
          )}
        </div>
      </div>
    </section>
  );
}
