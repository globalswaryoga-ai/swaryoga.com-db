/**
 * @fileoverview PayU Payment Button Helper
 * Generates dynamic Success, Failure, and Cancel URLs for PayU payment buttons
 * 
 * Features:
 * - Dynamic workshop name and amount handling
 * - URL parameter encoding for safe transmission
 * - Support for multiple currencies (INR, USD, NPR)
 * - Query parameter tracking for order details
 */

interface PayUButtonUrlsConfig {
  workshopSlug: string;
  workshopName: string;
  amount: number;
  currency: string;
  orderId?: string;
  mode?: string; // online, offline, residential, recorded
  language?: string;
  scheduleId?: string;
  baseUrl?: string;
}

interface PayUButtonUrls {
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
}

/**
 * Generate Safe URL Parameters
 * Encodes workshop details safely for transmission in URLs
 */
function encodePaymentParams(config: PayUButtonUrlsConfig): string {
  const params = new URLSearchParams({
    workshop: config.workshopSlug,
    name: config.workshopName,
    amount: config.amount.toString(),
    currency: config.currency,
    ...(config.orderId && { orderId: config.orderId }),
    ...(config.mode && { mode: config.mode }),
    ...(config.language && { language: config.language }),
    ...(config.scheduleId && { scheduleId: config.scheduleId }),
  });

  return params.toString();
}

/**
 * Generate PayU Button URLs
 * Creates Success, Failure, and Cancel URLs with dynamic workshop details
 * 
 * @param config - Configuration with workshop details
 * @returns Object with successUrl, failureUrl, cancelUrl
 * 
 * @example
 * const urls = generatePayUButtonUrls({
 *   workshopSlug: 'swar-yoga-level-1',
 *   workshopName: 'Swar Yoga Level-1 Workshop',
 *   amount: 3300,
 *   currency: 'INR',
 *   mode: 'online',
 *   language: 'hindi',
 *   scheduleId: 'o1'
 * });
 * 
 * // Returns:
 * // {
 * //   successUrl: 'https://example.com/payment-success?workshop=swar-yoga-level-1&name=...',
 * //   failureUrl: 'https://example.com/payment-failed?workshop=swar-yoga-level-1&name=...',
 * //   cancelUrl: 'https://example.com/payment-cancelled?workshop=swar-yoga-level-1&name=...'
 * // }
 */
export function generatePayUButtonUrls(config: PayUButtonUrlsConfig): PayUButtonUrls {
  const baseUrl = config.baseUrl || (typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'https://example.com');

  const params = encodePaymentParams(config);

  return {
    successUrl: `${baseUrl}/payment-successful?${params}`,
    failureUrl: `${baseUrl}/payment-failed?${params}`,
    cancelUrl: `${baseUrl}/payment-cancelled?${params}`,
  };
}

/**
 * Parse Payment URL Parameters
 * Extracts workshop details from payment page URLs
 */
export function parsePaymentParams(searchParams: URLSearchParams) {
  return {
    workshopSlug: searchParams.get('workshop') || '',
    workshopName: searchParams.get('name') || '',
    amount: parseFloat(searchParams.get('amount') || '0'),
    currency: searchParams.get('currency') || 'INR',
    orderId: searchParams.get('orderId'),
    mode: searchParams.get('mode'),
    language: searchParams.get('language'),
    scheduleId: searchParams.get('scheduleId'),
  };
}

/**
 * Format Amount for Display
 * Adds currency symbol and formatting
 */
export function formatPaymentAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    NPR: 'Rs',
  };

  const symbol = symbols[currency] || currency;

  if (currency === 'INR') {
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  } else if (currency === 'NPR') {
    return `${symbol}${amount.toLocaleString('en-NP')}`;
  } else {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Generate Order ID for Payment
 * Creates unique transaction ID based on workshop and timestamp
 */
export function generatePaymentOrderId(workshopSlug: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 5);
  return `${workshopSlug.slice(0, 4).toUpperCase()}${timestamp}${random}`.toUpperCase();
}

/**
 * Validate Payment Configuration
 * Checks if config has all required fields
 */
export function validatePaymentConfig(config: Partial<PayUButtonUrlsConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.workshopSlug) errors.push('Workshop slug is required');
  if (!config.workshopName) errors.push('Workshop name is required');
  if (!config.amount || config.amount <= 0) errors.push('Valid amount is required');
  if (!config.currency) errors.push('Currency is required');
  if (!['INR', 'USD', 'NPR'].includes(config.currency || '')) {
    errors.push('Currency must be INR, USD, or NPR');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
