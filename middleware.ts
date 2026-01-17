import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting for Edge Middleware
// Note: This is per-edge-instance, which is fine for basic "hiker" protection
const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  // 1. Rate Limiting Check
  const ip = request.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const limit = 30; // 30 requests per minute per IP for APIs

  const userData = rateLimitMap.get(ip) || { count: 0, startTime: now };
  
  // Reset window if expired
  if (now - userData.startTime > windowMs) {
    userData.count = 1;
    userData.startTime = now;
  } else {
    userData.count++;
  }
  
  rateLimitMap.set(ip, userData);

  if (userData.count > limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: { 'Content-Type': 'application/json' } 
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
  
  // Add Security Headers (Simplified for Edge compatibility)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cashfree.com https://*.payu.in https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.cashfree.com https://*.payu.in https://*.googleapis.com;");

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', isOriginAllowed ? (origin || '*') : '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Apply middleware only to API routes (and optionally specific sensitive pages)
export const config = {
  matcher: ['/api/:path*'],
};
