'use client';

import Link from 'next/link';
import { Home, Mail, Phone, Calendar } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

export const dynamic = 'force-dynamic';

interface RegistrationData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  workshopName: string;
  mode: string;
  startDate: string;
  endDate: string;
  price: number;
  currency: string;
  registrationDate: string;
}

interface OrderData {
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
}

function ThankYouInner() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registrationId');
  const email = searchParams.get('email');
  const orderId = searchParams.get('orderId') || searchParams.get('txnid');
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prefer PayU order success view if orderId is present.
    if (orderId) {
      fetch(`/api/orders/${encodeURIComponent(orderId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.order) {
            setOrder(data.order as OrderData);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching order:', error);
          setLoading(false);
        });
      return;
    }

    if (email) {
      // Fetch registration details
      fetch(`/api/workshops/registrations?email=${email}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data && data.data.length > 0) {
            // Get the latest registration
            setRegistration(data.data[0]);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching registration:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [email, orderId]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getModeLabel = (mode: string) => {
    const modeMap: Record<string, string> = {
      online: '🌐 Online',
      offline: '📍 Offline',
      residential: '🏨 Residential',
      recorded: '🎥 Recorded',
    };
    return modeMap[mode] || mode;
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 pb-12 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-swar-primary-light rounded-full">
                <svg
                  className="w-12 h-12 text-swar-primary"
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

            <h1 className="text-5xl font-bold mb-4 text-swar-primary">Thank You!</h1>
            <p className="text-2xl text-swar-text-secondary mb-4">
              {orderId ? 'Your payment is confirmed' : 'Your workshop registration is confirmed'}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-swar-text-secondary">Loading registration details...</p>
            </div>
          ) : order ? (
            <div className="bg-swar-primary-light rounded-lg p-8 mb-8 border-2 border-green-200">
              <h2 className="text-2xl font-bold text-swar-text mb-6">Payment Details</h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🧾</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Order ID</p>
                    <p className="text-lg text-swar-text font-mono break-all">{order._id}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-2xl">✅</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Status</p>
                    <p className="text-lg text-swar-text">{order.paymentStatus || order.status}</p>
                  </div>
                </div>

                {order.transactionId ? (
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">🔁</div>
                    <div>
                      <p className="text-sm text-swar-text-secondary font-semibold">Transaction ID</p>
                      <p className="text-lg text-swar-text font-mono break-all">{order.transactionId}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-4">
                  <div className="text-2xl">💰</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Total</p>
                    <p className="text-lg font-bold text-swar-primary">₹ {Number(order.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-green-300 pt-6">
                <p className="text-swar-text">
                  If you have any questions, please contact our team at{' '}
                  <a href="mailto:support@swaryoga.com" className="text-swar-primary font-bold hover:text-swar-primary">
                    support@swaryoga.com
                  </a>
                </p>
              </div>
            </div>
          ) : registration ? (
            <div className="bg-swar-primary-light rounded-lg p-8 mb-8 border-2 border-green-200">
              <h2 className="text-2xl font-bold text-swar-text mb-6">
                Registration Details
              </h2>

              <div className="space-y-4 mb-6">
                {/* Registration ID */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🎫</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Registration ID</p>
                    <p className="text-lg text-swar-text">{registrationId || registration._id}</p>
                  </div>
                </div>

                {/* Workshop */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🧘</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Workshop</p>
                    <p className="text-lg text-swar-text">{registration.workshopName}</p>
                  </div>
                </div>

                {/* Mode */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{getModeLabel(registration.mode).charAt(0)}</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Mode</p>
                    <p className="text-lg text-swar-text">
                      {getModeLabel(registration.mode)}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-4">
                  <Calendar className="w-6 h-6 text-swar-primary mt-1" />
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Duration</p>
                    <p className="text-lg text-swar-text">
                      {formatDate(registration.startDate)} to{' '}
                      {formatDate(registration.endDate)}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">💰</div>
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Price</p>
                    <p className="text-lg font-bold text-swar-primary">
                      {registration.currency} {registration.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-swar-primary mt-1" />
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Email</p>
                    <p className="text-lg text-swar-text">{registration.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-swar-primary mt-1" />
                  <div>
                    <p className="text-sm text-swar-text-secondary font-semibold">Phone</p>
                    <p className="text-lg text-swar-text">{registration.phone}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-green-300 pt-6">
                <p className="text-swar-text mb-4">
                  A confirmation email has been sent to <span className="font-bold">{registration.email}</span>. Keep it safe for future reference.
                </p>
                <p className="text-swar-text">
                  If you have any questions, please contact our team at{' '}
                  <a href="mailto:support@swaryoga.com" className="text-swar-primary font-bold hover:text-swar-primary">
                    support@swaryoga.com
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-8 mb-8 border-2 border-yellow-200">
              <p className="text-swar-text">
                Unable to load registration details. Please check your email for confirmation.
              </p>
            </div>
          )}

          <div className="space-y-4 text-center">
            <Link
              href="/workshop"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
            >
              <Home className="w-5 h-5" />
              Explore More Workshops
            </Link>
            <p>
              <Link
                href="/profile"
                className="text-swar-primary hover:text-swar-primary font-semibold"
              >
                View All My Registrations
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ThankYou() {
  return (
    <Suspense fallback={null}>
      <ThankYouInner />
    </Suspense>
  );
}
