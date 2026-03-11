/**
 * Comprehensive Health Check Endpoint
 * Monitors: MongoDB, WhatsApp Bridge, Environment, Error rates.
 *
 * GET /api/health           — basic health (public)
 * GET /api/health?deep=true — deep check with bridge + error stats (public, cached 30s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkMongoDB(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await connectDB();
    const mongoose = (await import('mongoose')).default;
    // Ping the database to measure actual latency
    await mongoose.connection.db?.admin().ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function checkWhatsAppBridge(): Promise<{ ok: boolean; connected: boolean; phone?: string; latencyMs: number; error?: string }> {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_URL;
  if (!bridgeUrl) return { ok: false, connected: false, latencyMs: 0, error: 'No bridge URL configured' };

  const secret = process.env.WHATSAPP_BRIDGE_SECRET || process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${bridgeUrl}/status`, {
      headers: {
        'x-bridge-secret': secret,
        'User-Agent': 'SwarYoga-HealthCheck/1.0',
        'ngrok-skip-browser-warning': 'true',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return {
      ok: res.ok,
      connected: !!data?.connected,
      phone: data?.phone?.id ? String(data.phone.id).split(':')[0].split('@')[0] : undefined,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return { ok: false, connected: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function getRecentErrorCount(): Promise<{ last1h: number; last24h: number; critical: number }> {
  try {
    const { getErrorStats } = await import('@/lib/error-logger');
    const [stats1h, stats24h] = await Promise.all([
      getErrorStats(new Date(Date.now() - 60 * 60 * 1000)),
      getErrorStats(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ]);
    return {
      last1h: stats1h.total,
      last24h: stats24h.total,
      critical: stats24h.critical,
    };
  } catch {
    return { last1h: 0, last24h: 0, critical: 0 };
  }
}

export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get('deep') === 'true';

  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: {
      nodeVersion: process.version,
      nextVersion: process.env.NEXT_RUNTIME || 'nodejs',
      vercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION || 'unknown',
    },
    checks: {
      api: true,
      mongodb: { ok: false, latencyMs: 0 },
    },
    config: {
      hasMongoDBUri: !!(process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN),
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasWhatsAppToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      hasBridgeUrl: !!(process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || process.env.WHATSAPP_BRIDGE_URL),
    },
  };

  // Always check MongoDB
  health.checks.mongodb = await checkMongoDB();
  if (!health.checks.mongodb.ok) health.status = 'degraded';

  // Deep check: bridge + error counts
  if (deep) {
    const [bridge, errors] = await Promise.all([
      checkWhatsAppBridge(),
      getRecentErrorCount(),
    ]);
    health.checks.whatsappBridge = bridge;
    health.checks.errorRates = errors;

    if (!bridge.ok) health.status = 'degraded';
    if (errors.critical > 0) health.status = 'warning';
    if (!health.checks.mongodb.ok && !bridge.ok) health.status = 'down';
  }

  // Memory usage (basic)
  if (typeof process.memoryUsage === 'function') {
    const mem = process.memoryUsage();
    health.memory = {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    };
  }

  const statusCode = health.status === 'ok' || health.status === 'warning' ? 200 : 503;
  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': deep ? 'public, max-age=30' : 'public, max-age=10',
    },
  });
}
