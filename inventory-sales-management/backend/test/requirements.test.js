import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const root = new URL('..', import.meta.url);
const source = file => fs.readFileSync(new URL(file, root), 'utf8');

test('schema preserves historical prices on sales', () => {
  const schema = source('prisma/schema.prisma');
  assert.match(schema, /wholesaleUnitPrice\s+Decimal/);
  assert.match(schema, /retailUnitPrice\s+Decimal/);
  assert.match(schema, /expectedTotal\s+Decimal/);
  assert.match(schema, /actualAmountPaid\s+Decimal/);
  assert.match(schema, /costOfGoodsSold\s+Decimal/);
  assert.match(schema, /grossProfit\s+Decimal/);
});

test('price changes have immutable audit records', () => {
  const schema = source('prisma/schema.prisma');
  const controller = source('src/controllers/productController.js');
  assert.match(schema, /model PriceHistory/);
  assert.match(controller, /tx\.priceHistory\.create/);
  assert.match(controller, /previousWholesale/);
  assert.match(controller, /previousRetail/);
  assert.match(controller, /newWholesale/);
  assert.match(controller, /newRetail/);
});

test('inventory movements capture stock before and after', () => {
  const schema = source('prisma/schema.prisma');
  const sale = source('src/controllers/saleController.js');
  const stock = source('src/controllers/inventoryController.js');
  assert.match(schema, /stockBefore\s+Int/);
  assert.match(schema, /stockAfter\s+Int/);
  assert.match(sale, /stockBefore/);
  assert.match(sale, /stockAfter/);
  assert.match(stock, /inventoryMovement\.create/);
});

test('admin-only sales listing protects transaction history', () => {
  const routes = source('src/routes/saleRoutes.js');
  assert.match(routes, /router\.get\('\/', authenticate, authorize\('ADMIN'\), listSales\)/);
});

test('reporting exposes required filters and exports', () => {
  const report = source('src/controllers/reportController.js');
  for (const field of ['productId', 'userId', 'type', 'from', 'to']) assert.match(report, new RegExp(field));
  assert.match(report, /salesReport/);
  assert.match(report, /profitReport/);
  assert.match(report, /stockAlerts/);
  assert.match(report, /ExcelJS/);
  assert.match(report, /PDFDocument/);
  assert.match(report, /text\/csv/);
});

test('frontend exposes editing, history, movement, reporting and exports', () => {
  const app = source('../frontend/src/App.jsx');
  for (const text of ['Edit Product', 'Price History', 'Inventory Movement History', 'Detailed Sales', 'Reporting', 'Export CSV', 'Export Excel', 'Export PDF']) {
    assert.match(app, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
