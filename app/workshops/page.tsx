'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { workshopCatalog, WorkshopOverview } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

const workshopFilterOptions = workshopCatalog.map((workshop) => ({
  slug: workshop.slug,
  name: workshop.name
}));

function WorkshopsPageInner() {
  const [currentPage, setCurrentPage] = useState(1);
  const workshopsPerPage = 3;
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState({
    workshop: false,
    mode: false,
    language: false,
    currency: false,
  });
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';
  const totalWorkshops = workshopCatalog.length;

  useEffect(() => {
    if (!searchParams) return;
  setSelectedMode(searchParams.get('mode') || null);
  setSelectedLanguage(searchParams.get('language') || null);
  setSelectedPayment(searchParams.get('currency') || null);
  setSelectedWorkshop(searchParams.get('workshop') || null);
    setCurrentPage(1);
  }, [queryString, searchParams]);

  // Filter workshops based on selected filters
  const filteredWorkshops = workshopCatalog.filter((workshop: WorkshopOverview) => {
    const workshopMatch = !selectedWorkshop || workshop.slug === selectedWorkshop;
    const modeMatch = !selectedMode || (workshop.mode && workshop.mode.includes(selectedMode));
    const languageMatch = !selectedLanguage || (workshop.language && workshop.language.includes(selectedLanguage));
    const currencyMatch = !selectedPayment || (workshop.currency && workshop.currency.includes(selectedPayment));

    return workshopMatch && modeMatch && languageMatch && currencyMatch;
  });

  const totalPages = Math.ceil(filteredWorkshops.length / workshopsPerPage);
  const startIndex = (currentPage - 1) * workshopsPerPage;
  const endIndex = startIndex + workshopsPerPage;
  const currentWorkshops = filteredWorkshops.slice(startIndex, endIndex);

  return (
    <>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[50vh] sm:min-h-[60vh] flex items-center overflow-hidden mt-16 sm:mt-20">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg"
              alt="Workshops hero"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="mb-4 sm:mb-6 md:mb-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                  <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-primary-400 flex-shrink-0" />
                  <span className="text-primary-400 font-semibold text-sm sm:text-lg">Our Programs</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-4 leading-tight">
                  Transformative Workshops
                </h1>
              </div>

              <p className="text-base sm:text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-6 sm:mb-8">
                Choose from {totalWorkshops} comprehensive workshops designed to elevate your yoga practice and transform your life through the science of breath.
              </p>

              <Link
                href="/calendar"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg transition-all duration-300 group hover:shadow-lg font-semibold text-sm sm:text-base touch-target"
              >
                Explore Schedules
                <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workshops Grid */}
        <section className="py-8 sm:py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="text-center mb-8 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
                Explore Our Workshops
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
                Each workshop is carefully designed by yoga masters to provide authentic learning and personal transformation.
              </p>
            </div>

            {/* Filters Section - Accordion */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 space-y-4">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Filter Workshops</h3>
                <p className="text-xs sm:text-sm text-gray-500">Find the perfect workshop for your journey</p>
              </div>

              {/* Workshop Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAccordionOpen({ ...accordionOpen, workshop: !accordionOpen.workshop })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span>Workshops</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.workshop ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.workshop && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => { setSelectedWorkshop(null); setCurrentPage(1); }}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${!selectedWorkshop ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        All Workshops
                      </button>
                      {workshopFilterOptions.map((option) => (
                        <button
                          key={option.slug}
                          onClick={() => { setSelectedWorkshop(option.slug); setCurrentPage(1); }}
                          className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${selectedWorkshop === option.slug ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAccordionOpen({ ...accordionOpen, mode: !accordionOpen.mode })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span>Mode</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.mode ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.mode && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => { setSelectedMode(null); setCurrentPage(1); }}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${!selectedMode ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        All Modes
                      </button>
                      {['Online', 'Offline', 'Residential', 'Recorded'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setSelectedMode(mode); setCurrentPage(1); }}
                          className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${selectedMode === mode ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAccordionOpen({ ...accordionOpen, language: !accordionOpen.language })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span>Language</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.language ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.language && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => { setSelectedLanguage(null); setCurrentPage(1); }}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${!selectedLanguage ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        All Languages
                      </button>
                      {['Hindi', 'English', 'Marathi'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => { setSelectedLanguage(lang); setCurrentPage(1); }}
                          className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${selectedLanguage === lang ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Currency Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setAccordionOpen({ ...accordionOpen, currency: !accordionOpen.currency })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span>Currency</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.currency ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.currency && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => { setSelectedPayment(null); setCurrentPage(1); }}
                        className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${!selectedPayment ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        All Currencies
                      </button>
                      {['INR', 'USD', 'NPR'].map((curr) => {
                        const currencySymbol = { INR: '₹', USD: '$', NPR: 'Rs' }[curr];
                        return (
                          <button
                            key={curr}
                            onClick={() => { setSelectedPayment(curr); setCurrentPage(1); }}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${selectedPayment === curr ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                          >
                            {currencySymbol} {curr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Filters Button */}
              <div className="mt-3 sm:mt-6 flex flex-wrap gap-2">
                {(selectedMode || selectedLanguage || selectedPayment || selectedWorkshop) && (
                  <button
                    onClick={() => {
                      setSelectedMode(null);
                      setSelectedLanguage(null);
                      setSelectedPayment(null);
                      setSelectedWorkshop(null);
                      setCurrentPage(1);
                    }}
                    className="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 touch-target"
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Workshop Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
              {currentWorkshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group flex flex-col"
                >
                  {/* Workshop Image */}
                  <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={workshop.image}
                      alt={workshop.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Level Badge */}
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                      <span
                        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-xs sm:text-sm font-semibold ${
                          workshop.level === 'Beginner'
                            ? 'bg-green-500'
                            : workshop.level === 'Intermediate'
                            ? 'bg-blue-500'
                            : workshop.level === 'Advanced'
                            ? 'bg-red-500'
                            : 'bg-purple-500'
                        }`}
                      >
                        {workshop.level}
                      </span>
                    </div>
                  </div>

                  {/* Workshop Content */}
                  <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 sm:mb-2 line-clamp-2">
                      {workshop.name}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                      {workshop.description}
                    </p>

                    <div className="flex items-center justify-between mb-4 sm:mb-6 py-2 sm:py-3 border-t border-gray-200 text-xs sm:text-sm">
                      <span className="text-gray-500 font-medium">
                        📚 {workshop.duration}
                      </span>
                    </div>

                    {/* Filter Badges Removed - Only shown in batch details */}

                    {/* Batches Section Removed - Only shown on detail page */}

                    {/* CTA Buttons Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Link
                        href={`/workshops/${workshop.slug}`}
                        className="bg-white border-2 border-primary-600 hover:bg-gray-50 active:scale-95 text-primary-600 py-2.5 sm:py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-1 sm:gap-2 group/btn touch-target text-sm sm:text-base"
                      >
                        Learn More
                        <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                      </Link>
                      <Link
                        href={`/workshops/${workshop.slug}/register`}
                        className="bg-primary-600 hover:bg-primary-700 active:scale-95 text-white py-2.5 sm:py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-1 sm:gap-2 group/btn touch-target text-sm sm:text-base"
                      >
                        Register Now
                        <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-xs sm:text-sm active:scale-95"
                >
                  ← Previous
                </button>

                <div className="flex gap-1 sm:gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 touch-target text-xs sm:text-sm active:scale-95 ${
                        currentPage === page
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-target text-xs sm:text-sm active:scale-95"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-8 sm:mt-12 md:mt-16 pt-8 sm:pt-12 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-1 sm:mb-2">14</div>
                  <p className="text-gray-600 font-semibold text-sm sm:text-base">Total Workshops</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-1 sm:mb-2">Expert</div>
                  <p className="text-gray-600 font-semibold text-sm sm:text-base">Certified Instructors</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-1 sm:mb-2">100%</div>
                  <p className="text-gray-600 font-semibold text-sm sm:text-base">Transformation</p>
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

export default function WorkshopsPage() {
  return (
    <Suspense fallback={null}>
      <WorkshopsPageInner />
    </Suspense>
  );
}
