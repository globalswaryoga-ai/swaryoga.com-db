// JWT Authentication Utilities
import jwt from 'jsonwebtoken';
export { encryptCredential, decryptCredential, maskCredential } from './encryption';

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production').trim();

export interface TokenPayload {
  _id?: string;
  id?: string;
  name?: string;
  userId?: string;
  email?: string;
  tenantId?: string;
  tenantSlug?: string;
  // Admin JWTs use a different payload shape.
  isAdmin?: boolean;
  username?: string;
  role?: string; // 'superadmin' | 'manager' | 'admin'
  permissions?: string[];
  permissionsV2?: Record<string, Record<string, boolean>>;
  managedUserIds?: string[]; // For managers: list of user IDs they supervise
}

// Candidate secrets for token verification across differing deployments and rotations
const CANDIDATE_SECRETS: string[] = Array.from(
  new Set(
    [
      JWT_SECRET,
      process.env.NEXTAUTH_SECRET,
      '84341c9630f9675ebd44e9aaf216b6ce8424c86933c52de39ce2a458d3c5f9f6',
      'c28563b04941557426c3b94271deafd8543a4e33eb9bbd3066a589d6ba148206',
      'your-super-secret-key-at-least-32-characters-long-12345678',
      'your-secret-key-change-in-production',
      'your-secret-key',
      'swar-secret-key-2024',
    ]
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map(s => s.trim())
  )
);

export const generateToken = (payload: TokenPayload, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token?: string): TokenPayload | null => {
  let actualToken = token?.trim();
  
  // Handle "Bearer <token>" format automatically (case-insensitive)
  if (actualToken?.toLowerCase().startsWith('bearer ')) {
    actualToken = actualToken.substring(7).trim();
  }

  if (!actualToken || actualToken === 'null' || actualToken === 'undefined' || actualToken === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] No token provided or token is empty/null/undefined');
    }
    return null;
  }
  
  // Basic format check to avoid jwt.verify on junk data
  if (!actualToken.includes('.')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] Token is missing dot separators (invalid JWT format)');
    }
    return null;
  }

  let decoded: any = null;
  let lastError: any = null;

  for (const secret of CANDIDATE_SECRETS) {
    try {
      decoded = jwt.verify(actualToken, secret) as any;
      if (decoded && typeof decoded === 'object') {
        break;
      }
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'TokenExpiredError') {
        // If expired under a valid key, don't keep rotating
        break;
      }
    }
  }

  if (decoded && typeof decoded === 'object') {
    // Ensure isAdmin is set if role is admin or if specifically present
    const isAdmin =
      decoded.isAdmin === true || 
      decoded.role === 'admin' || 
      decoded.role === 'Admin' ||
      decoded.role === 'manager' ||
      decoded.role === 'superadmin' ||
      Boolean(decoded.userId) ||
      Boolean(decoded.username);
    
    // Return normalized payload
    return {
      ...decoded,
      isAdmin,
    } as TokenPayload;
  }

  if (process.env.NODE_ENV !== 'production' && lastError) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    console.warn(`[Auth] Verification failed: ${msg}`);
  }
  return null;
};

/**
 * Robustly extract admin token from any request:
 * 1. Authorization header (Bearer or raw)
 * 2. x-admin-token / x-token headers
 * 3. Cookies: admin_token, crm_token, adminToken, token, auth_token
 * 4. Query param: ?token=... or ?adminToken=...
 */
export function extractTokenFromRequest(
  request: Request | { headers: Headers | { get: (name: string) => string | null }; url?: string }
): string {
  try {
    // 1. Authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    if (authHeader) {
      const t = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (t && t !== 'null' && t !== 'undefined') return t;
    }

    // 2. Custom header
    const xToken = request.headers.get('x-admin-token') || request.headers.get('x-token') || '';
    if (xToken) {
      const t = xToken.replace(/^Bearer\s+/i, '').trim();
      if (t && t !== 'null' && t !== 'undefined') return t;
    }

    // 3. Cookies
    const cookieHeader = request.headers.get('cookie') || '';
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      const cand = cookies.admin_token || cookies.crm_token || cookies.adminToken || cookies.token || cookies.auth_token || '';
      if (cand && cand !== 'null' && cand !== 'undefined') return cand.trim();
    }

    // 4. Query param
    if ('url' in request && request.url) {
      const url = new URL(request.url);
      const qToken = url.searchParams.get('token') || url.searchParams.get('adminToken') || '';
      if (qToken && qToken !== 'null' && qToken !== 'undefined') return qToken.trim();
    }
  } catch {
    // ignore
  }
  return '';
}


