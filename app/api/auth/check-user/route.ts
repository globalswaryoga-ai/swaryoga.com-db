/**
 * @fileoverview Check if a user already exists by email or phone
 * Used by workshop/enquiry forms to determine if password field is needed
 */

import { NextRequest } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { normalizePhone } from '@/lib/whatsapp';
import { apiError, apiSuccess, logError } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';


// Rate limiting: 20 checks per 5 minutes per IP
const CHECK_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
};

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request.headers);
    const rateLimitCheck = checkRateLimit(clientId, CHECK_RATE_LIMIT);
    if (!rateLimitCheck.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
    }

    const body = await request.json().catch(() => null);
    if (!body) return apiError('INVALID_REQUEST', 'Invalid JSON body');

    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();

    if (!email && !phone) {
      return apiError('VALIDATION_ERROR', 'Email or phone is required');
    }

    await connectDB();

    // Build search query
    const orConditions: any[] = [];
    if (email && email.includes('@')) {
      orConditions.push({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        orConditions.push({ phone: normalized });
      }
    }

    if (orConditions.length === 0) {
      return apiError('VALIDATION_ERROR', 'Valid email or phone is required');
    }

    const existingUser = await User.findOne({ $or: orConditions })
      .select('name email phone profileId createdAt')
      .lean();

    if (existingUser) {
      return apiSuccess({
        exists: true,
        // Return only safe fields — no password, no sensitive data
        profileId: (existingUser as any).profileId || '',
        name: (existingUser as any).name || '',
        // Mask email: show first 2 chars + ... + domain
        maskedEmail: maskEmail((existingUser as any).email || ''),
      });
    }

    return apiSuccess({ exists: false });
  } catch (error) {
    logError('auth/check-user', error);
    return apiError('SERVER_ERROR', 'Failed to check user');
  }
}

/** Mask email for privacy: "mo***@gmail.com" */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
