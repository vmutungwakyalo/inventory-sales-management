import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export async function currentInventory(req, res) {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  });

  const result = products.map((p) => {
    const currentStock = p.openingStock;
    const costValue = currentStock * Number(p.wholesalePrice);
    const retailValue = currentStock * Number(p.retailPrice);

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock,
      wholesaleUnitPrice: Number(p.wholesalePrice),
      retailUnitPrice: Number(p.retailPrice),
      totalCostValue: costValue,
      expectedRetailValue: retailValue,
      expectedProfit: retailValue - costValue,
      lowStockThreshold: p.lowStockThreshold,
      outOfStock: currentStock === 0,
      lowStock: currentStock > 0 && currentStock <= p.lowStockThreshold
    };
  });

  res.json(result);
}

export async function movements(req, res) {
  const { productId, type, userId, from, to } = req.query;

  const where = {};
  if (productId) where.productId = Number(productId);
  if (type) where.type = type;
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

  const data = await prisma.inventoryMovement.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
      user: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(data);
}

export async function stockIn(req, res) {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const note = req.body.note || null;

  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'Product and a positive whole quantity are required.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.active) throw new Error('Product not found.');

      const stockBefore = product.openingStock;
      const stockAfter = stockBefore + quantity;

      const stock = await tx.stockIn.create({
        data: {
          productId,
          userId: req.user.id,
          quantity,
          wholesaleUnitPrice: product.wholesalePrice,
          retailUnitPrice: product.retailPrice,
          note
        }
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          userId: req.user.id,
          type: 'STOCK_IN',
          quantity,
          stockBefore,
          stockAfter,
          wholesaleUnitPrice: product.wholesalePrice,
          retailUnitPrice: product.retailPrice,
          expectedRetailValue: quantity * Number(product.retailPrice),
          stockInId: stock.id
        }
      });

      await tx.product.update({
        where: { id: productId },
        data: { openingStock: stockAfter }
      });

      return { stock, movement, stockAfter };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function deleteStockIn(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid stock-in id.' });

  const stock = await prisma.stockIn.findUnique({ where: { id }, include: { inventoryMovement: true } });
  if (!stock) return res.status(404).json({ message: 'Stock-in record not found.' });
  if (!stock.inventoryMovement) return res.status(409).json({ message: 'Stock-in record has no inventory movement and cannot be safely deleted.' });

  try {
    await prisma.$transaction(async tx => {
      const latest = await tx.inventoryMovement.findFirst({ where: { productId: stock.productId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      const product = await tx.product.findUnique({ where: { id: stock.productId } });
      if (!latest || latest.id !== stock.inventoryMovement.id || !product || product.openingStock !== stock.inventoryMovement.stockAfter) {
        throw new Error('Only the latest inventory transaction for a product can be deleted.');
      }
      await tx.product.update({ where: { id: stock.productId }, data: { openingStock: stock.inventoryMovement.stockBefore } });
      await tx.inventoryMovement.delete({ where: { id: stock.inventoryMovement.id } });
      await tx.stockIn.delete({ where: { id } });
    });
    res.status(204).end();
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
}
