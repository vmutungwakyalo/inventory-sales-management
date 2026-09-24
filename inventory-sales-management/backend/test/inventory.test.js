import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSale } from '../src/utils/inventory.js';

test('sale calculation uses historical prices and actual payment', () => {
  const result = calculateSale({ quantity: 3, wholesaleUnitPrice: 100, retailUnitPrice: 150, actualAmountPaid: 420 });
  assert.deepEqual(result, { quantity: 3, expectedTotal: 450, salesVariance: -30, costOfGoodsSold: 300, grossProfit: 120 });
});

test('sales variance is actual revenue minus expected revenue', () => {
  const discounted = calculateSale({ quantity: 2, wholesaleUnitPrice: 40, retailUnitPrice: 60, actualAmountPaid: 100 });
  const premium = calculateSale({ quantity: 2, wholesaleUnitPrice: 40, retailUnitPrice: 60, actualAmountPaid: 140 });
  assert.equal(discounted.salesVariance, -20);
  assert.equal(premium.salesVariance, 20);
});

test('exact payment produces zero variance', () => {
  const result = calculateSale({ quantity: 2, wholesaleUnitPrice: 40.5, retailUnitPrice: 60.25, actualAmountPaid: 120.5 });
  assert.equal(result.salesVariance, 0);
  assert.equal(result.grossProfit, 39.5);
});

test('invalid quantity is rejected', () => {
  assert.throws(() => calculateSale({ quantity: 0, wholesaleUnitPrice: 10, retailUnitPrice: 20, actualAmountPaid: 20 }), /positive whole number/);
});
