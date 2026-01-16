'use client';

/**
 * @fileoverview PayU Payment Button Component
 * Reusable payment button that creates PayU form with dynamic URLs
 * 
 * Features:
 * - Dynamic workshop name and amount (changes with workshop selection)
 * - Supports multiple currencies (INR, USD, NPR)
 * - Auto-generates Success/Failure/Cancel URLs with workshop details
 * - Loading state and error handling
 * - Professional styling with workshop details
 * - Integrated with /api/payments/payu/initiate endpoint
 * 
 * Success URL: /payment-successful?workshop=slug&name=workshop&amount=amount&currency=INR
 * Failure URL: /payment-failed?workshop=slug&name=workshop&amount=amount&currency=INR
 * Cancel URL: /payment-cancelled?workshop=slug&name=workshop&amount=amount&currency=INR
 */

import React, { useState, useEffect } from 'react';
import { generatePayUButtonUrls, formatPaymentAmount, validatePaymentConfig, generatePaymentOrderId } from '@/lib/payments/payuButtonHelper';
import { getPayUPaymentUrl } from '@/lib/payments/payu';
import { AlertCircle, Loader } from 'lucide-react';

interface PayUPaymentButtonProps {
  workshopSlug: string;
  workshopName: string;
  amount: number;
  currency: string;
  mode?: string;
  language?: string;
  scheduleId?: string;
  buttonLabel?: string;
  className?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
}

export default function PayUPaymentButton({
  workshopSlug,
  workshopName,
  amount,
  currency,
  mode = 'online',
  language = 'english',
  scheduleId,
  buttonLabel = 'Pay Now',
  className = '',
  onError,
  onSuccess,
  disabled = false,
}: PayUPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate configuration on mount
  useEffect(() => {
    const validation = validatePaymentConfig({
      workshopSlug,
      workshopName,
      amount,
      currency,
    });

    if (!validation.valid) {
      const errorMsg = validation.errors.join(', ');
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [workshopSlug, workshopName, amount, currency, onError]);

  const handlePaymentClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate configuration
      const validation = validatePaymentConfig({
        workshopSlug,
        workshopName,
        amount,
        currency,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate dynamic URLs based on workshop and amount
      const urls = generatePayUButtonUrls({
        workshopSlug,
        workshopName,
        amount,
        currency,
        mode,
        language,
        scheduleId,
      });

      console.log('📤 PayU Payment initiated for:', {
        workshop: workshopName,
        amount: amount,
        currency: currency,
        successUrl: urls.successUrl,
        failureUrl: urls.failureUrl,
        cancelUrl: urls.cancelUrl,
      });

      // Get auth token from localStorage
      const authToken = typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || localStorage.getItem('token')
        : '';

      if (!authToken) {
        throw new Error('Authentication required. Please login to proceed with payment.');
      }

      // Call PayU initiation API endpoint with 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/payments/payu/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          amount: amount,
          productInfo: `${workshopName} (${currency})`,
          firstName: 'Customer',
          email: 'payment@example.com',
          phone: '9999999999',
          city: 'India',
          country: 'India',
          items: [
            {
              name: workshopName,
              price: amount,
              quantity: 1,
              workshopSlug: workshopSlug,
              mode: mode,
              language: language,
            },
          ],
          // Pass dynamic URLs to the API
          successUrl: urls.successUrl,
          failureUrl: urls.failureUrl,
          cancelUrl: urls.cancelUrl,
        }),
      }).finally(() => clearTimeout(timeoutId));

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      if (!result.data || !result.data.paymentUrl) {
        throw new Error('Invalid payment gateway response');
      }

      console.log('✅ PayU payment initiated successfully');

      // Create and submit hidden form to PayU
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = result.data.paymentUrl;
      form.style.display = 'none';

      // Add all required PayU fields from API response
      const payuFields = {
        key: result.data.key,
        txnid: result.data.txnid,
        amount: result.data.amount,
        productinfo: result.data.productinfo,
        firstname: result.data.firstname,
        email: result.data.email,
        phone: result.data.phone,
        surl: urls.successUrl,  // Use dynamic success URL
        furl: urls.failureUrl,  // Use dynamic failure URL
        curl: urls.cancelUrl,   // Use dynamic cancel URL
        hash: result.data.hash,
        city: result.data.city,
        state: result.data.state,
        zipcode: result.data.zipcode,
        address: result.data.address,
        service_provider: 'payu_paisa',
      };

      Object.entries(payuFields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value || '');
        form.appendChild(input);
      });

      document.body.appendChild(form);

      console.log('📨 Submitting PayU form to gateway...');
      form.submit();

      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      console.error('❌ Payment error:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className={`flex gap-2 items-start p-4 bg-red-50 rounded-lg border border-red-200 ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-700">Payment Error</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Payment Details Summary */}
      <div className="bg-gradient-to-r from-yoga-50 to-yoga-100 border border-yoga-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-gray-700">Workshop:</span>
            <span className="text-sm font-semibold text-yoga-700">{workshopName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Amount to Pay:</span>
            <span className="text-lg font-bold text-yoga-700">
              {formatPaymentAmount(amount, currency)}
            </span>
          </div>
          {mode && (
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-600">Mode:</span>
              <span className="text-xs text-gray-700 capitalize">{mode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handlePaymentClick}
        disabled={disabled || isLoading}
        className={`
          w-full px-6 py-3 rounded-lg font-bold transition-all duration-200
          flex items-center justify-center gap-2
          ${
            disabled || isLoading
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 active:scale-95 shadow-md hover:shadow-lg'
          }
          text-white
          ${className}
        `}
        title={`Pay ${formatPaymentAmount(amount, currency)} for ${workshopName}`}
      >
        {isLoading ? (
          <>
            <Loader className="animate-spin h-4 w-4" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <>
            <span>💳</span>
            <span>{buttonLabel}</span>
            <span className="text-sm">{formatPaymentAmount(amount, currency)}</span>
          </>
        )}
      </button>

      {/* Security Info */}
      <p className="text-xs text-gray-600 text-center">
        🔒 Secure payment powered by PayU • No additional charges
      </p>
    </div>
  );
}
