import type { NextRequest } from 'next/server';
import { getRequestBaseUrl } from '@/lib/requestBaseUrl';

export const YOUTUBE_OAUTH_CALLBACK_PATH = '/api/admin/social-media/youtube/oauth/callback';

function cleanBaseUrl(value: string | undefined | null): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

/**
 * Return one stable redirect URI for both OAuth initiation and token exchange.
 * GOOGLE_OAUTH_REDIRECT_URI should be registered verbatim in Google Cloud.
 */
export function getYouTubeOAuthRedirectUri(request?: NextRequest): string {
  const configured = cleanBaseUrl(process.env.GOOGLE_OAUTH_REDIRECT_URI);
  if (configured) return configured;

  const baseUrl = cleanBaseUrl(
    request
      ? getRequestBaseUrl(request)
      : process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  ) || 'https://swaryoga.com';
  return `${baseUrl}${YOUTUBE_OAUTH_CALLBACK_PATH}`;
}
