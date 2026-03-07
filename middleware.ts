import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================================================
// MULTI-LAYER PROTECTION SYSTEM — swaryoga.com & crm.swaryoga.com
// ===========================================================================
// Layer 1  — Suspicious request blocking (path traversal, injection)
// Layer 2  — IP auto-ban for repeat offenders
// Layer 3  — Bot & scanner detection (UA + header fingerprint)
// Layer 4  — Rate limiting (per-IP, per-bucket, sliding window)
// Layer 5  — CORS strict-mode (block disallowed origins)
// Layer 6  — Security headers (HSTS, CSP, XSS, clickjack, MIME)
// Layer 7  — Request ID tracing (X-Request-Id on every response)
// Layer 8  — IP reputation scoring (behavioural risk profiling)
// Layer 9  — Adaptive rate limiting (attack-pattern driven)
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
  /[<>'"`;|]/,                       // injection chars in URL (& and $ removed – valid in query strings)
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
    // Malformed URI encoding is itself suspicious
    return true;
  }
}

// ---------------------------------------------------------------------------
// LAYER 2 — Auto-ban store (IP gets banned after too many violations)
// ---------------------------------------------------------------------------
const MAX_MAP_SIZE = 50_000;              // hard cap to prevent OOM
const BAN_THRESHOLD = 5;                  // violations before auto-ban
const BAN_DURATION_MS = 15 * 60 * 1000;  // 15-minute ban

interface BanRecord { until: number; violations: number }
const banMap = new Map<string, BanRecord>();

function recordViolation(ip: string): void {
  const rec = banMap.get(ip) || { until: 0, violations: 0 };
  rec.violations++;
  if (rec.violations >= BAN_THRESHOLD) {
    rec.until = Date.now() + BAN_DURATION_MS;
  }
  banMap.set(ip, rec);
  // Also bump IP reputation score
  ipReputationHit(ip, 20);
}

function isBanned(ip: string): boolean {
  const rec = banMap.get(ip);
  if (!rec) return false;
  if (rec.until > Date.now()) return true;
  banMap.delete(ip);
  return false;
}

// ---------------------------------------------------------------------------
// LAYER 3 — Bot / scanner detection (UA + header fingerprint)
// ---------------------------------------------------------------------------
const BOT_UA_PATTERNS = [
  /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|ffuf/i,
  /havij|acunetix|nessus|burp\s?suite|owasp[_-]?zap/i,
  /python-requests\/|python-urllib|curl\/|wget\//i,
  /go-http-client|java\/|httpclient/i,
  /scrapy|phantom|headless|selenium|puppeteer/i,
  /ahrefsbot|semrushbot|dotbot|mj12bot/i,
];

function isMaliciousBot(ua: string | null, isProduction: boolean): boolean {
  if (!ua) return false;
  if (!isProduction && /python-requests|curl\//i.test(ua)) return false;
  return BOT_UA_PATTERNS.some(p => p.test(ua));
}

// ---------------------------------------------------------------------------
// LAYER 8 — IP Reputation Scoring (behavioural risk profiling)
// ---------------------------------------------------------------------------
// Every IP starts at score 0 (clean). Points accumulate for bad behaviour.
// Points decay over time. High-score IPs get throttled or blocked.
//
// Score thresholds:
//   0–29   → clean (normal limits)
//   30–59  → suspicious (rate limits halved)
//   60–89  → high-risk (rate limits quartered)
//   90+    → blocked (403 until score decays)
//
// Scoring events:
//   +20  suspicious-request blocked
//   +15  rate-limit exceeded
//   +25  malicious bot UA
//   +10  missing core headers on API call (no UA + no Accept)
//   +5   non-standard HTTP method on non-API path
//   −1   per clean request (decay, min 0)
// ---------------------------------------------------------------------------
interface IPReputation {
  score: number;
  lastSeen: number;
  hitCount: number;          // total requests from this IP
  distinctPaths: number;     // unique paths hit (capped tracking)
  pathSet?: Set<string>;     // track unique paths (up to 50)
}

const reputationMap = new Map<string, IPReputation>();
const REPUTATION_BLOCK_THRESHOLD = 90;
const REPUTATION_HIGH_RISK = 60;
const REPUTATION_SUSPICIOUS = 30;
const REPUTATION_DECAY_PER_REQ = 1;       // how much score drops per clean req
const REPUTATION_DECAY_INTERVAL_MS = 5 * 60 * 1000; // score decays 10 pts per 5min idle

function getReputation(ip: string): IPReputation {
  let rep = reputationMap.get(ip);
  if (!rep) {
    rep = { score: 0, lastSeen: Date.now(), hitCount: 0, distinctPaths: 0, pathSet: new Set() };
    reputationMap.set(ip, rep);
    return rep;
  }
  // Time-based decay: reduce score by 10 for every 5 min of inactivity
  const idle = Date.now() - rep.lastSeen;
  if (idle > REPUTATION_DECAY_INTERVAL_MS) {
    const decayRounds = Math.floor(idle / REPUTATION_DECAY_INTERVAL_MS);
    rep.score = Math.max(0, rep.score - decayRounds * 10);
  }
  rep.lastSeen = Date.now();
  return rep;
}

function ipReputationHit(ip: string, points: number): void {
  const rep = getReputation(ip);
  rep.score = Math.min(200, rep.score + points); // cap at 200
}

function ipReputationDecay(ip: string): void {
  const rep = getReputation(ip);
  rep.score = Math.max(0, rep.score - REPUTATION_DECAY_PER_REQ);
  rep.hitCount++;
}

/** Fingerprint-based detection: missing headers that real browsers always send */
function computeHeaderRiskSignals(headers: Headers): number {
  let risk = 0;
  const ua = headers.get('user-agent');
  const accept = headers.get('accept');
  const acceptLang = headers.get('accept-language');
  const acceptEnc = headers.get('accept-encoding');

  // Real browsers always send UA + Accept
  if (!ua && !accept) risk += 10;
  // No Accept-Language is uncommon for browsers (bots often omit this)
  if (!acceptLang && !acceptEnc) risk += 3;
  // Suspiciously short UA (under 15 chars) is unusual for real browsers
  if (ua && ua.length < 15 && ua.length > 0) risk += 5;

  return risk;
}

/** Path-diversity detection: IPs that hit many different paths quickly are likely scanning */
function trackPathDiversity(rep: IPReputation, path: string): number {
  if (!rep.pathSet) rep.pathSet = new Set();
  if (rep.pathSet.size < 50) rep.pathSet.add(path);
  rep.distinctPaths = rep.pathSet.size;

  // Scanning signature: 20+ unique paths in a session
  if (rep.distinctPaths >= 30) return 15;
  if (rep.distinctPaths >= 20) return 5;
  return 0;
}

// ---------------------------------------------------------------------------
// LAYER 9 — Adaptive Rate Limiting (attack-pattern driven)
// ---------------------------------------------------------------------------
// Monitors global request patterns. When an attack wave is detected
// (spike in 429s, spike in distinct IPs, spike in blocked requests),
// all rate limits tighten automatically and relax after a cooldown.
//
// This is a lightweight "circuit breaker" for the API.
// ---------------------------------------------------------------------------
interface AttackWindow {
  windowStart: number;
  blocked429Count: number;   // how many 429s fired in window
  blockedSuspicious: number; // how many 403s (suspicious/bot) in window
  uniqueIPs: Set<string>;   // distinct IPs making requests
}

const ADAPTIVE_WINDOW_MS = 60 * 1000; // 1-minute observation window
let attackWindow: AttackWindow = {
  windowStart: Date.now(),
  blocked429Count: 0,
  blockedSuspicious: 0,
  uniqueIPs: new Set(),
};

// Thresholds that trigger tightening
const ADAPTIVE_429_SPIKE = 30;         // 30+ rate-limited responses in 1 min → attack mode
const ADAPTIVE_SUSPICIOUS_SPIKE = 20;  // 20+ suspicious blocks in 1 min → attack mode
const ADAPTIVE_IP_SPIKE = 200;         // 200+ unique IPs in 1 min → DDoS indicator

// When attack mode activates, limits are multiplied by this factor
let adaptiveMultiplier = 1.0;          // 1.0 = normal, <1.0 = tighter
let adaptiveModeUntil = 0;            // timestamp when attack mode expires
const ADAPTIVE_COOLDOWN_MS = 3 * 60 * 1000; // attack mode lasts 3 minutes then relaxes

function resetAttackWindow(now: number): void {
  attackWindow = {
    windowStart: now,
    blocked429Count: 0,
    blockedSuspicious: 0,
    uniqueIPs: new Set(),
  };
}

function recordAdaptiveEvent(ip: string, type: '429' | 'suspicious'): void {
  const now = Date.now();
  // Roll window if expired
  if (now - attackWindow.windowStart > ADAPTIVE_WINDOW_MS) {
    resetAttackWindow(now);
  }

  attackWindow.uniqueIPs.add(ip);
  if (type === '429') attackWindow.blocked429Count++;
  if (type === 'suspicious') attackWindow.blockedSuspicious++;

  // Check if we should activate attack mode
  const isSpike =
    attackWindow.blocked429Count >= ADAPTIVE_429_SPIKE ||
    attackWindow.blockedSuspicious >= ADAPTIVE_SUSPICIOUS_SPIKE ||
    attackWindow.uniqueIPs.size >= ADAPTIVE_IP_SPIKE;

  if (isSpike && now > adaptiveModeUntil) {
    adaptiveMultiplier = 0.5; // halve all rate limits
    adaptiveModeUntil = now + ADAPTIVE_COOLDOWN_MS;
  }
}

function getAdaptiveMultiplier(): number {
  const now = Date.now();
  if (now > adaptiveModeUntil) {
    // Attack mode expired — relax
    adaptiveMultiplier = 1.0;
  }
  return adaptiveMultiplier;
}

/** Get the effective rate limit for an IP after applying reputation + adaptive factors */
function effectiveLimit(baseLimit: number, ipScore: number): number {
  let limit = baseLimit;

  // Reputation-based throttling
  if (ipScore >= REPUTATION_HIGH_RISK) {
    limit = Math.ceil(limit * 0.25); // quarter the limit
  } else if (ipScore >= REPUTATION_SUSPICIOUS) {
    limit = Math.ceil(limit * 0.5);  // halve the limit
  }

  // Global adaptive multiplier
  limit = Math.ceil(limit * getAdaptiveMultiplier());

  // Ensure at least 1 request allowed
  return Math.max(1, limit);
}

// ---------------------------------------------------------------------------
// LAYER 4 — Rate limiting (sliding window, per-bucket, with map cleanup)
// ---------------------------------------------------------------------------
interface RateEntry { count: number; startTime: number }
const rateLimitMap = new Map<string, RateEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

function cleanupMaps(now: number, windowMs: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  // Evict expired rate-limit entries
  for (const [k, v] of rateLimitMap) {
    if (now - v.startTime > windowMs * 2) rateLimitMap.delete(k);
  }

  // Evict expired bans
  for (const [k, v] of banMap) {
    if (v.until > 0 && v.until < now) banMap.delete(k);
  }

  // Evict stale reputation entries (not seen in 30 min and score 0)
  for (const [k, v] of reputationMap) {
    if (v.score === 0 && now - v.lastSeen > 30 * 60 * 1000) reputationMap.delete(k);
  }

  // Hard cap eviction — trim oldest entries from all maps
  trimMap(rateLimitMap, MAX_MAP_SIZE);
  trimMap(banMap, MAX_MAP_SIZE);
  trimMap(reputationMap, MAX_MAP_SIZE);

  // Reset attack window unique IPs set to prevent unbounded growth
  if (attackWindow.uniqueIPs.size > 10_000) {
    resetAttackWindow(now);
  }
}

function trimMap<V>(map: Map<string, V>, maxSize: number): void {
  if (map.size <= maxSize) return;
  const excess = map.size - maxSize;
  const iter = map.keys();
  for (let i = 0; i < excess; i++) {
    const k = iter.next().value;
    if (k) map.delete(k);
  }
}

// ---------------------------------------------------------------------------
// LAYER 7 — Request ID generator (Edge-compatible, no crypto.randomUUID)
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
  if (!origin) return true; // same-origin requests have no Origin header
  return ALLOWED_ORIGINS.includes(origin);
}

// ---------------------------------------------------------------------------
// LAYER 6 — Security headers
// ---------------------------------------------------------------------------
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cashfree.com https://*.payu.in https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.cashfree.com https://*.payu.in https://*.googleapis.com",
  "frame-src 'self' https://*.cashfree.com https://*.payu.in",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function applySecurityHeaders(res: NextResponse, requestId: string): void {
  res.headers.set('X-Request-Id', requestId);
  res.headers.set('X-Frame-Options', 'DENY');
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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  const requestId = generateRequestId();

  // ── 0. Tenant Detection (Edge-safe — no DB call) ──
  const hostname = request.nextUrl.hostname || request.headers.get('host') || '';
  const tenantSlug = extractTenantSlugEdge(request.headers, hostname);

  // ── 0b. CRM Site Subdomain Rewrite ──
  const lowerHost = hostname.toLowerCase().split(':')[0];
  if (lowerHost === CRM_SITE_DOMAIN || lowerHost === 'crm.localhost') {
    const p = request.nextUrl.pathname;
    if (!p.startsWith('/crm-site') && !p.startsWith('/_next') && !p.startsWith('/favicon') && !p.startsWith('/logo')) {
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
    recordViolation(ip);
    recordAdaptiveEvent(ip, 'suspicious');
    return new NextResponse(
      JSON.stringify({ error: 'Blocked', code: 'SUSPICIOUS_REQUEST' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
    );
  }

  // ── Localhost bypass for development ──
  const isLocalDev = !IS_PRODUCTION && (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown' || ip === 'localhost');
  
  // Admin routes should bypass security blocks (they have their own auth)
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/api/admin');

  // ── LAYER 2: Auto-ban check (skip for admin routes) ──
  if (!isLocalDev && !isAdminPath && isBanned(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Access temporarily blocked', code: 'IP_BANNED' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
    );
  }

  // ── LAYER 8: IP reputation check ──
  const rep = getReputation(ip);
  
  // Block IPs with reputation score ≥ 90 (skip in local dev and admin routes)
  if (!isLocalDev && !isAdminPath && rep.score >= REPUTATION_BLOCK_THRESHOLD) {
    return new NextResponse(
      JSON.stringify({ error: 'Access denied', code: 'REPUTATION_BLOCKED' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
    );
  }

  // Accumulate header-based risk signals (bots often omit standard headers)
  const headerRisk = computeHeaderRiskSignals(request.headers);
  if (headerRisk > 0) ipReputationHit(ip, headerRisk);

  // Track path diversity (scanners hit many unique paths rapidly)
  const pathDiversityRisk = trackPathDiversity(rep, path);
  if (pathDiversityRisk > 0) ipReputationHit(ip, pathDiversityRisk);

  // ── LAYER 3: Bot detection (API routes only) ──
  if (path.startsWith('/api/')) {
    const ua = request.headers.get('user-agent');
    if (isMaliciousBot(ua, IS_PRODUCTION)) {
      recordViolation(ip);
      ipReputationHit(ip, 25);
      recordAdaptiveEvent(ip, 'suspicious');
      return new NextResponse(
        JSON.stringify({ error: 'Blocked', code: 'BOT_DETECTED' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId } }
      );
    }
  }

  // ── Non-API requests — security headers only ──
  if (!path.startsWith('/api/')) {
    ipReputationDecay(ip); // clean request → decay score
    const response = NextResponse.next();
    if (tenantSlug) {
      response.headers.set(TENANT_HEADER, tenantSlug);
      response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
    }
    applySecurityHeaders(response, requestId);
    return response;
  }

  // ── Cleanup stale map entries (runs at most once every 2 min) ──
  cleanupMaps(now, windowMs);

  // ── LAYER 4 + LAYER 9: Rate limiting with adaptive + reputation modifiers ──
  const hasAuthHeader = Boolean(request.headers.get('authorization'));
  let baseLimit = 30;
  let bucket = 'api';

  if (path.startsWith('/api/admin/crm/whatsapp/')) {
    bucket = 'crm_whatsapp';
    baseLimit = hasAuthHeader ? 600 : 60;
  } else if (path.startsWith('/api/admin/crm/messages')) {
    bucket = 'crm_messages';
    baseLimit = hasAuthHeader ? 240 : 60;
  } else if (path.startsWith('/api/admin/crm/')) {
    bucket = 'crm_admin';
    baseLimit = hasAuthHeader ? 180 : 60;
  } else if (path.startsWith('/api/auth/admin-login')) {
    bucket = 'admin_login';
    baseLimit = 5;
  } else if (path.startsWith('/api/auth/')) {
    bucket = 'auth';
    baseLimit = 15;
  } else if (path.startsWith('/api/payments/')) {
    bucket = 'payments';
    baseLimit = 10;
  }

  // Apply reputation + adaptive multipliers
  const limit = effectiveLimit(baseLimit, rep.score);

  const key = `${ip}:${bucket}`;
  const entry = rateLimitMap.get(key) || { count: 0, startTime: now };
  if (now - entry.startTime > windowMs) {
    entry.count = 1;
    entry.startTime = now;
  } else {
    entry.count++;
  }
  rateLimitMap.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);

  if (entry.count > limit) {
    recordViolation(ip);
    ipReputationHit(ip, 15); // rate-limit violation → reputation hit
    recordAdaptiveEvent(ip, '429');
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - entry.startTime)) / 1000));
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
          'X-Request-Id': requestId,
        },
      }
    );
  }

  // Clean request passed all checks → decay reputation
  ipReputationDecay(ip);

  // ── LAYER 5: CORS strict-mode ──
  const origin = request.headers.get('origin');
  const originOk = isOriginAllowed(origin);

  // Preflight
  if (request.method === 'OPTIONS') {
    if (!originOk) {
      return new NextResponse(null, {
        status: 403,
        headers: { 'X-Request-Id': requestId },
      });
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

  // Tenant slug injection
  if (tenantSlug) {
    response.headers.set(TENANT_HEADER, tenantSlug);
    response.headers.set(TENANT_RESPONSE_HEADER, tenantSlug);
  }

  applySecurityHeaders(response, requestId);

  // CORS headers for API routes
  if (originOk && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  // If origin is NOT allowed, omit Access-Control-Allow-Origin → browser blocks

  // Rate limit info headers
  response.headers.set('RateLimit-Limit', String(limit));
  response.headers.set('RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Bucket', bucket);

  // Adaptive mode indicator (lets monitoring see when system is in attack mode)
  if (getAdaptiveMultiplier() < 1.0) {
    response.headers.set('X-Adaptive-Mode', 'active');
  }

  return response;
}

// Apply middleware to API routes + all page routes (for subdomain rewriting)
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
