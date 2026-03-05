// JWT Authentication Utilities
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET || 'your-secret-key-change-in-production').trim();

export interface TokenPayload {
  _id?: string;
  id?: string;
  name?: string;
  userId?: string;
  email?: string;
  // Admin JWTs use a different payload shape.
  isAdmin?: boolean;
  username?: string;
  role?: string; // 'superadmin' | 'manager' | 'admin'
  permissions?: string[];
  permissionsV2?: Record<string, Record<string, boolean>>;
  managedUserIds?: string[]; // For managers: list of user IDs they supervise
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token?: string): TokenPayload | null => {
  let actualToken = token?.trim();
  
  // Handle "Bearer <token>" format automatically
  if (actualToken?.startsWith('Bearer ')) {
    actualToken = actualToken.substring(7).trim();
  }

  if (!actualToken || actualToken === 'null' || actualToken === 'undefined' || actualToken === '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Auth] No token provided or token is empty/null/undefined');
    }
    return null;
  }
  
  try {
    // Basic format check to avoid jwt.verify on junk data
    if (!actualToken.includes('.')) {
      console.warn('[Auth] Token is missing dot separators (invalid JWT format)');
      return null;
    }

    const decoded = jwt.verify(actualToken, JWT_SECRET) as any;

    if (decoded && typeof decoded === 'object') {
      // Ensure isAdmin is set if role is admin or if specifically present
      const isAdmin = decoded.isAdmin === true || 
                      decoded.role === 'admin' || 
                      decoded.role === 'Admin' ||
                      decoded.role === 'manager' ||
                      decoded.role === 'superadmin';
      
      // Return normalized payload
      return {
        ...decoded,
        isAdmin: isAdmin
      } as TokenPayload;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Auth] Verification failed: ${msg}`);
      // Log part of the secret and token for debugging secret mismatches
      console.error(`[Auth] Secret prefix: ${JWT_SECRET.substring(0, 4)}...`);
      console.error(`[Auth] Token prefix: ${actualToken.substring(0, 10)}...`);
    }
    return null;
  }
};
