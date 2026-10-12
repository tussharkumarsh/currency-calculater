"use client";

import { useState } from "react";
import { SegmentedTabs, type SegmentedTab } from "@/components/app/SegmentedTabs";
import { DiscountCalculator } from "./DiscountCalculator";
import { SellingPriceCalculator } from "./SellingPriceCalculator";

type DiscountTab = "customer" | "selling";

const TABS: readonly SegmentedTab<DiscountTab>[] = [
  { id: "customer", label: "Customer Discount" },
  { id: "selling", label: "Selling Price / Margin", shortLabel: "Selling price" },
];

/**
 * Discount Calculator mode: one tool at a time. Both tabs stay mounted (the inactive
 * one is hidden) so each keeps its own values while switching.
 */
export function DiscountMode() {
  const [tab, setTab] = useState<DiscountTab>("customer");

  return (
    <div>
      <main className="mx-auto max-w-2xl px-4 py-4 sm:px-6 lg:py-5">
        <div className="mb-3 flex justify-center">
          <SegmentedTabs
            tabs={TABS}
            value={tab}
            onChange={setTab}
            idPrefix="discount-"
            ariaLabel="Discount tools"
            variant="secondary"
          />
        </div>
        <div id="panel-discount-customer" role="tabpanel" aria-labelledby="tab-discount-customer" hidden={tab !== "customer"}>
          <DiscountCalculator />
        </div>
        <div id="panel-discount-selling" role="tabpanel" aria-labelledby="tab-discount-selling" hidden={tab !== "selling"}>
          <SellingPriceCalculator />
        </div>
      </main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-6 text-center text-xs text-muted sm:px-6">
        Calculations stay on this device and are never saved.
      </footer>
    </div>
  );
}
