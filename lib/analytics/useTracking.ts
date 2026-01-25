/**
 * Hook for tracking form submissions as Lead events
 * Use this in your form components to auto-track when users fill and submit forms
 */

'use client';

import { useCallback } from 'react';
import { trackLead, pushToDataLayer } from '@/lib/analytics/pixel-events';

export const useFormTracking = () => {
  const handleFormSubmit = useCallback((formType: string, formValue?: number) => {
    // Track to Meta Pixel
    trackLead(formType, formValue);

    // Also track to GTM
    pushToDataLayer('form_submit', {
      form_type: formType,
      form_value: formValue,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return { handleFormSubmit };
};

export const useContentTracking = () => {
  const trackContentView = useCallback(
    (contentName: string, contentType: string, price?: number) => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'ViewContent', {
          content_name: contentName,
          content_type: contentType,
          value: price || undefined,
          currency: 'INR',
        });
      }

      // Also track to GTM
      pushToDataLayer('view_content', {
        content_name: contentName,
        content_type: contentType,
        value: price,
      });
    },
    []
  );

  return { trackContentView };
};

export const useCheckoutTracking = () => {
  const trackCheckout = useCallback((cartValue: number, itemCount: number) => {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: cartValue,
        num_items: itemCount,
        currency: 'INR',
      });
    }

    pushToDataLayer('begin_checkout', {
      value: cartValue,
      num_items: itemCount,
      currency: 'INR',
    });
  }, []);

  return { trackCheckout };
};

export const usePurchaseTracking = () => {
  const trackPurchase = useCallback(
    (purchaseValue: number, orderId?: string, items?: any[]) => {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
          value: purchaseValue,
          currency: 'INR',
          transaction_id: orderId,
          contents: items,
        });
      }

      pushToDataLayer('purchase', {
        transaction_id: orderId,
        value: purchaseValue,
        currency: 'INR',
        items: items,
      });
    },
    []
  );

  return { trackPurchase };
};
