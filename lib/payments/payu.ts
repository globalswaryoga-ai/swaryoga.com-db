import crypto from 'crypto';

export const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').toString().trim();
export const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').toString().trim();

const rawPayuMode = (process.env.PAYU_MODE || 'TEST').toString().trim().toUpperCase();
const productionTokens = ['PRODUCTION', 'PROD', 'LIVE', 'ONLINE', 'ONLIE'];
const isProductionMode = productionTokens.some((token) => rawPayuMode.includes(token));

export const PAYU_MODE = isProductionMode ? 'PRODUCTION' : 'TEST';
export const PAYU_BASE_URL = isProductionMode
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';

// Modern PayU web checkout endpoint.
// (Historically some integrations used /_xclick; PayU's current docs use /_payment.)
export const PAYU_PAYMENT_PATH = '/_payment';

export function getPayUPaymentUrl(): string {
  return `${PAYU_BASE_URL}${PAYU_PAYMENT_PATH}`;
}

// Debug logging
if (typeof window === 'undefined') {
  console.log('🔐 PayU Configuration:', {
    mode: PAYU_MODE,
    baseUrl: PAYU_BASE_URL,
    hasKey: !!PAYU_MERCHANT_KEY,
    hasSalt: !!PAYU_MERCHANT_SALT,
    keyPrefix: PAYU_MERCHANT_KEY?.substring(0, 3),
  });
}

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
  // Validate mandatory parameters before hashing
  const mandatoryFields = {
    key: params.key || PAYU_MERCHANT_KEY,
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
  };

  const missingFields = Object.entries(mandatoryFields)
    .filter(([_, value]) => !value || value.toString().trim() === '')
    .map(([key]) => key);

  if (missingFields.length > 0) {
    console.error('❌ PayU Hash Error: Missing mandatory fields:', missingFields);
    throw new Error(`Cannot generate hash: Missing mandatory fields: ${missingFields.join(', ')}`);
  }

  const key = mandatoryFields.key.toString().trim();
  const salt = PAYU_MERCHANT_SALT.toString().trim();

  if (!salt || salt === '') {
    console.error('❌ PayU Hash Error: PAYU_MERCHANT_SALT is not configured');
    throw new Error('PAYU_MERCHANT_SALT environment variable is not set');
  }

  // PayU hash formula (CORRECT per PayU docs):
  // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  // Note: Only UDF fields 1-5, followed by 6 empty pipes (for udf6-10 placeholders), then SALT
  
  const hashArray = [
    key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 || '',
    params.udf2 || '',
    params.udf3 || '',
    params.udf4 || '',
    params.udf5 || '',
    '', // udf6 empty
    '', // udf7 empty
    '', // udf8 empty
    '', // udf9 empty
    '', // udf10 empty
    salt,
  ];

  const hashString = hashArray.join('|');

  // Enhanced debugging for PayU hash issues (per PayU docs best practices)
  if (process.env.DEBUG_PAYU === '1' || process.env.NODE_ENV === 'development') {
    console.log('\n🔐 ========== PayU Hash Generation Debug ==========');
    console.log('Mode:', PAYU_MODE);
    console.log('\n📋 Parameters (in order):');
    console.log('  [00] key:', key.substring(0, 3) + '***');
    console.log('  [01] txnid:', params.txnid);
    console.log('  [02] amount:', params.amount);
    console.log('  [03] productinfo:', params.productinfo);
    console.log('  [04] firstname:', params.firstname);
    console.log('  [05] email:', params.email.substring(0, 5) + '***');
    console.log('  [06] udf1:', params.udf1 || '(empty)');
    console.log('  [07] udf2:', params.udf2 || '(empty)');
    console.log('  [08] udf3:', params.udf3 || '(empty)');
    console.log('  [09] udf4:', params.udf4 || '(empty)');
    console.log('  [10] udf5:', params.udf5 || '(empty)');
    console.log('  [11-15] udf6-10: (all empty)');
    console.log('  [16] salt:', salt.substring(0, 5) + '***');
    console.log('\n📝 Full hash string (for verification):');
    console.log('  LENGTH:', hashString.length, 'characters');
    console.log('  VALUE:', hashString);
    console.log('🔐 ================================================\n');
  }

  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  // Log hash result
  console.log('🔐 PayU Hash Generated:', {
    mode: PAYU_MODE,
    txnid: params.txnid,
    amount: params.amount,
    hashLength: hash.length,
    hashPrefix: hash.substring(0, 20) + '...',
    status: '✅ Valid',
  });

  return hash;
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

  // Response verification hash formula (CORRECT):
  // salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const udf1 = data[`udf1`] || '';
  const udf2 = data[`udf2`] || '';
  const udf3 = data[`udf3`] || '';
  const udf4 = data[`udf4`] || '';
  const udf5 = data[`udf5`] || '';
  const udf6 = data[`udf6`] || '';
  const udf7 = data[`udf7`] || '';
  const udf8 = data[`udf8`] || '';
  const udf9 = data[`udf9`] || '';
  const udf10 = data[`udf10`] || '';
  
  const hashString = [
    PAYU_MERCHANT_SALT,
    status,
    udf10,
    udf9,
    udf8,
    udf7,
    udf6,
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    PAYU_MERCHANT_KEY,
  ].join('|');

  console.log('🔐 PayU Response Hash String:', hashString);
  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  console.log('🔐 Calculated Hash:', calculatedHash);
  console.log('🔐 Received Hash:', hash);
  console.log('🔐 Match:', calculatedHash.toLowerCase() === hash.toLowerCase());
  
  return calculatedHash.toLowerCase() === hash.toLowerCase();
}
