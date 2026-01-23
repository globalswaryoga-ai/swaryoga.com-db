/**
 * Investment System Constants & Enums
 * All configuration, status values, and calculation constants
 */

// ============ ENTITIES ============
export const ENTITIES = {
  SWAR_SAKSHI: 'swar-sakshi',
  UPAMANYU: 'upamanyu',
} as const;

export const ENTITY_NAMES = {
  [ENTITIES.SWAR_SAKSHI]: 'Swar Sakshi International Yoga & Naturopathy',
  [ENTITIES.UPAMANYU]: 'Upamanyu International Education Pvt. Ltd.',
} as const;

export const ENTITY_DESCRIPTIONS = {
  [ENTITIES.SWAR_SAKSHI]: 'Proprietorship - Interest-based Investment',
  [ENTITIES.UPAMANYU]: 'Private Limited - Equity & Preference Shares',
} as const;

// ============ SHARE TYPES ============
export const SHARE_TYPES = {
  EQUITY: 'equity',
  PREFERENCE: 'preference',
} as const;

export const SHARE_TYPE_NAMES = {
  [SHARE_TYPES.EQUITY]: 'Equity Shares',
  [SHARE_TYPES.PREFERENCE]: 'Preference Shares (12% Fixed)',
} as const;

// ============ USER ROLES ============
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  CS: 'cs', // Customer Success
  CA: 'ca', // Chartered Accountant
} as const;

// ============ INVESTMENT STATUS WORKFLOW ============
export const INVESTMENT_STATUS = {
  SUBMITTED: 'submitted',
  ADMIN_APPROVED_1: 'admin_approved_1',
  KYC_PENDING: 'kyc_pending',
  KYC_UPLOADED: 'kyc_uploaded',
  PAYMENT_1_DONE: 'payment_1_done',
  ADMIN_APPROVED_2: 'admin_approved_2',
  FINAL_PAYMENT_DONE: 'final_payment_done',
  CERTIFICATE_ISSUED: 'certificate_issued',
} as const;

export const STATUS_LABELS = {
  [INVESTMENT_STATUS.SUBMITTED]: '📝 Submitted',
  [INVESTMENT_STATUS.ADMIN_APPROVED_1]: '✅ Admin Approved Step 1',
  [INVESTMENT_STATUS.KYC_PENDING]: '🔍 KYC Pending',
  [INVESTMENT_STATUS.KYC_UPLOADED]: '📤 KYC Uploaded',
  [INVESTMENT_STATUS.PAYMENT_1_DONE]: '💳 Verification Payment Done',
  [INVESTMENT_STATUS.ADMIN_APPROVED_2]: '✅ Admin Approved Step 2',
  [INVESTMENT_STATUS.FINAL_PAYMENT_DONE]: '💰 Final Payment Done',
  [INVESTMENT_STATUS.CERTIFICATE_ISSUED]: '🎖️ Certificate Issued',
} as const;

export const STATUS_COLORS = {
  [INVESTMENT_STATUS.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [INVESTMENT_STATUS.ADMIN_APPROVED_1]: 'bg-green-100 text-green-800',
  [INVESTMENT_STATUS.KYC_PENDING]: 'bg-orange-100 text-orange-800',
  [INVESTMENT_STATUS.KYC_UPLOADED]: 'bg-purple-100 text-purple-800',
  [INVESTMENT_STATUS.PAYMENT_1_DONE]: 'bg-indigo-100 text-indigo-800',
  [INVESTMENT_STATUS.ADMIN_APPROVED_2]: 'bg-green-100 text-green-800',
  [INVESTMENT_STATUS.FINAL_PAYMENT_DONE]: 'bg-green-100 text-green-800',
  [INVESTMENT_STATUS.CERTIFICATE_ISSUED]: 'bg-green-100 text-green-800',
} as const;

// ============ PAYMENT TYPES ============
export const PAYMENT_TYPES = {
  VERIFICATION: 'verification',
  FINAL: 'final',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

// ============ CALCULATION CONSTANTS ============
export const CALCULATION = {
  VERIFICATION_AMOUNT: 1, // ₹1 for verification
  PREFERENCE_DIVIDEND_RATE: 0.12, // 12%
  EQUITY_ANNUAL_RATE: 0.10, // 10%
} as const;

// ============ SWAR SAKSHI INVESTMENT STRUCTURE ============
export const SWAR_SAKSHI_INVESTMENT = {
  // FIXED DIVIDEND
  FIXED_DIVIDEND_RATE: 0.12, // 12% per year (fixed, no variation)
  DIVIDEND_FREQUENCY: 'annual', // Paid annually
  
  // INVESTMENT LIMITS
  MINIMUM_AMOUNT: 15000, // Minimum ₹15,000
  MAXIMUM_AMOUNT: null, // No upper limit
  
  // REFUND RULES
  EARLY_REFUND_ALLOWED: false, // Cannot refund before due date
  REFUND_ONLY_AT_MATURITY: true, // Only at maturity/due date
  
  // INVESTMENT DURATION
  MINIMUM_DURATION_MONTHS: 12, // Minimum 1 year
  MAXIMUM_DURATION_YEARS: null, // No upper limit
  
  // CALCULATION METHOD
  DEFAULT_CALCULATION_METHOD: 'simple', // Simple interest (12% fixed)
  ALLOW_COMPOUND_INTEREST: false, // Fixed 12% dividend, no compounding option
} as const;

// ============ UPAMANYU SHARE STRUCTURE ============
export const UPAMANYU_SHARES = {
  // EQUITY SHARES (LOT BASED)
  EQUITY_SHARE_PRICE: 110, // ₹110 per share (updated quarterly by CA)
  EQUITY_SHARES_PER_LOT: 110, // 110 shares = 1 lot
  EQUITY_LOT_PRICE: 12100, // 110 shares × ₹110 = ₹12,100 per lot
  
  // PREFERENCE SHARES
  PREFERENCE_SHARE_PRICE: 10, // ₹10 per share (fixed)
  PREFERENCE_DIVIDEND_RATE: 0.12, // 12% p.a. (fixed)
  PREFERENCE_REDEMPTION_PERIOD: 10, // 10 years
  
  // DIVIDEND ELIGIBILITY
  DIVIDEND_ELIGIBILITY_MONTHS: 12, // Must hold for 12 months to get dividend (equity only)
  PRICE_UPDATE_FREQUENCY: 'quarterly', // Updated every 3 months by CA
  
  // EQUITY SPECIFIC
  EQUITY_DIVIDEND_RATE: 0.10, // 10% p.a. (for equity holders after 1 year)
  EQUITY_DIVIDEND_ELIGIBILITY_MONTHS: 12, // 1 year holding period
} as const;

// ============ THEME COLORS ============
export const THEME_COLORS = {
  WHITE: '#FFFFFF',
  GREEN: '#22C55E',
  RED: '#EF4444',
  BLUE: '#1D4ED8',
  ORANGE: '#F97316',
} as const;

export const BUTTON_STYLES = {
  GREEN: 'bg-green-500 hover:bg-green-600 text-white',
  BLUE: 'bg-blue-600 hover:bg-blue-700 text-white',
  RED: 'bg-red-500 hover:bg-red-600 text-white',
  ORANGE: 'bg-orange-500 hover:bg-orange-600 text-white',
} as const;

// ============ FILE UPLOAD LIMITS ============
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

// ============ S3 PATHS ============
export const S3_PATHS = {
  INVESTMENTS: (investmentId: string) => `swarayoga/investments/${investmentId}`,
  KYC: (investmentId: string) => `swarayoga/investments/${investmentId}/kyc`,
  CERTIFICATES: (investmentId: string) => `swarayoga/investments/${investmentId}/certificate`,
  DOCUMENTS: (investmentId: string) => `swarayoga/investments/${investmentId}/documents`,
} as const;

// ============ WORKFLOW STAGE LABELS ============
export const WORKFLOW_STAGES = [
  { step: 1, label: 'Investment Submission', status: INVESTMENT_STATUS.SUBMITTED },
  { step: 2, label: 'Admin Approval', status: INVESTMENT_STATUS.ADMIN_APPROVED_1 },
  { step: 3, label: 'KYC Upload', status: INVESTMENT_STATUS.KYC_PENDING },
  { step: 4, label: 'KYC Verification', status: INVESTMENT_STATUS.KYC_UPLOADED },
  { step: 5, label: 'Verification Payment', status: INVESTMENT_STATUS.PAYMENT_1_DONE },
  { step: 6, label: 'Final Admin Approval', status: INVESTMENT_STATUS.ADMIN_APPROVED_2 },
  { step: 7, label: 'Final Payment', status: INVESTMENT_STATUS.FINAL_PAYMENT_DONE },
  { step: 8, label: 'Certificate Generation', status: INVESTMENT_STATUS.CERTIFICATE_ISSUED },
] as const;

// ============ KYC DOCUMENT TYPES ============
export const KYC_DOCUMENTS = {
  AADHAR: 'aadhar',
  PAN: 'pan',
  BANK: 'bank',
} as const;

export const KYC_DOCUMENT_LABELS = {
  [KYC_DOCUMENTS.AADHAR]: 'Aadhar Card',
  [KYC_DOCUMENTS.PAN]: 'PAN Card',
  [KYC_DOCUMENTS.BANK]: 'Bank Passbook/Statement',
} as const;

// ============ REFUND RULES ============
export const REFUND_RULES = {
  EARLY_REFUND_BLOCKED: 'early_refund_blocked',
  REFUND_AT_MATURITY: 'refund_at_maturity',
} as const;

export const REFUND_RULE_LABELS = {
  [REFUND_RULES.EARLY_REFUND_BLOCKED]: 'Cannot refund before due date',
  [REFUND_RULES.REFUND_AT_MATURITY]: 'Refund only at maturity',
} as const;
