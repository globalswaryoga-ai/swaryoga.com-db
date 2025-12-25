import React from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, Clock, Users, Star, ArrowRight, CheckCircle, Globe, Languages, Wallet } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { findWorkshopBySlug } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

// Helper to extract first 5 lines from description
const extractFiveLines = (text: string): string[] => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.slice(0, 5);
};

export default function WorkshopDetailPage({ params }: { params: { id: string } }) {
  const workshop = findWorkshopBySlug(params.id);

  // Invalid slug (including reserved words like "register") should be a real 404.
  if (!workshop) {
    notFound();
  }

  const modes = workshop.mode?.length ? workshop.mode.join(', ') : '—';
  const languages = workshop.language?.length ? workshop.language.join(', ') : '—';
  const currencies = workshop.currency?.length ? workshop.currency.join(', ') : '—';
  
  // Extract first 5 lines from description for "About This Workshop" section
  const aboutLines = extractFiveLines(workshop.description || '');

  return (
    <>
      <Navigation />

      <main className="mt-16 sm:mt-20">
        {/* Hero */}
        <section className="relative min-h-[50vh] sm:min-h-[60vh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src={workshop.image}
              alt={workshop.name}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 to-black/30" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full mb-6 font-semibold">
                <span className="text-primary-200">{workshop.category}</span>
                <span className="opacity-70">•</span>
                <span>{workshop.level}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {workshop.name}
              </h1>

              <p className="text-base sm:text-lg text-gray-100 leading-relaxed mb-8">
                {workshop.description}
              </p>

              <div className="flex flex-wrap gap-4 mb-8 text-white/90">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{workshop.duration}</span>
                </div>
              </div>

              <Link
                href={`/workshops/${workshop.slug}/register`}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-7 py-3.5 rounded-lg transition-all duration-300 font-semibold animate-pulse"
              >
                Register Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Details Section - 7 lines format */}
        <section className="py-10 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                  <Globe className="w-5 h-5 text-primary-600" />
                  Mode
                </div>
                <p className="text-gray-700">{modes}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                  <Languages className="w-5 h-5 text-primary-600" />
                  Language
                </div>
                <p className="text-gray-700">{languages}</p>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  Currency
                </div>
                <p className="text-gray-700">{currencies}</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 bg-white rounded-xl shadow p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Workshop Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div><strong>Duration:</strong> {workshop.duration}</div>
                <div><strong>Level:</strong> {workshop.level}</div>
                <div><strong>Category:</strong> {workshop.category}</div>
                <div><strong>Instructor:</strong> {workshop.instructor || 'Mohan Kalburgi (Yogacharya)'}</div>
                <div><strong>Mode:</strong> {modes}</div>
                <div><strong>Language:</strong> {languages}</div>
                <div><strong>Currency:</strong> {currencies}</div>
              </div>
            </div>
          </div>
        </section>

        {/* About This Workshop - 5 dynamic lines */}
        <section className="py-10 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">About This Workshop</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-video relative rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={workshop.image}
                  alt={workshop.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-3">
                {aboutLines.map((line, idx) => (
                  <p key={idx} className="text-gray-700 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Register CTA */}
        <section className="py-10 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="bg-white rounded-xl shadow p-6 sm:p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Ready to Begin?</h2>
              <p className="text-gray-700 mb-6">
                Select your preferred mode, schedule, and language on the register page.
              </p>

              <Link
                href={`/workshops/${workshop.slug}/register`}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold animate-pulse"
              >
                Go to Register Page
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
