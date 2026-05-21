/** Snap chart prediction drags to nearest $1,000. */
export const PREDICTION_PRICE_STEP = 1000;

export function roundPredictionPrice(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / PREDICTION_PRICE_STEP) * PREDICTION_PRICE_STEP;
}

/** null clears prediction when dragged back to actual price. */
export function predictionPriceForSave(
  draggedY: number,
  basePrice: number
): number | null {
  const rounded = roundPredictionPrice(draggedY);
  return rounded === roundPredictionPrice(basePrice) ? null : rounded;
}
