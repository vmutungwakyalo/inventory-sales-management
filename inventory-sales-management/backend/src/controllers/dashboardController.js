import { prisma } from '../config/prisma.js';

export async function adminSummary(req, res) {
  const [products, sales] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.sale.findMany({ select: { actualAmountPaid: true, grossProfit: true, salesVariance: true } })
  ]);
  const inventory = products.map(p => {
    const currentStock = p.openingStock;
    const costValue = currentStock * Number(p.wholesalePrice);
    const retailValue = currentStock * Number(p.retailPrice);
    return { id:p.id,name:p.name,sku:p.sku,currentStock,wholesaleUnitPrice:Number(p.wholesalePrice),retailUnitPrice:Number(p.retailPrice),totalCostValue:costValue,expectedRetailValue:retailValue,expectedProfit:retailValue-costValue,lowStockThreshold:p.lowStockThreshold,outOfStock:currentStock===0,lowStock:currentStock>0&&currentStock<=p.lowStockThreshold };
  });
  const totalRevenue=sales.reduce((n,s)=>n+Number(s.actualAmountPaid),0), totalGrossProfit=sales.reduce((n,s)=>n+Number(s.grossProfit),0), totalVariance=sales.reduce((n,s)=>n+Number(s.salesVariance),0);
  res.json({ metrics:{totalProducts:products.length,totalSales:sales.length,totalRevenue,totalGrossProfit,totalVariance,outOfStockCount:inventory.filter(x=>x.outOfStock).length,lowStockCount:inventory.filter(x=>x.lowStock).length},inventory });
}
