'use client';

/**
 * @fileoverview Workshop Payment Form Component
 * Complete example showing how to use PayU payment button with workshop details
 * 
 * Features:
 * - Displays workshop details dynamically
 * - Multiple currency support
 * - Mode and language selection
 * - PayU button with auto-generated URLs
 */

import React, { useState } from 'react';
import PayUPaymentButton from './PayUPaymentButton';
import { generatePayUButtonUrls, formatPaymentAmount } from '@/lib/payments/payuButtonHelper';

interface WorkshopPaymentFormProps {
  workshopSlug: string;
  workshopName: string;
  amount: number;
  currency: string;
  availableModes?: string[];
  availableLanguages?: string[];
  scheduleId?: string;
  onPaymentInitiated?: () => void;
}

export default function WorkshopPaymentForm({
  workshopSlug,
  workshopName,
  amount,
  currency,
  availableModes = ['online', 'offline', 'residential'],
  availableLanguages = ['english', 'hindi', 'marathi'],
  scheduleId,
  onPaymentInitiated,
}: WorkshopPaymentFormProps) {
  const [selectedMode, setSelectedMode] = useState(availableModes[0] || 'online');
  const [selectedLanguage, setSelectedLanguage] = useState(availableLanguages[0] || 'english');
  const [error, setError] = useState<string | null>(null);

  const paymentUrls = generatePayUButtonUrls({
    workshopSlug,
    workshopName,
    amount,
    currency,
    mode: selectedMode,
    language: selectedLanguage,
    scheduleId,
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Enrollment</h2>
        <p className="text-gray-600">Secure payment for {workshopName}</p>
      </div>

      {/* Workshop Details Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-8 border border-blue-200">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-gray-600 font-semibold uppercase">Workshop</p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">{workshopName}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 font-semibold uppercase">Amount</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {formatPaymentAmount(amount, currency)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-600 font-semibold uppercase">Currency</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{currency}</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      {availableModes.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Learning Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedMode === mode
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Language Selection */}
      {availableLanguages.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Language
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedLanguage === lang
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary Box */}
      <div className="bg-gray-50 rounded-lg p-4 mb-8 border border-gray-200">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Workshop Fee:</span>
            <span className="font-semibold text-gray-900">
              {formatPaymentAmount(amount, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Processing Fee:</span>
            <span className="font-semibold text-gray-900">Free</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total Amount:</span>
            <span className="font-bold text-lg text-emerald-600">
              {formatPaymentAmount(amount, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">⚠ Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Payment Button */}
      <div className="mb-6">
        <PayUPaymentButton
          workshopSlug={workshopSlug}
          workshopName={workshopName}
          amount={amount}
          currency={currency}
          mode={selectedMode}
          language={selectedLanguage}
          scheduleId={scheduleId}
          buttonLabel="Pay & Enroll Now"
          className="w-full py-4 text-lg"
          onError={(err) => setError(err)}
          onSuccess={() => {
            onPaymentInitiated?.();
          }}
        />
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-900">
          <span className="font-bold">🔒 Secure Payment:</span> Your payment is processed securely through PayU, India's trusted payment gateway. 
          We never store your card details. Your enrollment confirmation will be sent to your email immediately after successful payment.
        </p>
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 overflow-x-auto">
          <p className="font-bold mb-2">Debug URLs (Development Only):</p>
          <div className="space-y-1">
            <p>Success: {paymentUrls.successUrl}</p>
            <p>Failure: {paymentUrls.failureUrl}</p>
            <p>Cancel: {paymentUrls.cancelUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
