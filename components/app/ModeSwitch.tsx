"use client";

import { Banknote, Calculator, Tag } from "lucide-react";
import { SegmentedTabs, type SegmentedTab } from "./SegmentedTabs";

export type AppMode = "cash" | "calculator" | "discount";

const MODES: readonly SegmentedTab<AppMode>[] = [
  { id: "cash", label: "Cash Counter", Icon: Banknote },
  { id: "calculator", label: "Calculator", Icon: Calculator },
  { id: "discount", label: "Discount Calculator", shortLabel: "Discount", Icon: Tag },
];

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return <SegmentedTabs tabs={MODES} value={mode} onChange={onChange} ariaLabel="Mode" />;
}
