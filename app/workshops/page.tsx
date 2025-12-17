'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, Heart, TrendingUp, Users, Baby, ChevronDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { workshopCatalog, workshopDetails, WorkshopOverview, type Schedule } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

// Workshop categories
const WORKSHOP_CATEGORIES = [
  {
    id: 'health',
    name: 'Health',
    icon: Heart,
    description: 'Workshops focused on physical health, wellness, and fitness',
    color: 'from-red-500 to-pink-500'
  },
  {
    id: 'wealth',
    name: 'Wealth',
    icon: TrendingUp,
    description: 'Programs for prosperity, abundance, and financial wellness',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'married',
    name: 'Married',
    icon: Users,
    description: 'Workshops for couples and family harmony',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'youth',
    name: 'Youth & Children',
    icon: Baby,
    description: 'Programs designed for young people and children',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'trainings',
    name: 'Trainings',
    icon: BookOpen,
    description: 'Professional training and certification programs',
    color: 'from-orange-500 to-red-500'
  }
];

function WorkshopsPageInner() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [availabilityByKey, setAvailabilityByKey] = useState<Record<string, number>>({});
  const [dbSchedulesBySlug, setDbSchedulesBySlug] = useState<Record<string, Schedule[]>>({});
  const [accordionOpen, setAccordionOpen] = useState({
    category: false,
    workshop: false,
    mode: false,
    language: false,
    currency: false
  });
  
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';
  const totalWorkshops = workshopCatalog.length;

  const selectedCategoryName = selectedCategory
    ? (WORKSHOP_CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? selectedCategory)
    : null;

  const selectedWorkshopName = selectedWorkshop
    ? (workshopCatalog.find((w) => w.slug === selectedWorkshop)?.name ?? selectedWorkshop)
    : null;

  useEffect(() => {
    if (!searchParams) return;
    setSelectedCategory(searchParams.get('category') || null);
    setSelectedMode(searchParams.get('mode') || null);
    setSelectedLanguage(searchParams.get('language') || null);
  }, [queryString, searchParams]);

  // Load published schedules from MongoDB (public endpoint).
  // This ensures admin updates are reflected on the main workshops page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workshops/schedules', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');

        const list = Array.isArray(json?.data) ? (json.data as any[]) : [];
        const map: Record<string, Schedule[]> = {};

        for (const raw of list) {
          const workshopSlug = String(raw?.workshopSlug || '').trim();
          const mode = String(raw?.mode || '').trim().toLowerCase() as Schedule['mode'];
          const id = String(raw?.id || raw?._id || '').trim();
          const startDate = raw?.startDate ? String(raw.startDate) : '';
          const endDate = raw?.endDate ? String(raw.endDate) : '';
          if (!workshopSlug || !id || !startDate) continue;

          // Ensure mode is one of the supported keys; skip unknown modes.
          if (!['online', 'offline', 'residential', 'recorded'].includes(mode)) continue;

          const seats = Number.isFinite(Number(raw?.seatsTotal))
            ? Number(raw.seatsTotal)
            : Number.isFinite(Number(raw?.slots))
              ? Number(raw.slots)
              : 60;

          const price = Number.isFinite(Number(raw?.price)) ? Number(raw.price) : 0;
          const currency = String(raw?.currency || 'INR').toUpperCase();
          const time = String(raw?.time || '').trim() || 'TBD';
          const location = raw?.location ? String(raw.location) : undefined;

          const s: Schedule = {
            id,
            mode,
            startDate,
            endDate: endDate || startDate,
            time,
            seats,
            price,
            currency,
            location,
          };

          if (!map[workshopSlug]) map[workshopSlug] = [];
          map[workshopSlug].push(s);
        }

        // Sort schedules by date for stable picking.
        for (const slug of Object.keys(map)) {
          map[slug].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
        }

        if (cancelled) return;
        setDbSchedulesBySlug(map);
      } catch (e) {
        // Non-fatal. We'll fall back to static schedules.
        console.error('Failed to load workshop schedules', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Chained UX (robust): selecting a value auto-opens the next dropdown.
  // This avoids "sometimes it doesn't open" issues due to event timing/batching.
  useEffect(() => {
    if (!selectedCategory) return;
    setAccordionOpen({ category: false, workshop: true, mode: false, language: false, currency: false });
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedWorkshop) return;
    setAccordionOpen({ category: false, workshop: false, mode: true, language: false, currency: false });
  }, [selectedWorkshop]);

  useEffect(() => {
    if (!selectedMode) return;
    setAccordionOpen({ category: false, workshop: false, mode: false, language: true, currency: false });
  }, [selectedMode]);

  useEffect(() => {
    if (!selectedLanguage) return;
    setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: true });
  }, [selectedLanguage]);

  // If category changes, ensure we don't keep a stale workshop selection from another category
  useEffect(() => {
    if (!selectedWorkshop) return;
    if (!selectedCategory) return;

    const selected = workshopCatalog.find((w) => w.slug === selectedWorkshop);
    if (!selected) {
      setSelectedWorkshop(null);
      return;
    }

    const workshopCategory = (selected.category || '').toLowerCase();
    const categoryKey = selectedCategory.toLowerCase();
    if (workshopCategory !== categoryKey) {
      setSelectedWorkshop(null);
    }
  }, [selectedCategory, selectedWorkshop]);

  // Get workshops for selected category (or all if none selected)
  const categoryWorkshops = selectedCategory 
    ? workshopCatalog.filter(w => w.category?.toLowerCase() === selectedCategory.toLowerCase())
    : workshopCatalog;

  // Filter based on mode and language
  const filteredWorkshops = categoryWorkshops.filter((workshop: WorkshopOverview) => {
    const modeMatch = !selectedMode || (workshop.mode && workshop.mode.includes(selectedMode));
    const languageMatch = !selectedLanguage || (workshop.language && workshop.language.includes(selectedLanguage));
    const currencyMatch = !selectedPayment || (workshop.currency && workshop.currency.includes(selectedPayment));
    const workshopMatch = !selectedWorkshop || workshop.slug === selectedWorkshop;
    const q = searchQuery.trim().toLowerCase();
    const searchMatch = !q
      ? true
      : `${workshop.name} ${workshop.slug} ${workshop.description}`.toLowerCase().includes(q);
    return modeMatch && languageMatch && currencyMatch && workshopMatch && searchMatch;
  });

  // Workshop dropdown options (real workshops, optionally scoped by selected category)
  const CATEGORY_ORDER = ['Health', 'Wealth', 'Married', 'Youth', 'Trainings'] as const;
  const getCategoryHeading = (category: string) => (category === 'Youth' ? 'Youth & Children' : category);

  // Custom sequence as provided by user (do not sort alphabetically)
  const WORKSHOP_ORDER_BY_CATEGORY: Record<string, string[]> = {
    health: [
      'swar-yoga-basic',
      'yogasana-sadhana',
      'swar-yoga-level-1',
      'swar-yoga-level-3',
      'swar-yoga-level-4',
      'weight-loss-96days',
      'meditation-42days',
      'amrut-aahar-42days',
      'bandhan-mukti',
    ],
    wealth: [
      'swar-yoga-level-2',
      'swar-yoga-businessman',
      'corporate-swaryoga',
    ],
    married: [
      'pre-pregnancy-planning',
      'garbh-sanskar-9months',
      'happy-married-life',
    ],
    youth: [
      'swar-yoga-youth',
      'children-swaryoga',
    ],
    trainings: [
      'swy-teacher-training',
      'gurukul-organiser-training',
      'gurukul-teacher-training',
    ],
  };

  const AVAILABLE_CURRENCIES = Array.from(
    new Set(workshopCatalog.flatMap((w) => w.currency ?? []))
  );
  const sortCurrencies = (a: string, b: string) => {
    const order = ['INR', 'USD', 'NPR'];
    const ai = order.indexOf(String(a).toUpperCase());
    const bi = order.indexOf(String(b).toUpperCase());
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return String(a).localeCompare(String(b));
  };
  AVAILABLE_CURRENCIES.sort(sortCurrencies);

  const getWorkshopSortKey = (workshop: WorkshopOverview) => {
    const categoryKey = (workshop.category || '').toLowerCase();
    const order = WORKSHOP_ORDER_BY_CATEGORY[categoryKey] || [];
    const index = order.indexOf(workshop.slug);
    return {
      hasIndex: index !== -1,
      index: index === -1 ? Number.POSITIVE_INFINITY : index,
      name: workshop.name,
    };
  };

  const sortWorkshopsByUserOrder = (a: WorkshopOverview, b: WorkshopOverview) => {
    const ak = getWorkshopSortKey(a);
    const bk = getWorkshopSortKey(b);
    if (ak.index !== bk.index) return ak.index - bk.index;
    // Fallback for any workshop not present in the custom list
    return ak.name.localeCompare(bk.name);
  };

  const workshopDropdownOptions = (selectedCategory ? categoryWorkshops : workshopCatalog)
    .slice()
    .sort(sortWorkshopsByUserOrder);

  const workshopDropdownGroupedOptions = CATEGORY_ORDER.map((category) => {
    const options = workshopCatalog
      .filter((w) => (w.category || '').toLowerCase() === category.toLowerCase())
      .slice()
      .sort(sortWorkshopsByUserOrder);
    return {
      category,
      heading: getCategoryHeading(category),
      options,
    };
  }).filter((g) => g.options.length > 0);

  // Pagination logic
  const ITEMS_PER_PAGE = 3;

  // Sort by latest schedule date (desc) when available; fallback to the user-defined ordering.
  const getLatestScheduleDateMs = (slug: string) => {
    const schedules = (dbSchedulesBySlug?.[slug] && dbSchedulesBySlug[slug].length > 0)
      ? dbSchedulesBySlug[slug]
      : workshopDetails?.[slug]?.schedules;
    if (!schedules || schedules.length === 0) return Number.NEGATIVE_INFINITY;
    let maxMs = Number.NEGATIVE_INFINITY;
    for (const s of schedules) {
      const ms = Date.parse(s.startDate);
      if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
    }
    return maxMs;
  };

  const allWorkshops = filteredWorkshops
    .slice()
    .sort((a, b) => {
      const aMs = getLatestScheduleDateMs(a.slug);
      const bMs = getLatestScheduleDateMs(b.slug);
      if (aMs !== bMs) return bMs - aMs; // latest first
      return sortWorkshopsByUserOrder(a, b);
    });
  const totalPages = Math.ceil(allWorkshops.length / ITEMS_PER_PAGE);
  const currentWorkshops = allWorkshops.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const getCurrencySymbol = (curr: string) => {
    const code = String(curr || '').toUpperCase();
    if (code === 'INR') return '₹';
    if (code === 'USD') return '$';
    if (code === 'NPR') return 'Rs';
    return '₹';
  };

  const formatDate = (isoDate: string) => {
    const ms = Date.parse(isoDate);
    if (Number.isNaN(ms)) return isoDate;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const normalizeModeToKey = useCallback((mode: string | null) => {
    if (!mode) return null;
    const m = mode.toLowerCase();
    if (m === 'online') return 'online';
    if (m === 'offline') return 'offline';
    if (m === 'residential') return 'residential';
    if (m === 'recorded') return 'recorded';
    return null;
  }, []);

  const pickScheduleForCard = useCallback((slug: string) => {
    const schedules = (dbSchedulesBySlug?.[slug] && dbSchedulesBySlug[slug].length > 0)
      ? dbSchedulesBySlug[slug]
      : workshopDetails?.[slug]?.schedules;
    if (!schedules || schedules.length === 0) return null;

    const modeKey = normalizeModeToKey(selectedMode);
    const currencyKey = selectedPayment ? String(selectedPayment).toUpperCase() : null;

    const parsed = schedules
      .map((s) => {
        const startMs = Date.parse(s.startDate);
        return { s, startMs };
      })
      .filter(({ s, startMs }) => {
        if (Number.isNaN(startMs)) return false;
        if (modeKey && s.mode !== modeKey) return false;
        if (currencyKey && String(s.currency).toUpperCase() !== currencyKey) return false;
        return true;
      });

    if (parsed.length === 0) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const upcoming = parsed.filter((p) => p.startMs >= todayStart).sort((a, b) => a.startMs - b.startMs);
    if (upcoming.length > 0) return upcoming[0].s;

    // If nothing upcoming, show the most recent past schedule.
    parsed.sort((a, b) => b.startMs - a.startMs);
    return parsed[0].s;
  }, [dbSchedulesBySlug, normalizeModeToKey, selectedMode, selectedPayment]);

  // Fetch seats remaining for the schedules currently shown on the page.
  useEffect(() => {
    const requests = currentWorkshops
      .map((w) => {
        const schedule = pickScheduleForCard(w.slug);
        if (!schedule) return null;
        return {
          workshopSlug: w.slug,
          scheduleId: schedule.id,
          seatsTotal: schedule.seats,
        };
      })
      .filter(Boolean) as Array<{ workshopSlug: string; scheduleId: string; seatsTotal: number }>;

    if (requests.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/workshops/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (payload?.success && payload?.data && typeof payload.data === 'object') {
          setAvailabilityByKey((prev) => ({ ...prev, ...payload.data }));
        }
      } catch (error) {
        // Non-fatal. We'll fall back to static seats from workshopDetails.
        console.error('Failed to fetch workshop availability', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentWorkshops, pickScheduleForCard, selectedMode, selectedPayment]);

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
              <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700">Filter Workshops</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Find the perfect workshop for your journey</p>
                </div>

                {/* Search (upper right) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none sm:w-[320px]">
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search workshops..."
                      className="w-full border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Search applies instantly via state; button kept per UI request.
                      setCurrentPage(1);
                    }}
                    className="bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-start">
              {/* Category Dropdown */}
              <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 min-w-[150px] self-start h-fit">
                <button
                  onClick={() => setAccordionOpen({ category: !accordionOpen.category, workshop: false, mode: false, language: false, currency: false })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">Category</span>
                    {selectedCategoryName && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {selectedCategoryName}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.category ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.category && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                    {WORKSHOP_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(cat.id);
                          // Show ALL workshops in the selected category
                          setSelectedWorkshop(null);
                          setCurrentPage(1);
                          // Auto-open Workshops dropdown so user immediately sees the workshops list
                          setAccordionOpen({ category: false, workshop: true, mode: false, language: false, currency: false });
                        }}
                        className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Workshop Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden flex-[1.5] min-w-[150px] self-start h-fit">
                <button
                  onClick={() => {
                    const willOpenCategory = !accordionOpen.category;
                    // When user clicks "Workshops", first open only Category.
                    // Workshops list will open automatically after selecting a Category.
                    setAccordionOpen({
                      category: willOpenCategory,
                      workshop: false,
                      mode: false,
                      language: false,
                      currency: false,
                    });
                  }}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">Workshops</span>
                    {selectedWorkshopName && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {selectedWorkshopName}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${(accordionOpen.category || accordionOpen.workshop) ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.workshop && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                    {/* If a category is selected, show only that category's workshops */}
                    {selectedCategory ? (
                      workshopDropdownOptions.map((option) => (
                        <button
                          key={option.slug}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkshop(option.slug);
                            setCurrentPage(1);
                            // Chain: after workshop selection, open Mode
                            setAccordionOpen({ category: false, workshop: false, mode: true, language: false, currency: false });
                          }}
                          className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedWorkshop === option.slug ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {option.name}
                        </button>
                      ))
                    ) : (
                      <div className="space-y-4">
                        {workshopDropdownGroupedOptions.map((group) => (
                          <div key={group.category} className="space-y-2">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                              {group.heading}
                            </div>
                            <div className="space-y-2">
                              {group.options.map((option) => (
                                <button
                                  key={option.slug}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkshop(option.slug);
                                    setCurrentPage(1);
                                    // Chain: after workshop selection, open Mode
                                    setAccordionOpen({ category: false, workshop: false, mode: true, language: false, currency: false });
                                  }}
                                  className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedWorkshop === option.slug ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                  {option.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mode Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 min-w-[150px] self-start h-fit">
                <button
                  onClick={() => setAccordionOpen({ category: false, workshop: false, mode: !accordionOpen.mode, language: false, currency: false })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">Mode</span>
                    {selectedMode && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {selectedMode}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.mode ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.mode && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                    {['Online', 'Offline', 'Residential', 'Recorded'].map((mode) => (
                      <button
                        key={mode}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMode(mode);
                          setCurrentPage(1);
                          // Chain: after mode selection, open Language
                          setAccordionOpen({ category: false, workshop: false, mode: false, language: true, currency: false });
                        }}
                        className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedMode === mode ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 min-w-[150px] self-start h-fit">
                <button
                  onClick={() => setAccordionOpen({ category: false, workshop: false, mode: false, language: !accordionOpen.language, currency: false })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">Language</span>
                    {selectedLanguage && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {selectedLanguage}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.language ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.language && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                    {['Hindi', 'English', 'Marathi'].map((lang) => (
                      <button
                        key={lang}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLanguage(lang);
                          setCurrentPage(1);
                          // Chain: after language selection, open Currency
                          setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: true });
                        }}
                        className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedLanguage === lang ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Accordion */}
              <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 min-w-[150px] self-start h-fit">
                <button
                  onClick={() => setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: !accordionOpen.currency })}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-700 text-sm sm:text-base transition-colors"
                >
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate">Currency</span>
                    {selectedPayment && (
                      <span className="mt-1 inline-block max-w-full truncate rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {selectedPayment}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${accordionOpen.currency ? 'rotate-180' : ''}`} />
                </button>
                {accordionOpen.currency && (
                  <div className="px-4 sm:px-6 py-4 space-y-2 border-t border-gray-200 bg-white" onClick={(e) => e.stopPropagation()}>
                    {AVAILABLE_CURRENCIES.map((curr) => {
                      const currencySymbol = { INR: '₹', USD: '$', NPR: 'Rs' }[curr];
                      return (
                        <button
                          key={curr}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(curr);
                            setCurrentPage(1);
                            setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: false });
                          }}
                          className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all text-left ${selectedPayment === curr ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {currencySymbol} {curr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              </div>

              {/* Clear Filters Button */}
              <div className="mt-3 sm:mt-6 flex flex-wrap gap-2">
                {(selectedCategory || selectedMode || selectedLanguage || selectedPayment || selectedWorkshop || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedMode(null);
                      setSelectedLanguage(null);
                      setSelectedPayment(null);
                      setSelectedWorkshop(null);
                      setSearchQuery('');
                      setCurrentPage(1);
                      setAccordionOpen({ category: false, workshop: false, mode: false, language: false, currency: false });
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
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 group flex flex-col cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary-200"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/workshops/${workshop.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/workshops/${workshop.slug}`);
                    }
                  }}
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

                    {(() => {
                      const schedule = pickScheduleForCard(workshop.slug);
                      const now = new Date();

                      const startDateMs = schedule ? Date.parse(schedule.startDate) : Number.NaN;
                      const hasValidStart = schedule && !Number.isNaN(startDateMs);
                      const admissionCloseDateMs = hasValidStart ? startDateMs - 5 * MS_PER_DAY : Number.NaN;
                      const daysToClose = hasValidStart
                        ? Math.ceil((admissionCloseDateMs - now.getTime()) / MS_PER_DAY)
                        : null;
                      const admissionClosed = hasValidStart ? (daysToClose != null && daysToClose <= 0) : false;

                      const availabilityKey = schedule ? `${workshop.slug}|${schedule.id}` : '';
                      const seatsRemaining = schedule
                        ? (availabilityByKey[availabilityKey] ?? schedule.seats)
                        : null;

                      const soldOut = typeof seatsRemaining === 'number' ? seatsRemaining <= 0 : false;

                      return (
                        <div className="mb-4 sm:mb-6 border-t border-gray-200 pt-3 sm:pt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">Fees</p>
                              <p className="text-sm sm:text-base font-bold text-gray-900">
                                {schedule ? (
                                  <>
                                    {getCurrencySymbol(schedule.currency)}{Number(schedule.price).toLocaleString()}
                                    <span className="ml-1 text-xs font-semibold text-gray-500">{String(schedule.currency).toUpperCase()}</span>
                                  </>
                                ) : (
                                  <span className="text-gray-500 font-semibold">TBD</span>
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">Start Date</p>
                              <p className="text-sm sm:text-base font-bold text-gray-900">
                                {schedule ? formatDate(schedule.startDate) : <span className="text-gray-500 font-semibold">TBD</span>}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-base sm:text-lg font-extrabold text-gray-900 leading-tight">
                                {workshop.duration}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm sm:text-base font-bold text-gray-900">
                                {typeof seatsRemaining === 'number' ? (
                                  <>
                                    {seatsRemaining}
                                    <span className="ml-1 text-xs font-semibold text-gray-500">left</span>
                                  </>
                                ) : (
                                  <span className="text-gray-500 font-semibold">TBD</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {admissionClosed ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                  Admission Closed
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                                  Admission Open
                                </span>
                              )}

                              {!admissionClosed && typeof daysToClose === 'number' && daysToClose <= 5 && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                  {daysToClose <= 0
                                    ? 'Closes today'
                                    : `Closes in ${daysToClose} day${daysToClose === 1 ? '' : 's'}`}
                                </span>
                              )}

                              {soldOut && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                                  Sold out
                                </span>
                              )}
                            </div>

                            {schedule?.mode && (
                              <span className="text-xs font-semibold text-gray-500">
                                {schedule.mode.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Filter Badges Removed - Only shown in batch details */}

                    {/* Batches Section Removed - Only shown on detail page */}

                    {/* CTA Buttons Grid */}
                    <div className="flex items-stretch gap-2">
                      <Link
                        href={`/workshops/${workshop.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-none bg-white border-2 border-primary-600 hover:bg-gray-50 active:scale-95 text-primary-600 px-3 sm:px-4 py-2.5 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-1 sm:gap-2 group/btn touch-target text-sm"
                      >
                        Learn More
                        <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/registernow?workshop=${encodeURIComponent(workshop.slug)}`);
                        }}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 text-white px-4 py-2.5 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-1 sm:gap-2 group/btn touch-target text-sm sm:text-base"
                      >
                        Register Now
                        <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4 group-hover/btn:translate-x-1 transition-transform flex-shrink-0" />
                      </button>
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
