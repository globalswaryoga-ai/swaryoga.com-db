import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get('origin');
  
  // Allow these origins (add more as needed)
  const allowedOrigins = [
    'https://swaryoga.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'android-app://', // For Android WebView
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
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  // For all other requests, just return the response
  // CORS headers will be added via next.config.js headers
  return NextResponse.next();
}

// Apply middleware only to API routes
export const config = {
  matcher: ['/api/:path*'],
};
