import { buildGraphMessagesUrl, generateAppSecretProof } from '@/lib/whatsapp';

describe('generateAppSecretProof', () => {
  it('returns undefined when app secret is missing', () => {
    expect(generateAppSecretProof('token')).toBeUndefined();
  });

  it('produces a deterministic HMAC when app secret is provided', () => {
    const proof = generateAppSecretProof('test-token', 'abc123');
    expect(proof).toBe('932532b92e81c2fcc37ad56b4fb9e338b31e5ccc344a5b0191fe2a425cc693fc');
  });
});

describe('buildGraphMessagesUrl', () => {
  it('returns base Graph URL when no appsecret_proof is provided', () => {
    const url = buildGraphMessagesUrl('123');
    expect(url).toBe('https://graph.facebook.com/v24.0/123/messages');
  });

  it('appends the appsecret_proof query parameter when provided', () => {
    const url = buildGraphMessagesUrl('PHONE_ID', 'proof-value');
    expect(url).toBe('https://graph.facebook.com/v24.0/PHONE_ID/messages?appsecret_proof=proof-value');
  });
});
