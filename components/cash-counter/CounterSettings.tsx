"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, X } from "lucide-react";
import { parseIndianMobile } from "@/lib/phone";
import type { CounterSettings as Settings, MessageLanguage } from "@/types/cash-counter";

interface CounterSettingsProps {
  open: boolean;
  settings: Settings;
  onSave: (next: Settings) => void;
  onClose: () => void;
}

/**
 * Mount with a fresh `key` each time it opens so the draft starts from the saved settings.
 */
export function CounterSettings({ open, settings, onSave, onClose }: CounterSettingsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const phone = draft.defaultNumber.trim() === "" ? null : parseIndianMobile(draft.defaultNumber);
  const phoneInvalid = phone !== null && !phone.ok;

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="settings-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (phoneInvalid) return;
          onSave({ ...draft, shopName: draft.shopName.trim(), defaultNumber: draft.defaultNumber.trim() });
        }}
        className="flex max-h-[min(90dvh,44rem)] flex-col"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="settings-title" className="text-base font-semibold">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="-mr-1.5 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <Field label="Shop name" htmlFor="shop-name" hint="Shown at the top of the WhatsApp summary.">
            <input
              id="shop-name"
              type="text"
              autoComplete="organization"
              maxLength={60}
              placeholder="e.g. Sharma General Store"
              value={draft.shopName}
              onChange={(event) => update("shopName", event.target.value)}
              className={inputClass(false)}
            />
          </Field>

          <Field label="Default WhatsApp number" htmlFor="default-number">
            <input
              id="default-number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="e.g. +91 98765 43210"
              value={draft.defaultNumber}
              onChange={(event) => update("defaultNumber", event.target.value)}
              aria-invalid={phoneInvalid || undefined}
              aria-describedby="default-number-hint"
              className={inputClass(phoneInvalid)}
            />
            <p id="default-number-hint" className="mt-1.5 text-xs leading-relaxed">
              {phone === null ? (
                <span className="text-muted">
                  Used when the customer number is left blank — usually the shop owner&apos;s own WhatsApp.
                </span>
              ) : phone.ok ? (
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                  Will open chats with <strong className="font-semibold tabular">{phone.display}</strong>
                </span>
              ) : (
                <span className="text-danger">{phone.error}</span>
              )}
            </p>
          </Field>

          <fieldset>
            <legend className="text-sm font-medium">Message language</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
              {(
                [
                  ["en", "English"],
                  ["hi", "हिन्दी"],
                ] as [MessageLanguage, string][]
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={[
                    "flex h-9 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                    draft.language === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="language"
                    value={value}
                    checked={draft.language === value}
                    onChange={() => update("language", value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1 rounded-xl border border-line">
            <Toggle
              id="include-date"
              label="Include date and time"
              description="Adds the current local date to each summary."
              checked={draft.includeDate}
              onChange={(value) => update("includeDate", value)}
            />
            <div className="mx-4 border-t border-line" />
            <Toggle
              id="legacy-2000"
              label="Show ₹2,000 note"
              description="Withdrawn from circulation by RBI but still legal tender. Off by default."
              checked={draft.showLegacy2000}
              onChange={(value) => update("showLegacy2000", value)}
            />
          </div>

          <p className="flex gap-2 text-xs leading-relaxed text-muted">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            These settings are saved only in this browser on this device. Cash amounts and customer numbers are
            never saved.
          </p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={phoneInvalid}
            className="h-10 rounded-xl bg-ink px-5 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function inputClass(invalid: boolean) {
  return [
    "mt-1.5 h-11 w-full rounded-xl border bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted/60",
    invalid
      ? "border-danger ring-2 ring-danger-soft"
      : "border-line-strong focus:border-accent focus:ring-2 focus:ring-accent-soft",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-success peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
