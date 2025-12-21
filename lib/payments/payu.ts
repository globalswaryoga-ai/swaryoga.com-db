import crypto from 'crypto';

/**
 * PayU Payment Gateway Configuration
 * Clean, minimal implementation for payment processing
 */

export const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').trim();
export const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').trim();

const rawPayuMode = (process.env.PAYU_MODE || 'TEST').trim().toUpperCase();
const isProductionMode = ['PRODUCTION', 'PROD', 'LIVE', 'ONLINE'].some(token => 
  rawPayuMode.includes(token)
);

export const PAYU_MODE = isProductionMode ? 'PRODUCTION' : 'TEST';
export const PAYU_BASE_URL = isProductionMode 
  ? 'https://secure.payu.in' 
  : 'https://test.payu.in';

export const PAYU_PAYMENT_PATH = '/_payment';

export function getPayUPaymentUrl(): string {
  return `${PAYU_BASE_URL}${PAYU_PAYMENT_PATH}`;
}

if (typeof window === 'undefined') {
  console.log('✅ PayU:', { mode: PAYU_MODE, url: PAYU_BASE_URL });
}

/**
 * Generate PayU hash for payment form
 * Formula: key|txnid|amount|productinfo|firstname|email|||||||||||||salt
 */
export function generatePayUHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
}): string {
  const hashArray = [
    params.key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    '', '', '', '', '', '', '', '', '', '',
    PAYU_MERCHANT_SALT
  ];

  const hashString = hashArray.join('|');
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

/**
 * Verify PayU callback hash
 */
export function verifyPayUHash(
  txnid: string,
  amount: string,
  status: string,
  hash: string
): boolean {
  const hashArray = [
    PAYU_MERCHANT_SALT,
    status,
    txnid,
    amount,
    '', '', '', '', '', '', '', '', '', '',
    ''
  ];

  const hashString = hashArray.join('|');
  const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  return generatedHash === hash;
}
