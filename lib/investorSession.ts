/**
 * Investor sign-in tokens.
 * Uses its own secret (INVESTOR_SESSION_SECRET) and does NOT accept the shared
 * admin token helper, which trusts several hardcoded fallback secrets.
 */

import jwt from 'jsonwebtoken';

const SESSION_TTL = '2d';

function getSecret() {
  const secret = (process.env.INVESTOR_SESSION_SECRET || process.env.JWT_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    throw new Error('INVESTOR_SESSION_SECRET must be set (32+ characters)');
  }
  return secret;
}

export function issueInvestorToken(investmentId: string) {
  return jwt.sign({ typ: 'investor', sub: investmentId }, getSecret(), {
    expiresIn: SESSION_TTL,
    algorithm: 'HS256',
  });
}

/** Returns the investment id for a valid investor Bearer token, otherwise null. */
export function getInvestorIdFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7).trim(), getSecret(), { algorithms: ['HS256'] }) as any;
    if (payload?.typ !== 'investor' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
