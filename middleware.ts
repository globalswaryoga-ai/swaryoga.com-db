import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================================================
// PROTECTION SYSTEM — swaryoga.com & crm.swaryoga.com
// ===========================================================================
// Layer 1  — Suspicious request blocking (path traversal, injection)
// Layer 4  — Rate limiting (per-IP, per-bucket, sliding window)
// Layer 5  — CORS strict-mode (block disallowed origins)
// Layer 6  — Security headers (HSTS, CSP, XSS, clickjack, MIME)
// Layer 7  — Request ID tracing (X-Request-Id on every response)
// ===========================================================================

// ---------------------------------------------------------------------------
// Multi-Tenant: lightweight slug extraction (Edge-safe, no DB)
// ---------------------------------------------------------------------------
const TENANT_APP_DOMAIN = process.env.TENANT_APP_DOMAIN || 'app.swaryoga.com';
const CRM_SITE_DOMAIN = process.env.CRM_SITE_DOMAIN || 'crm.swaryoga.com';
const TENANT_HEADER = 'x-tenant-id';
const TENANT_RESPONSE_HEADER = 'x-tenant-slug';

function extractTenantSlugEdge(headers: Headers, hostname: string): string | null {
  const h = headers.get(TENANT_HEADER);
  if (h) return h.trim().toLowerCase();
  const lower = hostname.toLowerCase();
  if (lower.endsWith(`.${TENANT_APP_DOMAIN}`)) {
    const sub = lower.slice(0, -(TENANT_APP_DOMAIN.length + 1));
    if (sub && sub !== 'www') return sub;
  }
  return null;
}

// ---------------------------------------------------------------------------
// LAYER 1 — Suspicious request detection
// ---------------------------------------------------------------------------
const SUSPICIOUS_PATH_PATTERNS = [
  /\.\.[/\\]/,                       // path traversal
  /[<>'"`;|]/,                       // injection chars in URL
  /\.(php|asp|aspx|cgi|pl|py)$/i,   // probing for non-Next.js backends
  /\/wp-(admin|login|content|includes)/i, // WordPress probes
  /\/phpmyadmin|\/adminer|\/mysql/i, // DB admin probes
  /\/\.env|\/\.git|\/\.ssh/i,       // sensitive file access
  /\/etc\/passwd|\/proc\/self/i,    // Linux file probes
  /union\s+select|drop\s+table/i,   // SQL injection in URL
  /%00|%0[aAdD]/,                    // null byte / CRLF injection
];

function isSuspiciousRequest(pathname: string, search: string): boolean {
  const full = pathname + search;
  try {
    return SUSPICIOUS_PATH_PATTERNS.some(p => p.test(decodeURIComponent(full).replace(/\+/g, ' ')));
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// LAYER 4 — Rate limiting (sliding window, per-bucket)
// ---------------------------------------------------------------------------
const MAX_MAP_SIZE = 50_000;
interface RateEntry { count: number; startTime: number }
const rateLimitMap = new Map<string, RateEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

function cleanupMaps(now: number, windowMs: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, v] of rateLimitMap) {
    if (now - v.startTime > windowMs * 2) rateLimitMap.delete(k);
  }
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    const excess = rateLimitMap.size - MAX_MAP_SIZE;
    const iter = rateLimitMap.keys();
    for (let i = 0; i < excess; i++) {
      const k = iter.next().value;
      if (k) rateLimitMap.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// LAYER 7 — Request ID generator
// ---------------------------------------------------------------------------
function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// LAYER 5 — CORS strict-mode
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
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

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

// ---------------------------------------------------------------------------
// LAYER 6 — Security headers
// ---------------------------------------------------------------------------
const STRICT_CSP_ENABLED = process.env.STRICT_CSP === 'true';

const STRICT_CSP_RULES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cashfree.com https://*.payu.in https://www.googletagmanager.com https://unpkg.com https://connect.facebook.net https://vercel.live https://*.vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:",
  "connect-src 'self' https://*.cashfree.com https://*.payu.in https://*.googleapis.com https://vercel.live https://*.vercel.live wss://*.vercel.live",
  "frame-src 'self' https://*.cashfree.com https://*.payu.in https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const RELAXED_CSP_RULES = [
  "default-src 'self' https: wss:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: https: blob:",
  "font-src 'self' https: data:",
  "media-src 'self' https: blob:",
  "connect-src 'self' https: wss: blob:",
  "frame-src 'self' https: https://iframe.mediadelivery.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
].join('; ');

const CSP = STRICT_CSP_ENABLED ? STRICT_CSP_RULES : RELAXED_CSP_RULES;

function applySecurityHeaders(res: NextResponse, requestId: string, pathname: string, searchParams: URLSearchParams): void {
  res.headers.set('X-Request-Id', requestId);
  const isLandingPagePreview = pathname.startsWith('/lp/') && searchParams.get('preview') === 'true';
  res.headers.set('X-Frame-Options', isLandingPagePreview ? 'SAMEORIGIN' : 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), usb=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('Content-Security-Policy', CSP);
}

// ===========================================================================
// MAIN MIDDLEWARE
// ===========================================================================

export function middleware(request: NextRequest) {
  const requestId = generateRequestId();

  // ── 0. Tenant Detection ──
  const hostname = request.nextUrl.hostname || request.headers.get('host') || '';
  const tenantSlug = extractTenantSlugEdge(request.headers, hostname);

  // ── 0b. CRM Site Subdomain Rewrite ──
  const lowerHost = hostname.toLowerCase().split(':')[0];
  if (lowerHost === CRM_SITE_DOMAIN || lowerHost === 'crm.localhost') {
    const p = request.nextUrl.pathname;
    if (!p.startsWith('/crm-site') && !p.startsWith('/api') && !p.startsWith('/admin') && !p.startsWith('/life-planner') && !p.startsWith('/lp') && !p.startsWith('/_next') && !p.startsWith('/favicon') && !p.startsWith('/logo')) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/crm-site${p === '/' ? '' : p}`;
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // ── Extract client IP ──
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0]?.trim() : '') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.ip ||
    'unknown';

  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search || '';
  const now = Date.now();
  const windowMs = 60 * 1000;

  // ── LAYER 1: Suspicious request blocking ──
  if (isSuspiciousRequest(path, search)) {
    return new NextResponse(
      JSON.stringify({ error: 'Blocked', code: 'SUSPICIOUS_REQUEST' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
    );
  }

  // ── Non-API requests — security headers only ──
  if (!path.startsWith('/api/')) {
    const response = NextResponse.next();
    if (tenantSlug) {
      response.headers.set(TENANT_HEADER, tenantSlug);
      response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
    }
    applySecurityHeaders(response, requestId, path, request.nextUrl.searchParams);
    return response;
  }

  // ── Cleanup stale map entries ──
  cleanupMaps(now, windowMs);

  // ── LAYER 4: Rate limiting ──
  const hasAuthHeader = Boolean(request.headers.get('authorization'));
  let baseLimit = 60;
  let bucket = 'api';

  if (path.startsWith('/api/sadhana/')) {
    bucket = 'sadhana';
    baseLimit = 300; // High limit: sadhana pages poll every 3s + admin calendar views
  } else if (path.startsWith('/api/admin/crm/whatsapp/')) {
    bucket = 'crm_whatsapp';
    baseLimit = hasAuthHeader ? 600 : 120;
  } else if (path.startsWith('/api/admin/crm/messages')) {
    bucket = 'crm_messages';
    baseLimit = hasAuthHeader ? 300 : 120;
  } else if (path.startsWith('/api/admin/crm/')) {
    bucket = 'crm_admin';
    baseLimit = hasAuthHeader ? 300 : 120;
  } else if (path.startsWith('/api/life-planner/')) {
    bucket = 'life_planner';
    baseLimit = hasAuthHeader ? 100 : 30;
  } else if (path.startsWith('/api/crm-site/')) {
    bucket = 'crm_site';
    baseLimit = 60;
  } else if (path.startsWith('/api/admin/recorded-courses')) {
    bucket = 'admin_courses';
    baseLimit = hasAuthHeader ? 120 : 60;
  } else if (path.startsWith('/api/admin/')) {
    bucket = 'admin_general';
    baseLimit = hasAuthHeader ? 120 : 60;
  } else if (path.startsWith('/api/auth/admin-login')) {
    bucket = 'admin_login';
    baseLimit = 10;
  } else if (path.startsWith('/api/auth/')) {
    bucket = 'auth';
    baseLimit = 30;
  } else if (path.startsWith('/api/payments/')) {
    bucket = 'payments';
    baseLimit = 20;
  }

  const key = `${ip}:${bucket}`;
  const entry = rateLimitMap.get(key) || { count: 0, startTime: now };
  if (now - entry.startTime > windowMs) {
    entry.count = 1;
    entry.startTime = now;
  } else {
    entry.count++;
  }
  rateLimitMap.set(key, entry);

  const remaining = Math.max(0, baseLimit - entry.count);

  if (entry.count > baseLimit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - entry.startTime)) / 1000));
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'RateLimit-Limit': String(baseLimit),
          'RateLimit-Remaining': '0',
          'X-RateLimit-Bucket': bucket,
          'X-Request-Id': requestId,
        },
      }
    );
  }

  // ── LAYER 5: CORS strict-mode ──
  const origin = request.headers.get('origin');
  const originOk = isOriginAllowed(origin);

  if (request.method === 'OPTIONS') {
    if (!originOk) {
      return new NextResponse(null, { status: 403, headers: { 'X-Request-Id': requestId } });
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Tenant-Id',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        'X-Request-Id': requestId,
      },
    });
  }

  // ── LAYER 6: Build response with security headers ──
  const response = NextResponse.next();

  if (tenantSlug) {
    response.headers.set(TENANT_HEADER, tenantSlug);
    response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
  }

  applySecurityHeaders(response, requestId, path, request.nextUrl.searchParams);

  if (originOk && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('RateLimit-Limit', String(baseLimit));
  response.headers.set('RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Bucket', bucket);

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
