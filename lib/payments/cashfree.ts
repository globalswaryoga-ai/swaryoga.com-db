import { getRequestBaseUrl } from '@/lib/requestBaseUrl';
import { NextRequest } from 'next/server';

export type CashfreeEnv = 'sandbox' | 'production';

export type CashfreeOrderStatus =
  | 'ACTIVE'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | string;

export type CashfreePaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | string;

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export interface CashfreeCreateOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: CashfreeCustomerDetails;
  order_note?: string;
  order_meta?: {
    return_url?: string;
    notify_url?: string;
  };
}

export interface CashfreeCreateOrderResponse {
  cf_order_id?: number;
  order_id: string;
  order_status?: CashfreeOrderStatus;
  payment_session_id?: string;
  payments?: unknown;
  [key: string]: unknown;
}

export interface CashfreeGetOrderResponse {
  order_id: string;
  order_status?: CashfreeOrderStatus;
  order_amount?: number;
  order_currency?: string;
  cf_order_id?: number;
  payment_session_id?: string;
  payments?: unknown;
  [key: string]: unknown;
}

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  if (v.includes('YOUR_') || v === 'your_') {
    throw new Error(`${name} is not configured - placeholder value detected. Please set actual credentials.`);
  }
  return v;
}

export function getCashfreeEnv(): CashfreeEnv {
  return process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
}

export function getCashfreeApiVersion(): string {
  return process.env.CASHFREE_API_VERSION || '2023-08-01';
}

export function getCashfreeApiBase(): string {
  // Cashfree PG base URLs.
  // NOTE: if Cashfree changes domains for your account, update here.
  return getCashfreeEnv() === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function getCashfreeSdkUrl(): string {
  // Cashfree JS SDK v3
  return 'https://sdk.cashfree.com/js/v3/cashfree.js';
}

export function getCashfreeReturnUrl(request: NextRequest): string {
  const baseUrl = getRequestBaseUrl(request);
  // IMPORTANT: Cashfree will only send the order id back if we include placeholders
  // in the return_url. Without this, the user may see:
  //   "Payment Failed – Missing Cashfree order id"
  // Docs pattern: return_url = https://.../return?order_id={order_id}&order_token={order_token}
  // We only require order_id, but include order_token for debugging/future verification.
  let url = `${baseUrl}/api/payments/cashfree/return?order_id={order_id}&order_token={order_token}`;
  
  // Cashfree production requires HTTPS. For local testing, use a placeholder HTTPS URL
  // When deployed to Vercel, this will already be HTTPS
  if (url.startsWith('http://localhost') && getCashfreeEnv() === 'production') {
    // In production mode, localhost shouldn't be used anyway
    // But if it is, use a dummy HTTPS URL for Cashfree validation
    url = url.replace('http://localhost:3000', 'https://localhost:3000');
  }
  
  return url;
}

export function getCashfreeWebhookUrl(request: NextRequest): string {
  const baseUrl = getRequestBaseUrl(request);
  let url = `${baseUrl}/api/payments/cashfree/webhook`;
  
  // Cashfree production requires HTTPS for webhook URLs
  // When deployed to Vercel, this will already be HTTPS
  if (url.startsWith('http://localhost') && getCashfreeEnv() === 'production') {
    // For production mode on localhost, convert to HTTPS
    url = url.replace('http://localhost:3000', 'https://localhost:3000');
  }
  
  return url;
}

function cashfreeHeaders() {
  const clientId = requiredEnv('CASHFREE_CLIENT_ID');
  const clientSecret = requiredEnv('CASHFREE_CLIENT_SECRET');
  return {
    'Content-Type': 'application/json',
    'x-client-id': clientId,
    'x-client-secret': clientSecret,
    'x-api-version': getCashfreeApiVersion(),
  };
}

export async function cashfreeCreateOrder(
  payload: CashfreeCreateOrderRequest
): Promise<CashfreeCreateOrderResponse> {
  const url = `${getCashfreeApiBase()}/orders`;

  // Add 10 second timeout for Cashfree API calls (Cashfree can be slow from India)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`📡 Calling Cashfree API: ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: cashfreeHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as CashfreeCreateOrderResponse) : ({} as CashfreeCreateOrderResponse);

    if (!res.ok) {
      const msg = (json as any)?.message || (json as any)?.error || text || 'Cashfree create order failed';
      console.error(`❌ Cashfree API Error (${res.status}):`, msg);
      throw new Error(msg);
    }

    console.log(`✅ Cashfree API Success: order_id=${(json as any)?.order_id}`);
    return json;
  } catch (error) {
    if ((error as any)?.name === 'AbortError') {
      console.error('❌ Cashfree API timeout (10s exceeded)');
      throw new Error('Cashfree payment gateway timeout. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function cashfreeGetOrder(orderId: string): Promise<CashfreeGetOrderResponse> {
  const url = `${getCashfreeApiBase()}/orders/${encodeURIComponent(orderId)}`;

  // Add 10 second timeout for Cashfree API calls
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`📡 Fetching Cashfree order: ${orderId}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: cashfreeHeaders(),
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as CashfreeGetOrderResponse) : ({} as CashfreeGetOrderResponse);

    if (!res.ok) {
      const msg = (json as any)?.message || (json as any)?.error || text || 'Cashfree get order failed';
      console.error(`❌ Cashfree API Error (${res.status}):`, msg);
      throw new Error(msg);
    }

    console.log(`✅ Cashfree order status: ${(json as any)?.order_status}`);
    return json;
  } catch (error) {
    if ((error as any)?.name === 'AbortError') {
      console.error('❌ Cashfree API timeout (10s exceeded)');
      throw new Error('Cashfree payment gateway timeout. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
