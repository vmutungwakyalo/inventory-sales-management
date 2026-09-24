export function toNumber(value) { return Number(value); }

const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateSale({ quantity, wholesaleUnitPrice, retailUnitPrice, actualAmountPaid }) {
  const qty = Number(quantity);
  const wholesale = Number(wholesaleUnitPrice);
  const retail = Number(retailUnitPrice);
  const actual = Number(actualAmountPaid);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantity must be a positive whole number.');
  if (![wholesale, retail, actual].every(Number.isFinite)) throw new Error('Invalid monetary value.');
  if (wholesale < 0 || retail < 0 || actual < 0) throw new Error('Amounts cannot be negative.');
  const expectedTotal = round2(qty * retail);
  const salesVariance = round2(actual - expectedTotal);
  const costOfGoodsSold = round2(qty * wholesale);
  const grossProfit = round2(actual - costOfGoodsSold);
  return { quantity: qty, expectedTotal, salesVariance, costOfGoodsSold, grossProfit };
}
