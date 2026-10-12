"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";

export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  /** Shorter label used on narrow phones, where the full labels would not fit. */
  shortLabel?: string;
  Icon?: LucideIcon;
}

interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefix for tab/panel ids: tabs get `tab-${prefix}${id}`, panels `panel-${prefix}${id}`. */
  idPrefix?: string;
  ariaLabel: string;
  variant?: "primary" | "secondary";
}

/** Segmented control implemented as an ARIA tablist (arrow keys, Home/End move between tabs). */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  idPrefix = "",
  ariaLabel,
  variant = "primary",
}: SegmentedTabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const primary = variant === "primary";

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        "inline-flex max-w-full gap-1 p-1",
        primary ? "rounded-full border border-line bg-surface shadow-card" : "rounded-xl bg-surface-muted",
      ].join(" ")}
    >
      {tabs.map(({ id, label, shortLabel, Icon }, index) => {
        const selected = value === id;
        return (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`tab-${idPrefix}${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${idPrefix}${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              "flex min-w-0 items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-all",
              primary ? "h-9 rounded-full px-3 sm:px-4" : "h-8 rounded-lg px-3 sm:px-4",
              selected
                ? primary
                  ? "bg-ink text-surface shadow-sm"
                  : "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {Icon && <Icon className="hidden size-4 shrink-0 sm:block" aria-hidden />}
            {shortLabel ? (
              <>
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </button>
        );
      })}
    </div>
  );
}
