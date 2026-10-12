"use client";

import { useRef } from "react";
import { Banknote, Calculator } from "lucide-react";

export type AppMode = "cash" | "calculator";

const MODES: { id: AppMode; label: string; Icon: typeof Banknote }[] = [
  { id: "cash", label: "Cash Counter", Icon: Banknote },
  { id: "calculator", label: "Calculator", Icon: Calculator },
];

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

/** Segmented control implemented as an ARIA tablist (arrow keys move between modes). */
export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? MODES.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + MODES.length) % MODES.length;
    const next = MODES[nextIndex];
    if (!next) return;
    onChange(next.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Mode"
      className="inline-grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1 shadow-card"
    >
      {MODES.map(({ id, label, Icon }, index) => {
        const selected = mode === id;
        return (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              "flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all",
              selected ? "bg-ink text-surface shadow-sm" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
