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

      console.log('🔵 Starting payment with amount:', amount);

      // Step 1: Call our API to initiate payment
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add Authorization header if token exists
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

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
      });

      console.log('🔵 API Response status:', response.status, response.ok);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Payment initiation failed' }));
        console.error('🔴 API Error:', data);
        throw new Error(data.error || 'Failed to initiate payment');
      }

      const paymentData = await response.json();
      console.log('🔵 Payment Data:', { success: paymentData.success, hasSessionId: !!paymentData.paymentSessionId, sessionId: paymentData.paymentSessionId });

      if (!paymentData.success || !paymentData.paymentSessionId) {
        throw new Error(paymentData.error || 'Invalid payment session');
      }

      console.log('✅ Payment initiated, session ID:', paymentData.paymentSessionId);

      // Step 2: Initialize Cashfree and start checkout
      const cf = window.Cashfree;
      if (!cf) {
        throw new Error('Cashfree SDK not loaded');
      }

      console.log('🔵 Triggering Cashfree checkout...');

      // Configure payment
      const checkoutOptions = {
        paymentSessionId: paymentData.paymentSessionId,
        redirectTarget: '_self',
      };

      console.log('🔵 Checkout options:', checkoutOptions);

      // Trigger checkout
      const checkoutResult = await cf.checkout(checkoutOptions);
      console.log('✅ Checkout triggered:', checkoutResult);
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed. Please try again.';
      console.error('🔴 Cashfree payment error:', errorMessage, err);
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
