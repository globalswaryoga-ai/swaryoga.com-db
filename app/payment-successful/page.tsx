'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

type SafeOrder = {
  _id: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string;
  failureReason: string;
  createdAt?: string;
  updatedAt?: string;
};

function PaymentSuccessfulInner() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId') || searchParams.get('txnid') || '';
  const transactionId = searchParams.get('mihpayid') || '';
  const amount = searchParams.get('amount') || '';
  const email = searchParams.get('email') || '';

  const [order, setOrder] = useState<SafeOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(!!orderId);

  const heading = 'Payment Successful';
  const subheading = 'Thank you! Your payment has been received.';

  const summaryLine = useMemo(() => {
    const parts: string[] = [];
    if (amount) parts.push(`Amount: ₹${amount}`);
    if (transactionId) parts.push(`PayU ID: ${transactionId}`);
    if (email) parts.push(`Email: ${email}`);
    return parts.join(' • ');
  }, [amount, transactionId, email]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && data?.order) {
          setOrder(data.order as SafeOrder);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch order details:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white rounded-2xl shadow-xl border border-swar-border overflow-hidden">
            <div className="p-8 sm:p-10 bg-gradient-to-r from-swar-primary-light to-white border-b border-swar-border">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-swar-primary-light flex items-center justify-center">
                  <span className="text-swar-primary text-2xl">✓</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-bold text-swar-primary">{heading}</h1>
                  <p className="mt-2 text-swar-text text-lg">{subheading}</p>
                  {summaryLine ? (
                    <p className="mt-3 text-sm text-swar-text-secondary break-words">{summaryLine}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              {!orderId ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                  <p className="text-swar-text font-semibold">Missing order id</p>
                  <p className="text-swar-text mt-1">
                    We received a success callback, but no <span className="font-mono">orderId</span> was provided.
                    If your money was deducted, please contact support.
                  </p>
                </div>
              ) : loading ? (
                <p className="text-swar-text-secondary">Loading your order details…</p>
              ) : order ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-swar-border p-4">
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase tracking-wide">Order ID</p>
                      <p className="mt-1 font-mono text-sm break-all text-swar-text">{order._id}</p>
                    </div>
                    <div className="rounded-xl border border-swar-border p-4">
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase tracking-wide">Payment Status</p>
                      <p className="mt-1 text-swar-text font-semibold">{order.paymentStatus || order.status}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-swar-border p-4">
                    <p className="text-xs text-swar-text-secondary font-semibold uppercase tracking-wide">Items</p>
                    <div className="mt-3 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-swar-text font-medium truncate">{item.name}</p>
                            <p className="text-xs text-swar-text-secondary">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-swar-text font-semibold">₹{Number(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-swar-border flex items-center justify-between">
                      <p className="text-swar-text font-semibold">Total</p>
                      <p className="text-swar-text font-bold text-lg">₹{Number(order.total || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {order.transactionId ? (
                    <div className="rounded-xl border border-swar-border p-4">
                      <p className="text-xs text-swar-text-secondary font-semibold uppercase tracking-wide">Transaction ID</p>
                      <p className="mt-1 font-mono text-sm break-all text-swar-text">{order.transactionId}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                  <p className="text-swar-text font-semibold">Order details not available</p>
                  <p className="text-swar-text mt-1">
                    Your payment succeeded, but we couldn’t load the order details right now. You can still continue.
                  </p>
                  <p className="mt-3 text-sm text-swar-text">
                    Order ID: <span className="font-mono break-all">{orderId}</span>
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/workshop"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-swar-primary text-white font-semibold hover:bg-swar-primary-hover transition"
                >
                  Explore Workshops
                </Link>
                <Link
                  href="/"
                  className="inline-flex justify-center items-center px-6 py-3 rounded-xl border border-swar-border text-swar-text font-semibold hover:bg-swar-primary-light transition"
                >
                  Home
                </Link>
              </div>

              <p className="mt-6 text-sm text-swar-text-secondary">
                Need help? Email{' '}
                <a className="text-swar-accent font-semibold" href="mailto:support@swaryoga.com">
                  support@swaryoga.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentSuccessfulPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessfulInner />
    </Suspense>
  );
}
