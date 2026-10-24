/**
 * Compares the bill with what the customer paid: the cash counted on the
 * denomination grid plus any online / bank transfer. Everything runs in whole
 * paise so decimal amounts never pick up floating-point noise.
 */

export type ChangeStatus = "change" | "due" | "exact";

export interface ChangeResult {
  billPaise: number;
  cashPaise: number;
  onlinePaise: number;
  /** Cash + online. */
  receivedPaise: number;
  status: ChangeStatus;
  /** Change to return (status "change") or balance still to collect ("due"); 0 when exact. */
  amountPaise: number;
}

/**
 * `cashReceivedRupees` is the Cash Counter grand total — never a separately tracked figure.
 * `onlinePaise` is the amount paid by UPI / bank transfer (0 when none).
 */
export function calculateChange(billPaise: number, cashReceivedRupees: number, onlinePaise = 0): ChangeResult {
  const cashPaise = cashReceivedRupees * 100;
  const receivedPaise = cashPaise + onlinePaise;
  const difference = receivedPaise - billPaise;
  return {
    billPaise,
    cashPaise,
    onlinePaise,
    receivedPaise,
    status: difference > 0 ? "change" : difference < 0 ? "due" : "exact",
    amountPaise: Math.abs(difference),
  };
}
