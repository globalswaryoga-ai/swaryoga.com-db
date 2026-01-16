'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leadNumber, setLeadNumber] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    // Get order details from URL params
    const order = searchParams.get('orderId');
    const name = searchParams.get('name');
    const lead = searchParams.get('leadNumber');

    if (order) setOrderId(order);
    if (name) setCustomerName(decodeURIComponent(name));
    if (lead) setLeadNumber(lead);

    // Auto-redirect to admin leads page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/admin/crm/leads');
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful! 🎉</h1>
          <p className="text-gray-600">Your payment has been processed successfully</p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-4">
          {customerName && (
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Customer Name</p>
              <p className="font-semibold text-gray-900">{customerName}</p>
            </div>
          )}

          {orderId && (
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-mono text-sm text-gray-900">{orderId}</p>
            </div>
          )}

          {leadNumber && (
            <div className="pb-3">
              <p className="text-sm text-gray-500">Lead Number</p>
              <p className="font-bold text-lg text-yoga-600">#{leadNumber}</p>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900">
            ✅ Customer record has been created and will appear in your <strong>Sales/Leads Dashboard</strong>.
            You will be redirected automatically...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/admin/crm/leads"
            className="block w-full text-center bg-gradient-to-r from-yoga-600 to-yoga-700 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all"
          >
            Go to Sales Dashboard Now
          </Link>
          <Link
            href="/"
            className="block w-full text-center bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 transition-all"
          >
            Back to Home
          </Link>
        </div>

        {/* Footer Message */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Your payment details have been automatically saved. The customer lead has been created and will appear in the Sales/Leads page with status as <strong>"Customer"</strong>.
        </p>
      </div>
    </div>
  );
}

function PaymentSuccessFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment status...</p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
