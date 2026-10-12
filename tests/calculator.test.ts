import { describe, expect, it } from "vitest";
import {
  INITIAL_CALCULATOR_STATE,
  calculatorReducer,
  evaluate,
  formatEntry,
  getDisplay,
  keyToAction,
  toPlainString,
  type CalculatorAction,
  type CalculatorState,
} from "@/lib/calculator";

/** Feeds a key sequence like "100+50=" through the reducer, as typed on a keyboard. */
function run(keys: string[], from: CalculatorState = INITIAL_CALCULATOR_STATE): CalculatorState {
  return keys.reduce((state, key) => {
    const action: CalculatorAction | null =
      key === "±" ? { type: "toggle-sign" } : key === "⌫" ? { type: "backspace" } : keyToAction(key);
    if (!action) throw new Error(`Unknown key ${key}`);
    return calculatorReducer(state, action);
  }, from);
}
const type = (sequence: string) => run(sequence.split(""));
const primary = (sequence: string) => getDisplay(type(sequence)).primary;

describe("basic arithmetic", () => {
  it.each([
    ["100+50=", "150"],
    ["200-75=", "125"],
    ["25*4=", "100"],
    ["100/4=", "25"],
    ["7/2=", "3.5"],
    ["0.1+0.2=", "0.3"],
    ["1.1*3=", "3.3"],
    ["0.3-0.1=", "0.2"],
    ["2.5*2.5=", "6.25"],
    ["10/3=", "3.33333333333333"],
    ["5-8=", "−3"],
    ["1000*1000=", "10,00,000"],
  ])("%s → %s", (keys, expected) => {
    expect(primary(keys)).toBe(expected);
  });

  it("follows operator precedence", () => {
    expect(primary("2+3*4=")).toBe("14");
    expect(primary("100-20/4=")).toBe("95");
    expect(primary("10/4*2+1=")).toBe("6");
  });

  it("supports consecutive operations and chaining from a result", () => {
    expect(primary("10+5-3+2=")).toBe("14");
    const after = type("10+5=");
    expect(getDisplay(after).secondary).toBe("10 + 5 =");
    expect(getDisplay(run(["*", "2", "="], after)).primary).toBe("30");
  });

  it("starts a new calculation when typing a digit after equals", () => {
    expect(primary("10+5=7")).toBe("7");
  });

  it("replaces a repeated operator instead of stacking it", () => {
    expect(primary("10+*2=")).toBe("20");
  });

  it("shows a live preview while typing", () => {
    expect(getDisplay(type("100+5"))).toEqual({ primary: "100 + 5", secondary: "= 105", isError: false });
    expect(getDisplay(type("100+")).secondary).toBe("");
  });
});

describe("division by zero and overflow", () => {
  it("reports division by zero instead of Infinity", () => {
    const state = type("5/0=");
    expect(getDisplay(state)).toEqual({ primary: "Cannot divide by zero", secondary: "5 ÷ 0 =", isError: true });
    expect(primary("0/0=")).toBe("Cannot divide by zero");
  });

  it("recovers from an error with a new number or AC", () => {
    expect(primary("5/0=3+4=")).toBe("7");
    expect(getDisplay(run(["Escape"], type("5/0="))).primary).toBe("0");
    expect(getDisplay(run(["⌫"], type("5/0="))).primary).toBe("0");
    expect(getDisplay(run(["+"], type("5/0="))).isError).toBe(true);
  });

  it("never shows NaN or Infinity", () => {
    expect(primary("999999999999999*999999999999999=")).toBe("Result too large");
    expect(evaluate(["1", "/", "0"])).toEqual({ ok: false, error: "Cannot divide by zero" });
  });
});

describe("editing keys", () => {
  it("AC clears everything", () => {
    expect(getDisplay(run(["Escape"], type("12+3"))).primary).toBe("0");
  });

  it("backspace removes the last character or operator", () => {
    expect(getDisplay(run(["⌫"], type("123"))).primary).toBe("12");
    expect(getDisplay(run(["⌫"], type("12+"))).primary).toBe("12");
    expect(getDisplay(run(["⌫", "⌫"], type("12"))).primary).toBe("0");
  });

  it("decimal point is added once and leading zero is supplied", () => {
    expect(primary(".5")).toBe("0.5");
    expect(primary("1.2.3")).toBe("1.23");
    expect(primary("3+.")).toBe("3 + 0.");
  });

  it("± toggles the sign of the current number", () => {
    expect(getDisplay(run(["5", "±"])).primary).toBe("−5");
    expect(getDisplay(run(["5", "±", "±"])).primary).toBe("5");
    expect(getDisplay(run(["1", "0", "-", "±", "3", "="])).primary).toBe("13");
  });

  it("% converts to a fraction, or a percentage of the running total for + and −", () => {
    expect(primary("50%")).toBe("0.5");
    expect(primary("2000-15%=")).toBe("1,700");
    expect(primary("200+10%=")).toBe("220");
    expect(primary("80*25%=")).toBe("20");
  });

  it("limits typed numbers to 15 digits", () => {
    expect(primary("1234567890123456789")).toBe("12,34,56,78,90,12,345");
  });

  it("leading zeros are replaced", () => {
    expect(primary("0007")).toBe("7");
  });
});

describe("formatting", () => {
  it("formats entries with Indian grouping while preserving typed decimals", () => {
    expect(formatEntry("125000")).toBe("1,25,000");
    expect(formatEntry("1234.50")).toBe("1,234.50");
    expect(formatEntry("0.")).toBe("0.");
    expect(formatEntry("-2500")).toBe("−2,500");
  });

  it("avoids exponent notation for small values", () => {
    expect(toPlainString(0.0000001)).toBe("0.0000001");
    expect(toPlainString(-0)).toBe("0");
  });
});

describe("keyboard mapping", () => {
  it("maps physical keys", () => {
    expect(keyToAction("Enter")).toEqual({ type: "equals" });
    expect(keyToAction("Escape")).toEqual({ type: "clear" });
    expect(keyToAction("Backspace")).toEqual({ type: "backspace" });
    expect(keyToAction("*")).toEqual({ type: "operator", operator: "*" });
    expect(keyToAction("a")).toBeNull();
  });
});
