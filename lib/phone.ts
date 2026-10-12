export type PhoneParseResult =
  | { ok: true; international: string; display: string }
  | { ok: false; error: string };

/**
 * Validates an Indian mobile number and normalises it to international digits
 * (e.g. "919876543210") as required by wa.me links.
 * Accepts 9876543210, 09876543210, +91 98765-43210, 91 9876543210 and 0091 prefixes.
 */
export function parseIndianMobile(input: string): PhoneParseResult {
  const compact = input.trim().replace(/[\s\-().]/g, "");
  if (compact === "") return { ok: false, error: "Enter a mobile number." };

  let digits = compact;
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
    if (!digits.startsWith("91")) {
      return { ok: false, error: "Only Indian (+91) mobile numbers are supported." };
    }
  }
  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: "Use digits only, with an optional +91 prefix." };
  }

  let local: string | null = null;
  if (digits.length === 10) local = digits;
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith("91")) local = digits.slice(2);
  else if (digits.length === 14 && digits.startsWith("0091")) local = digits.slice(4);

  if (!local) return { ok: false, error: "An Indian mobile number has 10 digits." };
  if (!/^[6-9]\d{9}$/.test(local)) {
    return { ok: false, error: "Indian mobile numbers start with 6, 7, 8 or 9." };
  }

  return {
    ok: true,
    international: `91${local}`,
    display: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
  };
}
