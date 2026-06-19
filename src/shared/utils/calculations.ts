/**
 * Financial calculations — all monetary math MUST use roundTo2().
 * Rule: Math.round(value * 100) / 100
 */

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Calculate item discount amount */
export function calcItemDiscount(
  unitPrice: number,
  quantity: number,
  discountType: 'percent' | 'amount',
  discountValue: number
): number {
  if (discountType === 'percent') {
    return roundTo2(unitPrice * quantity * (discountValue / 100));
  }
  const sign = quantity >= 0 ? 1 : -1;
  return roundTo2(discountValue * sign);
}

/** Calculate item total */
export function calcItemTotal(unitPrice: number, quantity: number, discountAmount: number): number {
  return roundTo2(unitPrice * quantity - discountAmount);
}

/** Calculate invoice subtotal from items */
export function calcSubtotal(itemTotals: number[]): number {
  return roundTo2(itemTotals.reduce((sum, t) => sum + t, 0));
}

/** Calculate global discount amount */
export function calcGlobalDiscount(
  subtotal: number,
  discountType: 'percent' | 'amount',
  discountValue: number
): number {
  if (discountType === 'percent') {
    return roundTo2(subtotal * (discountValue / 100));
  }
  const sign = subtotal >= 0 ? 1 : -1;
  return roundTo2(discountValue * sign);
}

/** Calculate tax amount */
export function calcTax(totalBeforeTax: number, taxPercent: number): number {
  return roundTo2(totalBeforeTax * (taxPercent / 100));
}

/** Calculate final total */
export function calcTotal(totalBeforeTax: number, taxAmount: number): number {
  return roundTo2(totalBeforeTax + taxAmount);
}

/** Calculate remaining balance */
export function calcRemaining(total: number, paid: number): number {
  return roundTo2(total - paid);
}

/** Calculate item gross profit */
export function calcItemGrossProfit(
  unitPrice: number,
  purchasePriceSnapshot: number,
  quantity: number,
  discountAmount: number
): number {
  return roundTo2((unitPrice - purchasePriceSnapshot) * quantity - discountAmount);
}

/** Profit margin percentage */
export function calcProfitMargin(netProfit: number, totalRevenue: number): number {
  if (totalRevenue === 0) return 0;
  return roundTo2((netProfit / totalRevenue) * 100);
}
