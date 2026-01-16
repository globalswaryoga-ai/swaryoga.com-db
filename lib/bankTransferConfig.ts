/**
 * Bank Account Configuration
 * Used for Bank Transfer Payment Option
 * 
 * Beneficiary: MOHAN PANDURANG KALBURGI
 * Bank: Axis Bank Ltd – Sangamner Branch
 */

export const BANK_ACCOUNT_DETAILS = {
  beneficiaryName: 'MOHAN PANDURANG KALBURGI',
  bank: 'Axis Bank Ltd',
  branch: 'Sangamner Branch',
  ifscCode: 'UTIB0001516',
  swiftCode: 'AXISINBB',
  address: 'Ward No. 2, Gulab Shree Bungalow, Kolhewadi Rd, Shivajinagar, Sangamner, Dist. Ahmednagar, Maharashtra, India – 422605',
  purpose: 'Payment for Swar Yoga Workshops',
} as const;

/**
 * WhatsApp Configuration for Payment Confirmation
 * Update the phone number below to your WhatsApp Business number
 */
export const WHATSAPP_CONFIG = {
  phoneNumber: '919876543210', // Change this to your actual WhatsApp number (country code + number without +)
  confirmationMessage: 'I have completed the bank transfer for Swar Yoga Workshops. Please find the transaction screenshot attached.',
} as const;

/**
 * Payment Method Configuration
 */
export const PAYMENT_METHODS = {
  CASHFREE: {
    id: 'cashfree',
    name: 'Cashfree Payment Gateway',
    description: 'UPI, Cards, Wallets & More',
    icon: '🔒',
    enabled: true,
  },
  BANK_TRANSFER: {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct bank transfer to our account',
    icon: '🏦',
    enabled: true,
  },
} as const;

/**
 * Helper function to format bank account details for display
 */
export function formatBankDetails() {
  return `
Beneficiary Name: ${BANK_ACCOUNT_DETAILS.beneficiaryName}
Bank: ${BANK_ACCOUNT_DETAILS.bank} – ${BANK_ACCOUNT_DETAILS.branch}
IFSC Code: ${BANK_ACCOUNT_DETAILS.ifscCode}
SWIFT Code: ${BANK_ACCOUNT_DETAILS.swiftCode}
Address: ${BANK_ACCOUNT_DETAILS.address}
Purpose: ${BANK_ACCOUNT_DETAILS.purpose}
  `.trim();
}

/**
 * Generate WhatsApp message link
 */
export function getWhatsAppLink(message?: string) {
  const baseUrl = 'https://wa.me';
  const phone = WHATSAPP_CONFIG.phoneNumber;
  const msg = encodeURIComponent(message || WHATSAPP_CONFIG.confirmationMessage);
  return `${baseUrl}/${phone}?text=${msg}`;
}

/**
 * Generate WhatsApp confirmation message with order details
 */
export function generateConfirmationMessage(orderId: string, amount: number, email: string) {
  return `I have completed the bank transfer for Swar Yoga Workshops.\n\nOrder ID: ${orderId}\nAmount: ₹${amount}\nEmail: ${email}\n\nPlease find the transaction screenshot attached.`;
}
