const environment = process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox';
const baseUrl = environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing M-Pesa configuration: ${name}.`);
  return value;
}

function timestamp() {
  const now = new Date();
  const parts = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()];
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^07\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^01\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  throw new Error('Enter a valid Kenyan M-Pesa phone number.');
}

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok || body.errorCode) throw new Error(body.errorMessage || body.error_description || 'M-Pesa request failed.');
  return body;
}

export async function requestStkPush({ phoneNumber, amount, accountReference }) {
  const consumerKey = required('MPESA_CONSUMER_KEY');
  const consumerSecret = required('MPESA_CONSUMER_SECRET');
  const shortCode = required('MPESA_SHORTCODE');
  const passKey = required('MPESA_PASSKEY');
  const callbackUrl = required('MPESA_CALLBACK_URL');
  const transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';
  const partyB = required('MPESA_PARTY_B');
  if (!['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'].includes(transactionType)) {
    throw new Error('MPESA_TRANSACTION_TYPE must be CustomerPayBillOnline or CustomerBuyGoodsOnline.');
  }
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const token = await jsonFetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  const time = timestamp();
  const password = Buffer.from(`${shortCode}${passKey}${time}`).toString('base64');
  return jsonFetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: shortCode, Password: password, Timestamp: time, TransactionType: transactionType, Amount: Math.round(amount), PartyA: normalizePhone(phoneNumber), PartyB: partyB, PhoneNumber: normalizePhone(phoneNumber), CallBackURL: callbackUrl, AccountReference: accountReference, TransactionDesc: 'Inventory sale' })
  });
}

export { normalizePhone };