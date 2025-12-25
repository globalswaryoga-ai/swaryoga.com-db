// JWT Authentication Utilities
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface TokenPayload {
  userId?: string;
  email?: string;
  // Admin JWTs use a different payload shape.
  isAdmin?: boolean;
  username?: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token?: string): TokenPayload | null => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;

    // Backward compatibility: older flows sometimes signed a string payload
    // (typically the user's ObjectId). Normalize to TokenPayload.
    if (typeof decoded === 'string') {
      return { userId: decoded };
    }

    if (decoded && typeof decoded === 'object') {
      return decoded as TokenPayload;
    }

    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};
