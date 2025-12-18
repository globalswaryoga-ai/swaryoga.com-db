import React, { useState, useEffect, useRef } from 'react';
import { addCartItem, CartCurrency } from '@/lib/cart';

interface Batch {
  id: string;
  startDate: string;
  duration: string;
  time: string;
  location: string;
  availableSeats: number;
}

interface BatchCardProps {
  workshop: string;
  mode: string;
  language: string;
  batches: Batch[];
  indianPrice?: number;
  internationalPrice?: number;
}

export default function BatchCard({
  workshop,
  mode,
  language,
  batches,
  indianPrice = 999,
  internationalPrice = 29,
}: BatchCardProps) {
  const [selectedCountry, setSelectedCountry] = useState<'India' | 'Nepal' | 'International'>('India');

  const getCurrency = (country: string): string => {
    if (country === 'India' || country === 'Nepal') return 'INR';
    return 'USD';
  };

  const getPrice = (country: string): number => {
    if (country === 'International') return internationalPrice;
    return indianPrice;
  };

  const currency = getCurrency(selectedCountry);
  const price = getPrice(selectedCountry);
  const languageDisplayName = language.charAt(0).toUpperCase() + language.slice(1);
  const modeDisplayName = mode.charAt(0).toUpperCase() + mode.slice(1);
  const [added, setAdded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2200);
  };

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-swar-primary text-white px-5 py-3 rounded-lg shadow-lg text-sm font-semibold">
          {toastMessage}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
      {/* Header with gradient and title */}
      <div className="bg-gradient-to-r from-swar-primary to-blue-700 px-6 py-4">
        <h3 className="text-white font-bold text-xl">Batch Starting</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Batches List */}
        <div className="space-y-4">
          {batches.map((batch) => (
            <div key={batch.id} className="border border-swar-border rounded-lg p-4 space-y-3">
              {/* Start Date */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide">Start Date</p>
                  <p className="text-lg font-bold text-swar-text">{batch.startDate}</p>
                </div>
                <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded font-semibold text-sm hover:bg-blue-200 transition">
                  Admission Info
                </button>
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide">Duration</p>
                <p className="text-swar-text">{batch.duration}</p>
              </div>

              {/* Time */}
              <div>
                <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide">Time</p>
                <div className="flex items-center gap-2 text-swar-text">
                  <span>⏰</span>
                  <span>{batch.time}</span>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide">Location</p>
                <div className="flex items-center gap-2 text-swar-text">
                  <span>📍</span>
                  <span>{batch.location}</span>
                </div>
              </div>

              {/* Available Seats */}
              <div>
                <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide">Available Seats</p>
                <p className="text-lg font-bold text-blue-600">{batch.availableSeats} seats left</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-swar-border"></div>

        {/* Country Selection */}
        <div>
          <p className="text-sm font-bold text-swar-text uppercase tracking-wide mb-3">Select Country</p>
          <div className="flex gap-3 flex-wrap">
            {(['India', 'Nepal', 'International'] as const).map((country) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                  selectedCountry === country
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-swar-primary-light text-swar-text hover:bg-gray-300'
                }`}
              >
                {country}
              </button>
            ))}
          </div>
        </div>

        {/* Price and Buy Button */}
        <div className="flex justify-between items-center pt-4 border-t border-swar-border">
          <div>
            <p className="text-xs font-bold text-swar-text-secondary uppercase tracking-wide mb-1">Price</p>
            <p className="text-3xl font-bold text-swar-text">
              {currency === 'INR' ? '₹' : '$'}{price}
            </p>
          </div>
          <button
            onClick={() => {
              const cartCurrency = currency as CartCurrency;
              addCartItem({
                id: `${workshop}-${mode}-${language}-${currency}`,
                name: `${workshop} (${modeDisplayName} • ${languageDisplayName})`,
                price,
                quantity: 1,
                currency: cartCurrency,
                workshop,
                mode,
                language,
              });
              setAdded(true);
              showToast(`${workshop} (${modeDisplayName}) added to cart!`);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg uppercase tracking-wide font-bold text-sm hover:bg-blue-700 transition-shadow shadow-lg flex items-center gap-2"
          >
            {added ? 'Added' : 'Add to Cart'}
          </button>
        </div>

        {/* Workshop Info Footer */}
        <div className="pt-4 border-t border-swar-border text-center text-sm text-swar-text-secondary">
          <p>
            <span className="font-semibold text-swar-text">{languageDisplayName}</span> • 
            <span className="font-semibold text-swar-text ml-1">{modeDisplayName}</span> • 
            <span className="text-swar-text-secondary ml-1">({currency})</span>
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
