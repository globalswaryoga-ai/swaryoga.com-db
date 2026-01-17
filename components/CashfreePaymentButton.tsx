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
      checkout: (opts: { paymentSessionId: string; redirectTarget?: string }) => Promise<void>;
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
  const [sdkReady, setSdkReady] = useState(false);
  const sdkCheckCountRef = useRef(0);
  const maxSDKChecks = 60; // Max 30 seconds (60 * 500ms)

  // SDK is ready when window.Cashfree exists
  useEffect(() => {
    const checkSDK = () => {
      if (typeof window !== 'undefined' && window.Cashfree && typeof window.Cashfree.checkout === 'function') {
        setSdkReady(true);
        console.log('✅ Cashfree SDK verified and ready');
        return true;
      }
      return false;
    };

    if (checkSDK()) return;

    const interval = setInterval(() => {
      sdkCheckCountRef.current += 1;
      
      if (checkSDK()) {
        clearInterval(interval);
      } else if (sdkCheckCountRef.current >= maxSDKChecks) {
        clearInterval(interval);
        console.error('❌ Cashfree SDK failed to load within 30 seconds');
        setError('Payment gateway failed to load. Please refresh and try again.');
      }
    }, 500);

    return () => {
      clearInterval(interval);
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
            items: items.length > 0 ? items : undefined,
          }),
          signal: controller.signal,
        });

        const elapsed = Date.now() - startTime;
        console.log(`⏱️ API response in ${elapsed}ms, status: ${response.status}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Payment initiation failed' }));
          console.error('❌ API Error Response:', data);
          
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
        console.log('✅ Payment session received:', paymentData.paymentSessionId?.substring(0, 20) + '...');

        if (!paymentData.success || !paymentData.paymentSessionId) {
          throw new Error(paymentData.error || 'Invalid payment session');
        }

        // Step 2: Trigger Cashfree checkout
        const cf = window.Cashfree;
        if (!cf) {
          throw new Error('Cashfree SDK not loaded. Please refresh the page.');
        }

        if (typeof cf.checkout !== 'function') {
          console.error('❌ Cashfree.checkout is not a function. SDK object:', cf);
          console.error('Available properties:', Object.keys(cf || {}));
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
        async
        defer
        onLoad={() => {
          console.log('✅ Cashfree SDK script loaded from CDN');
          console.log('📊 window.Cashfree state:', typeof window.Cashfree, Object.keys(window.Cashfree || {}));
          
          // Verify SDK initialization with multiple attempts
          let attempts = 0;
          const maxAttempts = 30; // Try for up to 15 seconds (30 × 500ms) - SDK can be slow
          
          const verifySdk = () => {
            const cfExists = typeof window.Cashfree !== 'undefined';
            const checkoutExists = typeof window.Cashfree?.checkout === 'function';
            
            if (cfExists && checkoutExists) {
              setSdkReady(true);
              console.log('✅ Cashfree SDK ready - checkout function verified after', attempts * 500, 'ms');
              return;
            }
            
            attempts++;
            
            // Log progress every 10 attempts (every 5 seconds)
            if (attempts % 10 === 0) {
              console.log(`⏳ Cashfree SDK initialization attempt ${attempts}/${maxAttempts}`, {
                windowCashfreeExists: cfExists,
                checkoutFunctionExists: checkoutExists,
                windowCashfreeKeys: Object.keys(window.Cashfree || {}),
              });
            }
            
            if (attempts < maxAttempts) {
              setTimeout(verifySdk, 500);
            } else {
              console.error('❌ Cashfree SDK loaded but checkout function never became available after', maxAttempts * 500, 'ms');
              console.error('📊 Final state:', {
                windowCashfireExists: cfExists,
                checkoutFunctionExists: checkoutExists,
                windowCashfireType: typeof window.Cashfree,
                windowCashfireKeys: Object.keys(window.Cashfree || {}),
                windowCashfreeCheckoutType: typeof window.Cashfree?.checkout,
              });
              
              // Try manual re-inject as last resort
              console.log('🔄 Attempting SDK re-injection as final fallback...');
              const lastAttempt = document.createElement('script');
              lastAttempt.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
              lastAttempt.async = true;
              lastAttempt.onload = () => {
                console.log('✅ Re-injected SDK loaded');
                if (typeof window.Cashfree?.checkout === 'function') {
                  setSdkReady(true);
                  console.log('✅ SDK finally ready after re-injection');
                } else {
                  setError('Payment gateway loaded but checkout failed to initialize. Please refresh the page.');
                }
              };
              lastAttempt.onerror = () => {
                setError('Payment gateway is temporarily unavailable. Please refresh and try again.');
              };
              document.head.appendChild(lastAttempt);
            }
          };
          
          verifySdk();
        }}
        onError={() => {
          console.error('❌ CRITICAL: Cashfree SDK failed to load via Next.js Script');
          console.error('SDK URL: https://sdk.cashfree.com/js/v3/cashfree.js');
          
          // Try manual SDK load as immediate fallback
          console.log('📡 Attempting immediate fallback SDK load via direct script injection...');
          const fallbackScript = document.createElement('script');
          fallbackScript.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
          fallbackScript.async = true;
          
          let fallbackAttempts = 0;
          const maxFallbackAttempts = 30;
          
          fallbackScript.onload = () => {
            console.log('✅ Fallback script loaded successfully');
            
            // Verify with same retry logic as primary
            const verifyFallback = () => {
              if (typeof window.Cashfree?.checkout === 'function') {
                setSdkReady(true);
                console.log('✅ Fallback SDK ready - checkout function verified');
                return;
              }
              
              fallbackAttempts++;
              if (fallbackAttempts < maxFallbackAttempts) {
                setTimeout(verifyFallback, 500);
              } else {
                console.error('❌ Fallback SDK loaded but checkout never became available');
                setError('Payment gateway is temporarily unavailable. Please:\n1. Refresh the page\n2. Check your internet connection\n3. Disable VPN if using one\n\nIf problem persists, contact support.');
              }
            };
            
            verifyFallback();
          };
          
          fallbackScript.onerror = () => {
            console.error('❌ Fallback SDK load also failed - Network issue detected');
            setError('Payment gateway is temporarily unavailable. Please:\n1. Check your internet connection\n2. Disable VPN if using one\n3. Try again in a few moments\n\nIf problem persists, contact support.');
          };
          
          document.head.appendChild(fallbackScript);
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
