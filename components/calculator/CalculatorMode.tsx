import { DiscountCalculator } from "./DiscountCalculator";
import { StandardCalculator } from "./StandardCalculator";

interface CalculatorModeProps {
  active: boolean;
}

/** Calculator mode: discount tool (the primary retail feature) beside an everyday calculator. */
export function CalculatorMode({ active }: CalculatorModeProps) {
  return (
    <div>
      <main className="mx-auto grid max-w-[1240px] items-start gap-4 px-4 py-4 sm:px-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-5 lg:py-5">
        <DiscountCalculator />
        <StandardCalculator active={active} />
      </main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-6 text-center text-xs text-muted sm:px-6">
        Calculations stay on this device and are never saved.
      </footer>
    </div>
  );
}
