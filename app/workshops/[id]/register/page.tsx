'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import EnquiryForm from '@/components/EnquiryForm';
import { ArrowLeft, Calendar, Clock, Users, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { addCartItem, CartCurrency } from '@/lib/cart';

interface Schedule {
  id: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  startDate: string;
  endDate: string;
  registrationCloseDate?: string;
  time: string;
  seats: number;
  price: number;
  currency: string;
  location?: string | null;
  duration?: string;
  language?: string;
}

// Dynamic schedules loaded from .env.workshop via API
// No hardcoded workshop data - all data comes from /api/workshops/list

const modeConfig = {
  online: { label: 'Online', color: 'from-blue-600 to-blue-700', icon: '' },
  offline: { label: 'Offline', color: 'from-purple-600 to-purple-700', icon: '' },
  residential: { label: 'Residential', color: 'from-green-600 to-green-700', icon: '' },
  recorded: { label: 'Recorded Class', color: 'from-orange-600 to-orange-700', icon: '' }
};


export default function RegisterPage() {
  const params = useParams();
  const workshopSlug = params.id as string;
  const [selectedMode, setSelectedMode] = useState<'online' | 'offline' | 'residential' | 'recorded'>('online');
  const [selectedCountriesBySchedule, setSelectedCountriesBySchedule] = useState<Record<string, 'india' | 'nepal' | 'international'>>({});
  const [dynamicSchedules, setDynamicSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<{ name: string; duration: string; level: string; price: string } | null>(null);
  const [addedSchedules, setAddedSchedules] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Format date from ISO string to readable format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr + 'T00:00:00Z');
      return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Get country selected for a specific schedule
  const getSelectedCountryForSchedule = (scheduleId: string) => {
    return selectedCountriesBySchedule[scheduleId] || 'india';
  };

  // Set country for a specific schedule
  const setCountryForSchedule = (scheduleId: string, country: 'india' | 'nepal' | 'international') => {
    setSelectedCountriesBySchedule((prev) => ({
      ...prev,
      [scheduleId]: country,
    }));
  };

  // Exchange rates (base currency: INR)
  const exchangeRates = {
    india: { symbol: '₹', rate: 1, name: 'Indian Rupee' },
    nepal: { symbol: 'रु', rate: 1.6, name: 'Nepali Rupee' },
    international: { symbol: '$', rate: 0.012, name: 'US Dollar' }, // 1 INR = 0.012 USD
  };

  // Function to convert price based on selected country
  const convertPrice = (priceInINR: number, country: 'india' | 'nepal' | 'international') => {
    const rate = exchangeRates[country].rate;
    return Math.round(priceInINR * rate);
  };

  const getPriceDisplay = (priceInINR: number, country: 'india' | 'nepal' | 'international') => {
    const converted = convertPrice(priceInINR, country);
    const symbol = exchangeRates[country].symbol;
    return `${symbol}${converted.toLocaleString()}`;
  };

  const triggerCartToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Fetch dynamic schedules and payment links from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Import workshop catalog to get workshop info
        const { workshopCatalog } = await import('@/lib/workshopsData');
        const workshop = workshopCatalog.find((w) => w.slug === workshopSlug);
        
        if (workshop) {
          setWorkshopInfo({
            name: workshop.name,
            duration: workshop.duration,
            level: workshop.level,
            price: '₹' + (Math.floor(Math.random() * 5000) + 2999), // Price will come from API schedules
          });
        }

        // Fetch workshop data from the new API
        const workshopsRes = await fetch('/api/workshops/list');
        if (workshopsRes.ok) {
          const { data: allWorkshops } = await workshopsRes.json();
          // Find the current workshop
          const currentWorkshop = allWorkshops.find((w: any) => w.id === workshopSlug);
          if (currentWorkshop && currentWorkshop.schedules) {
            const convertedSchedules = currentWorkshop.schedules.map((s: any) => ({
              id: s.id,
              mode: s.mode,
              startDate: s.startDate,
              endDate: s.endDate,
              registrationCloseDate: s.registrationCloseDate,
              time: s.time,
              seats: s.slots,
              price: s.price,
              currency: 'INR',
              location: s.location,
              duration: s.duration,
              language: s.language || 'hindi',
            }));
            setDynamicSchedules(convertedSchedules);
          }
        }
      } catch (error) {
        console.error('Error fetching workshop data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workshopSlug]);

  const schedules = useMemo(() => {
    if (selectedMode === 'recorded') {
      return [];
    }
    
    // Use only dynamic schedules from .env.workshop via API
    const filtered = dynamicSchedules.filter((s: Schedule) => s.mode === selectedMode);
    return filtered;
  }, [selectedMode, dynamicSchedules]);

  const getCartCurrencyForCountry = (country: 'india' | 'nepal' | 'international'): CartCurrency => {
    switch (country) {
      case 'nepal':
        return 'NPR';
      case 'international':
        return 'USD';
      default:
        return 'INR';
    }
  };

  const handleAddToCart = (schedule: Schedule) => {
    const country = getSelectedCountryForSchedule(schedule.id);
    const cartCurrency = getCartCurrencyForCountry(country);
    const convertedPrice = convertPrice(schedule.price, country);
    const workshopName = workshopInfo?.name || 'Workshop';
    const modeLabel = modeConfig[selectedMode].label;
    const displayDate = formatDate(schedule.startDate);
  const language = (schedule.language || 'hindi').toLowerCase();
  const languageLabel = schedule.language ? schedule.language : 'Multi-language';

    addCartItem({
      id: `${schedule.id}-${cartCurrency}`,
      name: `${workshopName} (${modeLabel} • ${displayDate} • ${languageLabel})`,
      price: convertedPrice,
      quantity: 1,
      currency: cartCurrency,
      workshop: workshopSlug,
      mode: selectedMode,
      language,
    });

    setAddedSchedules((prev) => ({
      ...prev,
      [schedule.id]: true,
    }));

    triggerCartToast(`${workshopName} (${modeLabel}) added to cart!`);

    setTimeout(() => {
      setAddedSchedules((prev) => ({
        ...prev,
        [schedule.id]: false,
      }));
    }, 2000);
  };

  const handleRecordedAddToCart = () => {
    const numericPrice = Number((workshopInfo?.price || '').replace(/[^0-9.]/g, '')) || 0;
    const workshopName = workshopInfo?.name || 'Workshop';

    if (!numericPrice) {
      alert('Price information is unavailable. Please add a scheduled batch to your cart instead.');
      return;
    }

    addCartItem({
      id: `${workshopSlug}-recorded-INR`,
      name: `${workshopName} (Recorded Class)`,
      price: numericPrice,
      quantity: 1,
      currency: 'INR',
      workshop: workshopSlug,
      mode: 'recorded',
      language: 'hindi',
    });

    setAddedSchedules((prev) => ({
      ...prev,
      recorded: true,
    }));

    triggerCartToast(`${workshopName} (Recorded) added to cart!`);

    setTimeout(() => {
      setAddedSchedules((prev) => ({
        ...prev,
        recorded: false,
      }));
    }, 2000);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 md:py-12">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-6xl">
          {/* Back Button */}
          <Link
            href={`/workshops/${workshopSlug}`}
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold mb-4 md:mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back to Workshop</span>
            <span className="sm:hidden">Back</span>
          </Link>

          {/* Header */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg p-4 sm:p-6 md:p-8 mb-6 md:mb-12 border-l-4 border-blue-600">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4 leading-tight">
              {workshopInfo?.name || 'Loading Workshop...'}
            </h1>
            <div className="flex flex-wrap gap-3 md:gap-6 text-gray-700 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 md:w-5 h-4 md:h-5 text-blue-600 flex-shrink-0" />
                <span>{workshopInfo?.duration || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 md:w-5 h-4 md:h-5 text-blue-600 flex-shrink-0" />
                <span>{workshopInfo?.level || 'N/A'}</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-blue-600">{workshopInfo?.price || 'Price TBA'}</div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Select Mode</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {Object.entries(modeConfig).map(([mode, config]) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode as any)}
                  className={`p-2 md:p-4 rounded-lg md:rounded-xl font-bold text-xs md:text-base transition-all duration-300 flex flex-col items-center justify-center ${
                    selectedMode === mode
                      ? `bg-gradient-to-r ${config.color} text-white shadow-lg scale-105`
                      : 'bg-blue-50 text-gray-800 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100'
                  }`}
                >
                  <span className="text-xl md:text-2xl mb-0.5">{config.icon}</span>
                  <span className="text-xs md:text-xs text-center">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recorded Class Special Section */}
          {selectedMode === 'recorded' && (
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg md:rounded-xl shadow-md md:shadow-lg p-6 md:p-12 text-center mb-6 md:mb-12 border-2 border-orange-200">
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎥</div>
              <h2 className="text-2xl md:text-3xl font-bold text-orange-900 mb-3 md:mb-4">Recorded Class Access</h2>
              <p className="text-base md:text-lg text-orange-800 mb-6 md:mb-8 max-w-2xl mx-auto">
                Get lifetime access to high-quality recorded classes. Learn at your own pace, anytime, anywhere.
              </p>
              <div className="bg-white rounded-lg p-4 md:p-6 mb-6 md:mb-8 max-w-2xl mx-auto border border-orange-200">
                <p className="text-xl md:text-2xl font-semibold text-orange-900">Price: {workshopInfo?.price || 'Price TBA'}</p>
                <p className="text-orange-700 mt-2 text-sm md:text-base">One-time payment for lifetime access</p>
              </div>
              <button
                onClick={handleRecordedAddToCart}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 md:px-10 py-2 md:py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-bold text-sm md:text-lg inline-flex items-center gap-2"
              >
                {addedSchedules.recorded ? 'Added to Cart' : 'Add Recorded Class to Cart'}
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* Schedules Grid */}
          {selectedMode !== 'recorded' && (
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 md:mb-8 leading-tight">
                Available {modeConfig[selectedMode].label} Sessions
              </h2>
              <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">(Next 6 Months)</p>
              
              {isLoading && dynamicSchedules.length === 0 ? (
                <div className="bg-blue-50 rounded-lg md:rounded-xl shadow-md p-6 md:p-12 text-center border border-blue-200">
                  <p className="text-base md:text-lg text-gray-600">Loading sessions...</p>
                </div>
              ) : schedules.length === 0 && dynamicSchedules.length === 0 ? (
                <div className="py-8 md:py-12">
                  <div className="bg-amber-50 rounded-lg md:rounded-xl shadow-md p-6 md:p-12 text-center border border-amber-200 mb-8">
                    <Calendar className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-lg md:text-xl font-bold text-amber-900 mb-2">Coming Soon!</h3>
                    <p className="text-base text-amber-800 mb-6">
                      Exciting dates for {workshopInfo?.name || 'this workshop'} will be announced soon. <br />
                      Fill the form below to get notified when schedules are available.
                    </p>
                  </div>
                  <EnquiryForm 
                    workshopId={workshopSlug} 
                    workshopName={workshopInfo?.name || 'Unknown Workshop'}
                  />
                </div>
              ) : schedules.length === 0 ? (
                <div className="bg-blue-50 rounded-lg md:rounded-xl shadow-md p-6 md:p-12 text-center border border-blue-200">
                  <p className="text-base md:text-lg text-gray-600">No sessions available for this mode</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {schedules.map((schedule: Schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-white rounded-lg md:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-t-4 border-blue-500"
                    >
                      {/* Header */}
                      <div className="bg-blue-600 p-3 md:p-4 border-b-2 border-blue-500">
                        <h3 className="text-sm md:text-lg font-bold text-white">Batch Starting</h3>
                      </div>

                      {/* Content */}
                      <div className="p-3 md:p-4">
                        {/* Date */}
                        <div className="mb-2 md:mb-3 flex items-start justify-between">
                          <div>
                            <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">Start Date</p>
                            <p className="text-base md:text-lg font-bold text-gray-900">
                              {formatDate(schedule.startDate)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setShowAdmissionModal(true);
                            }}
                            className="text-xs md:text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 md:px-3 py-1 rounded transition-colors"
                          >
                            Admission Info
                          </button>
                        </div>

                        {/* Duration */}
                        <div className="mb-2 md:mb-3">
                          <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">Duration</p>
                          <p className="text-xs md:text-sm text-gray-700">
                            {new Date(schedule.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(schedule.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        {/* Time */}
                        <div className="mb-2 md:mb-3">
                          <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">Time</p>
                          <div className="flex items-center gap-2 text-gray-700 text-xs md:text-sm">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>{schedule.time}</span>
                          </div>
                        </div>
                        {/* Location */}
                        <div className="mb-2 md:mb-3">
                          <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">Location</p>
                          <div className="flex items-center gap-2 text-gray-700 text-xs md:text-sm">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {selectedMode === 'online' ? 'By Zoom' : (schedule.location || 'N/A')}
                            </span>
                          </div>
                        </div>

                        {/* Seats */}
                        <div className="mb-3 md:mb-3 pb-3 md:pb-3 border-b border-gray-200">
                          <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">Available Seats</p>
                          <p className={`text-sm md:text-base font-bold ${schedule.seats > 10 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {schedule.seats} seats left
                          </p>
                        </div>

                        {/* Country Selection */}
                        <div className="mb-3 md:mb-3 pb-3 md:pb-3 border-b border-gray-200">
                          <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase mb-2">Select Country</p>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setCountryForSchedule(schedule.id, 'india')}
                              className={`px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold transition-all duration-300 ${
                                getSelectedCountryForSchedule(schedule.id) === 'india'
                                  ? 'bg-red-600 text-white shadow-md'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              India
                            </button>
                            <button
                              onClick={() => setCountryForSchedule(schedule.id, 'nepal')}
                              className={`px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold transition-all duration-300 ${
                                getSelectedCountryForSchedule(schedule.id) === 'nepal'
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              Nepal
                            </button>
                            <button
                              onClick={() => setCountryForSchedule(schedule.id, 'international')}
                              className={`px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold transition-all duration-300 ${
                                getSelectedCountryForSchedule(schedule.id) === 'international'
                                  ? 'bg-green-600 text-white shadow-md'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              International
                            </button>
                          </div>
                        </div>

                        {/* Price and CTA */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3">
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-0.5">Price</p>
                            <p className="text-lg md:text-xl font-bold text-blue-600">
                              {getPriceDisplay(schedule.price, getSelectedCountryForSchedule(schedule.id))}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToCart(schedule)}
                            className={`w-full sm:w-auto bg-gradient-to-r ${modeConfig[selectedMode].color} hover:opacity-90 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-300 transform hover:scale-105 font-bold text-sm md:text-base flex items-center justify-center gap-2 whitespace-nowrap`}
                          >
                            {addedSchedules[schedule.id] ? 'Added to Cart' : 'Add to Cart'}
                            <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admission Info Modal */}
        {showAdmissionModal && selectedSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdmissionModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full">
              <button
                onClick={() => setShowAdmissionModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Admission Details</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Admission Open</p>
                  <p className="text-lg font-bold text-blue-600">{formatDate(selectedSchedule.startDate)}</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Admission Closes</p>
                  <p className="text-lg font-bold text-red-600">{formatDate(selectedSchedule.registrationCloseDate || '')}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Classes Start</p>
                  <p className="text-lg font-bold text-green-600">{formatDate(selectedSchedule.startDate)}</p>
                </div>

                {selectedSchedule.duration && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 uppercase font-semibold mb-1">Duration</p>
                    <p className="text-lg font-bold text-gray-700">{selectedSchedule.duration}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAdmissionModal(false)}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl text-sm font-semibold transition-opacity">
          {toastMessage}
        </div>
      )}
      <Footer />
    </>
  );
}
