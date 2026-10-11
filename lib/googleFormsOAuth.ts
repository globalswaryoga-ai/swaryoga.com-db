import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function googleFormsOAuthConfig() {
  const dedicated = Boolean(process.env.GOOGLE_FORMS_CLIENT_ID || process.env.GOOGLE_FORMS_CLIENT_SECRET);
  const clientId = (dedicated ? process.env.GOOGLE_FORMS_CLIENT_ID : process.env.GOOGLE_CLIENT_ID)?.trim();
  const clientSecret = (dedicated ? process.env.GOOGLE_FORMS_CLIENT_SECRET : process.env.GOOGLE_CLIENT_SECRET)?.trim();
  if (!clientId || !clientSecret) throw new Error('Configure both GOOGLE_FORMS_CLIENT_ID and GOOGLE_FORMS_CLIENT_SECRET for Google Forms.');
  return { clientId, clientSecret };
}

export function googleFormsRedirect(baseUrl: string) {
  const base = new URL(baseUrl);
  const redirect = new URL(process.env.GOOGLE_FORMS_REDIRECT_URI?.trim() || '/api/admin/google-form-oauth/callback', base);
  if (redirect.origin !== base.origin || redirect.pathname !== '/api/admin/google-form-oauth/callback') {
    throw new Error('GOOGLE_FORMS_REDIRECT_URI must use this CRM origin and /api/admin/google-form-oauth/callback.');
  }
  return redirect.toString();
}

type GoogleFormsOAuthState = { userId: string; superAdmin: boolean; redirectUri: string; expiresAt: number; nonce: string };

function stateKey() {
  const key = process.env.JWT_SECRET?.trim();
  if (!key) throw new Error('JWT_SECRET is required for Google Forms authorization.');
  return key;
}

export function createGoogleFormsOAuthState(userId: string, superAdmin: boolean, redirectUri: string) {
  const context: GoogleFormsOAuthState = { userId, superAdmin, redirectUri, expiresAt: Date.now() + 600000, nonce: randomBytes(24).toString('hex') };
  const payload = Buffer.from(JSON.stringify(context)).toString('base64url');
  return `${payload}.${createHmac('sha256', stateKey()).update(payload).digest('base64url')}`;
}

export function verifyGoogleFormsOAuthState(state: string, cookie: string): GoogleFormsOAuthState {
  if (!state || state !== cookie) throw new Error('Google authorization expired or does not match this browser. Reconnect Google.');
  const [payload, signature, extra] = state.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid Google authorization state.');
  const expected = createHmac('sha256', stateKey()).update(payload).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new Error('Invalid Google authorization state.');
  const context = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GoogleFormsOAuthState;
  if (!context.userId || typeof context.superAdmin !== 'boolean' || !context.redirectUri || context.expiresAt < Date.now()) {
    throw new Error('Google authorization expired. Reconnect Google.');
  }
  return context;
}

export async function requestGoogleFormsTokens(input: { refreshToken: string; oauthClientId?: string } | { code: string; redirectUri: string }) {
  const { clientId, clientSecret } = googleFormsOAuthConfig();
  if ('refreshToken' in input && input.oauthClientId && input.oauthClientId !== clientId) {
    throw new Error('Google Forms OAuth client changed. Reconnect Google Forms; saved responses are preserved.');
  }
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if ('refreshToken' in input) {
    body.set('refresh_token', input.refreshToken);
    body.set('grant_type', 'refresh_token');
  } else {
    body.set('code', input.code);
    body.set('redirect_uri', input.redirectUri);
    body.set('grant_type', 'authorization_code');
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body, signal: AbortSignal.timeout(30000),
  });
  const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(`Google Forms authorization failed (${data.error || response.status}). Reconnect Google using the configured Forms OAuth client; saved responses are preserved.`);
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: Number(data.expires_in) || 3600, clientId };
}
