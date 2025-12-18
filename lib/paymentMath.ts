export type CurrencyCode = 'INR' | 'USD' | 'NPR';

const asNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getFxRates = () => {
  // Defaults match existing rough conversions used elsewhere in the app.
  const inrToUsd = asNumber(process.env.NEXT_PUBLIC_INR_TO_USD_RATE, 0.012);
  const inrToNpr = asNumber(process.env.NEXT_PUBLIC_INR_TO_NPR_RATE, 1.6);
  return { inrToUsd, inrToNpr };
};

export function convertAmount(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;

  const { inrToUsd, inrToNpr } = getFxRates();

  // Convert to INR first.
  let inr = amount;
  if (from === 'USD') inr = amount / inrToUsd;
  if (from === 'NPR') inr = amount / inrToNpr;

  // Convert from INR to target.
  if (to === 'INR') return inr;
  if (to === 'USD') return inr * inrToUsd;
  if (to === 'NPR') return inr * inrToNpr;

  return amount;
}

export type ChargeMethod = 'indian' | 'credit_card' | 'international' | 'nepal_qr';

export function getChargeRate(method: ChargeMethod): number {
  switch (method) {
    case 'indian':
      return 0.025;
    case 'credit_card':
      return 0.05;
    case 'international':
      return 0.08;
    case 'nepal_qr':
      return 0;
    default:
      return 0;
  }
}

export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function getCurrencySymbol(curr: CurrencyCode): string {
  switch (curr) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'NPR':
      return 'Rs';
    default:
      return '₹';
  }
}
