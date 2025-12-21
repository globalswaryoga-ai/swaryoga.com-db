import type { Metadata } from 'next';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Swar Yoga',
  description: 'Privacy policy describing how Swar Yoga collects, uses, and protects personal information.',
};

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="mt-20 bg-gray-50">
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="mt-2 text-sm text-gray-600">Last updated: {new Date().toLocaleDateString('en-IN')}</p>

              <div className="mt-8 space-y-6 text-gray-700 leading-relaxed">
                <p>
                  This Privacy Policy explains how Swar Yoga collects, uses, shares, and protects information when you
                  visit our website or register for our programs.
                </p>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>Contact details (e.g., name, email, phone number) provided during registration or inquiry.</li>
                    <li>Booking details (e.g., workshop selected, schedule, amount, and order identifiers).</li>
                    <li>Technical data (e.g., device information, IP address, and browser data) for security and analytics.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">2. How We Use Information</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>To provide services and process registrations/bookings.</li>
                    <li>To communicate confirmations, updates, and support responses.</li>
                    <li>To prevent fraud, abuse, and unauthorized access.</li>
                    <li>To improve our website, services, and user experience.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">3. Payments</h2>
                  <p className="mt-2">
                    Payments are processed through third-party payment gateways. We do not store full card details on
                    our servers. Payment providers may process data according to their own policies.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">4. Communications</h2>
                  <p className="mt-2">
                    We may contact you via email/phone/WhatsApp for booking confirmations, important updates about your
                    program, and support. You can ask us to stop promotional messages by contacting us.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">5. Sharing of Information</h2>
                  <p className="mt-2">
                    We may share limited information with service providers (e.g., payment gateways, hosting providers)
                    strictly to deliver services. We may also disclose information if required by law.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">6. Cookies</h2>
                  <p className="mt-2">
                    We may use cookies or similar technologies to enable core functionality and understand website
                    usage. You can adjust browser settings to manage cookies, but some features may not work properly.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">7. Data Security</h2>
                  <p className="mt-2">
                    We take reasonable measures to protect your information. However, no system is 100% secure. Please
                    contact us immediately if you suspect unauthorized activity.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">8. Your Choices</h2>
                  <ul className="mt-2 list-disc pl-6 space-y-2">
                    <li>You may request access, correction, or deletion of your personal information where applicable.</li>
                    <li>You can opt out of non-essential communications by contacting us.</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">9. Data Retention</h2>
                  <p className="mt-2">
                    We retain personal information only as long as needed to provide services, comply with legal
                    obligations, resolve disputes, and enforce agreements.
                  </p>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
                  <p className="mt-2">
                    For privacy-related questions, email{' '}
                    <a className="text-primary-700 font-semibold hover:underline" href="mailto:globalswaryoga@gmail.com">
                      globalswaryoga@gmail.com
                    </a>{' '}
                    or call <span className="font-semibold">+91 9779006820</span>.
                  </p>
                </div>

                <div className="pt-2 text-sm text-gray-600">
                  <p>
                    This Privacy Policy may be updated from time to time. The updated policy will be posted on this
                    page with a revised "Last updated" date.
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
