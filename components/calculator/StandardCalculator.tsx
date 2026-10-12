"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Calculator, Delete } from "lucide-react";
import {
  INITIAL_CALCULATOR_STATE,
  calculatorReducer,
  getDisplay,
  isOperator,
  keyToAction,
  type CalculatorAction,
  type Operator,
} from "@/lib/calculator";

interface KeyDef {
  id: string;
  label: React.ReactNode;
  ariaLabel: string;
  action: CalculatorAction;
  variant: "digit" | "operator" | "function" | "equals";
}

const op = (operator: Operator, label: string, ariaLabel: string): KeyDef => ({
  id: operator,
  label,
  ariaLabel,
  action: { type: "operator", operator },
  variant: "operator",
});
const digit = (d: string): KeyDef => ({ id: d, label: d, ariaLabel: d, action: { type: "digit", digit: d }, variant: "digit" });

const KEYS: KeyDef[] = [
  { id: "clear", label: "AC", ariaLabel: "All clear", action: { type: "clear" }, variant: "function" },
  {
    id: "backspace",
    label: <Delete className="size-5" aria-hidden />,
    ariaLabel: "Delete",
    action: { type: "backspace" },
    variant: "function",
  },
  { id: "percent", label: "%", ariaLabel: "Percent", action: { type: "percent" }, variant: "function" },
  op("/", "÷", "Divide"),
  digit("7"),
  digit("8"),
  digit("9"),
  op("*", "×", "Multiply"),
  digit("4"),
  digit("5"),
  digit("6"),
  op("-", "−", "Subtract"),
  digit("1"),
  digit("2"),
  digit("3"),
  op("+", "+", "Add"),
  { id: "toggle-sign", label: "±", ariaLabel: "Toggle plus or minus", action: { type: "toggle-sign" }, variant: "function" },
  digit("0"),
  { id: "decimal", label: ".", ariaLabel: "Decimal point", action: { type: "decimal" }, variant: "digit" },
  { id: "equals", label: "=", ariaLabel: "Equals", action: { type: "equals" }, variant: "equals" },
];

function actionKeyId(action: CalculatorAction): string {
  switch (action.type) {
    case "digit":
      return action.digit;
    case "operator":
      return action.operator;
    default:
      return action.type;
  }
}

const VARIANT_CLASSES: Record<KeyDef["variant"], string> = {
  digit: "border border-line bg-surface text-ink hover:bg-surface-muted",
  function: "bg-surface-muted text-ink-soft hover:bg-line",
  operator: "bg-accent-soft text-accent hover:brightness-95",
  equals: "bg-ink text-surface hover:opacity-90",
};

interface StandardCalculatorProps {
  /** Physical-keyboard shortcuts are only listened for while Calculator mode is visible. */
  active: boolean;
}

export function StandardCalculator({ active }: StandardCalculatorProps) {
  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_CALCULATOR_STATE);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const display = getDisplay(state);
  const last = state.entries[state.entries.length - 1];
  const pendingOperator = !state.justEvaluated && isOperator(last) ? last : null;

  useEffect(() => {
    if (!active) return;
    // Whether focus last moved by Tab (keyboard navigation) rather than mouse/touch.
    let navigatingByKeyboard = false;
    function onPointerDown() {
      navigatingByKeyboard = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        navigatingByKeyboard = true;
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Leave typing in form fields (e.g. the discount inputs) alone.
      if (target?.closest("input, textarea, select, [contenteditable='true'], dialog")) return;
      // A button reached with Tab handles Enter/Space itself; one merely left focused by a
      // mouse click (e.g. the mode tab) must not swallow Enter, which means "=" here.
      if ((event.key === "Enter" || event.key === " ") && navigatingByKeyboard && target?.closest("button")) return;
      const action = keyToAction(event.key);
      if (!action) return;
      event.preventDefault();
      dispatch(action);
      clearTimeout(flashTimer.current);
      setFlashKey(actionKeyId(action));
      flashTimer.current = setTimeout(() => setFlashKey(null), 140);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const primaryLength = display.primary.length;
  const primarySize =
    display.isError || primaryLength > 22
      ? "text-2xl"
      : primaryLength > 15
        ? "text-3xl"
        : primaryLength > 10
          ? "text-4xl"
          : "text-5xl";

  return (
    <section aria-labelledby="standard-calc-heading" className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Calculator className="size-4 text-muted" aria-hidden />
        <h2 id="standard-calc-heading" className="text-sm font-semibold text-ink">
          Calculator
        </h2>
      </header>

      <div className="rounded-2xl bg-surface-muted px-4 pt-3 pb-4 text-right">
        <p className="h-5 truncate text-sm text-muted tabular" aria-hidden={!display.secondary}>
          {display.secondary}
        </p>
        <output
          aria-live="polite"
          aria-atomic
          className={[
            "mt-1 block min-h-[3.25rem] leading-tight font-semibold tracking-tight break-all tabular",
            primarySize,
            display.isError ? "text-danger" : "text-ink",
          ].join(" ")}
        >
          {display.primary}
        </output>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="Calculator keypad">
        {KEYS.map((key) => {
          const highlighted = flashKey === key.id || (key.variant === "operator" && pendingOperator === key.id);
          return (
            <button
              key={key.id}
              type="button"
              aria-label={key.ariaLabel}
              // Keep focus off keypad buttons on mouse/touch, so Enter on the keyboard always means "=".
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => dispatch(key.action)}
              className={[
                "flex h-14 items-center justify-center rounded-xl text-xl font-medium transition-all select-none active:scale-[0.97] sm:h-[3.75rem]",
                VARIANT_CLASSES[key.variant],
                highlighted ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : "",
              ].join(" ")}
            >
              {key.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 hidden text-center text-xs text-muted lg:block">
        Type with your keyboard: numbers, + − * /, %, Enter for =, Backspace, Esc to clear.
      </p>
    </section>
  );
}
