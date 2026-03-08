'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Download, Mail } from 'lucide-react';

const PLAN_NAMES: Record<string, string> = {
  free: 'Free Plan',
  basic: 'Basic Plan',
  starter: 'Starter Plan',
  growth: 'Growth Plan',
  professional: 'Professional Plan',
};

export default function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'starter';
  const orderId = searchParams.get('orderId');

  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>

        <p className="text-gray-600 mb-6">
          Your subscription to <strong>{PLAN_NAMES[plan] || plan}</strong> is now active.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">What&apos;s Next?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Your CRM dashboard is ready to use</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>All plan features are now unlocked</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>Confirmation email sent to your inbox</span>
            </li>
          </ul>
        </div>

        {orderId && (
          <p className="text-xs text-gray-400 mb-6">
            Order ID: {orderId}
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/admin/crm"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl transition"
          >
            Go to CRM Dashboard <ArrowRight className="h-4 w-4" />
          </Link>

          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <Download className="h-4 w-4" /> Download Receipt
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Need help? Contact us at{' '}
          <a href="mailto:support@swaryoga.com" className="text-swar-primary hover:underline">
            support@swaryoga.com
          </a>
        </p>
      </div>
    </section>
  );
}
