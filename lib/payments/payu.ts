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
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
}

export function generatePayUHash(params: PayUParams): string {
  const key = (params.key || PAYU_MERCHANT_KEY).toString();
  const udf = [
    params.udf1 || '',
    params.udf2 || '',
    params.udf3 || '',
    params.udf4 || '',
    params.udf5 || '',
    params.udf6 || '',
    params.udf7 || '',
    params.udf8 || '',
    params.udf9 || '',
    params.udf10 || '',
  ];
  const hashString = [
    key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    ...udf,
    PAYU_MERCHANT_SALT,
  ].join('|');
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

  if (!hash || !status || !txnid || !amount || !productinfo || !firstname || !email) {
    return false;
  }

  // Response verification hash sequence:
  // salt|status|udf10|udf9|...|udf1|email|firstname|productinfo|amount|txnid|key
  const udf = Array.from({ length: 10 }, (_, idx) => data[`udf${idx + 1}`] || '');
  const hashString = [
    PAYU_MERCHANT_SALT,
    status,
    ...udf.reverse(),
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    PAYU_MERCHANT_KEY,
  ].join('|');

  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return calculatedHash.toLowerCase() === hash.toLowerCase();
}
