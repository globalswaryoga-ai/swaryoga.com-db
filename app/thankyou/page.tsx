'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function ThankYou() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4 text-yoga-700">Thank You!</h1>
          <p className="text-2xl text-gray-600 mb-4">Your order has been placed successfully</p>

          <div className="bg-yoga-50 rounded-lg p-8 max-w-2xl mx-auto mb-8">
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-bold">Order Number:</span> #SY-2024-12345
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-bold">Total Amount:</span> $279.95
              </p>
              <p className="text-gray-700">
                <span className="font-bold">Estimated Delivery:</span> December 15, 2024
              </p>
            </div>

            <div className="border-t border-yoga-200 pt-6">
              <p className="text-gray-700 mb-4">
                A confirmation email has been sent to your email address. You can track your order status anytime by visiting your account.
              </p>
              <p className="text-gray-700">
                If you have any questions, please contact our customer support team at{' '}
                <a href="mailto:support@swaryoga.com" className="text-yoga-600 font-bold">
                  support@swaryoga.com
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-block bg-yoga-600 text-white px-8 py-3 rounded-lg hover:bg-yoga-700 transition font-semibold"
            >
              Continue Shopping
            </Link>
            <p>
              <Link
                href="/signin"
                className="text-yoga-600 hover:text-yoga-700 font-semibold"
              >
                View Your Orders
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
