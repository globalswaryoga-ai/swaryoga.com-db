import { NextResponse } from 'next/server';
import { PAYU_BASE_URL, PAYU_MODE } from '@/lib/payments/payu';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Never expose environment diagnostics on production.
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_ALLOW_PROD !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const mongoUriMain = process.env.MONGODB_URI_MAIN;
  const mongoUriLegacy = process.env.MONGODB_URI;
  const mongoUriEffective = mongoUriMain || mongoUriLegacy;
  const env = {
    nodeEnv: process.env.NODE_ENV,
    mongoUriMain: mongoUriMain ? '✓ set' : '✗ missing',
    mongoUriLegacy: mongoUriLegacy ? '✓ set' : '✗ missing',
    mongoUriEffective: mongoUriEffective ? '✓ set' : '✗ missing',
    mongoMainDbName: process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB (default)',
    jwtSecret: process.env.JWT_SECRET ? '✓ set' : '✗ missing',
    nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    vercel: {
      env: process.env.VERCEL_ENV,
      url: process.env.VERCEL_URL,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      git: {
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA,
        commitRef: process.env.VERCEL_GIT_COMMIT_REF,
        repoOwner: process.env.VERCEL_GIT_REPO_OWNER,
        repoSlug: process.env.VERCEL_GIT_REPO_SLUG,
      },
    },
    payu: {
      mode: PAYU_MODE,
      baseUrl: PAYU_BASE_URL,
      merchantKey: process.env.PAYU_MERCHANT_KEY ? '✓ set' : '✗ missing',
      merchantSalt: process.env.PAYU_MERCHANT_SALT ? '✓ set' : '✗ missing',
    },
  };

  if (!mongoUriEffective) {
    return NextResponse.json({
      error: 'Environment variables not configured properly on Vercel',
      details: 'MONGODB_URI_MAIN (preferred) or MONGODB_URI is missing. Please add it to Vercel project settings.',
      env,
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  return NextResponse.json({
    message: 'Environment variables configured',
    env,
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
