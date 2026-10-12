import { StandardCalculator } from "./StandardCalculator";

interface CalculatorModeProps {
  active: boolean;
}

/** Calculator mode: the everyday calculator on its own. */
export function CalculatorMode({ active }: CalculatorModeProps) {
  return (
    <div>
      <main className="mx-auto max-w-md px-4 py-4 sm:px-6 lg:py-5">
        <StandardCalculator active={active} />
      </main>
      <footer className="mx-auto max-w-[1240px] px-4 pb-6 text-center text-xs text-muted sm:px-6">
        Calculations stay on this device and are never saved.
      </footer>
    </div>
  );
}
