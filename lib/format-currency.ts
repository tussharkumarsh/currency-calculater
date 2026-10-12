/**
 * Groups digits in the Indian system: 1,25,000 / 1,00,00,000.
 * Implemented by hand so server and client output are identical regardless of ICU data.
 */
export function groupIndian(value: number): string {
  const n = Math.trunc(value);
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(n).toString();
  if (digits.length <= 3) return sign + digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}${rest},${lastThree}`;
}

export function formatINR(amount: number): string {
  return amount < 0 ? `-₹${groupIndian(-amount)}` : `₹${groupIndian(amount)}`;
}

export function formatCount(count: number): string {
  return groupIndian(count);
}

/** Display label for a denomination, e.g. "₹500". */
export function formatDenomination(value: number): string {
  return formatINR(value);
}
