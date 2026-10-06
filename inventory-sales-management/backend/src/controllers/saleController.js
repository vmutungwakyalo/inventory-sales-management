import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { calculateSale } from '../utils/inventory.js';
import { normalizePhone, requestStkPush } from '../services/mpesa.js';
import { getEnabledPaymentMethods } from '../config/payments.js';

const allowedReasons = new Set(['DISCOUNT', 'ERROR', 'NEGOTIATION', 'FRAUD', 'OTHER']);

async function recordSale(tx, { productId, quantity, actualAmountPaid, varianceReason, varianceNote, userId, paymentMethod = 'CASH', mpesaReceiptNumber = null }) {
  const product = await tx.product.findUnique({ where: { id: productId } });

  if (!product || !product.active) throw new Error('Product not found.');
  const stockBefore = product.openingStock;
  if (stockBefore < quantity) throw new Error(`Insufficient stock. Available: ${stockBefore}, requested: ${quantity}.`);

  const retailUnitPrice = Number(product.retailPrice);
  const wholesaleUnitPrice = Number(product.wholesalePrice);
  const calculated = calculateSale({ quantity, wholesaleUnitPrice, retailUnitPrice, actualAmountPaid });

  if (calculated.salesVariance !== 0 && !varianceReason) throw new Error('A variance reason is required when actual payment differs from expected retail value.');
  if (calculated.salesVariance === 0 && varianceReason) throw new Error('A variance reason should only be supplied when there is a sales variance.');

  const stockAfter = stockBefore - quantity;
  const sale = await tx.sale.create({
    data: {
      productId, userId, quantity, wholesaleUnitPrice, retailUnitPrice,
      expectedTotal: calculated.expectedTotal, actualAmountPaid,
      salesVariance: calculated.salesVariance, varianceReason, varianceNote,
      costOfGoodsSold: calculated.costOfGoodsSold, grossProfit: calculated.grossProfit,
      paymentMethod, mpesaReceiptNumber
    },
    include: { product: { select: { name: true, sku: true } } }
  });

  const movement = await tx.inventoryMovement.create({
    data: { productId, userId, type: 'STOCK_OUT', quantity: -quantity, stockBefore, stockAfter, wholesaleUnitPrice, retailUnitPrice, expectedRetailValue: calculated.expectedTotal, saleId: sale.id }
  });

  await tx.product.update({ where: { id: productId }, data: { openingStock: stockAfter } });
  return { sale, movement, stockAfter };
}

export async function createSale(req, res) {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const actualAmountPaid = Number(req.body.actualAmountPaid);
  const varianceReason = req.body.varianceReason || null;
  const varianceNote = req.body.varianceNote || null;
  const paymentMethod = req.body.paymentMethod || 'CASH';

  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'Product and a positive whole quantity are required.' });
  }

  if (!Number.isFinite(actualAmountPaid) || actualAmountPaid < 0) {
    return res.status(400).json({ message: 'Actual amount paid must be a non-negative number.' });
  }

  if (varianceReason && !allowedReasons.has(varianceReason)) {
    return res.status(400).json({ message: 'Invalid variance reason.' });
  }
  const enabledPaymentMethods = new Set(getEnabledPaymentMethods().map(method => method.value));
  if (!enabledPaymentMethods.has(paymentMethod) || paymentMethod === 'MPESA') {
    return res.status(400).json({ message: paymentMethod === 'MPESA' ? 'Use the M-Pesa payment flow for M-Pesa sales.' : 'Invalid payment method.' });
  }

  try {
    const result = await prisma.$transaction(tx => recordSale(tx, { productId, quantity, actualAmountPaid, varianceReason, varianceNote, userId: req.user.id, paymentMethod }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function startMpesaPayment(req, res) {
  if (!getEnabledPaymentMethods().some(method => method.value === 'MPESA')) {
    return res.status(400).json({ message: 'M-Pesa is disabled in the current payment configuration.' });
  }
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const actualAmountPaid = Number(req.body.actualAmountPaid);
  const varianceReason = req.body.varianceReason || null;
  const phoneNumber = req.body.phoneNumber;

  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(actualAmountPaid) || actualAmountPaid <= 0 || !phoneNumber) {
    return res.status(400).json({ message: 'Product, positive quantity, amount and M-Pesa phone number are required.' });
  }
  if (varianceReason && !allowedReasons.has(varianceReason)) return res.status(400).json({ message: 'Invalid variance reason.' });

  try {
    const normalizedPhone = normalizePhone(phoneNumber);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) return res.status(400).json({ message: 'Product not found.' });
    if (product.openingStock < quantity) return res.status(400).json({ message: `Insufficient stock. Available: ${product.openingStock}, requested: ${quantity}.` });

    const expectedTotal = quantity * Number(product.retailPrice);
    if (actualAmountPaid !== expectedTotal && !varianceReason) return res.status(400).json({ message: 'A variance reason is required when actual payment differs from expected retail value.' });
    if (actualAmountPaid === expectedTotal && varianceReason) return res.status(400).json({ message: 'A variance reason should only be supplied when there is a sales variance.' });

    const payment = await prisma.payment.create({ data: { phoneNumber: normalizedPhone, amount: actualAmountPaid, productId, userId: req.user.id, quantity, varianceReason } });
    let response;
    try {
      response = await requestStkPush({ phoneNumber: normalizedPhone, amount: actualAmountPaid, accountReference: `SALE-${payment.id}` });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', resultDescription: error.message } });
      throw error;
    }
    const updated = await prisma.payment.update({ where: { id: payment.id }, data: { checkoutRequestId: response.CheckoutRequestID, merchantRequestId: response.MerchantRequestID, resultDescription: response.ResponseDescription } });
    res.status(202).json({ paymentId: updated.id, checkoutRequestId: updated.checkoutRequestId, message: 'STK prompt sent. Ask the customer to enter their M-Pesa PIN on their phone.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function mpesaCallback(req, res) {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  const callback = req.body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return;
  const payment = await prisma.payment.findUnique({ where: { checkoutRequestId: callback.CheckoutRequestID } });
  if (!payment || payment.status !== 'PENDING') return;

  const metadata = Object.fromEntries((callback.CallbackMetadata?.Item || []).map(item => [item.Name, item.Value]));
  if (Number(callback.ResultCode) !== 0) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', resultCode: Number(callback.ResultCode), resultDescription: callback.ResultDesc } });
    return;
  }

  try {
    await prisma.$transaction(async tx => {
      const result = await recordSale(tx, { productId: payment.productId, quantity: payment.quantity, actualAmountPaid: Number(payment.amount), varianceReason: payment.varianceReason, userId: payment.userId, paymentMethod: 'MPESA', mpesaReceiptNumber: metadata.MpesaReceiptNumber || null });
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'COMPLETED', resultCode: Number(callback.ResultCode), resultDescription: callback.ResultDesc, mpesaReceiptNumber: metadata.MpesaReceiptNumber || null, saleId: result.sale.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', resultDescription: error.message } });
  }
}

export async function getMpesaPayment(req, res) {
  const payment = await prisma.payment.findFirst({ where: { id: Number(req.params.id), userId: req.user.id }, include: { sale: { include: { product: { select: { name: true, sku: true } } } } } });
  if (!payment) return res.status(404).json({ message: 'Payment not found.' });
  res.json(payment);
}

export async function listSales(req, res) {
  const { productId, userId, from, to } = req.query;
  const where = {};

  if (productId) where.productId = Number(productId);
  if (userId) where.userId = Number(userId);

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(sales);
}

export async function deleteSale(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid sale id.' });

  const sale = await prisma.sale.findUnique({ where: { id }, include: { inventoryMovement: true } });
  if (!sale) return res.status(404).json({ message: 'Sale not found.' });
  if (!sale.inventoryMovement) return res.status(409).json({ message: 'Sale has no inventory movement and cannot be safely deleted.' });

  try {
    await prisma.$transaction(async tx => {
      const latest = await tx.inventoryMovement.findFirst({ where: { productId: sale.productId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const product = await tx.product.findUnique({ where: { id: sale.productId } });
      if (!latest || latest.id !== sale.inventoryMovement.id || !product || product.openingStock !== sale.inventoryMovement.stockAfter) {
        throw new Error('Only the latest inventory transaction for a product can be deleted.');
      }
      await tx.product.update({ where: { id: sale.productId }, data: { openingStock: sale.inventoryMovement.stockBefore } });
      await tx.inventoryMovement.delete({ where: { id: sale.inventoryMovement.id } });
      await tx.sale.delete({ where: { id } });
    });
    res.status(204).end();
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
}
