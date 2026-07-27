import type { Metadata } from 'next';
import Link from 'next/link';
import { Laptop, ArrowRight } from 'lucide-react';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Online Programs | Swar Yoga',
  description: 'Learn Swar Yoga from anywhere with live and recorded online sessions.',
};

export default function OnlineProgramsPage() {
  return (
    <>
      <Navigation />
      <main className="mt-20 bg-gray-50">
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-500/10 rounded-lg">
                  <Laptop className="w-6 h-6 text-primary-600" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Online Programs</h1>
              </div>

              <p className="mt-4 text-gray-700 leading-relaxed">
                Can&apos;t join in person? Learn Swar Yoga from anywhere with our live and recorded
                online sessions, designed for the same depth of practice as our in-person workshops.
              </p>

              <Link
                href="/workshops"
                className="mt-8 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold"
              >
                View Upcoming Programs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
