"use client";

import { useState } from "react";
import { CalculatorMode } from "@/components/calculator/CalculatorMode";
import { CashCounter } from "@/components/cash-counter/CashCounter";
import { ModeSwitch, type AppMode } from "./ModeSwitch";

/**
 * Hosts the two modes. Both stay mounted and the inactive one is hidden, so
 * switching never resets either mode's in-memory state and needs no reload.
 * The Cash Counter component itself is rendered unchanged.
 */
export function AppShell() {
  const [mode, setMode] = useState<AppMode>("cash");

  return (
    <>
      <div className="mx-auto flex max-w-[1240px] justify-center px-4 pt-4 sm:px-6 lg:pt-5">
        <ModeSwitch mode={mode} onChange={setMode} />
      </div>

      {/* The Cash Counter root reserves a full viewport height on its own; the mode bar
          above already takes space, so that minimum is dropped here to avoid a needless scroll. */}
      <div id="panel-cash" role="tabpanel" aria-labelledby="tab-cash" hidden={mode !== "cash"} className="*:min-h-0">
        <CashCounter />
      </div>

      <div id="panel-calculator" role="tabpanel" aria-labelledby="tab-calculator" hidden={mode !== "calculator"}>
        <CalculatorMode active={mode === "calculator"} />
      </div>
    </>
  );
}
