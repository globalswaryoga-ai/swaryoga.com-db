import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export type AdminJwtPayload = {
  username?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
};

export function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
}

export function verifyAdminJwt(token: string): { valid: boolean; decoded?: AdminJwtPayload } {
  if (!token) return { valid: false };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as AdminJwtPayload;
    if (!decoded?.isAdmin) return { valid: false };
    return { valid: true, decoded };
  } catch {
    return { valid: false };
  }
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const token = getBearerToken(request);
  return verifyAdminJwt(token).valid;
}
