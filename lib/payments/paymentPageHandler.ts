/**
 * @fileoverview Payment Page Handler Helper
 * 
 * Provides utilities to handle payment success, failure, and cancel pages
 * Extracts workshop details from URL parameters
 * 
 * Usage in pages:
 * - /app/payment-successful/page.tsx
 * - /app/payment-failed/page.tsx
 * - /app/payment-cancelled/page.tsx
 */

import { parsePaymentParams, formatPaymentAmount } from './payuButtonHelper';

/**
 * Parse payment redirect parameters from URL
 * 
 * @example
 * const params = parsePaymentUrlParams(searchParams);
 * // Returns:
 * // {
 * //   workshopSlug: 'swar-yoga-level-1',
 * //   workshopName: 'Swar Yoga Level-1 Workshop',
 * //   amount: 3300,
 * //   currency: 'INR',
 * //   mode: 'online',
 * //   language: 'hindi',
 * //   scheduleId: 'o1'
 * // }
 */
export function parsePaymentUrlParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>) {
  if (searchParams instanceof URLSearchParams) {
    return parsePaymentParams(searchParams);
  }

  // Convert Next.js searchParams to URLSearchParams
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      params.set(key, value[0] || '');
    }
  });
  return parsePaymentParams(params);
}

/**
 * Get formatted display text for payment page
 */
export function getPaymentDisplayText(
  workshopName: string,
  amount: number,
  currency: string
) {
  return {
    title: workshopName,
    amountText: formatPaymentAmount(amount, currency),
    fullText: `${workshopName} - ${formatPaymentAmount(amount, currency)}`,
  };
}

/**
 * Payment Success Page Handler
 * 
 * @example
 * import { handlePaymentSuccess } from '@/lib/payments/paymentPageHandler';
 * 
 * export default function PaymentSuccessfulPage({ searchParams }) {
 *   const { workshopSlug, workshopName, amount, currency } = handlePaymentSuccess(searchParams);
 *   
 *   return (
 *     <div>
 *       <h1>Payment Successful!</h1>
 *       <p>{workshopName} - {amount} {currency}</p>
 *       // Enrollment triggered, email sent, etc.
 *     </div>
 *   );
 * }
 */
export function handlePaymentSuccess(searchParams?: Record<string, string | string[] | undefined>) {
  const params = parsePaymentUrlParams(searchParams || {});

  return {
    ...params,
    display: getPaymentDisplayText(params.workshopName, params.amount, params.currency),
    pageType: 'success' as const,
  };
}

/**
 * Payment Failure Page Handler
 * 
 * @example
 * export default function PaymentFailedPage({ searchParams }) {
 *   const { workshopName, amount, currency } = handlePaymentFailure(searchParams);
 *   
 *   return (
 *     <div>
 *       <h1>Payment Failed</h1>
 *       <p>Your payment for {workshopName} could not be processed.</p>
 *       <button>Retry Payment</button>
 *     </div>
 *   );
 * }
 */
export function handlePaymentFailure(searchParams?: Record<string, string | string[] | undefined>) {
  const params = parsePaymentUrlParams(searchParams || {});

  return {
    ...params,
    display: getPaymentDisplayText(params.workshopName, params.amount, params.currency),
    pageType: 'failure' as const,
  };
}

/**
 * Payment Cancel Page Handler
 * 
 * @example
 * export default function PaymentCancelledPage({ searchParams }) {
 *   const { workshopName, amount, currency } = handlePaymentCancel(searchParams);
 *   
 *   return (
 *     <div>
 *       <h1>Payment Cancelled</h1>
 *       <p>You have cancelled the payment for {workshopName}.</p>
 *       <button>Try Again</button>
 *     </div>
 *   );
 * }
 */
export function handlePaymentCancel(searchParams?: Record<string, string | string[] | undefined>) {
  const params = parsePaymentUrlParams(searchParams || {});

  return {
    ...params,
    display: getPaymentDisplayText(params.workshopName, params.amount, params.currency),
    pageType: 'cancel' as const,
  };
}

/**
 * Payment Status Page Content Provider
 * Provides consistent messaging across all payment pages
 */
export const PaymentPageMessages = {
  success: {
    title: '✅ Payment Successful!',
    subtitle: 'Your payment has been processed successfully.',
    message: (name: string, amount: string) =>
      `Thank you for enrolling in ${name}. You will receive a confirmation email shortly with your login credentials.`,
    cta: 'View My Enrollment',
    ctaUrl: '/my-workshops',
  },
  failure: {
    title: '❌ Payment Failed',
    subtitle: 'We could not process your payment.',
    message: (name: string) =>
      `Your payment for ${name} could not be completed. Please check your payment details and try again, or contact support if the problem persists.`,
    cta: 'Retry Payment',
    ctaUrl: '/checkout',
  },
  cancel: {
    title: '⚠️ Payment Cancelled',
    subtitle: 'You have cancelled the payment process.',
    message: (name: string) =>
      `Your payment for ${name} has been cancelled. You can complete your enrollment at any time by clicking the button below.`,
    cta: 'Continue Shopping',
    ctaUrl: '/workshop',
  },
};

/**
 * Create a standardized payment status page component
 * Can be reused for success, failure, and cancel pages
 * 
 * @example
 * // In /app/payment-successful/page.tsx
 * 'use client';
 * 
 * import { PaymentStatusPageLayout } from '@/lib/payments/paymentPageHandler';
 * import { handlePaymentSuccess } from '@/lib/payments/paymentPageHandler';
 * 
 * export default function PaymentSuccessfulPage({ searchParams }) {
 *   const data = handlePaymentSuccess(searchParams);
 *   
 *   return (
 *     <PaymentStatusPageLayout
 *       status="success"
 *       workshopName={data.workshopName}
 *       amount={data.display.amountText}
 *     />
 *   );
 * }
 */

export interface PaymentStatusPageProps {
  status: 'success' | 'failure' | 'cancel';
  workshopName: string;
  amount: string;
}

export function getPaymentStatusContent(status: 'success' | 'failure' | 'cancel', workshopName: string) {
  const messages = PaymentPageMessages[status];
  return {
    ...messages,
    message: messages.message(workshopName, workshopName),
  };
}
