'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { CheckCircle, Download, Home, Copy } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const status = searchParams.get('status') || 'success';
  const txnid = searchParams.get('txnid') || searchParams.get('mihpayid') || '';
  const amount = searchParams.get('amount') || '';
  const currency = searchParams.get('currency') || 'INR';
  const email = searchParams.get('email') || '';

  const isPending = status === 'pending';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-swar-primary overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-swar-primary-light to-white p-8 sm:p-12 border-b-2 border-swar-primary">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-16 h-16 text-swar-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-swar-primary mb-2">
                    {isPending ? 'Payment Pending' : 'Payment Successful!'}
                  </h1>
                  <p className="text-lg text-swar-text">
                    {isPending
                      ? 'Your payment is being processed. Please check your email for confirmation.'
                      : 'Thank you for your registration! Your workshop is confirmed.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 sm:p-12">
              {/* Payment Details */}
              <div className="space-y-4 mb-8 pb-8 border-b border-swar-border">
                <h2 className="font-semibold text-swar-text text-lg mb-4">Payment Details</h2>

                {txnid && (
                  <div className="bg-swar-primary-light rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-swar-text-secondary font-semibold uppercase mb-1">Transaction ID</p>
                        <p className="font-mono text-swar-text break-all">{txnid}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(txnid)}
                        className="ml-4 p-2 hover:bg-white rounded transition"
                      >
                        <Copy className="w-5 h-5 text-swar-text-secondary" />
                      </button>
                    </div>
                    {copied && <p className="text-xs text-swar-primary mt-2">Copied!</p>}
                  </div>
                )}

                {amount && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase mb-1">Amount</p>
                      <p className="text-2xl font-bold text-swar-primary">{amount} {currency}</p>
                    </div>
                    {email && (
                      <div>
                        <p className="text-xs text-swar-text-secondary font-semibold uppercase mb-1">Confirmation Email</p>
                        <p className="text-swar-text break-all">{email}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Next Steps */}
              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-swar-text text-lg">What's Next?</h3>
                <ol className="space-y-3 text-swar-text-secondary">
                  <li className="flex gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-swar-primary text-white rounded-full flex-shrink-0 text-sm font-semibold">
                      1
                    </span>
                    <span>Check your email for workshop details and access instructions</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-swar-primary text-white rounded-full flex-shrink-0 text-sm font-semibold">
                      2
                    </span>
                    <span>Join 15 minutes early for technical setup and to meet other participants</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-swar-primary text-white rounded-full flex-shrink-0 text-sm font-semibold">
                      3
                    </span>
                    <span>Complete the workshop and receive your certificate</span>
                  </li>
                </ol>
              </div>

              {/* Support */}
              <div className="bg-swar-primary-light rounded-lg p-6 mb-8">
                <h4 className="font-semibold text-swar-text mb-2">Need Help?</h4>
                <p className="text-swar-text-secondary mb-3">
                  If you have any questions, contact us at
                  <a href="mailto:support@swaryoga.com" className="text-swar-primary font-semibold ml-1 hover:underline">
                    support@swaryoga.com
                  </a>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/"
                  className="flex-1 bg-swar-primary hover:bg-swar-primary-hover text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Back to Home
                </Link>
                <Link
                  href="/workshop"
                  className="flex-1 border-2 border-swar-primary text-swar-primary hover:bg-swar-primary-light py-3 rounded-lg font-semibold transition text-center"
                >
                  Browse More Workshops
                </Link>
              </div>

              {/* Receipt */}
              <div className="mt-8 pt-8 border-t border-swar-border text-center">
                <button className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover font-semibold transition">
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
