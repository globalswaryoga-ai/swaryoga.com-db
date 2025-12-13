'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

function PaymentFailedInner() {
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') || 'failure').toLowerCase();
  const orderId = searchParams.get('orderId') || searchParams.get('txnid') || '';
  const transactionId = searchParams.get('mihpayid') || '';
  const amount = searchParams.get('amount') || '';
  const email = searchParams.get('email') || '';
  const error = searchParams.get('error') || (status === 'pending' ? 'Payment pending. Please check again later.' : 'Payment failed. Please try again.');

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (orderId) parts.push(`Order: ${orderId}`);
    if (transactionId) parts.push(`PayU ID: ${transactionId}`);
    if (amount) parts.push(`Amount: ₹${amount}`);
    if (email) parts.push(`Email: ${email}`);
    return parts.join(' • ');
  }, [orderId, transactionId, amount, email]);

  const isPending = status === 'pending';

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
            <div className="p-8 sm:p-10 bg-gradient-to-r from-red-50 to-white border-b border-red-100">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-700 text-2xl">!</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-bold text-red-800">
                    {isPending ? 'Payment Pending' : 'Payment Failed'}
                  </h1>
                  <p className="mt-2 text-gray-700 text-lg">{error}</p>
                  {summary ? (
                    <p className="mt-3 text-sm text-gray-600 break-words">{summary}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="text-gray-800 font-semibold">What you can do next</p>
                <ul className="mt-2 text-gray-700 list-disc pl-5 space-y-1">
                  <li>Try the payment again from checkout.</li>
                  <li>If money was deducted, wait 5–10 minutes and check your bank/UPI status.</li>
                  <li>If it still shows failure, contact support with your Order ID.</li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/checkout"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-yoga-600 text-white font-semibold hover:bg-yoga-700 transition"
                >
                  Back to Checkout
                </Link>
                <Link
                  href="/cart"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-xl border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition"
                >
                  View Cart
                </Link>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Support: <a className="text-yoga-700 font-semibold" href="mailto:support@swaryoga.com">support@swaryoga.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={null}>
      <PaymentFailedInner />
    </Suspense>
  );
}
