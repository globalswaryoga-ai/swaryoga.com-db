import crypto from 'crypto';

export const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || '';
export const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT || '';

const rawPayuMode = (process.env.PAYU_MODE || 'TEST').toString().trim().toUpperCase();
const productionTokens = ['PRODUCTION', 'PROD', 'LIVE', 'ONLINE', 'ONLIE'];
const isProductionMode = productionTokens.some((token) => rawPayuMode.includes(token));

export const PAYU_MODE = isProductionMode ? 'PRODUCTION' : 'TEST';
export const PAYU_BASE_URL = isProductionMode
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';

export interface PayUParams {
  key?: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  surl: string;
  furl: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

export function generatePayUHash(params: PayUParams): string {
  const hashString = `${PAYU_MERCHANT_KEY}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${PAYU_MERCHANT_SALT}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

export function verifyPayUResponseHash(data: Record<string, string>): boolean {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    hash,
    status
  } = data;

  const hashString = `${PAYU_MERCHANT_SALT}|${status}|||||||||||${PAYU_MERCHANT_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}`;
  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

  return calculatedHash === hash;
}
