'use client';

import React, { useEffect, useState, useRef } from 'react';

/**
 * @fileoverview Cashfree Payment Button Component
 *
 * Uses Cashfree JS SDK v3 for secure payment checkout
 * Features:
 * - Loads Cashfree SDK dynamically
 * - Initiates payment through API endpoint
 * - Handles payment session creation
 * - Uses Cashfree's hosted checkout
 */

interface CashfreePaymentButtonProps {
  amount: number;
  productInfo: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  city: string;
  address?: string;
  state?: string;
  zip?: string;
  currency?: string;
  token: string;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
  items?: Array<{ name: string; price: number; quantity: number }>;
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    Cashfree?: {
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> | unknown;
    };
  }
}

export default function CashfreePaymentButton({
  amount,
  productInfo,
  firstName,
  lastName = '',
  email,
  phone,
  city,
  address = '',
  state = '',
  zip = '',
  currency = 'INR',
  token,
  onSuccess,
  onError,
  onLoading,
  items = [],
  className = '',
  disabled = false,
}: CashfreePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sdkLoadedRef = useRef(false);

  // Load Cashfree SDK on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loading or loaded
    if (window.Cashfree) {
      sdkLoadedRef.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      sdkLoadedRef.current = true;
      console.log('✅ Cashfree SDK loaded successfully');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Cashfree SDK');
      setError('Failed to load payment gateway. Please refresh and try again.');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');
      onLoading?.(true);

      if (!sdkLoadedRef.current || !window.Cashfree) {
        throw new Error('Cashfree SDK not loaded. Please refresh and try again.');
      }

      // Step 1: Call our API to initiate payment with 15 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if token exists
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch('/api/payments/cashfree/initiate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amount,
            productInfo,
            firstName,
            lastName,
            email,
            phone,
            city,
            address,
            state,
            zip,
            currency,
            items: items.length > 0 ? items : undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Payment initiation failed' }));
          
          // Provide more detailed error messages
          let errorMessage = data.error || 'Failed to initiate payment';
          
          if (response.status === 401 || response.status === 403) {
            errorMessage = 'Payment authentication failed. Please try again or contact support.';
          } else if (response.status === 500) {
            errorMessage = 'Payment server error. This might be a Cashfree credential issue. Please contact support.';
          } else if (data.error?.includes('authentication')) {
            errorMessage = 'Authentication failed with payment gateway. Credentials may need renewal.';
          }
          
          throw new Error(errorMessage);
        }

        const paymentData = await response.json();

        if (!paymentData.success || !paymentData.paymentSessionId) {
          throw new Error(paymentData.error || 'Invalid payment session');
        }

        // Step 2: Trigger Cashfree checkout
        const cf = window.Cashfree;
        if (!cf) {
          throw new Error('Cashfree SDK not loaded');
        }

        // Trigger checkout
        await cf.checkout({
          paymentSessionId: paymentData.paymentSessionId,
          redirectTarget: '_self',
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">❌ Payment Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={disabled || loading || !sdkLoadedRef.current}
        className={`${
          className
            ? className
            : 'w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all transform hover:scale-105 flex items-center justify-center gap-2'
        } ${loading || !sdkLoadedRef.current ? 'opacity-75 cursor-wait' : ''}`}
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Processing Payment...
          </>
        ) : !sdkLoadedRef.current ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Loading Payment...
          </>
        ) : (
          <>
            💳 Pay with Cashfree
          </>
        )}
      </button>
    </div>
  );
}
