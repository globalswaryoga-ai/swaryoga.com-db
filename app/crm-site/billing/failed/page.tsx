'use client';

import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { XCircle, RefreshCcw, ArrowRight } from 'lucide-react';

export default function BillingFailedPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown';
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  const errorMessages: Record<string, string> = {
    missing_order: 'Order ID was not provided.',
    order_not_found: 'We could not find your order. Please contact support.',
    server_error: 'Something went wrong on our end. Please try again.',
    FAILED: 'Payment was declined. Please try a different payment method.',
    CANCELLED: 'Payment was cancelled.',
    EXPIRED: 'Payment session expired. Please try again.',
    unknown: 'Payment could not be processed.',
  };

  const message = errorMessages[status || error] || errorMessages.unknown;

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50 py-16 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        {orderId && (
          <p className="text-xs text-gray-400 mb-6">Order ID: {orderId}</p>
        )}

        <div className="space-y-3">
          <Link
            href="/crm-site/pricing"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl transition"
          >
            <RefreshCcw className="h-4 w-4" /> Try Again
          </Link>
          
          <Link
            href="/admin/crm"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            Continue with Free Plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Need help?{' '}
          <a href="https://wa.me/919779006820" className="text-swar-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </section>
  );
}
