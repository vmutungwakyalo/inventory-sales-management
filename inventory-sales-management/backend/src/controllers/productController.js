import { prisma } from '../config/prisma.js';

const decimal = value => Number(value);

export function canDeleteProduct(product) {
  const hasSales = Number(product?._count?.sales || 0) > 0;
  const hasMovements = Number(product?._count?.movements || 0) > 0;

  return !(hasSales || hasMovements);
}

export async function listProducts(req, res) {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  res.json(products);
}

export async function createProduct(req, res) {
  const { name, sku, description, wholesalePrice, retailPrice, openingStock = 0, lowStockThreshold = 0 } = req.body;
  const wholesale = decimal(wholesalePrice), retail = decimal(retailPrice);
  const stock = Number(openingStock), threshold = Number(lowStockThreshold);
  if (!name?.trim() || !sku?.trim() || !Number.isFinite(wholesale) || !Number.isFinite(retail)) return res.status(400).json({ message: 'Name, SKU, wholesale price and retail price are required.' });
  if (wholesale < 0 || retail < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) return res.status(400).json({ message: 'Prices and stock values are invalid.' });

  try {
    const product = await prisma.$transaction(async tx => {
      const created = await tx.product.create({ data: { name: name.trim(), sku: sku.trim(), description: description?.trim() || null, wholesalePrice: wholesale, retailPrice: retail, openingStock: stock, lowStockThreshold: threshold } });
      await tx.priceHistory.create({ data: { productId: created.id, changedByUserId: req.user.id, changeType: 'INITIAL', previousWholesale: wholesale, previousRetail: retail, newWholesale: wholesale, newRetail: retail, note: 'Initial product price.' } });
      return created;
    });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'SKU already exists.' });
    throw error;
  }
}

export async function updateProduct(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid product id.' });
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ message: 'Product not found.' });

  const { name, sku, description, wholesalePrice, retailPrice, lowStockThreshold, active, priceNote } = req.body;
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (sku !== undefined) data.sku = String(sku).trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (active !== undefined) data.active = Boolean(active);
  if (lowStockThreshold !== undefined) {
    const n = Number(lowStockThreshold); if (!Number.isInteger(n) || n < 0) return res.status(400).json({ message: 'Low-stock threshold must be a non-negative whole number.' });
    data.lowStockThreshold = n;
  }

  const nextWholesale = wholesalePrice === undefined ? Number(current.wholesalePrice) : Number(wholesalePrice);
  const nextRetail = retailPrice === undefined ? Number(current.retailPrice) : Number(retailPrice);
  if (!Number.isFinite(nextWholesale) || !Number.isFinite(nextRetail) || nextWholesale < 0 || nextRetail < 0) return res.status(400).json({ message: 'Prices must be non-negative numbers.' });
  if (name !== undefined && !data.name) return res.status(400).json({ message: 'Name cannot be empty.' });
  if (sku !== undefined && !data.sku) return res.status(400).json({ message: 'SKU cannot be empty.' });

  const priceChanged = nextWholesale !== Number(current.wholesalePrice) || nextRetail !== Number(current.retailPrice);
  try {
    const result = await prisma.$transaction(async tx => {
      const product = await tx.product.update({ where: { id }, data: { ...data, wholesalePrice: nextWholesale, retailPrice: nextRetail } });
      if (priceChanged) {
        const type = nextWholesale !== Number(current.wholesalePrice) && nextRetail !== Number(current.retailPrice) ? 'BOTH' : nextWholesale !== Number(current.wholesalePrice) ? 'WHOLESALE' : 'RETAIL';
        await tx.priceHistory.create({ data: { productId: id, changedByUserId: req.user.id, changeType: type, previousWholesale: current.wholesalePrice, previousRetail: current.retailPrice, newWholesale: nextWholesale, newRetail: nextRetail, note: priceNote?.trim() || null } });
      }
      return product;
    });
    res.json(result);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'SKU already exists.' });
    throw error;
  }
}

export async function deleteProduct(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid product id.' });

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: true,
          movements: true,
          stockIns: true,
          priceHistory: true
        }
      }
    }
  });
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  const canDelete = canDeleteProduct(product);

  if (!canDelete) {
    return res.status(409).json({ message: 'Products with sales or stock movements cannot be deleted. Deactivate the product instead.' });
  }

  await prisma.$transaction(async tx => {
    await tx.priceHistory.deleteMany({ where: { productId: id } });
    await tx.stockIn.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });
  res.status(204).end();
}

export async function priceHistory(req, res) {
  const productId = Number(req.params.id);
  const rows = await prisma.priceHistory.findMany({ where: { productId }, include: { changedBy: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  res.json(rows);
}
