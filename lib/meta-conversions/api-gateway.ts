/**
 * Meta Conversions API Gateway Integration
 * Server-side conversion tracking for better accuracy and compliance
 *
 * Gateway ID: 707598524418962
 * Pixel ID: 906922940547021
 */

import crypto from 'crypto';

interface ConversionEvent {
  eventName: string;
  eventTime?: number;
  eventId?: string;
  eventSourceUrl?: string;
  optOut?: boolean;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentType?: string;
    contentId?: string;
    [key: string]: any;
  };
  testEventCode?: string;
}

/**
 * Hash PII data using SHA256 (required by Meta)
 */
function hashPII(value: string): string {
  if (!value) return '';
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Send conversion event to Meta Conversions API
 */
export async function sendConversionEvent(event: ConversionEvent) {
  try {
    const pixelId = '906922940547021';
    const accessToken = process.env.META_CONVERSIONS_API_TOKEN;

    if (!accessToken) {
      console.warn('⚠️  META_CONVERSIONS_API_TOKEN not set');
      return { success: false, error: 'Missing access token' };
    }

    // Hash user data (PII normalization)
    const userData = event.userData
      ? {
          em: event.userData.email ? hashPII(event.userData.email) : undefined,
          ph: event.userData.phone ? hashPII(event.userData.phone.replace(/\D/g, '')) : undefined,
          fn: event.userData.firstName ? hashPII(event.userData.firstName) : undefined,
          ln: event.userData.lastName ? hashPII(event.userData.lastName) : undefined,
          ct: event.userData.city ? hashPII(event.userData.city) : undefined,
          st: event.userData.state ? hashPII(event.userData.state) : undefined,
          zp: event.userData.zipCode ? hashPII(event.userData.zipCode) : undefined,
          country: event.userData.country ? hashPII(event.userData.country) : undefined,
          external_id: event.userData.externalId,
          client_ip_address: event.userData.clientIpAddress,
          client_user_agent: event.userData.clientUserAgent,
        }
      : {};

    // Remove undefined values
    Object.keys(userData).forEach((key) => {
      if (userData[key] === undefined) {
        delete userData[key];
      }
    });

    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime || Math.floor(Date.now() / 1000),
          event_id: event.eventId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          event_source_url: event.eventSourceUrl,
          opt_out: event.optOut || false,
          user_data: userData,
          custom_data: event.customData || {},
          test_event_code: event.testEventCode,
        },
      ],
      access_token: accessToken,
    };

    const response = await fetch(
      `https://graph.instagram.com/v18.0/${pixelId}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Meta Conversions API Error:', data);
      return {
        success: false,
        error: data.error?.message || 'API request failed',
      };
    }

    console.log('✅ Conversion event sent to Meta:', {
      eventName: event.eventName,
      eventId: payload.data[0].event_id,
    });

    return {
      success: true,
      eventId: payload.data[0].event_id,
      data: data,
    };
  } catch (error) {
    console.error('❌ Error sending conversion event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track form submission (Lead event)
 */
export async function trackFormSubmission(
  formData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    workshopName?: string;
    workshopId?: string;
  },
  clientIp?: string,
  userAgent?: string
) {
  return sendConversionEvent({
    eventName: 'Lead',
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    userData: {
      email: formData.email,
      phone: formData.phone,
      firstName: formData.firstName,
      lastName: formData.lastName,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: {
      contentName: formData.workshopName,
      contentType: 'workshop',
      contentId: formData.workshopId,
      currency: 'INR',
    },
  });
}

/**
 * Track page view (server-side)
 */
export async function trackPageView(
  pageUrl: string,
  userId?: string,
  clientIp?: string,
  userAgent?: string
) {
  return sendConversionEvent({
    eventName: 'PageView',
    eventSourceUrl: pageUrl,
    userData: {
      externalId: userId,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
  });
}

/**
 * Track purchase (server-side for accuracy)
 */
export async function trackPurchase(
  purchaseData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    orderId: string;
    amount: number;
    currency?: string;
    items?: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
  },
  clientIp?: string,
  userAgent?: string
) {
  const contentNames = purchaseData.items?.map((item) => item.name).join(', ') || 'Purchase';

  return sendConversionEvent({
    eventName: 'Purchase',
    eventId: purchaseData.orderId,
    userData: {
      email: purchaseData.email,
      phone: purchaseData.phone,
      firstName: purchaseData.firstName,
      lastName: purchaseData.lastName,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: {
      value: purchaseData.amount,
      currency: purchaseData.currency || 'INR',
      contentName: contentNames,
      contentType: 'product',
      contentId: purchaseData.orderId,
    },
  });
}

/**
 * Track view content (server-side)
 */
export async function trackViewContent(
  contentData: {
    contentId: string;
    contentName: string;
    contentType: string;
    value?: number;
    currency?: string;
  },
  userId?: string,
  clientIp?: string,
  userAgent?: string
) {
  return sendConversionEvent({
    eventName: 'ViewContent',
    userData: {
      externalId: userId,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: {
      contentId: contentData.contentId,
      contentName: contentData.contentName,
      contentType: contentData.contentType,
      value: contentData.value,
      currency: contentData.currency || 'INR',
    },
  });
}

/**
 * Track add to cart (server-side)
 */
export async function trackAddToCart(
  cartData: {
    cartId?: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    cartValue: number;
    currency?: string;
  },
  userId?: string,
  clientIp?: string,
  userAgent?: string
) {
  const itemNames = cartData.items.map((item) => item.name).join(', ');

  return sendConversionEvent({
    eventName: 'AddToCart',
    userData: {
      externalId: userId,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: {
      contentName: itemNames,
      contentType: 'product',
      value: cartData.cartValue,
      currency: cartData.currency || 'INR',
      num_items: cartData.items.length,
    },
  });
}

/**
 * Track initiate checkout (server-side)
 */
export async function trackInitiateCheckout(
  checkoutData: {
    checkoutId: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
    checkoutValue: number;
    currency?: string;
  },
  userId?: string,
  clientIp?: string,
  userAgent?: string
) {
  const itemNames = checkoutData.items.map((item) => item.name).join(', ');

  return sendConversionEvent({
    eventName: 'InitiateCheckout',
    eventId: checkoutData.checkoutId,
    userData: {
      externalId: userId,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: {
      contentName: itemNames,
      contentType: 'product',
      value: checkoutData.checkoutValue,
      currency: checkoutData.currency || 'INR',
      num_items: checkoutData.items.length,
    },
  });
}

/**
 * Track custom event (server-side)
 */
export async function trackCustomEvent(
  eventName: string,
  eventData?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentType?: string;
    contentId?: string;
    [key: string]: any;
  },
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  },
  clientIp?: string,
  userAgent?: string
) {
  return sendConversionEvent({
    eventName,
    userData: {
      ...userData,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
    },
    customData: eventData,
  });
}

export default {
  sendConversionEvent,
  trackFormSubmission,
  trackPageView,
  trackPurchase,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackCustomEvent,
};
