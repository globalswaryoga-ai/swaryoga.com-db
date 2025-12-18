'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

function PaymentFailedContent() {
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') || 'failure').toLowerCase();
  const txnid = searchParams.get('txnid') || searchParams.get('mihpayid') || '';
  const amount = searchParams.get('amount') || '';
  const email = searchParams.get('email') || '';
  const error = searchParams.get('error') || (status === 'pending' ? 'Payment pending. Please check again later.' : 'Payment failed. Please try again.');

  const isPending = status === 'pending';

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Error Card */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-white p-8 sm:p-12 border-b-2 border-red-200">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-16 h-16 text-red-600" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-red-700 mb-2">
                    {isPending ? 'Payment Pending' : 'Payment Failed'}
                  </h1>
                  <p className="text-lg text-red-600">{error}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 sm:p-12">
              {/* Payment Details */}
              {(txnid || amount) && (
                <div className="space-y-4 mb-8 pb-8 border-b border-swar-border bg-swar-primary-light rounded-lg p-4">
                  <h2 className="font-semibold text-swar-text">Payment Details</h2>
                  {txnid && (
                    <div>
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase mb-1">Transaction ID</p>
                      <p className="font-mono text-swar-text break-all">{txnid}</p>
                    </div>
                  )}
                  {amount && (
                    <div>
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase mb-1">Amount</p>
                      <p className="text-swar-text font-semibold">₹{amount}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Troubleshooting */}
              <div className="space-y-4 mb-8 pb-8 border-b border-swar-border">
                <h3 className="font-semibold text-swar-text text-lg">What You Can Try</h3>
                <ul className="space-y-3 text-swar-text-secondary">
                  <li className="flex gap-3">
                    <span className="text-swar-primary font-bold">•</span>
                    <span>Check your internet connection and try again</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-swar-primary font-bold">•</span>
                    <span>Verify your payment method has sufficient balance</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-swar-primary font-bold">•</span>
                    <span>If money was deducted, wait 5–10 minutes for confirmation</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-swar-primary font-bold">•</span>
                    <span>Try a different payment method</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-swar-primary font-bold">•</span>
                    <span>Contact your bank if the issue persists</span>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div className="bg-swar-primary-light rounded-lg p-6 mb-8">
                <h4 className="font-semibold text-swar-text mb-2">Need Additional Help?</h4>
                <p className="text-swar-text-secondary mb-3">
                  If the problem continues, please contact our support team:
                </p>
                <a
                  href="mailto:support@swaryoga.com"
                  className="inline-block text-swar-primary font-semibold hover:text-swar-primary-hover transition"
                >
                  support@swaryoga.com
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/checkout"
                  className="flex-1 bg-swar-primary hover:bg-swar-primary-hover text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Try Payment Again
                </Link>
                <Link
                  href="/"
                  className="flex-1 border-2 border-swar-primary text-swar-primary hover:bg-swar-primary-light py-3 rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}
