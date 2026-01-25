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
  actionSource?: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
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
    leadId?: string | number; // Meta Lead Ads lead ID
    fbClickId?: string; // fbc parameter
    fbBrowserId?: string; // fbp parameter
  };
  customData?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentType?: string;
    contentId?: string;
    eventSource?: string;
    leadEventSource?: string;
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
 * Normalize and hash phone number for Meta
 * Removes non-digits and ensures country code
 */
function normalizeAndHashPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digits
  let normalized = phone.replace(/\D/g, '');
  // Add India country code if 10 digits
  if (normalized.length === 10) {
    normalized = '91' + normalized;
  }
  return hashPII(normalized);
}

/**
 * Generate appsecret_proof for Meta API (required for server-side calls)
 */
function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto
    .createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
}

/**
 * Send conversion event to Meta Conversions API
 */
export async function sendConversionEvent(event: ConversionEvent) {
  try {
    const pixelId = process.env.META_PIXEL_ID || '906922940547021';
    const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
    const appSecret = process.env.META_APP_SECRET;

    if (!accessToken) {
      console.warn('⚠️  META_CONVERSIONS_API_TOKEN not set');
      return { success: false, error: 'Missing access token' };
    }

    // Hash user data (PII normalization)
    const userData: Record<string, any> = {};
    
    if (event.userData) {
      // Hash email - Meta expects array format for em
      if (event.userData.email) {
        userData.em = [hashPII(event.userData.email)];
      }
      // Hash phone - Meta expects array format for ph
      if (event.userData.phone) {
        userData.ph = [normalizeAndHashPhone(event.userData.phone)];
      }
      // Hash other PII
      if (event.userData.firstName) userData.fn = hashPII(event.userData.firstName);
      if (event.userData.lastName) userData.ln = hashPII(event.userData.lastName);
      if (event.userData.city) userData.ct = hashPII(event.userData.city);
      if (event.userData.state) userData.st = hashPII(event.userData.state);
      if (event.userData.zipCode) userData.zp = hashPII(event.userData.zipCode);
      if (event.userData.country) userData.country = hashPII(event.userData.country);
      // Non-hashed fields
      if (event.userData.externalId) userData.external_id = event.userData.externalId;
      if (event.userData.clientIpAddress) userData.client_ip_address = event.userData.clientIpAddress;
      if (event.userData.clientUserAgent) userData.client_user_agent = event.userData.clientUserAgent;
      if (event.userData.leadId) userData.lead_id = event.userData.leadId;
      if (event.userData.fbClickId) userData.fbc = event.userData.fbClickId;
      if (event.userData.fbBrowserId) userData.fbp = event.userData.fbBrowserId;
    }

    // Build event data
    const eventData: Record<string, any> = {
      event_name: event.eventName,
      event_time: event.eventTime || Math.floor(Date.now() / 1000),
      event_id: event.eventId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action_source: event.actionSource || 'website',
      user_data: userData,
    };

    // Add optional fields
    if (event.eventSourceUrl) eventData.event_source_url = event.eventSourceUrl;
    if (event.optOut) eventData.opt_out = event.optOut;
    if (event.customData && Object.keys(event.customData).length > 0) {
      eventData.custom_data = event.customData;
    }

    const payload: Record<string, any> = {
      data: [eventData],
      access_token: accessToken,
    };

    // Add test event code if provided
    if (event.testEventCode) {
      payload.test_event_code = event.testEventCode;
    }

    // Add appsecret_proof if app secret is available (recommended for security)
    if (appSecret) {
      payload.appsecret_proof = generateAppSecretProof(accessToken, appSecret);
    }

    // Use Facebook Graph API (not Instagram)
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
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
        details: data.error,
      };
    }

    console.log('✅ Conversion event sent to Meta:', {
      eventName: event.eventName,
      eventId: eventData.event_id,
      eventsReceived: data.events_received,
    });

    return {
      success: true,
      eventId: eventData.event_id,
      eventsReceived: data.events_received,
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
 * Supports both website leads and CRM/system-generated leads
 */
export async function trackFormSubmission(
  formData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    workshopName?: string;
    workshopId?: string;
    leadId?: string | number; // Meta Lead Ads ID
    eventSource?: string; // e.g., 'crm', 'website', 'whatsapp'
  },
  clientIp?: string,
  userAgent?: string,
  options?: {
    actionSource?: 'website' | 'system_generated' | 'other';
    testEventCode?: string;
  }
) {
  // Determine action source based on context
  const actionSource = options?.actionSource || 
    (formData.leadId ? 'system_generated' : 'website');

  return sendConversionEvent({
    eventName: 'Lead',
    actionSource,
    eventSourceUrl: actionSource === 'website' && typeof window !== 'undefined' 
      ? window.location.href 
      : 'https://swaryoga.com',
    userData: {
      email: formData.email,
      phone: formData.phone,
      firstName: formData.firstName,
      lastName: formData.lastName,
      clientIpAddress: clientIp,
      clientUserAgent: userAgent,
      leadId: formData.leadId,
    },
    customData: {
      contentName: formData.workshopName,
      contentType: 'workshop',
      contentId: formData.workshopId,
      currency: 'INR',
      event_source: formData.eventSource || 'crm',
      lead_event_source: 'Swar Yoga CRM',
    },
    testEventCode: options?.testEventCode,
  });
}

/**
 * Track CRM lead (system-generated lead from CRM)
 * Use this for leads imported or created in CRM
 */
export async function trackCRMLeadEvent(
  leadData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    leadId?: string | number;
    source?: string;
    workshopName?: string;
  },
  testEventCode?: string
) {
  return sendConversionEvent({
    eventName: 'Lead',
    actionSource: 'system_generated',
    eventSourceUrl: 'https://swaryoga.com',
    userData: {
      email: leadData.email,
      phone: leadData.phone,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      leadId: leadData.leadId,
    },
    customData: {
      event_source: 'crm',
      lead_event_source: 'Swar Yoga CRM',
      content_name: leadData.workshopName,
      source: leadData.source,
    },
    testEventCode,
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
  trackCRMLeadEvent,
  trackPageView,
  trackPurchase,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackCustomEvent,
};
