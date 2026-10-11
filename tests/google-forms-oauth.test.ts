/** @jest-environment node */
jest.mock('@/lib/auth', () => ({ verifyToken: jest.fn(), encryptCredential: (value: string) => `encrypted:${value}` }));
jest.mock('@/lib/crm-handlers', () => ({ getViewerUserId: () => 'tenant-user', isSuperAdmin: () => false }));
jest.mock('@/lib/bunnySocialInboxRepository', () => ({ upsertBunnySocialAccount: jest.fn() }));

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { upsertBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';
import { GET as authorize } from '@/app/api/admin/google-form-oauth/route';
import { GET as callback } from '@/app/api/admin/google-form-oauth/callback/route';
import {
  googleFormsOAuthConfig, googleFormsRedirect, createGoogleFormsOAuthState,
  verifyGoogleFormsOAuthState, requestGoogleFormsTokens,
} from '@/lib/googleFormsOAuth';

describe('Dedicated Google Forms connection', () => {
  const previousEnv = process.env;
  const previousFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...previousEnv, JWT_SECRET: 'test-only-state-secret', ENCRYPTION_KEY: 'test-only-encryption',
      GOOGLE_FORMS_CLIENT_ID: 'forms-client', GOOGLE_FORMS_CLIENT_SECRET: 'forms-secret',
      GOOGLE_CLIENT_ID: 'youtube-client', GOOGLE_CLIENT_SECRET: 'youtube-secret',
      GOOGLE_OAUTH_REDIRECT_URI: 'https://example.test/api/admin/social-media/youtube/oauth/callback',
    };
    delete process.env.GOOGLE_FORMS_REDIRECT_URI;
    jest.mocked(verifyToken).mockReturnValue({ userId: 'tenant-user', isAdmin: true });
    jest.mocked(upsertBunnySocialAccount).mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }) });
  });
  afterEach(() => { process.env = previousEnv; global.fetch = previousFetch; });
  it('uses one dedicated client for authorization, code exchange and refresh without changing YouTube', async () => {
    const response = await authorize(new NextRequest('https://crm.example.test/api/admin/google-form-oauth?token=test'));
    const url = new URL((await response.json()).authUrl);
    expect(url.searchParams.get('client_id')).toBe('forms-client');
    expect(url.searchParams.get('redirect_uri')).toBe('https://crm.example.test/api/admin/google-form-oauth/callback');
    await requestGoogleFormsTokens({ code: 'code', redirectUri: url.searchParams.get('redirect_uri')! });
    await requestGoogleFormsTokens({ refreshToken: 'refresh', oauthClientId: 'forms-client' });
    for (const [, input] of jest.mocked(global.fetch).mock.calls) {
      const body = input?.body as URLSearchParams;
      expect(body.get('client_id')).toBe('forms-client');
      expect(body.get('client_secret')).toBe('forms-secret');
    }
    expect(process.env.GOOGLE_CLIENT_ID).toBe('youtube-client');
  });
  it('respects origin query parameter from client frontend', async () => {
    const response = await authorize(new NextRequest('https://crm.example.test/api/admin/google-form-oauth?token=test&origin=https%3A%2F%2Fswaryoga.com'));
    const url = new URL((await response.json()).authUrl);
    expect(url.searchParams.get('redirect_uri')).toBe('https://swaryoga.com/api/admin/google-form-oauth/callback');
  });
  it('rejects a partially configured dedicated client instead of mixing credentials', () => {
    delete process.env.GOOGLE_FORMS_CLIENT_SECRET;
    expect(googleFormsOAuthConfig).toThrow('both GOOGLE_FORMS_CLIENT_ID');
  });
  it('supports an unchanged complete legacy environment when dedicated configuration is absent', () => {
    delete process.env.GOOGLE_FORMS_CLIENT_ID;
    delete process.env.GOOGLE_FORMS_CLIENT_SECRET;
    expect(googleFormsOAuthConfig()).toEqual({ clientId: 'youtube-client', clientSecret: 'youtube-secret' });
  });
  it('rejects cross-origin and YouTube callback overrides', () => {
    process.env.GOOGLE_FORMS_REDIRECT_URI = 'https://different.example.test/api/admin/google-form-oauth/callback';
    expect(() => googleFormsRedirect('https://crm.example.test')).toThrow('CRM origin');
    process.env.GOOGLE_FORMS_REDIRECT_URI = 'https://crm.example.test/api/admin/social-media/youtube/oauth/callback';
    expect(() => googleFormsRedirect('https://crm.example.test')).toThrow('CRM origin');
  });
  it('rejects missing, modified, expired or mismatched browser state', () => {
    const state = createGoogleFormsOAuthState('tenant-user', false, 'https://crm.example.test/api/admin/google-form-oauth/callback');
    expect(verifyGoogleFormsOAuthState(state, state)).toMatchObject({ userId: 'tenant-user', superAdmin: false });
    expect(() => verifyGoogleFormsOAuthState(state, '')).toThrow('browser');
    const modified = `${state}a`;
    expect(() => verifyGoogleFormsOAuthState(modified, modified)).toThrow('Invalid');
    const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 600001);
    expect(() => verifyGoogleFormsOAuthState(state, state)).toThrow('expired');
    spy.mockRestore();
  });
  it('saves scoped encrypted credentials only after a verified callback', async () => {
    const redirect = 'https://crm.example.test/api/admin/google-form-oauth/callback';
    const state = createGoogleFormsOAuthState('tenant-user', false, redirect);
    const response = await callback(new NextRequest(`${redirect}?code=code&state=${state}`, {
      headers: { cookie: `google_forms_oauth_state=${state}` },
    }));
    expect(response.headers.get('location')).toContain('success=google_forms_connected');
    expect(upsertBunnySocialAccount).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: 'tenant-user', scopeKey: 'tenant-user', platform: 'google_forms',
      oauthClientId: 'forms-client', accessToken: 'encrypted:access', refreshToken: 'encrypted:refresh',
    }));
  });
  it('never claims connection success after a database failure or invalid state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const redirect = 'https://crm.example.test/api/admin/google-form-oauth/callback';
    const invalid = await callback(new NextRequest(`${redirect}?code=code&state=invalid`));
    expect(invalid.headers.get('location')).toContain('error=');
    expect(upsertBunnySocialAccount).not.toHaveBeenCalled();
    const state = createGoogleFormsOAuthState('tenant-user', false, redirect);
    jest.mocked(upsertBunnySocialAccount).mockRejectedValue(new Error('Bunny save failed'));
    const failed = await callback(new NextRequest(`${redirect}?code=code&state=${state}`, {
      headers: { cookie: `google_forms_oauth_state=${state}` },
    }));
    expect(failed.headers.get('location')).toContain('error=Bunny');
    expect(failed.headers.get('location')).not.toContain('success=');
    spy.mockRestore();
  });
  it('requires reconnect for changed clients and reports provider authorization errors', async () => {
    await expect(requestGoogleFormsTokens({ refreshToken: 'old', oauthClientId: 'other-client' })).rejects.toThrow('Reconnect');
    expect(global.fetch).not.toHaveBeenCalled();
    jest.mocked(global.fetch).mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'unauthorized_client' }) } as Response);
    await expect(requestGoogleFormsTokens({ refreshToken: 'old' })).rejects.toThrow('unauthorized_client');
  });
});
