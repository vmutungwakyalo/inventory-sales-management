import React, { useEffect, useState } from 'react';
import { api } from './services/api';

const money = value => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function UserDashboard({ user, logout }) {
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([{ value: 'CASH', label: 'Cash' }]);
  const [form, setForm] = useState({ productId: '', quantity: 1, actualAmountPaid: '', paymentMethod: 'CASH', phoneNumber: '' });
  const [search, setSearch] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    const [{ data: productData }, { data: paymentData }] = await Promise.all([api.get('/products'), api.get('/config/payment-methods')]);
    setProducts(productData);
    setPaymentMethods(paymentData.methods);
    setForm(current => paymentData.methods.some(method => method.value === current.paymentMethod) ? current : { ...current, paymentMethod: paymentData.methods[0].value });
  }

  useEffect(() => {
    loadProducts()
      .catch(error => setMessage(error.response?.data?.message || 'Could not load products.'))
      .finally(() => setLoading(false));
  }, []);

  const product = products.find(item => item.id === Number(form.productId));
  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter(item => !query || item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query));
  const expected = product ? Number(form.quantity || 0) * Number(product.retailPrice) : 0;
  const actual = Number(form.actualAmountPaid || 0);
  const variance = actual - expected;

  async function sell(event) {
    event.preventDefault();
    if (submitting) return;
    setMessage('');

    const body = {
      ...form,
      productId: Number(form.productId),
      quantity: Number(form.quantity),
      actualAmountPaid: actual
    };

    if (variance !== 0) body.varianceReason = varianceReason;

    setSubmitting(true);
    try {
      let data;
      if (form.paymentMethod === 'MPESA') {
        const started = await api.post('/sales/mpesa/stk-push', body);
        setMessage(started.data.message);
        let payment;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          payment = (await api.get(`/sales/mpesa/${started.data.paymentId}`)).data;
          if (payment.status !== 'PENDING') break;
        }
        if (!payment || payment.status !== 'COMPLETED') throw new Error(payment?.resultDescription || 'M-Pesa payment was not completed.');
        data = { sale: payment.sale, stockAfter: product.openingStock - Number(form.quantity) };
      } else {
        data = (await api.post('/sales', body)).data;
      }
      setMessage(`Sale recorded. Remaining stock: ${data.stockAfter}.`);
      setForm({ productId: '', quantity: 1, actualAmountPaid: '', paymentMethod: 'CASH', phoneNumber: '' });
      setSearch('');
      setVarianceReason('');
      setReceipt({ sale: data.sale, product, stockAfter: data.stockAfter });
      await loadProducts();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Sale failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="app">
    <header className="topbar"><div><strong>Inventory & Sales</strong><span>Sales Dashboard</span></div><div>{user.name} <button onClick={logout}>Logout</button></div></header>
    <main className="content narrow"><section className="panel"><h2>Record Sale</h2>
      {loading ? <p className="loading">Loading products...</p> : <form onSubmit={sell}>
        <label>Search product<input type="search" placeholder="Name or SKU" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label>Product<select required value={form.productId} onChange={event => setForm({ ...form, productId: event.target.value })}><option value="">Select product</option>{visibleProducts.map(item => <option disabled={!item.active || item.openingStock === 0} key={item.id} value={item.id}>{item.name} ({item.sku}) - {item.openingStock} units - {money(item.retailPrice)}</option>)}</select></label>
        {product && <div className={product.openingStock === 0 ? 'alert danger' : 'alert'}>{product.openingStock === 0 ? 'OUT OF STOCK - 0 UNITS REMAINING' : `Available: ${product.openingStock} units | Unit retail price: ${money(product.retailPrice)}`}</div>}
        <label>Quantity<input required type="number" min="1" max={product?.openingStock || undefined} value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} /></label>
        <label>Expected total<input readOnly value={money(expected)} /></label>
        <label>Actual amount paid<input required type="number" step="0.01" min="0" value={form.actualAmountPaid} onChange={event => setForm({ ...form, actualAmountPaid: event.target.value })} /></label>
        {form.actualAmountPaid !== '' && <div className={variance === 0 ? 'alert' : 'alert warning'}>Variance: {money(variance)} {variance !== 0 && '(reason required)'}</div>}
        {variance !== 0 && <label>Variance reason<select required value={varianceReason} onChange={event => setVarianceReason(event.target.value)}><option value="">Select reason</option><option value="DISCOUNT">Discount</option><option value="ERROR">Error</option><option value="NEGOTIATION">Negotiation</option><option value="FRAUD">Fraud</option><option value="OTHER">Other</option></select></label>}
        <label>Payment method<select value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value })}>{paymentMethods.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
        {form.paymentMethod === 'MPESA' && <label>M-Pesa phone number<input required placeholder="07XXXXXXXX" value={form.phoneNumber} onChange={event => setForm({ ...form, phoneNumber: event.target.value })} /></label>}
        <button type="submit" disabled={submitting}>{submitting ? (form.paymentMethod === 'MPESA' ? 'Waiting for M-Pesa...' : 'Recording...') : 'Record Sale'}</button>
        {message && <p>{message}</p>}
          {receipt && <div className="alert"><strong>Receipt ready</strong><button type="button" onClick={() => printReceipt(receipt)}>Print receipt</button></div>}
      </form>}
    </section></main>
  </div>;
}

function printReceipt({ sale, product, stockAfter }) {
  const receiptWindow = window.open('', '_blank', 'width=420,height=640');
  if (!receiptWindow) return;
  receiptWindow.document.write(`<html><head><title>Sale Receipt</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px}p{margin:8px 0}.total{font-size:18px;font-weight:bold;border-top:1px solid #999;padding-top:12px}</style></head><body><h1>Inventory &amp; Sales</h1><p>Receipt #${sale.id}</p><p>${new Date(sale.createdAt || Date.now()).toLocaleString()}</p><p>Product: ${escapeReceiptText(product.name)} (${escapeReceiptText(product.sku)})</p><p>Quantity: ${sale.quantity}</p><p>Payment method: ${escapeReceiptText(sale.paymentMethod || 'CASH')}</p>${sale.mpesaReceiptNumber ? `<p>M-Pesa receipt: ${escapeReceiptText(sale.mpesaReceiptNumber)}</p>` : ''}<p>Amount paid: ${money(sale.actualAmountPaid)}</p><p class="total">Total: ${money(sale.actualAmountPaid)}</p><p>Remaining stock: ${stockAfter}</p></body></html>`);
  receiptWindow.document.close();
  receiptWindow.focus();
  receiptWindow.print();
}

function escapeReceiptText(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
