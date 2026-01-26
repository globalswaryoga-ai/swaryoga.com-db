'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { workshopCatalog, WorkshopOverview, workshopDetails } from '@/lib/workshopsData';
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';

export const dynamic = 'force-dynamic';

// Fee mapping for all workshops
const WORKSHOP_FEES: Record<string, { minPrice: number; maxPrice: number; currency: string }> = {
  'swar-yoga-basic-program': { minPrice: 145, maxPrice: 145, currency: 'INR' },
  'swar-yoga-basic': { minPrice: 96, maxPrice: 96, currency: 'INR' },
  'master-swar-yoga': { minPrice: 1500, maxPrice: 1500, currency: 'INR' },
  'yogasana-sadhana': { minPrice: 5400, maxPrice: 5400, currency: 'INR' },
  'swar-yoga-level-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-3': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-4': { minPrice: 6000, maxPrice: 6000, currency: 'INR' },
  '96-days-weight-loss': { minPrice: 6600, maxPrice: 6600, currency: 'INR' },
  '42-days-meditation': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'amrut-aahar': { minPrice: 7200, maxPrice: 7200, currency: 'INR' },
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
  'astavakra': { minPrice: 21000, maxPrice: 21000, currency: 'INR' },
  'self-awareness': { minPrice: 35000, maxPrice: 35000, currency: 'INR' },
  'swy-children': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'corporate-swy': { minPrice: 15000, maxPrice: 15000, currency: 'INR' },
  'happy-marriage': { minPrice: 8400, maxPrice: 8400, currency: 'INR' },
  'gurukul-training': { minPrice: 51000, maxPrice: 51000, currency: 'INR' },
  'swy-teacher': { minPrice: 12500, maxPrice: 12500, currency: 'INR' },
  'gurukul-organiser-training': { minPrice: 25000, maxPrice: 25000, currency: 'INR' },
  'naturopathy': { minPrice: 11000, maxPrice: 11000, currency: 'INR' },
  'meditation': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'weight-loss': { minPrice: 3500, maxPrice: 3500, currency: 'INR' },
  'pre-pregnancy': { minPrice: 15000, maxPrice: 15000, currency: 'INR' },
  'complete-health': { minPrice: 21000, maxPrice: 21000, currency: 'INR' },
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
  currency?: string;
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

function toDateOnlyIso(isoDate: string | undefined | null): string | null {
  if (!isoDate) return null;
  // Accept either YYYY-MM-DD or full ISO timestamps (YYYY-MM-DDTHH:mm:ss.sssZ)
  const m = String(isoDate).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function toDateSafe(isoDate: string | undefined | null): Date | null {
  const dateOnly = toDateOnlyIso(isoDate);
  if (!dateOnly) return null;
  const d = new Date(`${dateOnly}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getNextUpcomingSchedule(schedules: ApiWorkshopSchedule[] | undefined, now: Date): ApiWorkshopSchedule | null {
  if (!schedules || schedules.length === 0) return null;
  const todayIso = now.toISOString().slice(0, 10);
  const upcoming = schedules
    .map((s) => ({ s, startDateOnly: toDateOnlyIso(s.startDate) }))
    .filter((x): x is { s: ApiWorkshopSchedule; startDateOnly: string } => !!x.startDateOnly)
    // Compare using date-only semantics so a schedule starting today still counts as upcoming.
    .filter((x) => x.startDateOnly >= todayIso)
    .sort((a, b) => a.startDateOnly.localeCompare(b.startDateOnly));
  return upcoming.length ? upcoming[0].s : null;
}

function getNextUpcomingStartDateIso(schedules: ApiWorkshopSchedule[] | undefined, now: Date): string | null {
  const next = getNextUpcomingSchedule(schedules, now);
  return next ? toDateOnlyIso(next.startDate) : null;
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
  const dateOnly = toDateOnlyIso(isoDate);
  if (!dateOnly) return 'TBA';
  try {
    const date = new Date(dateOnly + 'T00:00:00Z');
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
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const workshopsPerPage = 20; // 5 rows of 4 cards
  const [searchTerm, setSearchTerm] = useState('');
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [schedulesByWorkshopId, setSchedulesByWorkshopId] = useState<Record<string, ApiWorkshopSchedule[]>>({});
  const [enrollModal, setEnrollModal] = useState<{ isOpen: boolean; workshopSlug: string | null; workshopName: string | null }>({
    isOpen: false,
    workshopSlug: null,
    workshopName: null,
  });
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' });
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';
  const activeWorkshopLabel = selectedWorkshop
    ? workshopCatalog.find((workshop) => workshop.slug === selectedWorkshop)?.name
    : null;

  // Check if user is logged in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    }
  }, []);

  // Filter ONLY basic program and master class
  const filteredWorkshopsList = useMemo(() => {
    return workshopCatalog.filter(w => 
      w.slug === 'swar-yoga-basic-program' || 
      w.slug === 'master-swar-yoga'
    );
  }, []);

  const totalWorkshops = filteredWorkshopsList.length;

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
        const nextMap: Record<string, ApiWorkshopSchedule[]> = {};
        
        // 1. Fetch published schedules from API (Source of Truth)
        try {
          const res = await fetch('/api/workshops/schedules', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              json.data.forEach((s: any) => {
                const slug = s.workshopSlug;
                if (!nextMap[slug]) nextMap[slug] = [];
                nextMap[slug].push({
                  id: s.id,
                  startDate: s.startDate,
                  endDate: s.endDate,
                  registrationCloseDate: s.registrationCloseDate || s.endDate,
                  time: s.time || '',
                  mode: s.mode,
                  language: s.language || 'Hindi',
                  location: s.location || null,
                  slots: typeof s.seatsTotal === 'number' ? s.seatsTotal : 0,
                  price: s.price,
                  currency: s.currency,
                });
              });
            }
          }
        } catch (err) {
          console.error('Failed to fetch schedules from API:', err);
        }
        
        // 2. Fetch real-time seat availability to update slots
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
                      ? { ...schedule, slots: Math.max(0, seat.seatsRemaining ?? schedule.slots) }
                      : schedule
                  );
                }
              });
            }
          }
        } catch (e) {
          console.warn('Could not fetch live seat availability:', e);
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

  // Pin the first four workshops in a specific order (as requested).
  // We keep the remaining workshops in their existing sorted order.
  const PINNED_FIRST_WORKSHOP_SLUGS = [
    // 1st card
    'swar-yoga-basic',
    // 2nd card
    'master-swar-yoga',
    // keep the other previously pinned items after these two
    'pre-pregnancy',
    'weight-loss',
  ];

  // Ensure correct order: swar-yoga-basic-program first, master-swar-yoga second, then weight-loss and others
  const workshopsForDisplay = [
    sortedWorkshops.find(w => w.slug === 'swar-yoga-basic-program'),
    sortedWorkshops.find(w => w.slug === 'master-swar-yoga'),
    sortedWorkshops.find(w => w.slug === 'weight-loss'),
    sortedWorkshops.find(w => w.slug === '96-days-weight-loss'),
    sortedWorkshops.find(w => w.slug === 'pre-pregnancy'),
    // Include remaining workshops that aren't already pinned
    ...sortedWorkshops.filter(w => 
      !['swar-yoga-basic-program', 'master-swar-yoga', 'weight-loss', '96-days-weight-loss', 'pre-pregnancy'].includes(w.slug)
    ),
  ].filter((w): w is WorkshopOverview => w !== undefined);

  // Filter workshops based on selected filters
  const filteredWorkshops = workshopsForDisplay.filter((workshop: WorkshopOverview) => {
    const q = searchTerm.trim().toLowerCase();
    const textMatch =
      !q ||
      [workshop.name, workshop.slug, workshop.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    const categoryMatch = !selectedCategory || workshop.category === selectedCategory;
    const workshopMatch = !selectedWorkshop || workshop.slug === selectedWorkshop;
    const modeMatch = !selectedMode || (workshop.mode && workshop.mode.includes(selectedMode));
    const languageMatch = !selectedLanguage || (workshop.language && workshop.language.includes(selectedLanguage));
    const currencyMatch = !selectedPayment || (workshop.currency && workshop.currency.includes(selectedPayment));

    return textMatch && categoryMatch && workshopMatch && modeMatch && languageMatch && currencyMatch;
  });

  const categoryOptions = Array.from(new Set(workshopsForDisplay.map((w) => w.category))).sort((a, b) => a.localeCompare(b));
  const totalPages = Math.ceil(filteredWorkshops.length / workshopsPerPage);
  const startIndex = (currentPage - 1) * workshopsPerPage;
  const endIndex = startIndex + workshopsPerPage;
  const currentWorkshops = filteredWorkshops.slice(startIndex, endIndex);

  // Handle enrollment form submission
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!enrollForm.name.trim() || !enrollForm.email.trim() || !enrollForm.phone.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!enrollModal.workshopSlug) return;

    try {
      // Save lead to database
      const response = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enrollForm.name,
          email: enrollForm.email,
          phone: enrollForm.phone,
          workshopName: enrollModal.workshopName,
          workshopSlug: enrollModal.workshopSlug,
          source: 'workshop-listing',
          status: 'lead',
        }),
      });

      if (response.ok) {
        // Redirect to payment page
        const paymentLink = getWorkshopPaymentLink(enrollModal.workshopSlug, 'online', 'hindi');
        if (paymentLink) {
          window.open(paymentLink, '_blank');
        }
        setEnrollModal({ isOpen: false, workshopSlug: null, workshopName: null });
        setEnrollForm({ name: '', email: '', phone: '' });
      } else {
        alert('Failed to save enrollment. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[60vh] sm:min-h-[70vh] flex items-center overflow-hidden pt-32">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.pexels.com/photos/3822864/pexels-photo-3822864.jpeg"
              alt="Meditation Swar Yoga"
              fill
              priority
              className="object-cover scale-105"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl animate-fade-in-up">
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-500/20 backdrop-blur-md rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary-400" />
                  </div>
                  <span className="text-primary-400 font-bold tracking-widest text-sm uppercase">Global Learning</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                  Master the Art of <span className="text-primary-400">Swar Yoga</span>
                </h1>
              </div>

              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-10">
                Join thousands of practitioners in our transformative programs. Experience the ancient science of breath through deep meditation and personalized guidance.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-8 py-4 rounded-2xl transition-all duration-300 group shadow-xl shadow-primary-900/20 font-bold"
                >
                  View Schedule
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex -space-x-4 items-center ml-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <span className="ml-4 text-white/80 text-sm font-medium">+2,000 students joined</span>
                </div>
              </div>
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

            {/* Search */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="workshop-search">
                Search workshops
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="workshop-search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Type a workshop name…"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
                {searchTerm.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="shrink-0 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-sm text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Searches by name, category, or URL slug.
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
                        {workshopCatalog
                          .filter(w => w.slug === 'swar-yoga-basic-program' || w.slug === 'master-swar-yoga')
                          .filter(option => !selectedCategory || option.category === selectedCategory)
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {currentWorkshops.map((workshop) => {
                const schedules = schedulesByWorkshopId[workshop.slug] || [];
                const nextSchedule = getNextUpcomingSchedule(schedules, now);
                const nextStartIso = nextSchedule ? toDateOnlyIso(nextSchedule.startDate) : null;
                const startingPrice = getStartingPrice(schedules);
                const scheduleCurrency = (nextSchedule?.currency || schedules.find((s) => !!s.currency)?.currency || null) as string | null;
                const currency = scheduleCurrency || (workshop.currency && workshop.currency[0]) || WORKSHOP_FEES[workshop.slug]?.currency || 'INR';
                const displayPrice =
                  (typeof startingPrice === 'number' && startingPrice > 0)
                    ? formatPrice(startingPrice, currency)
                    : (WORKSHOP_FEES[workshop.slug]
                      ? formatPrice(WORKSHOP_FEES[workshop.slug].minPrice, WORKSHOP_FEES[workshop.slug].currency)
                      : null);

                return (
                  <div
                    key={workshop.slug}
                    className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={workshop.image}
                        alt={workshop.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
                          {workshop.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                        {workshop.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {workshop.description}
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mb-4">
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <div className="text-gray-500 font-semibold">Duration</div>
                          <div className="text-gray-900 font-bold">{workshop.duration}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                          <div className="text-gray-500 font-semibold">Level</div>
                          <div className="text-gray-900 font-bold">{workshop.level}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500 font-semibold">Next batch</div>
                          <div className="text-sm font-bold text-gray-900">
                            {nextStartIso ? formatDate(nextStartIso) : 'TBA'}
                          </div>
                          {nextSchedule ? (
                            <div className="mt-1 text-xs text-gray-600 font-semibold truncate">
                              {nextSchedule.time ? `${nextSchedule.time}` : null}
                              {typeof nextSchedule.slots === 'number' && nextSchedule.slots > 0 ? (
                                <span className="ml-2 text-gray-500 font-semibold">• Seats: {nextSchedule.slots}</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 font-semibold">From</div>
                          <div className="text-sm font-bold text-primary-700">
                            {displayPrice || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {/* Learn More Button - Goes to Landing Page */}
                        <Link
                          href={`/workshops/${workshop.slug}/landing`}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-3 font-bold transition"
                        >
                          Learn More
                          <ArrowRight className="w-4 h-4" />
                        </Link>

                        {/* Register Now Button - Go to Registration Page */}
                        <button
                          type="button"
                          onClick={() => router.push(`/registration/online/hindi/${workshop.slug}`)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white px-4 py-3 font-bold transition"
                        >
                          📝 Register Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm border transition active:scale-95 ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                  }`}
                >
                  Prev
                </button>
                <div className="px-3 py-2 text-sm text-gray-600 font-semibold">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm border transition active:scale-95 ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

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
