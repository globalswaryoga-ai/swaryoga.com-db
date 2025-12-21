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
  // We route Cashfree return through an API handler so we can verify payment and update DB.
  return `${baseUrl}/api/payments/cashfree/return`;
}

export function getCashfreeWebhookUrl(request: NextRequest): string {
  const baseUrl = getRequestBaseUrl(request);
  return `${baseUrl}/api/payments/cashfree/webhook`;
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

  const res = await fetch(url, {
    method: 'POST',
    headers: cashfreeHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as CashfreeCreateOrderResponse) : ({} as CashfreeCreateOrderResponse);

  if (!res.ok) {
    const msg = (json as any)?.message || (json as any)?.error || text || 'Cashfree create order failed';
    throw new Error(msg);
  }

  return json;
}

export async function cashfreeGetOrder(orderId: string): Promise<CashfreeGetOrderResponse> {
  const url = `${getCashfreeApiBase()}/orders/${encodeURIComponent(orderId)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: cashfreeHeaders(),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as CashfreeGetOrderResponse) : ({} as CashfreeGetOrderResponse);

  if (!res.ok) {
    const msg = (json as any)?.message || (json as any)?.error || text || 'Cashfree get order failed';
    throw new Error(msg);
  }

  return json;
}
