'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, ChevronDown, Calendar, Clock, Users, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { workshopCatalog, WorkshopOverview, workshopDetails } from '@/lib/workshopsData';
import { getWorkshopPaymentLink } from '@/lib/workshops/workshopPaymentConfig';
import { addCartItem } from '@/lib/cart';
import PaymentMethodPopup from '@/components/PaymentMethodPopup';

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
  price3Month?: number;
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

function formatDateShort(isoDate: string): string {
  const dateOnly = toDateOnlyIso(isoDate);
  if (!dateOnly) return 'TBA';
  try {
    const date = new Date(dateOnly + 'T00:00:00Z');
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  } catch {
    return 'TBA';
  }
}

function getMonthYear(isoDate: string): string {
  const dateOnly = toDateOnlyIso(isoDate);
  if (!dateOnly) return 'TBA';
  try {
    const date = new Date(dateOnly + 'T00:00:00Z');
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return 'TBA';
  }
}

function getBatchIcon(time: string | undefined): string {
  if (!time) return '⏰';
  const timeLower = time.toLowerCase();
  let hour = parseInt(time.split(':')[0] || '12', 10);
  // Handle 12-hour format with AM/PM
  if (timeLower.includes('pm') && hour !== 12) hour += 12;
  if (timeLower.includes('am') && hour === 12) hour = 0;
  if (hour >= 4 && hour < 9) return '🌅'; // Early morning / Morning
  if (hour >= 9 && hour < 12) return '☀️'; // Late morning
  if (hour >= 12 && hour < 17) return '🌤️'; // Afternoon
  if (hour >= 17 && hour < 21) return '🌙'; // Evening
  return '🌃'; // Night
}

function getBatchLabel(time: string | undefined): string {
  if (!time) return 'Batch';
  const timeLower = time.toLowerCase();
  let hour = parseInt(time.split(':')[0] || '12', 10);
  // Handle 12-hour format with AM/PM
  if (timeLower.includes('pm') && hour !== 12) hour += 12;
  if (timeLower.includes('am') && hour === 12) hour = 0;
  if (hour >= 4 && hour < 9) return 'Morning';
  if (hour >= 9 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
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
  
  // Payment method selection popup state
  const [paymentPopup, setPaymentPopup] = useState<{
    isOpen: boolean;
    workshop: any;
    schedule: any;
  }>({
    isOpen: false,
    workshop: null,
    schedule: null,
  });
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
              const todayIso = new Date().toISOString().slice(0, 10);
              json.data.forEach((s: any) => {
                // Auto-hide a schedule once its workshop has ended, so expired
                // batches don't keep showing on the public site.
                const endDateOnly = toDateOnlyIso(s.endDate || s.startDate);
                if (endDateOnly && endDateOnly < todayIso) return;

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
                  price3Month: s.price3Month,
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

  // Flagship workshops always lead the list (if they have a published
  // schedule); every other workshop with a published schedule follows.
  const PINNED_FIRST_WORKSHOP_SLUGS = [
    'master-swar-yoga',
    'weight-loss',
    'pre-pregnancy',
  ];

  const workshopsWithSchedules = sortedWorkshops.filter(
    (w) => (schedulesByWorkshopId[w.slug]?.length ?? 0) > 0
  );

  const workshopsForDisplay = [
    ...PINNED_FIRST_WORKSHOP_SLUGS
      .map((slug) => workshopsWithSchedules.find((w) => w.slug === slug))
      .filter((w): w is WorkshopOverview => w !== undefined),
    ...workshopsWithSchedules.filter((w) => !PINNED_FIRST_WORKSHOP_SLUGS.includes(w.slug)),
  ];

  const totalWorkshops = workshopsForDisplay.length;

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

  // Handle payment method selection from popup
  const handlePaymentMethodSelect = (method: 'india' | 'nepal' | 'usd') => {
    const { workshop, schedule } = paymentPopup;
    if (!workshop || !schedule) return;

    if (method === 'nepal') {
      // Redirect to Nepal QR payment page
      const params = new URLSearchParams({
        workshop: workshop.slug,
        schedule: schedule.id,
        name: workshop.name,
        price: String(schedule.price),
        startDate: schedule.startDate,
        time: schedule.time || '',
      });
      router.push(`/pay-nepal?${params.toString()}`);
    } else {
      // India or USD - add to cart and go to checkout
      const currency = method === 'usd' ? 'USD' : 'INR';
      addCartItem({
        id: `${workshop.slug}-${schedule.id}`,
        name: workshop.name,
        price: schedule.price,
        quantity: 1,
        currency: currency as 'INR' | 'USD' | 'NPR',
        workshopSlug: workshop.slug,
        scheduleId: schedule.id,
        language: schedule.language,
        mode: schedule.mode,
        metadata: {
          startDate: schedule.startDate,
          time: schedule.time,
          price3Month: schedule.price3Month,
        },
      });
      router.push('/checkout-enhanced');
    }
    
    setPaymentPopup({ isOpen: false, workshop: null, schedule: null });
  };

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
        <section className="py-8 sm:py-16 md:py-24 bg-gray-50 overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="text-center mb-8 sm:mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
                Explore Our Workshops
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
                Each workshop is carefully designed by yoga masters to provide authentic learning and personal transformation.
              </p>
            </div>

            {/* Workshop Schedules - Monthly Table View */}
            {(() => {
              // Gather all upcoming schedules across all workshops
              const todayIso = now.toISOString().slice(0, 10);
              const allSchedules: Array<{
                workshop: WorkshopOverview;
                schedule: ApiWorkshopSchedule;
                monthKey: string;
              }> = [];

              workshopsForDisplay.forEach((workshop) => {
                const schedules = schedulesByWorkshopId[workshop.slug] || [];
                schedules.forEach((schedule) => {
                  const startDateOnly = toDateOnlyIso(schedule.startDate);
                  if (startDateOnly && startDateOnly >= todayIso) {
                    allSchedules.push({
                      workshop,
                      schedule,
                      monthKey: getMonthYear(schedule.startDate),
                    });
                  }
                });
              });

              // Sort by date
              allSchedules.sort((a, b) => {
                const aDate = toDateOnlyIso(a.schedule.startDate) || '';
                const bDate = toDateOnlyIso(b.schedule.startDate) || '';
                return aDate.localeCompare(bDate);
              });

              // Group by month
              const byMonth: Record<string, typeof allSchedules> = {};
              allSchedules.forEach((item) => {
                if (!byMonth[item.monthKey]) byMonth[item.monthKey] = [];
                byMonth[item.monthKey].push(item);
              });

              const monthKeys = Object.keys(byMonth);

              if (monthKeys.length === 0) {
                return (
                  <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Upcoming Schedules</h3>
                    <p className="text-gray-600">New batches will be announced soon. Stay tuned!</p>
                  </div>
                );
              }

              return (
                <div className="space-y-8">
                  {monthKeys.map((monthKey) => (
                    <div key={monthKey} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                      {/* Month Header */}
                      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 sm:px-6 py-4">
                        <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {monthKey} Updates
                        </h3>
                      </div>

                      {/* Schedule Rows */}
                      <div className="divide-y divide-gray-100 overflow-x-auto">
                        {byMonth[monthKey].map((item, idx) => {
                          const { workshop, schedule } = item;
                          const isOpen = schedule.slots > 0;
                          const regCloseDate = toDateOnlyIso(schedule.registrationCloseDate);
                          const isClosed = regCloseDate ? regCloseDate < todayIso : false;
                          const status = isClosed ? 'Closed' : isOpen ? 'Open' : 'Full';
                          const statusColor = isClosed ? 'bg-red-100 text-red-700' : isOpen ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                          
                          // Calculate remaining days until registration closes
                          let remainingDays = 0;
                          if (regCloseDate && !isClosed) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const closeDate = new Date(regCloseDate);
                            closeDate.setHours(0, 0, 0, 0);
                            remainingDays = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          }

                          return (
                            <div key={`${workshop.slug}-${schedule.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                              {/* Desktop View - 2 Rows */}
                              <div className="hidden md:block min-w-[800px]">
                                {/* Row 1: Workshop Info */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                                  <div className="col-span-2 text-sm font-semibold text-gray-600">
                                    {getMonthYear(schedule.startDate).split(' ')[0]}
                                  </div>
                                  <div className="col-span-4 text-sm font-bold text-gray-900 truncate" title={workshop.name}>
                                    {workshop.name}
                                  </div>
                                  <div className="col-span-2 text-sm text-gray-700 flex items-center gap-1">
                                    🗣️ {schedule.language || 'Hindi'}
                                  </div>
                                  <div className="col-span-2 text-sm text-gray-700 flex items-center gap-1">
                                    <Users className="w-4 h-4" /> {schedule.slots} slots
                                  </div>
                                  <div className="col-span-2 flex items-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                      {status === 'Open' ? '🟢' : status === 'Closed' ? '🔴' : '🟡'} {status}
                                    </span>
                                    {status === 'Open' && remainingDays > 0 && (
                                      <span className="text-xs font-bold text-red-600">
                                        {remainingDays} day{remainingDays !== 1 ? 's' : ''} left
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Row 2: Schedule Details + Actions */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                  <div className="col-span-2 text-sm font-bold text-primary-700">
                                    📅 {formatDateShort(schedule.startDate)}
                                  </div>
                                  <div className="col-span-2 text-sm text-gray-700">
                                    {getBatchIcon(schedule.time)} {getBatchLabel(schedule.time)}
                                  </div>
                                  <div className="col-span-2 text-sm text-gray-700 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> {schedule.time || 'TBA'}
                                  </div>
                                  <div className="col-span-2 text-sm font-bold text-gray-900">
                                    {formatPrice(schedule.price, schedule.currency || 'INR')}
                                  </div>
                                  <div className="col-span-4 flex gap-2 justify-end">
                                    <Link
                                      href={`/workshops/${workshop.slug}/landing`}
                                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
                                    >
                                      Learn More <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <button
                                      type="button"
                                      disabled={status !== 'Open'}
                                      onClick={() => {
                                        // Show payment method popup
                                        setPaymentPopup({
                                          isOpen: true,
                                          workshop,
                                          schedule,
                                        });
                                      }}
                                      className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
                                        status === 'Open'
                                          ? 'bg-green-600 hover:bg-green-700 text-white'
                                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}
                                    >
                                      📝 Register Now
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile View - 3 Rows (Stacked) */}
                              <div className="md:hidden p-4 space-y-3">
                                {/* Row 1: Workshop Name + Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{workshop.name}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                      <span>🗣️ {schedule.language || 'Hindi'}</span>
                                      <span>•</span>
                                      <span><Users className="w-3 h-3 inline" /> {schedule.slots}</span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                      {status === 'Open' ? '🟢' : status === 'Closed' ? '🔴' : '🟡'} {status}
                                    </span>
                                    {status === 'Open' && remainingDays > 0 && (
                                      <span className="text-[10px] font-bold text-red-600">
                                        {remainingDays}d left
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Row 2: Date, Time, Price */}
                                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="font-bold text-primary-700">📅 {formatDateShort(schedule.startDate)}</span>
                                    <span className="text-gray-600">{getBatchIcon(schedule.time)} {getBatchLabel(schedule.time)}</span>
                                  </div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {formatPrice(schedule.price, schedule.currency || 'INR')}
                                  </div>
                                </div>

                                {/* Row 3: Action Buttons */}
                                <div className="flex gap-2">
                                  <Link
                                    href={`/workshops/${workshop.slug}/landing`}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
                                  >
                                    Learn More <ArrowRight className="w-4 h-4" />
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={status !== 'Open'}
                                    onClick={() => {
                                      // Show payment method popup
                                      setPaymentPopup({
                                        isOpen: true,
                                        workshop,
                                        schedule,
                                      });
                                    }}
                                    className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-sm font-bold transition ${
                                      status === 'Open'
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    📝 Register
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

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
      
      {/* Payment Method Selection Popup */}
      <PaymentMethodPopup
        isOpen={paymentPopup.isOpen}
        onClose={() => setPaymentPopup({ isOpen: false, workshop: null, schedule: null })}
        onSelect={handlePaymentMethodSelect}
        workshopName={paymentPopup.workshop?.name}
      />
      
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
