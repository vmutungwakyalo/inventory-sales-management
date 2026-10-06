const definitions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'OTHER', label: 'Other' }
];

export function getEnabledPaymentMethods() {
  const configured = (process.env.PAYMENT_METHODS || definitions.map(item => item.value).join(','))
    .split(',')
    .map(method => method.trim().toUpperCase());
  const enabled = definitions.filter(item => configured.includes(item.value));
  return enabled.length ? enabled : [definitions[0]];
}