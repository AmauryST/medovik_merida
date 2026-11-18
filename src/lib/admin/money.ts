import type { Cents } from "@/types/catalog";

/**
 * Dollars typed in the UI ("25", "25.5", "25,50") → integer cents. Returns
 * `null` for anything that is not a plain amount with at most 2 decimals.
 * `allowNegative` is for `price_delta_cents` (a cheaper presentation).
 */
export function dollarsToCents(text: string, { allowNegative = false } = {}): Cents | null {
  const normalized = text.trim().replace(",", ".").replace(/^\$/, "");
  const pattern = allowNegative ? /^-?\d{1,6}(\.\d{1,2})?$/ : /^\d{1,6}(\.\d{1,2})?$/;
  if (!pattern.test(normalized)) {
    return null;
  }
  // Round: 19.99 * 100 is 1998.9999999999998 in floating point.
  return Math.round(Number(normalized) * 100);
}

/** Cents → the value an amount input starts with ("25" or "25.50"). */
export function centsToInput(cents: Cents): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
