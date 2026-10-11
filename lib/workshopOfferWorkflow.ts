export function offerAmount(value: unknown) {
  const text = String(value ?? '').trim().replace(/^(?:₹|INR)\s*/i, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Enter a valid amount with at most two decimal places');
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Received amount must be greater than zero');
  return amount;
}

export function validateOfferTransition(previous: Record<string, unknown>, patch: Record<string, unknown>) {
  if (previous.receiptNumber && ['amount', 'date', 'paymentMode'].some(key => key in patch && patch[key] !== previous[key])) {
    throw new Error('Payment fields are locked after receipt creation; use an audited correction instead');
  }
  const next = { ...previous, ...patch };
  if (next.status !== undefined && !['pending', 'received'].includes(String(next.status))) throw new Error('Invalid payment status');
  for (const key of ['pushedToReceipts', 'pushedToCreateReceipts']) {
    if (next[key] !== undefined && typeof next[key] !== 'boolean') throw new Error('Invalid payment queue flag');
  }
  if (previous.receiptNumber && next.status !== 'received') throw new Error('A receipted payment cannot be unconfirmed');
  if (next.status === 'received' || next.pushedToCreateReceipts) {
    offerAmount(next.amount);
    const date = new Date(`${next.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(next.date || '')) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== next.date) throw new Error('Select a valid payment date');
    if (!['upi', 'bank', 'bank_transfer', 'cash', 'card', 'other'].includes(String(next.paymentMode))) throw new Error('Select the payment mode');
  }
  if (next.pushedToCreateReceipts && next.status !== 'received') throw new Error('Confirm the payment before creating a receipt');
  return next;
}
