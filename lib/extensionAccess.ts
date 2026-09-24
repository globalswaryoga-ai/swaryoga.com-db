import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type TokenPayload } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';

/** Every /api/extension/* route responds with these so the Chrome extension
 * (running on web.whatsapp.com, a different origin) can call it directly. */
export const EXTENSION_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function extensionJson(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: EXTENSION_CORS_HEADERS });
}

export function extensionOptions() {
  return new NextResponse(null, { status: 200, headers: EXTENSION_CORS_HEADERS });
}

/**
 * Verifies the bearer token AND that this user has been granted
 * extensionEnabled (or is super admin) — a separate approval gate from
 * general CRM login, same pattern as qrWhatsappEnabled for the QR bridge.
 * Returns the decoded token on success, or writes an error response and
 * returns null on failure.
 */
export async function requireExtensionAccess(req: NextRequest): Promise<TokenPayload | null> {
  const decoded = verifyToken(req.headers.get('authorization') || '');
  if (!decoded?.userId) return null;

  if (isSuperAdmin(decoded)) return decoded;

  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings = await CRMUserSettings.findOne({ userId: decoded.userId }, { extensionEnabled: 1 }).lean();
  return (settings as any)?.extensionEnabled ? decoded : null;
}
