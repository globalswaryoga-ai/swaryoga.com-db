'use client';

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

/**
 * @fileoverview Cashfree Payment Button Component
 *
 * Uses Cashfree JS SDK v3 for secure payment checkout
 * Features:
 * - Loads Cashfree SDK via Next.js Script (handles CSP)
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
  courseId?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: string) => void;
  onLoading?: (loading: boolean) => void;
  items?: Array<{ name: string; price: number; quantity: number }>;
  className?: string;
  disabled?: boolean;
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
  courseId,
  onSuccess,
  onError,
  onLoading,
  items = [],
  className = '',
  disabled = false,
}: CashfreePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 30s

    const getOrInitInstance = () => {
      if (typeof window === 'undefined') return null;
      const win = window as any;
      if (win.CashfreeInstance && typeof win.CashfreeInstance.checkout === 'function') {
        return win.CashfreeInstance;
      }
      if (typeof win.Cashfree === 'function') {
        try {
          const inst = win.Cashfree({ mode: 'production' });
          if (inst && typeof inst.checkout === 'function') {
            win.CashfreeInstance = inst;
            return inst;
          }
        } catch (e) {
          console.warn('Cashfree constructor error:', e);
        }
      } else if (win.Cashfree && typeof win.Cashfree.checkout === 'function') {
        win.CashfreeInstance = win.Cashfree;
        return win.Cashfree;
      }
      return null;
    };

    const checkSDK = () => {
      const inst = getOrInitInstance();
      if (inst) {
        setSdkReady(true);
        setError('');
        console.log('✅ Cashfree SDK verified and ready');
        return true;
      }
      return false;
    };

    if (checkSDK()) return;

    // Load SDK via direct script injection if not already in DOM
    if (typeof document !== 'undefined') {
      const existing = document.querySelector('script[src*="cashfree.js"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.async = true;
        script.onload = () => {
          checkSDK();
        };
        script.onerror = () => {
          console.error('Failed to load Cashfree script tag');
        };
        document.head.appendChild(script);
      }
    }

    timer = setInterval(() => {
      attempts += 1;
      if (checkSDK()) {
        if (timer) clearInterval(timer);
      } else if (attempts >= maxAttempts) {
        if (timer) clearInterval(timer);
        console.error('❌ Cashfree SDK failed to initialize after 30 seconds');
        setError('Payment gateway failed to load. Please refresh and try again.');
      }
    }, 500);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');
      onLoading?.(true);

      console.log('🎯 Initiating Cashfree payment...');

      if (!window.Cashfree) {
        throw new Error('Cashfree SDK not loaded. Please refresh and try again.');
      }

      // Step 1: Call our API to initiate payment with 10 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ Payment API timeout after 10s');
      }, 10000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token && token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        console.log('📡 Calling /api/payments/cashfree/initiate...');
        const startTime = Date.now();
        
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
            courseId,
            items: items.length > 0 ? items : undefined,
          }),
          signal: controller.signal,
        });

        const elapsed = Date.now() - startTime;
        console.log(`⏱️ API response in ${elapsed}ms, status: ${response.status}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Payment initiation failed' }));
          console.error('❌ API Error Response:', data);
          
          let errorMessage = data.error || data.message || 'Failed to initiate payment';
          
          if (response.status === 401 || response.status === 403) {
            errorMessage = data.error || 'Payment authentication failed. Please try again or contact support.';
          } else if (data.error?.includes('credential') || data.error?.includes('not properly configured')) {
            errorMessage = 'Payment server error. This might be a Cashfree credential issue. Please contact support.';
          } else if (data.error?.includes('authentication')) {
            errorMessage = 'Authentication failed with payment gateway. Credentials may need renewal.';
          }
          
          throw new Error(errorMessage);
        }

        const paymentData = await response.json();
        console.log('✅ Payment session received:', paymentData.paymentSessionId?.substring(0, 20) + '...');

        if (!paymentData.success || !paymentData.paymentSessionId) {
          throw new Error(paymentData.error || 'Invalid payment session');
        }

        // Step 2: Trigger Cashfree checkout
        let cf = (window as any).CashfreeInstance || (window as any).Cashfree;
        if (!cf) {
          throw new Error('Cashfree SDK not loaded. Please refresh the page.');
        }

        // If it's the factory function, initialize it
        if (typeof cf === 'function' && typeof cf.checkout !== 'function') {
          console.log('🔄 Initializing Cashfree instance in handlePayment...');
          cf = cf({ mode: 'production' });
          (window as any).CashfreeInstance = cf;
        }

        if (typeof cf.checkout !== 'function') {
          console.error('❌ Cashfree.checkout is still not a function. Object:', cf);
          throw new Error('Cashfree checkout function not available. Please refresh the page and try again.');
        }

        console.log('🔒 Opening Cashfree checkout with session ID:', paymentData.paymentSessionId?.substring(0, 30) + '...');
        
        // Cashfree SDK v3 - checkout is a function, not a constructor
        try {
          // Call checkout and wait for completion
          const checkoutPromise = cf.checkout({
            paymentSessionId: paymentData.paymentSessionId,
            redirectTarget: '_self',
          });
          
          // If checkout doesn't return a promise, that's OK - Cashfree might open directly
          if (checkoutPromise && typeof checkoutPromise.then === 'function') {
            await checkoutPromise;
          }
          
          console.log('✅ Cashfree checkout opened/redirected successfully');
        } catch (checkoutError) {
          console.error('❌ Checkout execution error:', checkoutError);
          const errorMsg = checkoutError instanceof Error ? checkoutError.message : String(checkoutError);
          throw new Error(`Failed to open Cashfree checkout: ${errorMsg}`);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed. Please try again.';
      console.error('❌ Payment Error:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <div className="w-full">
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ Cashfree SDK script loaded from CDN');
          try {
            const win = window as any;
            if (typeof win.Cashfree === 'function') {
              const inst = win.Cashfree({ mode: 'production' });
              win.CashfreeInstance = inst;
              if (inst && typeof inst.checkout === 'function') {
                setSdkReady(true);
                setError('');
                console.log('✅ Cashfree instance initialized from Next.js Script onLoad');
              }
            } else if (win.Cashfree && typeof win.Cashfree.checkout === 'function') {
              win.CashfreeInstance = win.Cashfree;
              setSdkReady(true);
              setError('');
            }
          } catch (e) {
            console.warn('⚠️ Error initializing Cashfree on onLoad:', e);
          }
        }}
        onError={() => {
          console.error('❌ Next.js Script onError for Cashfree');
        }}
      />
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">❌ Payment Error</p>
          <p className="text-sm whitespace-pre-line">{error}</p>
          <p className="text-xs mt-2 font-semibold">💡 Tip: Open F12 (DevTools) → Console tab to see detailed error messages</p>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={disabled || loading || !sdkReady}
        className={`${
          className
            ? className
            : 'w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all transform hover:scale-105 flex items-center justify-center gap-2'
        } ${loading || !sdkReady ? 'opacity-75 cursor-wait' : ''}`}
        title={!sdkReady ? 'Loading payment gateway...' : loading ? 'Processing...' : 'Click to pay'}
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Processing Payment...
          </>
        ) : !sdkReady ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Loading Payment Gateway...
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
