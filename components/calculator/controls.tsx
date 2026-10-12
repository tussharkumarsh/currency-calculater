"use client";

/** Small building blocks shared by the discount and selling-price calculators. */

export function PresetButton({
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

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular text-ink-soft">{value}</dd>
    </div>
  );
}
