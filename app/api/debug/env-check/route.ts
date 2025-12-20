import { NextResponse } from 'next/server';
import { PAYU_BASE_URL, PAYU_MODE } from '@/lib/payments/payu';

export async function GET() {
  const env = {
    nodeEnv: process.env.NODE_ENV,
    mongoUri: process.env.MONGODB_URI ? '✓ set' : '✗ missing',
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
