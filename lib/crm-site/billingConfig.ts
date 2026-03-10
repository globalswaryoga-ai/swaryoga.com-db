/**
 * CRM Storage & Billing Configuration
 * 
 * Storage Pricing:
 * - All plans: minimum 500MB at ₹30/month
 * - Everyone must buy storage (required for all plans)
 * - Paid users: purchased data calculated monthly, remaining balance rolls over
 * 
 * Payment Methods:
 * - UPI (PhonePe, Google Pay, Paytm)
 * - Cards (Credit/Debit)
 * - Auto-pay subscriptions
 */

export const STORAGE_PRICING = {
  free: {
    minStorageMB: 1024,
    pricePerGB: 60, // ₹60/GB (₹30/500MB)
    pricePerGBUSD: 1, // $1/GB/month for out of India
    minPrice: 30,   // ₹30 minimum for 1GB/month
    minPriceUSD: 1, // $1 minimum for 1GB/month
    billing: 'monthly' as const,
  },
  basic: {
    minStorageMB: 500,
    pricePerGB: 50, // ₹50/1GB
    minPrice: 30,   // ₹30 minimum for 500MB/month
    billing: 'monthly' as const,
  },
  starter: {
    minStorageMB: 500,
    pricePerGB: 35, // ₹35/GB
    minPrice: 30,
    billing: 'monthly' as const,
  },
  growth: {
    minStorageMB: 500,
    pricePerGB: 35,
    minPrice: 30,
    billing: 'monthly' as const,
  },
  professional: {
    minStorageMB: 500,
    pricePerGB: 35,
    minPrice: 30,
    billing: 'monthly' as const,
  },
};

/**
 * Balance rollover policy for paid users:
 * - Purchased storage is calculated monthly
 * - Unused balance from current month transfers to next month
 * - Rollover applies only to paid plans (basic+)
 */
export const ROLLOVER_POLICY = {
  enabled: true,
  maxRolloverMonths: 3,  // Balance can accumulate up to 3 months
  appliesTo: ['basic', 'starter', 'growth', 'professional'],
};

/** Custom domain add-on */
export const CUSTOM_DOMAIN_ADDON = {
  price: 999,          // ₹999 one-time
  currency: 'INR',
  description: 'Connect your own domain to CRM',
  availableForAll: true, // Any plan can purchase
};

export const PLAN_PRICING = {
  free: { monthly: 0, quarterly: 0, annual: 0, name: 'Free Plan' },
  basic: { monthly: 999, quarterly: 2997, annual: 9990, name: 'Basic Plan' },
  starter: { monthly: 1999, quarterly: 5997, annual: 19990, name: 'Starter Plan' },
  growth: { monthly: 4999, quarterly: 14997, annual: 49990, name: 'Growth Plan' },
  professional: { monthly: 9999, quarterly: 29997, annual: 99990, name: 'Professional Plan' },
};

export const PAYMENT_METHODS = {
  upi: {
    id: 'upi',
    name: 'UPI',
    description: 'Pay using PhonePe, Google Pay, Paytm, or any UPI app',
    icons: ['phonepe', 'gpay', 'paytm'],
    supportsAutopay: true,
  },
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, Rupay - auto-pay enabled',
    icons: ['visa', 'mastercard', 'rupay'],
    supportsAutopay: true,
  },
  netbanking: {
    id: 'netbanking',
    name: 'Net Banking',
    description: 'All major banks supported',
    icons: ['bank'],
    supportsAutopay: false,
  },
};

export const BILLING_CONFIG = {
  confirmationEmail: 'mohan@swaryoga.com',
  supportEmail: 'support@swaryoga.com',
  supportPhone: '+91 9779006820',
  supportWhatsApp: 'https://wa.me/919779006820',
  currency: 'INR',
  gstRate: 18, // 18% GST
};

/**
 * Calculate storage cost for a plan
 */
export function calculateStorageCost(plan: string, storageMB: number): number {
  const pricing = STORAGE_PRICING[plan as keyof typeof STORAGE_PRICING] || STORAGE_PRICING.starter;
  const storageGB = Math.max(storageMB / 1024, pricing.minStorageMB / 1024);
  return Math.max(Math.ceil(storageGB * pricing.pricePerGB), pricing.minPrice);
}

/**
 * Calculate total monthly cost
 */
export function calculateTotalMonthlyCost(
  plan: string,
  billing: 'monthly' | 'quarterly' | 'annual',
  additionalStorageGB: number = 0
): { planCost: number; storageCost: number; total: number; gst: number; grandTotal: number } {
  const planPricing = PLAN_PRICING[plan as keyof typeof PLAN_PRICING] || PLAN_PRICING.free;
  const storagePricing = STORAGE_PRICING[plan as keyof typeof STORAGE_PRICING] || STORAGE_PRICING.starter;
  
  const planCost = planPricing[billing] || planPricing.monthly;
  const storageCost = additionalStorageGB > 0 
    ? Math.ceil(additionalStorageGB * storagePricing.pricePerGB)
    : storagePricing.minPrice;
  
  const total = planCost + storageCost;
  const gst = Math.ceil(total * BILLING_CONFIG.gstRate / 100);
  const grandTotal = total + gst;
  
  return { planCost, storageCost, total, gst, grandTotal };
}
