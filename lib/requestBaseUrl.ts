import type { NextRequest } from 'next/server';

const LOCAL_HOST_RE = /(localhost|127\.0\.0\.1)/i;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function normalizeConfigured(value: string | undefined | null): string {
  return value ? stripTrailingSlash(String(value).trim()) : '';
}

function normalizeHostDerived(proto: string, host: string): string {
  if (!host) return '';
  return stripTrailingSlash(`${proto}://${host}`);
}

/**
 * Returns the best-guess public base URL for the current request.
 *
 * Goals:
 * - In Vercel production, always prefer the actual request host (swaryoga.com), even if an env var
 *   is mistakenly left as localhost.
 * - In local dev, allow http://localhost:3000 when that's the real host.
 */
export function getRequestBaseUrl(request: NextRequest): string {
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto') || '';

  const derivedProto = forwardedProto || (LOCAL_HOST_RE.test(hostHeader) ? 'http' : 'https');
  const derived = normalizeHostDerived(derivedProto, hostHeader);

  const configured =
    normalizeConfigured(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeConfigured(process.env.APP_URL) ||
    normalizeConfigured(process.env.SITE_URL);

  // If configured is localhost but the request is not, ignore the configured value.
  if (configured) {
    const configuredIsLocal = LOCAL_HOST_RE.test(configured);
    const derivedIsLocal = LOCAL_HOST_RE.test(derived);
    if (!configuredIsLocal || derivedIsLocal) return configured;
  }

  const originHeader = request.headers.get('origin');
  const origin = originHeader ? stripTrailingSlash(originHeader) : '';
  if (origin) {
    const originIsLocal = LOCAL_HOST_RE.test(origin);
    const derivedIsLocal = LOCAL_HOST_RE.test(derived);
    if (!originIsLocal || derivedIsLocal) return origin;
  }

  if (derived) return derived;

  const vercelUrl = normalizeConfigured(process.env.VERCEL_URL);
  if (vercelUrl) {
    const normalized = vercelUrl.replace(/^https?:\/\//, '');
    return stripTrailingSlash(`https://${normalized}`);
  }

  return '';
}
