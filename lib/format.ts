/** Display formatting helpers (mirrors the prototype's money/pctOff/kfmt). */

export const money = (n: number): string => '$' + Number(n).toFixed(2);

export const pctOff = (price: number, was: number): number =>
  Math.round((1 - price / was) * 100);

/** Compact thousands: 8421 → "8.4k", 14200 → "14k". */
export function kfmt(n: number): string {
  return n >= 1000
    ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k'
    : '' + n;
}
