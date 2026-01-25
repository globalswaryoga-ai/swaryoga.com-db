/**
 * Meta Pixel Event Tracking Utilities
 * Fires conversion events to Meta Pixel for cost optimization
 * Events: PageView, Lead, ViewContent, AddToCart, InitiateCheckout, Purchase
 */

export interface PixelEventData {
  [key: string]: any;
}

/**
 * Fire a Meta Pixel event
 */
export const firePixelEvent = (eventName: string, data?: PixelEventData) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, data || {});
  }
};

/**
 * Track page view (automatically fired on pageload)
 */
export const trackPageView = () => {
  firePixelEvent('PageView');
};

/**
 * Track form submission (Lead event)
 * Fired when user fills and submits: contact form, registration form, class enrollment, etc.
 */
export const trackLead = (formType?: string, leadValue?: number) => {
  const data: PixelEventData = {};
  if (formType) data.content_name = formType;
  if (leadValue) data.value = leadValue;
  firePixelEvent('Lead', data);
};

/**
 * Track content view
 * Fired when user views: yoga session, workshop, investment package, course, etc.
 */
export const trackViewContent = (
  contentName: string,
  contentType: 'session' | 'workshop' | 'investment' | 'course' | 'product',
  price?: number,
  currency: string = 'INR'
) => {
  const data: PixelEventData = {
    content_name: contentName,
    content_type: contentType,
    currency,
  };
  if (price) data.value = price;
  firePixelEvent('ViewContent', data);
};

/**
 * Track add to cart
 * Fired when user adds yoga class, workshop, or product to cart
 */
export const trackAddToCart = (
  productName: string,
  productType: string,
  price: number,
  currency: string = 'INR'
) => {
  const data: PixelEventData = {
    content_name: productName,
    content_type: productType,
    value: price,
    currency,
  };
  firePixelEvent('AddToCart', data);
};

/**
 * Track checkout initiation
 * Fired when user proceeds to checkout from cart
 */
export const trackInitiateCheckout = (
  cartValue: number,
  numItems: number,
  currency: string = 'INR'
) => {
  const data: PixelEventData = {
    value: cartValue,
    num_items: numItems,
    currency,
  };
  firePixelEvent('InitiateCheckout', data);
};

/**
 * Track purchase
 * Fired after successful payment
 */
export const trackPurchase = (
  purchaseValue: number,
  currency: string = 'INR',
  orderId?: string,
  items?: Array<{ name: string; price: number; quantity: number }>
) => {
  const data: PixelEventData = {
    value: purchaseValue,
    currency,
  };
  if (orderId) data.transaction_id = orderId;
  if (items) data.contents = items;
  firePixelEvent('Purchase', data);
};

/**
 * Track custom events
 */
export const trackCustomEvent = (eventName: string, data?: PixelEventData) => {
  firePixelEvent(eventName, data);
};

/**
 * Initialize GTM with dataLayer
 */
export const initializeGTM = (gtagId?: string) => {
  if (typeof window !== 'undefined') {
    // Initialize dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];

    // Push initial page view to GTM
    (window as any).gtag = function () {
      (window as any).dataLayer.push(arguments);
    };
    (window as any).gtag('js', new Date());

    if (gtagId) {
      (window as any).gtag('config', gtagId, {
        page_path: window.location.pathname,
      });
    }
  }
};

/**
 * Push custom event to GTM dataLayer
 */
export const pushToDataLayer = (event: string, data?: PixelEventData) => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event,
      ...data,
    });
  }
};
