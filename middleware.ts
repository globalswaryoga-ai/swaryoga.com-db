import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Multi-Tenant: lightweight slug extraction (Edge-safe, no DB)
// ---------------------------------------------------------------------------
const TENANT_APP_DOMAIN = process.env.TENANT_APP_DOMAIN || 'app.swaryoga.com';
const CRM_SITE_DOMAIN = process.env.CRM_SITE_DOMAIN || 'crm.swaryoga.com';
const TENANT_HEADER = 'x-tenant-id';
const TENANT_RESPONSE_HEADER = 'x-tenant-slug';

function extractTenantSlugEdge(headers: Headers, hostname: string): string | null {
  // 1. Explicit header
  const h = headers.get(TENANT_HEADER);
  if (h) return h.trim().toLowerCase();
  // 2. Subdomain: e.g. acme.app.swaryoga.com → "acme"
  const lower = hostname.toLowerCase();
  if (lower.endsWith(`.${TENANT_APP_DOMAIN}`)) {
    const sub = lower.slice(0, -(TENANT_APP_DOMAIN.length + 1));
    if (sub && sub !== 'www') return sub;
  }
  return null;
}

// Simple in-memory rate limiting for Edge Middleware
// Note: This is per-edge-instance, which is fine for basic "hiker" protection
const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  // 0. Tenant Detection (Edge-safe — no DB call)
  const hostname = request.nextUrl.hostname || request.headers.get('host') || '';
  const tenantSlug = extractTenantSlugEdge(request.headers, hostname);

  // 0b. CRM Site Subdomain Rewrite
  // crm.swaryoga.com → serve /crm-site/* pages (does NOT affect main site or admin CRM)
  const lowerHost = hostname.toLowerCase().split(':')[0]; // strip port for localhost
  if (lowerHost === CRM_SITE_DOMAIN || lowerHost === 'crm.localhost') {
    const path = request.nextUrl.pathname;
    // Skip if already on /crm-site or accessing /api/crm-site or static assets
    if (!path.startsWith('/crm-site') && !path.startsWith('/_next') && !path.startsWith('/favicon') && !path.startsWith('/logo')) {
      // Rewrite / → /crm-site, /pricing → /crm-site/pricing, etc.
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/crm-site${path === '/' ? '' : path}`;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // 1. Rate Limiting Check — ONLY for API routes (skip page requests)
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/api/')) {
    // Non-API request: just add security headers and return
    const response = NextResponse.next();
    if (tenantSlug) {
      response.headers.set(TENANT_HEADER, tenantSlug);
      response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
    }
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  // IMPORTANT: On Vercel/Edge, request.ip can be undefined.
  // If we fall back to a constant like 127.0.0.1, all users share the same bucket
  // and will get rate-limited quickly. Prefer forwarded headers.
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0]?.trim() : '') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.ip ||
    'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  // Default: conservative limit for most APIs.
  // NOTE: Some admin/CRM pages (WhatsApp QR inbox) poll endpoints frequently
  // and can exceed 30 req/min during normal usage. Use path-based buckets
  // with higher limits for authenticated admin traffic.
  const hasAuthHeader = Boolean(request.headers.get('authorization'));
  let limit = 30; // 30 requests per minute per IP for general APIs
  let bucket = 'api';

  // WhatsApp QR bridge + WhatsApp admin APIs are chat-like and poll frequently.
  if (path.startsWith('/api/admin/crm/whatsapp/')) {
    bucket = 'crm_whatsapp';
    limit = hasAuthHeader ? 600 : 60;
  } else if (path.startsWith('/api/admin/crm/messages')) {
    // CRM messages thread API can be hit by polling/refresh.
    bucket = 'crm_messages';
    limit = hasAuthHeader ? 240 : 60;
  } else if (path.startsWith('/api/admin/crm/')) {
    // Other CRM admin endpoints may be used heavily from dashboards.
    bucket = 'crm_admin';
    limit = hasAuthHeader ? 180 : 60;
  } else if (path.startsWith('/api/auth/')) {
    // Keep auth endpoints tighter; they also have per-route rate limiting.
    bucket = 'auth';
    limit = 30;
  }

  const key = `${ip}:${bucket}`;
  const userData = rateLimitMap.get(key) || { count: 0, startTime: now };
  
  // Reset window if expired
  if (now - userData.startTime > windowMs) {
    userData.count = 1;
    userData.startTime = now;
  } else {
    userData.count++;
  }
  
  rateLimitMap.set(key, userData);

  if (userData.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - userData.startTime)) / 1000));
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(limit),
          'RateLimit-Remaining': '0',
          'X-RateLimit-Bucket': bucket,
        } 
      }
    );
  }

  // 2. CORS and Security Headers
  // Get the origin from the request
  const origin = request.headers.get('origin');
  
  // Allow these origins
  const allowedOrigins = [
    'https://swaryoga.com',
    'https://www.swaryoga.com',
    'https://crm.swaryoga.com',
    'https://app.swaryoga.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'android-app://',
  ];
  
  const isOriginAllowed = 
    !origin || 
    allowedOrigins.includes(origin) || 
    allowedOrigins.some(allowed => origin?.includes(allowed));

  // Handle preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': isOriginAllowed ? (origin || '*') : '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 3. Prepare response with common security headers
  const response = NextResponse.next();

  // Inject tenant slug for downstream API routes (so they don't re-parse)
  if (tenantSlug) {
    response.headers.set(TENANT_HEADER, tenantSlug);
    response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
  }
  
  // Add Security Headers (Simplified for Edge compatibility)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cashfree.com https://*.payu.in https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.cashfree.com https://*.payu.in https://*.googleapis.com; frame-src 'self' https://*.cashfree.com https://*.payu.in;");

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', isOriginAllowed ? (origin || '*') : '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Apply middleware to API routes + all page routes (for subdomain rewriting)
export const config = {
  matcher: [
    '/api/:path*',
    // CRM subdomain rewriting — match all page routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
