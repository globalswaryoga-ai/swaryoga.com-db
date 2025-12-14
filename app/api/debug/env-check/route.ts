import { NextResponse } from 'next/server';

export async function GET() {
  const env = {
    nodeEnv: process.env.NODE_ENV,
    mongoUri: process.env.MONGODB_URI ? '✓ set' : '✗ missing',
    jwtSecret: process.env.JWT_SECRET ? '✓ set' : '✗ missing',
    nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
  };

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      error: 'Environment variables not configured properly on Vercel',
      details: 'MONGODB_URI is missing. Please add it to Vercel project settings.',
      env,
    }, { status: 503 });
  }

  return NextResponse.json({
    message: 'Environment variables configured',
    env,
  });
}
