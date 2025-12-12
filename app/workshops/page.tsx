'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';
  const totalWorkshops = workshopCatalog.length;
  const activeWorkshopLabel = selectedWorkshop
    ? workshopCatalog.find((workshop) => workshop.slug === selectedWorkshop)?.name
    : null;

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
        <section className="relative min-h-[60vh] flex items-center overflow-hidden mt-20">
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

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-8 h-8 text-primary-400" />
                  <span className="text-primary-400 font-semibold text-lg">Our Programs</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  Transformative Workshops
                </h1>
              </div>

              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-8">
                Choose from {totalWorkshops} comprehensive workshops designed to elevate your yoga practice and transform your life through the science of breath.
              </p>

              <Link
                href="/calendar"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-semibold"
              >
                Explore Schedules
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workshops Grid */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Explore Our Workshops
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Each workshop is carefully designed by yoga masters to provide authentic learning and personal transformation.
              </p>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700">Filter Our Workshops</h3>
                <p className="text-sm text-gray-500">Find the perfect workshop for your yoga journey</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Our Workshop Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Our Workshops</label>
                  <select
                    value={selectedWorkshop || ''}
                    onChange={(e) => {
                      setSelectedWorkshop(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Workshops</option>
                    {workshopFilterOptions.map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Mode</label>
                  <select
                    value={selectedMode || ''}
                    onChange={(e) => {
                      setSelectedMode(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Modes</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Residential">Residential</option>
                    <option value="Recorded">Recorded</option>
                  </select>
                </div>

                {/* Language Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Language</label>
                  <select
                    value={selectedLanguage || ''}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Languages</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                {/* Payment Currency Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Currency</label>
                  <select
                    value={selectedPayment || ''}
                    onChange={(e) => {
                      setSelectedPayment(e.target.value || null);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Currencies</option>
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="NPR">Rs NPR</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-6">
                  {(selectedMode || selectedLanguage || selectedPayment || selectedWorkshop) ? (
                    <button
                      onClick={() => {
                        setSelectedMode(null);
                        setSelectedLanguage(null);
                        setSelectedPayment(null);
                        setSelectedWorkshop(null);
                        setCurrentPage(1);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                    >
                      ✕ Clear
                    </button>
                  ) : null}
                </div>

              {/* Filter Summary */}
              {(selectedMode || selectedLanguage || selectedPayment || selectedWorkshop) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-gray-700 font-semibold mb-3">Active Filters:</p>
                  <div className="flex flex-wrap gap-3">
                    {activeWorkshopLabel && (
                      <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full font-semibold">
                        📚 {activeWorkshopLabel}
                        <button onClick={() => setSelectedWorkshop(null)} className="hover:text-primary-900">✕</button>
                      </span>
                    )}
                    {selectedMode && (
                      <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
                        🎯 {selectedMode}
                        <button onClick={() => setSelectedMode(null)} className="hover:text-blue-900">✕</button>
                      </span>
                    )}
                    {selectedLanguage && (
                      <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold">
                        🗣️ {selectedLanguage}
                        <button onClick={() => setSelectedLanguage(null)} className="hover:text-green-900">✕</button>
                      </span>
                    )}
                    {selectedPayment && (
                      <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-semibold">
                        💰 {selectedPayment}
                        <button onClick={() => setSelectedPayment(null)} className="hover:text-yellow-900">✕</button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workshop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {currentWorkshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
                >
                  {/* Workshop Image */}
                  <div className="relative h-64 md:h-72 overflow-hidden bg-gray-200">
                    <Image
                      src={workshop.image}
                      alt={workshop.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(min-width: 768px) 33vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Level Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${
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
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {workshop.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {workshop.description}
                    </p>

                    <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-500 font-medium">
                        Duration: {workshop.duration}
                      </span>
                    </div>

                    {/* Filter Badges Removed - Only shown in batch details */}

                    {/* Batches Section Removed - Only shown on detail page */}

                    {/* Learn More Button */}
                    <Link
                      href={`/workshops/${workshop.slug}`}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2 group/btn transform hover:scale-105"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
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
                  className="px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-16 pt-12 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">14</div>
                  <p className="text-gray-600 font-semibold">Total Workshops</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">Expert</div>
                  <p className="text-gray-600 font-semibold">Certified Instructors</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">100%</div>
                  <p className="text-gray-600 font-semibold">Transformation Guaranteed</p>
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
