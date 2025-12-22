import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      hasMongoDBUri: !!process.env.MONGODB_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
    },
    checks: {
      localhost: true,
      mongodb: false,
      api: true,
    },
  };

  // Try to connect to MongoDB
  try {
    await connectDB();
    health.checks.mongodb = true;
  } catch (err) {
    health.checks.mongodb = false;
    health.status = 'degraded';
  }

  const statusCode = health.checks.mongodb ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
