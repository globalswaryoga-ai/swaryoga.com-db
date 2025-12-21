import type { Metadata } from 'next';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Refunds & Cancellations | Swar Yoga',
  description: 'Refund and cancellation policy for Swar Yoga workshops, programs, and bookings.',
};

export default function RefundsAndCancellationsPage() {
  return (
    <>
      <Navigation />
      <main className="mt-20 bg-gray-50">
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Refunds &amp; Cancellations</h1>
              <p className="mt-2 text-sm text-gray-600">Last updated: {new Date().toLocaleDateString('en-IN')}</p>

              <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
                <p>
                  This policy explains how cancellations and refunds are handled for Swar Yoga bookings.
                  By placing an order on our website, you agree to this policy.
                </p>

                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <h2 className="text-lg font-semibold text-gray-900">72-hour refund request window</h2>
                  <p className="mt-2">
                    Anyone can request a refund within <span className="font-semibold">72 hours</span> of a successful
                    payment.
                  </p>
                  <ul className="mt-3 list-disc pl-6 space-y-2">
                    <li>
                      Refund requests must be sent from the registered email/phone along with order/payment reference.
                    </li>
                    <li>
                      If a program has already started or access/deliverables have already been provided, we may
                      process the request as a partial refund or credit, depending on the case.
                    </li>
                    <li>
                      Bank/payment-gateway charges (if any) may be non-refundable.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">1. Workshop / Program Registrations</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>
                      Refund requests within 72 hours are handled as per the 72-hour window above.
                    </li>
                    <li>
                      After the 72-hour window, refunds are generally not available, unless required by law or
                      approved as an exception.
                    </li>
                    <li>
                      If a program is cancelled by Swar Yoga due to unavoidable circumstances, you will be offered a
                      refund or alternate schedule/credit.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">2. Retreat / Resort Bookings (if applicable)</h2>
                  <p className="mt-2">
                    Retreat/resort bookings may have separate cancellation timelines based on accommodation and vendor
                    commitments. Where applicable, these terms will be shown at the time of booking.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">3. How to Request a Cancellation/Refund</h2>
                  <p className="mt-2">Please email us with the following details (this helps us process quickly):</p>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>Registered name</li>
                    <li>Email / phone number used during booking</li>
                    <li>Program/workshop name and date</li>
                    <li>Order/payment reference (if available)</li>
                    <li>Reason for request</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">4. Processing Time</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>
                      Approved refunds are processed back to the original payment method where possible, subject to the
                      payment gateway and bank processing times.
                    </li>
                    <li>
                      Processing time can vary. If you do not receive an update within a reasonable timeframe, please
                      contact us.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">5. Contact</h2>
                  <p className="mt-2">
                    For cancellations and refunds, email{' '}
                    <a className="text-primary-700 font-semibold hover:underline" href="mailto:globalswaryoga@gmail.com">
                      globalswaryoga@gmail.com
                    </a>{' '}
                    or call <span className="font-semibold">+91 9779006820</span>.
                  </p>
                </div>

                <div className="pt-2 text-sm text-gray-600">
                  <p>
                    This policy may be updated from time to time and will be published on this page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
