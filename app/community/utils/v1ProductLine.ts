/**
 * V1 Product Line is derived from price level.
 * e.g. $730,990 → "70s" (price in 700k range), $293,990 → "20s" (200k range).
 * Formula: floor(price / 100_000) * 10, then "${result}s".
 */
export function getV1ProductLineLabel(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  const tier = Math.floor(price / 100_000) * 10;
  return `${tier}s`;
}
