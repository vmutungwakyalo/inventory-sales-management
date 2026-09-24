import { prisma } from '../config/prisma.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function filters(req) {
  const { productId, userId, type, from, to } = req.query;
  const where = {};
  if (productId) where.productId = Number(productId);
  if (userId) where.userId = Number(userId);
  if (type) where.varianceReason = type;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }
  return where;
}

function number(v) { return Number(v || 0); }
function money(v) { return number(v).toFixed(2); }

export async function salesReport(req, res) {
  const sales = await prisma.sale.findMany({ where: filters(req), include: { product: { select: { id: true, name: true, sku: true } }, user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  const totals = sales.reduce((a, s) => { a.quantity += s.quantity; a.expected += number(s.expectedTotal); a.revenue += number(s.actualAmountPaid); a.variance += number(s.salesVariance); a.cogs += number(s.costOfGoodsSold); a.profit += number(s.grossProfit); return a; }, { quantity: 0, expected: 0, revenue: 0, variance: 0, cogs: 0, profit: 0 });
  totals.marginPercent = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;
  res.json({ rows: sales, totals });
}

export async function profitReport(req, res) {
  const sales = await prisma.sale.findMany({ where: filters(req), include: { product: { select: { id: true, name: true, sku: true } } } });
  const map = new Map();
  for (const s of sales) {
    const key = s.productId;
    const row = map.get(key) || { productId: key, product: s.product.name, sku: s.product.sku, quantity: 0, revenue: 0, cogs: 0, profit: 0, variance: 0 };
    row.quantity += s.quantity; row.revenue += number(s.actualAmountPaid); row.cogs += number(s.costOfGoodsSold); row.profit += number(s.grossProfit); row.variance += number(s.salesVariance); map.set(key, row);
  }
  const rows = [...map.values()].map(r => ({ ...r, marginPercent: r.revenue ? r.profit / r.revenue * 100 : 0 }));
  const totals = rows.reduce((a,r) => { a.quantity += r.quantity; a.revenue += r.revenue; a.cogs += r.cogs; a.profit += r.profit; a.variance += r.variance; return a; }, { quantity:0,revenue:0,cogs:0,profit:0,variance:0 });
  totals.marginPercent = totals.revenue ? totals.profit / totals.revenue * 100 : 0;
  res.json({ rows, totals });
}

export async function stockAlerts(req, res) {
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { openingStock: 'asc' } });
  const alerts = products.filter(p => p.openingStock <= p.lowStockThreshold).map(p => ({ id:p.id,name:p.name,sku:p.sku,currentStock:p.openingStock,lowStockThreshold:p.lowStockThreshold,status:p.openingStock===0?'OUT_OF_STOCK':'LOW_STOCK' }));
  res.json(alerts);
}

function csvEscape(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }
function sendCsv(res, filename, columns, rows) {
  const csv = [columns.map(c => csvEscape(c.label)).join(','), ...rows.map(row => columns.map(c => csvEscape(c.value(row))).join(','))].join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition',`attachment; filename="${filename}"`); res.send('\ufeff' + csv);
}

export async function exportSales(req, res) {
  const format = String(req.query.format || 'csv').toLowerCase();
  const sales = await prisma.sale.findMany({ where: filters(req), include: { product:true, user:true }, orderBy:{createdAt:'desc'} });
  const columns = [
    {label:'Sale ID',value:s=>s.id},{label:'Date',value:s=>s.createdAt.toISOString()},{label:'Product',value:s=>s.product.name},{label:'SKU',value:s=>s.product.sku},{label:'User',value:s=>s.user.name},{label:'User Email',value:s=>s.user.email},{label:'Payment Method',value:s=>s.paymentMethod},{label:'M-Pesa Receipt',value:s=>s.mpesaReceiptNumber || ''},{label:'Quantity',value:s=>s.quantity},{label:'Wholesale Unit Price',value:s=>money(s.wholesaleUnitPrice)},{label:'Retail Unit Price',value:s=>money(s.retailUnitPrice)},{label:'Expected Total',value:s=>money(s.expectedTotal)},{label:'Actual Amount Paid',value:s=>money(s.actualAmountPaid)},{label:'Sales Variance',value:s=>money(s.salesVariance)},{label:'Variance Reason',value:s=>s.varianceReason || ''},{label:'Variance Note',value:s=>s.varianceNote || ''},{label:'COGS',value:s=>money(s.costOfGoodsSold)},{label:'Gross Profit',value:s=>money(s.grossProfit)}
  ];
  if (format === 'csv') return sendCsv(res,'sales-transactions.csv',columns,sales);
  if (format === 'xlsx' || format === 'excel') {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Sales'); ws.columns = columns.map(c => ({header:c.label,key:c.label,width:20})); sales.forEach(s => ws.addRow(Object.fromEntries(columns.map(c=>[c.label,c.value(s)])))); ws.getRow(1).font = {bold:true}; res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition','attachment; filename="sales-transactions.xlsx"'); await wb.xlsx.write(res); return res.end();
  }
  if (format === 'pdf') {
    const doc = new PDFDocument({margin:30,size:'A4',layout:'landscape'}); res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','attachment; filename="sales-transactions.pdf"'); doc.pipe(res); doc.fontSize(16).text('Complete Sales Transactions', {align:'center'}).moveDown(); doc.fontSize(8); sales.forEach(s => doc.text(`#${s.id} | ${s.createdAt.toLocaleString()} | ${s.product.name} (${s.product.sku}) | ${s.user.name} | ${s.paymentMethod} | Qty ${s.quantity} | Expected ${money(s.expectedTotal)} | Paid ${money(s.actualAmountPaid)} | Variance ${money(s.salesVariance)} | COGS ${money(s.costOfGoodsSold)} | Profit ${money(s.grossProfit)}`)); doc.end(); return;
  }
  res.status(400).json({message:'Unsupported export format. Use csv, xlsx or pdf.'});
}

export async function exportProfit(req,res) {
  const report = await profitReportData(req);
  const format = String(req.query.format || 'csv').toLowerCase();
  const cols=[{label:'Product',value:r=>r.product},{label:'SKU',value:r=>r.sku},{label:'Quantity',value:r=>r.quantity},{label:'Revenue',value:r=>money(r.revenue)},{label:'COGS',value:r=>money(r.cogs)},{label:'Gross Profit',value:r=>money(r.profit)},{label:'Margin %',value:r=>r.marginPercent.toFixed(2)},{label:'Variance',value:r=>money(r.variance)}];
  if(format==='csv') return sendCsv(res,'profit-report.csv',cols,report.rows);
  if(format==='xlsx'||format==='excel'){const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Profit');ws.columns=cols.map(c=>({header:c.label,key:c.label,width:20}));report.rows.forEach(r=>ws.addRow(Object.fromEntries(cols.map(c=>[c.label,c.value(r)]))));ws.getRow(1).font={bold:true};res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="profit-report.xlsx"');await wb.xlsx.write(res);return res.end();}
  if(format==='pdf'){const doc=new PDFDocument({margin:35,size:'A4'});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="profit-report.pdf"');doc.pipe(res);doc.fontSize(16).text('Profit Report',{align:'center'}).moveDown();doc.fontSize(9);report.rows.forEach(r=>doc.text(`${r.product} (${r.sku}) | Qty ${r.quantity} | Revenue ${money(r.revenue)} | COGS ${money(r.cogs)} | Profit ${money(r.profit)} | Margin ${r.marginPercent.toFixed(2)}%`));doc.end();return;}
  res.status(400).json({message:'Unsupported export format. Use csv, xlsx or pdf.'});
}

async function profitReportData(req){
  const sales=await prisma.sale.findMany({where:filters(req),include:{product:{select:{id:true,name:true,sku:true}}}});const map=new Map();for(const s of sales){const r=map.get(s.productId)||{productId:s.productId,product:s.product.name,sku:s.product.sku,quantity:0,revenue:0,cogs:0,profit:0,variance:0};r.quantity+=s.quantity;r.revenue+=number(s.actualAmountPaid);r.cogs+=number(s.costOfGoodsSold);r.profit+=number(s.grossProfit);r.variance+=number(s.salesVariance);map.set(s.productId,r);}return {rows:[...map.values()].map(r=>({...r,marginPercent:r.revenue?r.profit/r.revenue*100:0}))};
}
