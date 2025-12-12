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

function ThankYouInner() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get('registrationId');
  const email = searchParams.get('email');
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [email]);

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

            <h1 className="text-5xl font-bold mb-4 text-green-700">Thank You!</h1>
            <p className="text-2xl text-gray-600 mb-4">
              Your workshop registration is confirmed
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading registration details...</p>
            </div>
          ) : registration ? (
            <div className="bg-green-50 rounded-lg p-8 mb-8 border-2 border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Registration Details
              </h2>

              <div className="space-y-4 mb-6">
                {/* Registration ID */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🎫</div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Registration ID</p>
                    <p className="text-lg text-gray-900">{registrationId || registration._id}</p>
                  </div>
                </div>

                {/* Workshop */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🧘</div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Workshop</p>
                    <p className="text-lg text-gray-900">{registration.workshopName}</p>
                  </div>
                </div>

                {/* Mode */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">{getModeLabel(registration.mode).charAt(0)}</div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Mode</p>
                    <p className="text-lg text-gray-900">
                      {getModeLabel(registration.mode)}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-4">
                  <Calendar className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Duration</p>
                    <p className="text-lg text-gray-900">
                      {formatDate(registration.startDate)} to{' '}
                      {formatDate(registration.endDate)}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-start gap-4">
                  <div className="text-2xl">💰</div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Price</p>
                    <p className="text-lg font-bold text-green-600">
                      {registration.currency} {registration.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Email</p>
                    <p className="text-lg text-gray-900">{registration.email}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Phone</p>
                    <p className="text-lg text-gray-900">{registration.phone}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-green-300 pt-6">
                <p className="text-gray-700 mb-4">
                  A confirmation email has been sent to <span className="font-bold">{registration.email}</span>. Keep it safe for future reference.
                </p>
                <p className="text-gray-700">
                  If you have any questions, please contact our team at{' '}
                  <a href="mailto:support@swaryoga.com" className="text-green-600 font-bold hover:text-green-700">
                    support@swaryoga.com
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-8 mb-8 border-2 border-yellow-200">
              <p className="text-gray-700">
                Unable to load registration details. Please check your email for confirmation.
              </p>
            </div>
          )}

          <div className="space-y-4 text-center">
            <Link
              href="/workshops"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
            >
              <Home className="w-5 h-5" />
              Explore More Workshops
            </Link>
            <p>
              <Link
                href="/profile"
                className="text-green-600 hover:text-green-700 font-semibold"
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
