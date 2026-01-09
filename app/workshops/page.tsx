'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { workshopCatalog, WorkshopOverview, workshopDetails } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

// Fee mapping for all workshops
const WORKSHOP_FEES: Record<string, { minPrice: number; maxPrice: number; currency: string }> = {
  'swar-yoga-basic': { minPrice: 96, maxPrice: 96, currency: 'INR' },
  'yogasana-sadhana': { minPrice: 330, maxPrice: 330, currency: 'INR' },
  'swar-yoga-level-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-3': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-4': { minPrice: 6000, maxPrice: 6000, currency: 'INR' },
  '96-days-weight-loss': { minPrice: 6600, maxPrice: 6600, currency: 'INR' },
  '42-days-meditation': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'amrut-aahar': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'bandhan-mukti': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'swar-yoga-level-2': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-businessman': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'personality-development': { minPrice: 3300, maxPrice: 5500, currency: 'INR' },
  'garbh-sanskar': { minPrice: 1000, maxPrice: 9000, currency: 'INR' },
  'teacher-training': { minPrice: 15000, maxPrice: 33000, currency: 'INR' },
  'annual-satsang': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'nadi-parikshan': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'family-wellness': { minPrice: 2000, maxPrice: 4000, currency: 'INR' },
  'advanced-breathing': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'life-transformation': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
};

const workshopFilterOptions = workshopCatalog.map((workshop) => ({
  slug: workshop.slug,
  name: workshop.name
}));

type ApiWorkshopSchedule = {
  id: string;
  startDate: string;
  endDate: string;
  registrationCloseDate?: string;
  time: string;
  mode: string;
  language: string;
  location?: string | null;
  slots: number;
  duration?: string;
  price: number;
};

type ApiWorkshopItem = {
  id: string;
  name: string;
  schedules: ApiWorkshopSchedule[];
};

type ApiWorkshopsListResponse = {
  message: string;
  data: ApiWorkshopItem[];
};

function toDateSafe(isoDate: string | undefined | null): Date | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getNextUpcomingStartDateIso(schedules: ApiWorkshopSchedule[] | undefined, now: Date): string | null {
  if (!schedules || schedules.length === 0) return null;
  const upcoming = schedules
    .map((s) => ({ s, d: toDateSafe(s.startDate) }))
    .filter((x): x is { s: ApiWorkshopSchedule; d: Date } => !!x.d)
    .filter((x) => x.d.getTime() >= now.getTime())
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  return upcoming.length ? upcoming[0].s.startDate : null;
}

function getStartingPrice(schedules: ApiWorkshopSchedule[] | undefined): number | null {
  if (!schedules || schedules.length === 0) return null;
  const prices = schedules
    .map((s) => Number(s.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function formatPrice(amount: number, currency: string | null): string {
  const c = (currency || 'INR').toUpperCase();
  if (c === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  if (c === 'USD') return `$${amount.toLocaleString('en-US')}`;
  if (c === 'NPR') return `NPR ${amount.toLocaleString('en-IN')}`;
  return `${c} ${amount.toLocaleString('en-IN')}`;
}

function formatDate(isoDate: string): string {
  if (!isoDate) return 'TBA';
  try {
    const date = new Date(isoDate + 'T00:00:00Z');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return 'TBA';
  }
}

function WorkshopsPageInner() {
  const [currentPage, setCurrentPage] = useState(1);
  const workshopsPerPage = 20; // 5 rows of 4 cards
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState<Record<'workshop' | 'mode' | 'language' | 'currency' | 'category', boolean>>({
    category: false,
    workshop: false,
    mode: false,
    language: false,
    currency: false,
  });
  const [schedulesByWorkshopId, setSchedulesByWorkshopId] = useState<Record<string, ApiWorkshopSchedule[]>>({});
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';
  const totalWorkshops = workshopCatalog.length;
  const activeWorkshopLabel = selectedWorkshop
    ? workshopCatalog.find((workshop) => workshop.slug === selectedWorkshop)?.name
    : null;

  useEffect(() => {
    if (!searchParams) return;
    setSelectedCategory(searchParams.get('category') || null);
    setSelectedMode(searchParams.get('mode') || null);
    setSelectedLanguage(searchParams.get('language') || null);
    setSelectedPayment(searchParams.get('currency') || null);
    setSelectedWorkshop(searchParams.get('workshop') || null);
    setCurrentPage(1);
  }, [queryString, searchParams]);

  useEffect(() => {
    let cancelled = false;
    
    const loadSchedulesWithSeats = async () => {
      try {
        // Build schedulesByWorkshopId from local workshopDetails
        const nextMap: Record<string, ApiWorkshopSchedule[]> = {};
        
        Object.entries(workshopDetails).forEach(([slug, details]) => {
          if (details && details.schedules) {
            nextMap[slug] = details.schedules.map((s) => ({
              id: s.id,
              startDate: s.startDate,
              endDate: s.endDate,
              registrationCloseDate: s.endDate, // Use end date as registration close
              time: s.time,
              mode: s.mode,
              language: 'English', // Default, can be extended
              location: s.location || null,
              slots: s.seats,
              price: s.price,
            }));
          }
        });
        
        // Fetch real-time seat availability from database
        try {
          const res = await fetch('/api/workshops/availability', { cache: 'no-store' });
          if (res.ok) {
            const seatData = await res.json();
            if (seatData.data && Array.isArray(seatData.data)) {
              seatData.data.forEach((seat: any) => {
                const slug = seat.workshopSlug;
                if (nextMap[slug]) {
                  // Update slots with real-time seat remaining
                  nextMap[slug] = nextMap[slug].map(schedule => 
                    schedule.id === seat.scheduleId 
                      ? { ...schedule, slots: Math.max(0, seat.seatsRemaining || schedule.slots) }
                      : schedule
                  );
                }
              });
            }
          }
        } catch (e) {
          console.warn('Could not fetch live seat availability:', e);
          // Continue with default slots if availability fetch fails
        }
        
        if (!cancelled) {
          setSchedulesByWorkshopId(nextMap);
        }
      } catch (e) {
        console.error('Error loading schedules:', e);
      }
    };
    
    loadSchedulesWithSeats();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const now = new Date();
  const sortedWorkshops = [...workshopCatalog].sort((a, b) => {
    const aNext = getNextUpcomingStartDateIso(schedulesByWorkshopId[a.slug], now);
    const bNext = getNextUpcomingStartDateIso(schedulesByWorkshopId[b.slug], now);
    const ad = toDateSafe(aNext);
    const bd = toDateSafe(bNext);

    // If both have upcoming dates, sort by date ascending (closest first)
    if (ad && bd) return ad.getTime() - bd.getTime();
    
    // If only one has an upcoming date, it comes first
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    
    // Neither has upcoming dates, sort by name
    return a.name.localeCompare(b.name);
  });

  // Filter workshops based on selected filters
  const filteredWorkshops = sortedWorkshops.filter((workshop: WorkshopOverview) => {
    const categoryMatch = !selectedCategory || workshop.category === selectedCategory;
    const workshopMatch = !selectedWorkshop || workshop.slug === selectedWorkshop;
    const modeMatch = !selectedMode || (workshop.mode && workshop.mode.includes(selectedMode));
    const languageMatch = !selectedLanguage || (workshop.language && workshop.language.includes(selectedLanguage));
    const currencyMatch = !selectedPayment || (workshop.currency && workshop.currency.includes(selectedPayment));

    return categoryMatch && workshopMatch && modeMatch && languageMatch && currencyMatch;
  });

  const categoryOptions = Array.from(new Set(workshopCatalog.map((w) => w.category))).sort((a, b) => a.localeCompare(b));
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

            {/* Filters Section - All in One Row */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-8 sm:mb-12">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Filter Workshops</h3>
                <p className="text-xs sm:text-sm text-gray-500">Find the perfect workshop for your journey</p>
              </div>

              {/* All Filters in One Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Category Filter */}
                <div className="border border-gray-200 rounded-lg overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccordionOpen((p) => {
                        // When opening category, close all other filters
                        if (!p.category) {
                          return { category: true, workshop: false, mode: false, language: false, currency: false };
                        }
                        return { ...p, category: !p.category };
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100"
                  >
                    <span>Category</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${accordionOpen.category ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.category && (
                    <div className="absolute top-full left-0 right-0 p-4 bg-white rounded-b-lg max-h-60 overflow-y-auto shadow-lg z-50">
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(null);
                            setCurrentPage(1);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                            !selectedCategory
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          All Categories
                        </button>
                        {categoryOptions.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(c);
                              setCurrentPage(1);
                              // Auto-open Workshop filter when category is selected
                              setAccordionOpen({ category: false, workshop: true, mode: false, language: false, currency: false });
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                              selectedCategory === c
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Accordion: Workshop */}
                <div className="border border-gray-200 rounded-lg overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccordionOpen((p) => {
                        // When opening workshop, close all other filters
                        if (!p.workshop) {
                          return { workshop: true, category: false, mode: false, language: false, currency: false };
                        }
                        return { ...p, workshop: !p.workshop };
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100"
                  >
                    <span>Workshops</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${accordionOpen.workshop ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.workshop && (
                    <div className="absolute top-full left-0 right-0 p-4 bg-white rounded-b-lg max-h-60 overflow-y-auto shadow-lg z-50">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkshop(null);
                            setCurrentPage(1);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                            !selectedWorkshop
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          All Workshops
                        </button>
                        {workshopFilterOptions
                          .filter(option => !selectedCategory || workshopCatalog.find(w => w.slug === option.slug && w.category === selectedCategory))
                          .map((option) => (
                          <button
                            key={option.slug}
                            type="button"
                            onClick={() => {
                              setSelectedWorkshop(option.slug);
                              setCurrentPage(1);
                              // Auto-open Mode filter when workshop is selected
                              setAccordionOpen({ category: false, workshop: false, mode: true, language: false, currency: false });
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left truncate ${
                              selectedWorkshop === option.slug
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                            }`}
                            title={option.name}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion: Mode */}
                <div className="border border-gray-200 rounded-lg overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccordionOpen((p) => {
                        // When opening mode, close all other filters
                        if (!p.mode) {
                          return { mode: true, category: false, workshop: false, language: false, currency: false };
                        }
                        return { ...p, mode: !p.mode };
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100"
                  >
                    <span>Mode</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${accordionOpen.mode ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.mode && (
                    <div className="absolute top-full left-0 right-0 p-4 bg-white rounded-b-lg max-h-60 overflow-y-auto shadow-lg z-50 space-y-2">
                      {['', 'Online', 'Offline', 'Residential', 'Recorded'].map((m) => (
                        <button
                          key={m || 'all'}
                          type="button"
                          onClick={() => {
                            setSelectedMode(m || null);
                            setCurrentPage(1);
                            // Auto-open Language filter when mode is selected
                            if (m) {
                              setAccordionOpen({ category: false, workshop: false, mode: false, language: true, currency: false });
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                            (selectedMode || '') === m
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {m ? m : 'All Modes'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accordion: Language */}
                <div className="border border-gray-200 rounded-lg overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccordionOpen((p) => {
                        // When opening language, close all other filters
                        if (!p.language) {
                          return { language: true, category: false, workshop: false, mode: false, currency: false };
                        }
                        return { ...p, language: !p.language };
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100"
                  >
                    <span>Language</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${accordionOpen.language ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.language && (
                    <div className="absolute top-full left-0 right-0 p-4 bg-white rounded-b-lg max-h-60 overflow-y-auto shadow-lg z-50 space-y-2">
                      {['', 'Hindi', 'English', 'Marathi'].map((l) => (
                        <button
                          key={l || 'all'}
                          type="button"
                          onClick={() => {
                            setSelectedLanguage(l || null);
                            setCurrentPage(1);
                            // Auto-open Currency filter when language is selected
                            if (l) {
                              setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: true });
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                            (selectedLanguage || '') === l
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {l ? l : 'All Languages'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accordion: Currency */}
                <div className="border border-gray-200 rounded-lg overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAccordionOpen((p) => {
                        // When opening currency, close all other filters
                        if (!p.currency) {
                          return { currency: true, category: false, workshop: false, mode: false, language: false };
                        }
                        return { ...p, currency: !p.currency };
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100"
                  >
                    <span>Currency</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${accordionOpen.currency ? 'rotate-180' : ''}`} />
                  </button>
                  {accordionOpen.currency && (
                    <div className="absolute top-full left-0 right-0 p-4 bg-white rounded-b-lg max-h-60 overflow-y-auto shadow-lg z-50 space-y-2">
                      {['', 'INR', 'USD', 'NPR'].map((c) => (
                        <button
                          key={c || 'all'}
                          type="button"
                          onClick={() => {
                            setSelectedPayment(c || null);
                            setCurrentPage(1);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-all text-left ${
                            (selectedPayment || '') === c
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {c ? c : 'All Currencies'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 sm:mt-6 flex flex-wrap gap-2">
                  {(selectedCategory || selectedMode || selectedLanguage || selectedPayment || selectedWorkshop) ? (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
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
                  ) : null}
                </div>

              {/* Filter Summary */}
              {(selectedCategory || selectedMode || selectedLanguage || selectedPayment || selectedWorkshop) && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                  <p className="text-gray-700 font-semibold mb-2 sm:mb-3 text-sm">Active Filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategory && (
                      <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm">
                        🗂️ {selectedCategory}
                        <button onClick={() => setSelectedCategory(null)} className="hover:text-indigo-900 ml-1">✕</button>
                      </span>
                    )}
                    {activeWorkshopLabel && (
                      <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm">
                        📚 {activeWorkshopLabel}
                        <button onClick={() => setSelectedWorkshop(null)} className="hover:text-primary-900 ml-1">✕</button>
                      </span>
                    )}
                    {selectedMode && (
                      <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm">
                        🎯 {selectedMode}
                        <button onClick={() => setSelectedMode(null)} className="hover:text-blue-900 ml-1">✕</button>
                      </span>
                    )}
                    {selectedLanguage && (
                      <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm">
                        🗣️ {selectedLanguage}
                        <button onClick={() => setSelectedLanguage(null)} className="hover:text-green-900 ml-1">✕</button>
                      </span>
                    )}
                    {selectedPayment && (
                      <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-semibold text-xs sm:text-sm">
                        💰 {selectedPayment}
                        <button onClick={() => setSelectedPayment(null)} className="hover:text-yellow-900 ml-1">✕</button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Workshop Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 sm:mb-12">
              {currentWorkshops.slice(0, 4).map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group flex flex-col border border-gray-100"
                >
                  {/* Workshop Image */}
                  <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={workshop.image}
                      alt={workshop.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Level Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1.5 rounded-full text-white text-[10px] font-bold bg-purple-500/90 backdrop-blur-sm shadow-sm">
                        {workshop.level}
                      </span>
                    </div>
                  </div>

                  {/* Workshop Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-base font-bold text-gray-800 mb-1 line-clamp-1">
                      {workshop.name}
                    </h3>
                    <p className="text-gray-500 text-[10px] font-semibold mb-2">
                      Duration - {workshop.duration}
                    </p>
                    <p className="text-gray-600 text-xs mb-4 line-clamp-2 leading-relaxed h-8">
                      {workshop.description}
                    </p>

                    {(() => {
                      const schedules = schedulesByWorkshopId[workshop.slug] || [];
                      const nextSchedule = schedules.length > 0 ? schedules[0] : null;
                      const nextStartDate = nextSchedule ? formatDate(nextSchedule.startDate) : 'TBA';
                      const totalSlots = schedules.reduce((sum, s) => sum + (s.slots || 0), 0);
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const registrationCloseDate = nextSchedule?.registrationCloseDate 
                        ? new Date(nextSchedule.registrationCloseDate + 'T00:00:00Z')
                        : null;
                      const isAdmissionOpen = registrationCloseDate ? registrationCloseDate.getTime() >= today.getTime() : true;
                      
                      return (
                        <div className="mt-auto space-y-3">
                          {/* CTA Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/workshops/${workshop.slug}/landing`}
                              className="bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 py-2 rounded-lg transition-all duration-300 font-bold flex items-center justify-center gap-1 group/btn text-[10px]"
                            >
                              Learn More
                              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                              href={`/registernow?workshop=${encodeURIComponent(workshop.slug)}`}
                              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-all duration-300 font-bold flex items-center justify-center text-[10px]"
                            >
                              Register Now
                            </Link>
                          </div>

                          {/* Fee Box */}
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px]">
                            <span className="text-gray-500 font-bold">Fee</span>
                            <span className="text-green-700 font-black">
                              {WORKSHOP_FEES[workshop.slug]
                                ? WORKSHOP_FEES[workshop.slug].minPrice === WORKSHOP_FEES[workshop.slug].maxPrice
                                  ? formatPrice(WORKSHOP_FEES[workshop.slug].minPrice, selectedPayment)
                                  : `₹${WORKSHOP_FEES[workshop.slug].minPrice.toLocaleString('en-IN')} - ${formatPrice(WORKSHOP_FEES[workshop.slug].maxPrice, selectedPayment)}`
                                : 'Contact us'}
                            </span>
                          </div>

                          {/* Date & Admission Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center">
                              <span className="text-gray-500 font-bold text-[9px]">Start</span>
                              <div className="text-blue-700 font-black text-[10px]">{nextStartDate}</div>
                            </div>
                            <div className={`px-3 py-2 rounded-lg border flex flex-col items-center ${isAdmissionOpen ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                              <span className="text-gray-500 font-bold text-[9px]">Admission</span>
                              <div className={`font-black text-[10px] ${isAdmissionOpen ? 'text-green-700' : 'text-red-700'}`}>
                                {isAdmissionOpen ? 'Open' : 'Closed'}
                              </div>
                            </div>
                          </div>

                          {/* Slots Info */}
                          <div className="text-center">
                            <span className="font-bold text-[11px] text-gray-900">
                              Slots: {totalSlots} Available
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}

              {/* Creative Glossy Divider - Row 2 starts after this */}
              {currentWorkshops.length > 4 && (
                <div className="col-span-full py-16 relative flex items-center justify-center overflow-hidden">
                   {/* Background Glossy Shine */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 bg-gradient-to-r from-transparent via-white/80 to-transparent blur-2xl"></div>
                  
                  {/* Floating Glass Label */}
                  <div className="relative z-10 px-8 py-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl shadow-gray-200/50 group hover:scale-105 transition-transform cursor-default text-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                      <span className="w-8 h-px bg-gray-300"></span>
                      All Programs
                      <span className="w-8 h-px bg-gray-300"></span>
                    </span>
                  </div>

                  {/* Shimmer Effect */}
                  <div className="absolute top-0 left-[-100%] h-full w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-pulse"></div>
                </div>
              )}

              {currentWorkshops.slice(4).map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group flex flex-col border border-gray-100"
                >
                  {/* Workshop Image */}
                  <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-200 flex-shrink-0">
                    <Image
                      src={workshop.image}
                      alt={workshop.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Level Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1.5 rounded-full text-white text-[10px] font-bold bg-purple-500/90 backdrop-blur-sm shadow-sm">
                        {workshop.level}
                      </span>
                    </div>
                  </div>

                  {/* Workshop Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-base font-bold text-gray-800 mb-1 line-clamp-1">
                      {workshop.name}
                    </h3>
                    <p className="text-gray-500 text-[10px] font-semibold mb-2">
                      Duration - {workshop.duration}
                    </p>
                    <p className="text-gray-600 text-xs mb-4 line-clamp-2 leading-relaxed h-8">
                      {workshop.description}
                    </p>

                    {(() => {
                      const schedules = schedulesByWorkshopId[workshop.slug] || [];
                      const nextSchedule = schedules.length > 0 ? schedules[0] : null;
                      const nextStartDate = nextSchedule ? formatDate(nextSchedule.startDate) : 'TBA';
                      const totalSlots = schedules.reduce((sum, s) => sum + (s.slots || 0), 0);
                      
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const registrationCloseDate = nextSchedule?.registrationCloseDate 
                        ? new Date(nextSchedule.registrationCloseDate + 'T00:00:00Z')
                        : null;
                      const isAdmissionOpen = registrationCloseDate ? registrationCloseDate.getTime() >= today.getTime() : true;
                      
                      return (
                        <div className="mt-auto space-y-3">
                          {/* CTA Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/workshops/${workshop.slug}/landing`}
                              className="bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 py-2 rounded-lg transition-all duration-300 font-bold flex items-center justify-center gap-1 group/btn text-[10px]"
                            >
                              Learn More
                              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                              href={`/registernow?workshop=${encodeURIComponent(workshop.slug)}`}
                              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-all duration-300 font-bold flex items-center justify-center text-[10px]"
                            >
                              Register Now
                            </Link>
                          </div>

                          {/* Fee Box */}
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px]">
                            <span className="text-gray-500 font-bold">Fee</span>
                            <span className="text-green-700 font-black">
                              {WORKSHOP_FEES[workshop.slug]
                                ? WORKSHOP_FEES[workshop.slug].minPrice === WORKSHOP_FEES[workshop.slug].maxPrice
                                  ? formatPrice(WORKSHOP_FEES[workshop.slug].minPrice, selectedPayment)
                                  : `₹${WORKSHOP_FEES[workshop.slug].minPrice.toLocaleString('en-IN')} - ${formatPrice(WORKSHOP_FEES[workshop.slug].maxPrice, selectedPayment)}`
                                : 'Contact us'}
                            </span>
                          </div>

                          {/* Date & Admission Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center">
                              <span className="text-gray-500 font-bold text-[9px]">Start</span>
                              <div className="text-blue-700 font-black text-[10px]">{nextStartDate}</div>
                            </div>
                            <div className={`px-3 py-2 rounded-lg border flex flex-col items-center ${isAdmissionOpen ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                              <span className="text-gray-500 font-bold text-[9px]">Admission</span>
                              <div className={`font-black text-[10px] ${isAdmissionOpen ? 'text-green-700' : 'text-red-700'}`}>
                                {isAdmissionOpen ? 'Open' : 'Closed'}
                              </div>
                            </div>
                          </div>

                          {/* Slots Info */}
                          <div className="text-center">
                            <span className="font-bold text-[11px] text-gray-900">
                              Slots: {totalSlots} Available
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-8 sm:mt-12 md:mt-16 pt-8 sm:pt-12 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-600 mb-1 sm:mb-2">{totalWorkshops}</div>
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
