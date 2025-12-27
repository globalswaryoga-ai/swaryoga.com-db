import React from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, Clock, Users, Star, ArrowRight, CheckCircle, Globe, Languages, Wallet, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { findWorkshopBySlug } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

// CSS for blinking button animation
const blinkingStyles = `
  @keyframes blink {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0.7; }
  }
  .btn-blink {
    animation: blink 1.5s infinite;
  }
`;

// Helper to extract first 5 lines from description
const extractFiveLines = (text: string): string[] => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.slice(0, 5);
};

export default function WorkshopDetailPage({ params }: { params: { slug: string } }) {
  const workshop = findWorkshopBySlug(params.slug);

  // Invalid slug (including reserved words like "register") should be a real 404.
  if (!workshop) {
    notFound();
  }

  const modes = workshop.mode?.length ? workshop.mode.join(', ') : '—';
  const languages = workshop.language?.length ? workshop.language.join(', ') : '—';
  const currencies = workshop.currency?.length ? workshop.currency.join(', ') : '—';
  
  // Extract first 5 lines from description for "About This Workshop" section
  const aboutLines = extractFiveLines(workshop.detailedDescription || workshop.description || '');

  const registerLink = `/workshops/${workshop.slug}/register`;

  return (
    <>
      <style>{blinkingStyles}</style>
      <Navigation />

      <main className="mt-16 sm:mt-20">
        {/* Hero Section */}
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full mb-6 font-semibold backdrop-blur">
                <span className="text-green-200">{workshop.category}</span>
                <span className="opacity-70">•</span>
                <span>{workshop.level}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {workshop.name}
              </h1>

              <p className="text-base sm:text-lg text-gray-100 leading-relaxed mb-8 max-w-2xl">
                {workshop.description}
              </p>

              <div className="flex flex-wrap gap-6 mb-8 text-white/90">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <span className="font-semibold">{workshop.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span className="font-semibold">{workshop.level}</span>
                </div>
              </div>

              <Link
                href={registerLink}
                className="btn-blink inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white px-8 py-4 rounded-lg transition-all duration-300 font-bold text-lg"
              >
                Register Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Key Details Cards */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                <div className="flex items-center gap-3 font-bold text-gray-800 mb-2">
                  <Globe className="w-6 h-6 text-green-600" />
                  Mode
                </div>
                <p className="text-gray-700 text-sm">{modes}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                <div className="flex items-center gap-3 font-bold text-gray-800 mb-2">
                  <Languages className="w-6 h-6 text-green-600" />
                  Language
                </div>
                <p className="text-gray-700 text-sm">{languages}</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
                <div className="flex items-center gap-3 font-bold text-gray-800 mb-2">
                  <Wallet className="w-6 h-6 text-green-600" />
                  Currency
                </div>
                <p className="text-gray-700 text-sm">{currencies}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Information Box */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Workshop Information</h2>
            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg p-8 border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Duration</p>
                    <p className="text-gray-700">{workshop.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Level</p>
                    <p className="text-gray-700">{workshop.level}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Category</p>
                    <p className="text-gray-700">{workshop.category}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Instructor</p>
                    <p className="text-gray-700">{workshop.instructor || 'Mohan Kalburgi (Yogacharya)'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content - Description + Video */}
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">About This Workshop</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Text Content */}
              <div className="space-y-6">
                {aboutLines.length > 0 ? (
                  <>
                    {aboutLines.map((line, idx) => (
                      <p key={idx} className="text-gray-700 leading-relaxed text-base">
                        {line}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="text-gray-700 leading-relaxed text-base">
                    {workshop.detailedDescription || workshop.description}
                  </p>
                )}
              </div>

              {/* Video Embed */}
              {workshop.videoUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden shadow-xl border-4 border-green-600 bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={workshop.videoUrl}
                      title={workshop.name}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600 italic">
                    Watch our introduction video to learn more about this program
                  </p>
                </div>
              ) : (
                <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={workshop.image}
                    alt={workshop.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Call to Action Buttons - Multiple Blinking Register Buttons */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Transform?</h2>
              <p className="text-lg text-gray-700 mb-8">
                Join thousands of practitioners on the path to wellness and spiritual growth
              </p>
            </div>

            {/* 5 Blinking Green Register Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <Link
                  key={idx}
                  href={registerLink}
                  className="btn-blink block bg-green-600 hover:bg-green-700 active:scale-95 text-white px-4 py-4 rounded-lg transition-all duration-300 font-bold text-center text-lg shadow-lg hover:shadow-xl"
                >
                  Register Now
                </Link>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Flexible Schedule</h3>
                <p className="text-gray-700 text-sm">Learn at your own pace with access to recorded sessions</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Expert Guidance</h3>
                <p className="text-gray-700 text-sm">Learn directly from experienced Yogacharya and masters</p>
              </div>
              <div className="text-center">
                <Star className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Lifetime Access</h3>
                <p className="text-gray-700 text-sm">Get lifetime access to course materials and community</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Facts Section */}
        <section className="py-12 sm:py-16 bg-green-50 border-t-4 border-green-600">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Choose This Program?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 text-white font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Proven Results</h3>
                  <p className="text-gray-700 text-sm">Thousands of successful students worldwide</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 text-white font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Personalized Support</h3>
                  <p className="text-gray-700 text-sm">Get guidance tailored to your specific needs</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 text-white font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Ancient Wisdom</h3>
                  <p className="text-gray-700 text-sm">Time-tested techniques from yogic traditions</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 text-white font-bold">
                    ✓
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Holistic Approach</h3>
                  <p className="text-gray-700 text-sm">Transform your physical, mental, and spiritual health</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 sm:py-20 bg-gradient-to-r from-green-600 to-green-700">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Begin Your Transformation Today
            </h2>
            <p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
              Every journey of a thousand miles begins with a single step. Take that step now and join our global community of practitioners.
            </p>
            <Link
              href={registerLink}
              className="btn-blink inline-flex items-center gap-3 bg-white hover:bg-gray-100 active:scale-95 text-green-700 px-10 py-4 rounded-lg transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl"
            >
              <span>Start Your Journey</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
