import { groupIndian } from "@/lib/format-currency";

export type Operator = "+" | "-" | "*" | "/";
export type Entry = string | Operator;

/**
 * Calculator state is an alternating list of number strings and operators,
 * e.g. ["100", "+", "5", "*", "2"]. Numbers stay as typed strings (so "12.50"
 * or "0." display exactly) and are parsed only when evaluating.
 */
export interface CalculatorState {
  entries: Entry[];
  /** Expression that produced the current result, shown as "100 + 50 =". */
  history: string | null;
  justEvaluated: boolean;
  error: string | null;
}

export type CalculatorAction =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" }
  | { type: "percent" }
  | { type: "toggle-sign" }
  | { type: "backspace" }
  | { type: "clear" };

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  entries: [],
  history: null,
  justEvaluated: false,
  error: null,
};

/** Maximum digits a single typed number may contain. */
export const MAX_INPUT_DIGITS = 15;
/** Results beyond this magnitude are reported as too large rather than shown in exponent form. */
export const MAX_MAGNITUDE = 1e15;

const OPERATORS: readonly string[] = ["+", "-", "*", "/"];
const SYMBOLS: Record<Operator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function isOperator(entry: Entry | undefined): entry is Operator {
  return entry !== undefined && OPERATORS.includes(entry);
}

/**
 * Rounds to 15 significant digits after every operation. This removes binary
 * floating-point noise (0.1 + 0.2 → 0.3) so it never compounds into later steps.
 */
export function roundSignificant(value: number): number {
  if (value === 0 || !Number.isFinite(value)) return value === 0 ? 0 : value;
  return Number.parseFloat(value.toPrecision(15));
}

/** Converts a number to a plain decimal string (never exponent notation within supported range). */
export function toPlainString(value: number): string {
  const n = roundSignificant(value);
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e-6) return String(n);
  return n.toFixed(14).replace(/0+$/, "").replace(/\.$/, "");
}

export type EvaluationResult = { ok: true; value: number } | { ok: false; error: string };

function checkMagnitude(value: number): EvaluationResult {
  if (!Number.isFinite(value) || Math.abs(value) >= MAX_MAGNITUDE) {
    return { ok: false, error: "Result too large" };
  }
  return { ok: true, value: roundSignificant(value) };
}

function apply(a: number, op: Operator, b: number): EvaluationResult {
  switch (op) {
    case "+":
      return checkMagnitude(a + b);
    case "-":
      return checkMagnitude(a - b);
    case "*":
      return checkMagnitude(a * b);
    case "/":
      if (b === 0) return { ok: false, error: "Cannot divide by zero" };
      return checkMagnitude(a / b);
  }
}

function parseEntry(entry: string): number {
  const n = Number.parseFloat(entry);
  return Number.isNaN(n) ? 0 : n;
}

/** Evaluates entries with standard precedence (× and ÷ before + and −). A trailing operator is ignored. */
export function evaluate(entries: readonly Entry[]): EvaluationResult {
  const list = isOperator(entries[entries.length - 1]) ? entries.slice(0, -1) : entries;
  if (list.length === 0) return { ok: true, value: 0 };

  // First pass: fold × and ÷ into terms.
  const terms: number[] = [];
  const additive: Operator[] = [];
  let current = parseEntry(list[0] as string);
  for (let i = 1; i < list.length; i += 2) {
    const op = list[i] as Operator;
    const operand = parseEntry(list[i + 1] as string);
    if (op === "*" || op === "/") {
      const step = apply(current, op, operand);
      if (!step.ok) return step;
      current = step.value;
    } else {
      terms.push(current);
      additive.push(op);
      current = operand;
    }
  }
  terms.push(current);

  // Second pass: + and − left to right.
  let total = terms[0] ?? 0;
  for (let i = 0; i < additive.length; i += 1) {
    const step = apply(total, additive[i] as Operator, terms[i + 1] ?? 0);
    if (!step.ok) return step;
    total = step.value;
  }
  return checkMagnitude(total);
}

function digitCount(entry: string): number {
  return entry.replace(/[^0-9]/g, "").length;
}

function lastIndex(state: CalculatorState): number {
  return state.entries.length - 1;
}

function withLast(state: CalculatorState, value: string): Entry[] {
  const entries = [...state.entries];
  entries[lastIndex(state)] = value;
  return entries;
}

function fresh(entries: Entry[]): CalculatorState {
  return { entries, history: null, justEvaluated: false, error: null };
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (action.type === "clear") return INITIAL_CALCULATOR_STATE;

  // After an error only clearing, typing a new number or backspace (which clears) are meaningful.
  if (state.error && action.type !== "digit" && action.type !== "decimal") {
    return action.type === "backspace" ? INITIAL_CALCULATOR_STATE : state;
  }

  const last = state.entries[lastIndex(state)];
  const startNew = state.justEvaluated || state.error !== null;

  switch (action.type) {
    case "digit": {
      if (!/^\d$/.test(action.digit)) return state;
      if (startNew || last === undefined || isOperator(last)) {
        return fresh([...(startNew ? [] : state.entries), action.digit]);
      }
      if (last === "0") return fresh(withLast(state, action.digit));
      if (last === "-0") return fresh(withLast(state, `-${action.digit}`));
      if (digitCount(last) >= MAX_INPUT_DIGITS) return state;
      return fresh(withLast(state, last + action.digit));
    }

    case "decimal": {
      if (startNew || last === undefined || isOperator(last)) {
        return fresh([...(startNew ? [] : state.entries), "0."]);
      }
      if (last.includes(".") || digitCount(last) >= MAX_INPUT_DIGITS) return state;
      return fresh(withLast(state, `${last}.`));
    }

    case "operator": {
      if (last === undefined) return fresh(["0", action.operator]);
      if (state.justEvaluated) return fresh([...state.entries, action.operator]);
      if (isOperator(last)) return fresh(withLast(state, action.operator));
      const cleaned = last.endsWith(".") ? last.slice(0, -1) : last;
      return fresh([...withLast(state, cleaned), action.operator]);
    }

    case "equals": {
      if (last === undefined || state.justEvaluated) return state;
      const entries = isOperator(last) ? state.entries.slice(0, -1) : state.entries;
      if (entries.length < 3) return state; // a lone number has nothing to evaluate
      const result = evaluate(entries);
      const history = `${formatExpression(entries)} =`;
      if (!result.ok) return { entries: [], history, justEvaluated: true, error: result.error };
      return { entries: [toPlainString(result.value)], history, justEvaluated: true, error: null };
    }

    case "percent": {
      if (last === undefined || isOperator(last)) return state;
      const value = parseEntry(last);
      const op = state.entries[lastIndex(state) - 1];
      let next: number;
      if (isOperator(op) && (op === "+" || op === "-")) {
        // Shop-calculator convention: 2000 − 15% → 2000 − 300.
        const base = evaluate(state.entries.slice(0, -2));
        if (!base.ok) return state;
        next = (base.value * value) / 100;
      } else {
        next = value / 100;
      }
      return fresh(withLast(state, toPlainString(next)));
    }

    case "toggle-sign": {
      if (last === undefined || isOperator(last)) return fresh([...state.entries, "-0"]);
      const toggled = last.startsWith("-") ? last.slice(1) : `-${last}`;
      return { ...fresh(withLast(state, toggled)), history: state.justEvaluated ? null : state.history };
    }

    case "backspace": {
      if (last === undefined) return state;
      if (state.justEvaluated) return { ...state, history: null, justEvaluated: false };
      if (isOperator(last)) return fresh(state.entries.slice(0, -1));
      const trimmed = last.slice(0, -1);
      if (trimmed === "" || trimmed === "-") return fresh(state.entries.slice(0, -1));
      return fresh(withLast(state, trimmed));
    }
  }
}

/** Formats a typed number with Indian grouping, keeping what the user typed ("1,25,000.50", "0."). */
export function formatEntry(entry: string): string {
  const negative = entry.startsWith("-");
  const body = negative ? entry.slice(1) : entry;
  const [intPart = "0", fraction] = body.split(".");
  const grouped = groupIndian(Number(intPart || "0"));
  return `${negative ? "−" : ""}${grouped}${fraction !== undefined ? `.${fraction}` : ""}`;
}

export function formatExpression(entries: readonly Entry[]): string {
  return entries.map((e) => (isOperator(e) ? SYMBOLS[e] : formatEntry(e))).join(" ");
}

export interface CalculatorDisplay {
  /** Small line: history ("100 + 50 =") or a live preview ("= 150"). */
  secondary: string;
  /** Large line: the expression being typed, the result, or an error. */
  primary: string;
  isError: boolean;
}

export function getDisplay(state: CalculatorState): CalculatorDisplay {
  if (state.error) return { secondary: state.history ?? "", primary: state.error, isError: true };
  if (state.entries.length === 0) return { secondary: "", primary: "0", isError: false };
  if (state.justEvaluated) {
    return { secondary: state.history ?? "", primary: formatExpression(state.entries), isError: false };
  }

  const hasOperation = state.entries.some((e) => isOperator(e)) && !isOperator(state.entries[state.entries.length - 1]);
  let secondary = "";
  if (hasOperation) {
    const preview = evaluate(state.entries);
    secondary = preview.ok ? `= ${formatEntry(toPlainString(preview.value))}` : "";
  }
  return { secondary, primary: formatExpression(state.entries), isError: false };
}

/** Maps a physical key to a calculator action. */
export function keyToAction(key: string): CalculatorAction | null {
  if (/^\d$/.test(key)) return { type: "digit", digit: key };
  switch (key) {
    case ".":
    case ",":
      return { type: "decimal" };
    case "+":
      return { type: "operator", operator: "+" };
    case "-":
      return { type: "operator", operator: "-" };
    case "*":
    case "x":
    case "X":
      return { type: "operator", operator: "*" };
    case "/":
      return { type: "operator", operator: "/" };
    case "%":
      return { type: "percent" };
    case "Enter":
    case "=":
      return { type: "equals" };
    case "Backspace":
      return { type: "backspace" };
    case "Escape":
    case "Delete":
      return { type: "clear" };
    case "F9":
      return { type: "toggle-sign" };
    default:
      return null;
  }
}
