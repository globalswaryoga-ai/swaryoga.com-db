/** @jest-environment node */
jest.mock('@/lib/bunnyDatabase', () => ({ bunnyExecute: jest.fn(), cleanMongoJson: (value: unknown) => value }));
jest.mock('@/lib/auth', () => ({ decryptCredential: (value: string) => value, encryptCredential: (value: string) => `encrypted:${value}` }));
jest.mock('@/lib/bunnySocialInboxRepository', () => ({ listBunnySocialAccounts: jest.fn(), updateBunnySocialAccount: jest.fn() }));
jest.mock('@/lib/googleFormsOAuth', () => ({ requestGoogleFormsTokens: jest.fn() }));

import { resolveGoogleAccounts, refreshGoogleAccessToken } from '@/lib/googleFormsAccounts';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { listBunnySocialAccounts, updateBunnySocialAccount } from '@/lib/bunnySocialInboxRepository';
import { requestGoogleFormsTokens } from '@/lib/googleFormsOAuth';

describe('Google connection ownership and archive compatibility', () => {
  beforeEach(() => jest.resetAllMocks());
  it('prefers the canonical connection and never falls back to archived credentials', async () => {
    jest.mocked(listBunnySocialAccounts).mockResolvedValue([
      { _id: 'own', platform: 'google_forms', ownerUserId: 'tenant', accessToken: 'own-token' },
      { _id: 'foreign', platform: 'google_forms', ownerUserId: 'someone-else', accessToken: 'foreign-token' },
    ]);
    const accounts = await resolveGoogleAccounts('tenant');
    expect(accounts.map(account => account.documentId)).toEqual(['own']);
    expect(bunnyExecute).not.toHaveBeenCalled();
  });
  it('deduplicates legacy token snapshots and excludes foreign tenants', async () => {
    jest.mocked(listBunnySocialAccounts).mockResolvedValue([]);
    jest.mocked(bunnyExecute).mockResolvedValue({
      rows: [
        { document_id: 'newest', document_json: JSON.stringify({ platform: 'google_forms', accessToken: 'new', refreshToken: 'same', ownerUserId: 'admincrm' }) },
        { document_id: 'oldest', document_json: JSON.stringify({ platform: 'google_forms', accessToken: 'old', refreshToken: 'same', ownerUserId: 'admincrm' }) },
        { document_id: 'foreign', document_json: JSON.stringify({ platform: 'google_forms', accessToken: 'foreign', ownerUserId: 'tenant' }) },
      ], rowsAffected: 0, columns: [], columnTypes: [], lastInsertRowid: undefined, toJSON: () => ({}),
    });
    expect((await resolveGoogleAccounts('shared')).map(account => account.documentId)).toEqual(['newest']);
  });
  it('records the same OAuth client during refresh and rejects failed persistence', async () => {
    jest.mocked(requestGoogleFormsTokens).mockResolvedValue({ accessToken: 'new', expiresIn: 3600, clientId: 'forms-client', refreshToken: undefined });
    jest.mocked(updateBunnySocialAccount).mockResolvedValue(null);
    const account = { account: { refreshToken: 'old', oauthClientId: 'forms-client' }, source: 'canonical' as const, documentId: 'own' };
    await expect(refreshGoogleAccessToken(account)).rejects.toThrow('could not be saved');
    expect(requestGoogleFormsTokens).toHaveBeenCalledWith({ refreshToken: 'old', oauthClientId: 'forms-client' });
    expect(updateBunnySocialAccount).toHaveBeenCalledWith('own', expect.objectContaining({ accessToken: 'encrypted:new', oauthClientId: 'forms-client' }));
  });
});
