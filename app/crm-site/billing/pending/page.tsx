'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, ArrowRight, RefreshCcw } from 'lucide-react';

export default function BillingPendingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <section className="min-h-screen flex items-center justify-center bg-gray-50 py-16 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h1>
        <p className="text-gray-600 mb-6">
          Your payment is being processed. This usually takes a few seconds, but can sometimes take up to 24 hours for bank transfers.
        </p>

        {orderId && (
          <p className="text-xs text-gray-400 mb-6">Order ID: {orderId}</p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            Don&apos;t worry! Your subscription will be activated automatically once payment is confirmed.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/admin/crm"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl transition"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <RefreshCcw className="h-4 w-4" /> Check Status
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Payment taking too long?{' '}
          <a href="https://wa.me/919779006820" className="text-swar-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </section>
  );
}
