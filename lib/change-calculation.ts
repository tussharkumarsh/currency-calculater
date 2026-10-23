/**
 * Compares the bill with the cash counted on the denomination grid. Everything
 * runs in whole paise so decimal bills never pick up floating-point noise.
 */

export type ChangeStatus = "change" | "due" | "exact";

export interface ChangeResult {
  billPaise: number;
  receivedPaise: number;
  status: ChangeStatus;
  /** Change to return (status "change") or balance still to collect ("due"); 0 when exact. */
  amountPaise: number;
}

/** `cashReceivedRupees` is the Cash Counter grand total — never a separately tracked figure. */
export function calculateChange(billPaise: number, cashReceivedRupees: number): ChangeResult {
  const receivedPaise = cashReceivedRupees * 100;
  const difference = receivedPaise - billPaise;
  return {
    billPaise,
    receivedPaise,
    status: difference > 0 ? "change" : difference < 0 ? "due" : "exact",
    amountPaise: Math.abs(difference),
  };
}
