import type { Metadata } from 'next';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Swar Yoga',
  description: 'Terms and conditions for Swar Yoga programs, workshops, retreats, and services.',
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="mt-20 bg-gray-50">
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Terms &amp; Conditions</h1>
              <p className="mt-2 text-sm text-gray-600">Last updated: {new Date().toLocaleDateString('en-IN')}</p>

              <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
                <p>
                  These Terms &amp; Conditions ("Terms") govern your access to and use of the Swar Yoga website and
                  services (including workshops, programs, retreats, and related digital services). By using our
                  website or making a booking/purchase, you agree to these Terms.
                </p>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">1. Services</h2>
                  <p className="mt-2">
                    Swar Yoga offers wellness programs such as yoga workshops, online/offline sessions, retreats, and
                    related services. Program content, schedule, faculty, venue, and inclusions may change when
                    necessary.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">2. Eligibility &amp; Participant Responsibility</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>You must provide accurate information during registration/checkout.</li>
                    <li>
                      You are responsible for assessing your health condition and consulting a medical professional if
                      needed before participating.
                    </li>
                    <li>
                      If you have injuries, medical conditions, or are pregnant, please inform us in advance and follow
                      safe participation guidelines.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">3. Bookings, Pricing &amp; Payments</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>Prices are shown in INR unless explicitly stated otherwise.</li>
                    <li>
                      Payment confirmation is subject to successful processing by the payment gateway and verification
                      by our systems.
                    </li>
                    <li>
                      We may decline, cancel, or hold an order if we detect suspicious activity, incorrect pricing, or
                      incomplete information.
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">4. Cancellations &amp; Refunds</h2>
                  <p className="mt-2">
                    Refund requests are accepted within <span className="font-semibold">72 hours</span> of successful
                    payment as per our policy. Please read our{' '}
                    <a className="text-primary-700 font-semibold hover:underline" href="/refunds-and-cancellations">
                      Refunds &amp; Cancellations Policy
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">5. Intellectual Property</h2>
                  <p className="mt-2">
                    Website content, program materials, logos, and branding are owned by Swar Yoga or used with
                    permission. You may not copy, reproduce, distribute, or create derivative works without prior
                    written consent.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">6. Acceptable Use</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>Do not misuse the website, interfere with its operation, or attempt unauthorized access.</li>
                    <li>Do not use the website for unlawful, abusive, or fraudulent purposes.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">7. Changes to Programs</h2>
                  <p className="mt-2">
                    We may update schedules, faculty, venue, or delivery mode for operational reasons. We will make
                    reasonable efforts to inform participants about material changes.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
                  <p className="mt-2">
                    To the maximum extent permitted by law, Swar Yoga is not liable for indirect, incidental, or
                    consequential damages. Participation in wellness activities is at your own risk.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">9. Privacy</h2>
                  <p className="mt-2">
                    We respect your privacy. Please review our{' '}
                    <a className="text-primary-700 font-semibold hover:underline" href="/privacy">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">10. Governing Law</h2>
                  <p className="mt-2">
                    These Terms are governed by the laws of India. Any disputes will be subject to the jurisdiction of
                    the competent courts.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">11. Contact</h2>
                  <p className="mt-2">
                    For questions about these Terms, contact us at{' '}
                    <a className="text-primary-700 font-semibold hover:underline" href="mailto:globalswaryoga@gmail.com">
                      globalswaryoga@gmail.com
                    </a>{' '}
                    or call <span className="font-semibold">+91 9779006820</span>.
                  </p>
                </div>

                <div className="pt-2 text-sm text-gray-600">
                  <p>
                    Note: These Terms may be updated from time to time. Continued use of the website after changes
                    constitutes acceptance of the updated Terms.
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
