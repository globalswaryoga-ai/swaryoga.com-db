/**
 * CRM Storage & Billing Configuration
 * 
 * Storage Pricing:
 * - Free plan: ₹30/500MB (minimum required)
 * - Basic (₹999): ₹50/1GB
 * - Starter (₹1,999+): ₹35/GB per month
 * 
 * Payment Methods:
 * - UPI (PhonePe, Google Pay, Paytm)
 * - Cards (Credit/Debit)
 * - Auto-pay subscriptions
 */

export const STORAGE_PRICING = {
  free: {
    minStorageMB: 500,
    pricePerGB: 60, // ₹30/500MB = ₹60/GB
    minPrice: 30,   // ₹30 minimum for 500MB
  },
  basic: {
    minStorageMB: 1000,
    pricePerGB: 50, // ₹50/1GB
    minPrice: 50,
  },
  starter: {
    minStorageMB: 1000,
    pricePerGB: 35, // ₹35/GB
    minPrice: 35,
  },
  growth: {
    minStorageMB: 1000,
    pricePerGB: 35,
    minPrice: 35,
  },
  professional: {
    minStorageMB: 1000,
    pricePerGB: 35,
    minPrice: 35,
  },
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
