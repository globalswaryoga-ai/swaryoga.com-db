import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyToken, TokenPayload } from './auth';

export type AdminJwtPayload = TokenPayload;

export function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
}

export function verifyAdminJwt(token: string): { valid: boolean; decoded?: AdminJwtPayload } {
  const decoded = verifyToken(token);
  return {
    valid: !!decoded?.isAdmin,
    decoded: decoded || undefined
  };
}

export function isAdminAuthorized(request: NextRequest): boolean {
  const token = getBearerToken(request);
  return verifyAdminJwt(token).valid;
}
