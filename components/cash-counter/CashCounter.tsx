"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { RotateCcw, Send, Settings2, Undo2 } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import {
  SAMPLE_QUANTITIES,
  calculateTotals,
  getActiveDenominations,
  setQuantity,
  stepQuantity,
} from "@/lib/currency";
import { formatCount, formatINR } from "@/lib/format-currency";
import { getServerSettingsSnapshot, getSettingsSnapshot, saveSettings, subscribeSettings } from "@/lib/settings";
import { buildSummaryMessage, buildWhatsAppUrl, formatMessageDate, resolveRecipient } from "@/lib/whatsapp";
import type { CounterSettings as Settings, Quantities } from "@/types/cash-counter";
import { CounterSettings } from "./CounterSettings";
import { DenominationSection } from "./DenominationSection";
import { LiveSummary } from "./LiveSummary";
import { WhatsAppShare, type ShareNotice } from "./WhatsAppShare";

const UNDO_WINDOW_MS = 8000;

interface ClearedSnapshot {
  quantities: Quantities;
  customerNumber: string;
}

export function CashCounter() {
  const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);

  // Live transaction state lives only in memory: a reload always starts from zero.
  const [quantities, setQuantities] = useState<Quantities>({});
  const [customerNumber, setCustomerNumber] = useState("");
  const [notice, setNotice] = useState<ShareNotice | null>(null);
  const [shareAttempted, setShareAttempted] = useState(false);
  const [cleared, setCleared] = useState<ClearedSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsKey, setSettingsKey] = useState(0);
  /** Bumped on Clear all: remounts the entry form so no per-field state (errors, touched) carries over. */
  const [resetKey, setResetKey] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const shareSectionRef = useRef<HTMLDivElement>(null);

  const denominations = useMemo(() => getActiveDenominations(settings.showLegacy2000), [settings.showLegacy2000]);
  const totals = useMemo(() => calculateTotals(denominations, quantities), [denominations, quantities]);
  const recipient = useMemo(
    () => resolveRecipient(customerNumber, settings.defaultNumber),
    [customerNumber, settings.defaultNumber],
  );

  const noteLines = totals.lines.filter((line) => line.denomination.kind === "note");
  const coinLines = totals.lines.filter((line) => line.denomination.kind === "coin");
  const canShare = totals.grandTotal > 0;
  const canClear = canShare || customerNumber !== "";

  // Any edit makes earlier "opened"/"copied" feedback stale.
  const updateQuantities = useCallback((updater: (current: Quantities) => Quantities) => {
    setQuantities(updater);
    setNotice(null);
  }, []);

  const handleQuantityChange = useCallback(
    (id: string, value: number) => updateQuantities((q) => setQuantity(q, id, value)),
    [updateQuantities],
  );
  const handleStep = useCallback(
    (id: string, delta: number) => updateQuantities((q) => stepQuantity(q, id, delta)),
    [updateQuantities],
  );
  const registerInput = useCallback((index: number, el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);
  const handleEnter = useCallback((index: number, backwards: boolean) => {
    const target = backwards ? index - 1 : index + 1;
    const next = inputRefs.current[target];
    if (next) next.focus();
    else if (!backwards) customerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (notice?.kind !== "copied" && notice?.kind !== "copy-failed") return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  // After a reset, bring the cashier back to the first field, ready for the next customer.
  useEffect(() => {
    if (resetKey === 0) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    inputRefs.current[0]?.focus({ preventScroll: true });
  }, [resetKey]);

  useEffect(() => {
    if (!cleared) return;
    const timer = setTimeout(() => setCleared(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [cleared]);

  function buildMessage() {
    return buildSummaryMessage(totals, {
      shopName: settings.shopName,
      language: settings.language,
      dateLabel: settings.includeDate ? formatMessageDate(new Date()) : undefined,
    });
  }

  function handleShare() {
    if (!canShare) return;
    if (!recipient.ok) {
      setShareAttempted(true);
      shareSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (recipient.field === "customer") customerInputRef.current?.focus({ preventScroll: true });
      return;
    }
    const url = buildWhatsAppUrl(recipient.international, buildMessage());
    window.open(url, "_blank", "noopener,noreferrer");
    setShareAttempted(false);
    setNotice({ kind: "opened", recipient: recipient.display });
  }

  async function handleCopy() {
    if (!canShare) return;
    const ok = await copyText(buildMessage());
    setNotice({ kind: ok ? "copied" : "copy-failed" });
  }

  function handleClear() {
    if (!canClear) return;
    setCleared({ quantities, customerNumber });
    setQuantities({});
    setCustomerNumber("");
    setNotice(null);
    setShareAttempted(false);
    setResetKey((k) => k + 1);
  }

  function handleUndo() {
    if (!cleared) return;
    setQuantities(cleared.quantities);
    setCustomerNumber(cleared.customerNumber);
    setCleared(null);
  }

  function handleLoadExample() {
    updateQuantities(() => SAMPLE_QUANTITIES);
  }

  function openSettings() {
    setSettingsKey((k) => k + 1);
    setSettingsOpen(true);
  }

  function handleSaveSettings(next: Settings) {
    saveSettings(next);
    if (!next.showLegacy2000) {
      // A hidden denomination must not keep a stale count that reappears later.
      updateQuantities((q) => setQuantity(q, "note-2000", 0));
    }
    setShareAttempted(false);
    setSettingsOpen(false);
  }

  return (
    <div className="min-h-dvh pb-28 md:pb-0">
      <main className="mx-auto grid max-w-[1240px] items-start gap-4 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:py-5">
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-ink text-lg font-semibold text-surface"
              >
                ₹
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] leading-tight font-semibold tracking-tight">
                  {settings.shopName || "Cash Counter"}
                </h1>
                <p className="truncate text-xs text-muted">
                  {settings.shopName ? "Cash Counter" : "Count notes and coins, then share on WhatsApp"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={!canClear}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-ink-soft transition-colors hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
              >
                <RotateCcw className="size-4" aria-hidden />
                Clear all
              </button>
              <button
                type="button"
                onClick={openSettings}
                aria-label={settings.defaultNumber ? "Settings" : "Settings — default WhatsApp number not set"}
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <Settings2 className="size-[18px]" aria-hidden />
                {!settings.defaultNumber && (
                  <span aria-hidden className="absolute top-0.5 right-0.5 size-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </button>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <DenominationSection
              key={`note-${resetKey}`}
              kind="note"
              lines={noteLines}
              startIndex={0}
              pieces={totals.totalNotes}
              amount={totals.noteTotal}
              onQuantityChange={handleQuantityChange}
              onStep={handleStep}
              onEnter={handleEnter}
              inputRef={registerInput}
            />
            <DenominationSection
              key={`coin-${resetKey}`}
              kind="coin"
              lines={coinLines}
              startIndex={noteLines.length}
              pieces={totals.totalCoins}
              amount={totals.coinTotal}
              onQuantityChange={handleQuantityChange}
              onStep={handleStep}
              onEnter={handleEnter}
              inputRef={registerInput}
            />
          </div>

          <p className="mt-4 hidden text-xs text-muted lg:block">
            <Shortcut>Enter</Shortcut> next · <Shortcut>Shift</Shortcut>+<Shortcut>Enter</Shortcut> previous ·{" "}
            <Shortcut>↑</Shortcut>
            <Shortcut>↓</Shortcut> adjust by 1 (hold Shift for 10)
          </p>
        </div>

        <aside className="min-w-0 space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <LiveSummary
            totals={totals}
            language={settings.language}
            onLoadExample={handleLoadExample}
          />
          <div ref={shareSectionRef} className="scroll-mt-4 border-t border-line pt-3">
            <WhatsAppShare
              key={resetKey}
              customerNumber={customerNumber}
              onCustomerNumberChange={setCustomerNumber}
              customerInputRef={customerInputRef}
              recipient={recipient}
              canShare={canShare}
              showErrors={shareAttempted}
              notice={notice}
              onShare={handleShare}
              onCopy={handleCopy}
              onOpenSettings={openSettings}
              onNewCustomer={handleClear}
            />
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-[1240px] px-4 pb-6 text-center text-xs text-muted sm:px-6">
        Private by design: everything is calculated on this device and nothing is stored or uploaded.
      </footer>

      {/* Mobile: total and the primary action stay within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted tabular">
              Total · {formatCount(totals.totalPieces)} {totals.totalPieces === 1 ? "piece" : "pieces"}
            </p>
            <p className="truncate text-xl leading-tight font-semibold tracking-tight tabular">
              {formatINR(totals.grandTotal)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleShare}
            disabled={!canShare}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-whatsapp px-4 text-sm font-semibold text-white transition-colors hover:bg-whatsapp-hover disabled:bg-line-strong disabled:text-muted"
          >
            <Send className="size-4" aria-hidden />
            Share
          </button>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-6"
      >
        {cleared && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-sm text-surface shadow-lg">
            Cleared — ready for the next customer
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center gap-1.5 rounded-full bg-surface/15 px-3 py-1 font-medium transition-colors hover:bg-surface/25"
            >
              <Undo2 className="size-3.5" aria-hidden />
              Undo
            </button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <CounterSettings
          key={settingsKey}
          open={settingsOpen}
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function Shortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-line-strong bg-surface-muted px-1 py-px font-sans text-[10px] font-medium text-ink-soft">
      {children}
    </kbd>
  );
}
