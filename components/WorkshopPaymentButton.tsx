'use client';

/**
 * @fileoverview Workshop Payment Button Component
 * 
 * Displays Cashfree payment buttons for workshops based on mode and language
 * Uses centralized workshop payment configuration
 * 
 * Features:
 * - Secure Cashfree SDK checkout
 * - Multiple languages support
 * - Multiple modes support
 * - Workshop details display
 * - Professional styling
 */

import { useState } from 'react';
import { getWorkshopPaymentLink, getWorkshopDetails, getAvailableModes, getAvailableLanguages } from '@/lib/workshops/workshopPaymentConfig';
import CashfreePaymentButton from './CashfreePaymentButton';

interface WorkshopPaymentButtonProps {
  workshopSlug: string;
  mode?: 'online' | 'offline' | 'residential' | 'recorded';
  language?: 'english' | 'hindi' | 'marathi' | 'nepali';
  className?: string;
  showDetails?: boolean;
  showModeSelector?: boolean;
  showLanguageSelector?: boolean;
  token?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  onPaymentSuccess?: (response: any) => void;
  onPaymentError?: (error: string) => void;
}

export default function WorkshopPaymentButton({
  workshopSlug,
  mode = 'online',
  language = 'english',
  className = '',
  showDetails = true,
  showModeSelector = false,
  showLanguageSelector = true,
  token = '',
  firstName = '',
  lastName = '',
  email = '',
  phone = '',
  city = '',
  onPaymentSuccess,
  onPaymentError,
}: WorkshopPaymentButtonProps) {
  const workshop = getWorkshopDetails(workshopSlug);
  const [selectedMode, setSelectedMode] = useState<'online' | 'offline' | 'residential' | 'recorded'>(mode);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'marathi' | 'nepali'>(language);

  if (!workshop) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 ${className}`}>
        <p className="font-semibold">Workshop not found</p>
        <p className="text-sm">Slug: {workshopSlug}</p>
      </div>
    );
  }

  const paymentLink = getWorkshopPaymentLink(workshopSlug, selectedMode, selectedLanguage);
  const availableModes = getAvailableModes(workshopSlug);
  const availableLanguages = getAvailableLanguages(workshopSlug, selectedMode);

  if (!paymentLink) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 ${className}`}>
        <p className="font-semibold">Payment link not available</p>
        <p className="text-sm">Mode: {selectedMode}, Language: {selectedLanguage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Workshop Details */}
      {showDetails && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-900 mb-2">{workshop.name}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
            <div>
              <span className="font-semibold">Duration:</span> {workshop.duration}
            </div>
            <div>
              <span className="font-semibold">Schedule:</span> {workshop.schedule}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Price:</span> ₹{workshop.basePrice.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      {showModeSelector && availableModes.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Mode
          </label>
          <div className="flex gap-2 flex-wrap">
            {availableModes.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMode(m as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedMode === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Language Selector */}
      {showLanguageSelector && availableLanguages.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Language
          </label>
          <div className="flex gap-2 flex-wrap">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang as any)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedLanguage === lang
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Button */}
      <div className="flex justify-center pt-4">
        {token && email && phone && firstName && city ? (
          <CashfreePaymentButton
            amount={workshop.basePrice}
            productInfo={`${workshop.name} - ${selectedMode} (${selectedLanguage})`}
            firstName={firstName}
            lastName={lastName}
            email={email}
            phone={phone}
            city={city}
            token={token}
            onSuccess={onPaymentSuccess}
            onError={onPaymentError}
            className="w-full max-w-xs bg-gradient-to-r from-cashfree-600 to-cashfree-700 hover:from-cashfree-700 hover:to-cashfree-800 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 transition-all"
          />
        ) : (
          <div className="w-full max-w-xs bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">
            <p className="font-semibold">Please log in to proceed with payment</p>
          </div>
        )}
      </div>

      {/* Security Message */}
      <p className="text-xs text-center text-gray-600">
        🔒 Secure payment powered by Cashfree • No additional charges
      </p>
    </div>
  );
}
