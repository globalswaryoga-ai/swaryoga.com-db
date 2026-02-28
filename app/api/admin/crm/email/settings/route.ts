import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailSettings } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/crm/email/settings
 * List all sender email configurations
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    await connectDB();
    const EmailSettings = getEmailSettings();
    const settings = await EmailSettings.find().sort({ isDefault: -1, createdAt: -1 }).lean();

    return apiSuccess({ settings });
  } catch (err: any) {
    console.error('[email-settings GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * POST /api/admin/crm/email/settings
 * Add a new sender email
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { senderEmail, senderName, resendApiKey, isDefault } = body;

    if (!senderEmail?.trim()) {
      return apiError('VALIDATION_ERROR', 'Sender email is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email address');
    }

    await connectDB();
    const EmailSettings = getEmailSettings();

    // Check duplicate
    const existing = await EmailSettings.findOne({ senderEmail: senderEmail.trim().toLowerCase() });
    if (existing) {
      return apiError('VALIDATION_ERROR', 'This sender email already exists');
    }

    // If setting as default, unset others
    if (isDefault) {
      await EmailSettings.updateMany({}, { isDefault: false });
    }

    // Verify the connection by trying to send a test via Resend
    const apiKey = resendApiKey?.trim() || process.env.RESEND_API_KEY || '';
    let isVerified = false;

    if (apiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${senderName || 'Swar Yoga'} <${senderEmail.trim()}>`,
            to: senderEmail.trim(),
            subject: 'Email Connection Test - Swar Yoga CRM',
            html: '<p>Your email sender has been successfully connected to Swar Yoga CRM.</p>',
          }),
        });
        isVerified = res.ok;
      } catch {
        isVerified = false;
      }
    }

    const doc = await EmailSettings.create({
      senderEmail: senderEmail.trim().toLowerCase(),
      senderName: senderName?.trim() || 'Swar Yoga',
      resendApiKey: resendApiKey?.trim() || '',
      isDefault: isDefault || false,
      isVerified,
      lastVerifiedAt: isVerified ? new Date() : undefined,
      createdBy: decoded.userId || 'unknown',
      updatedBy: decoded.userId || 'unknown',
    });

    return apiSuccess({ setting: doc, verified: isVerified }, 201);
  } catch (err: any) {
    console.error('[email-settings POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * PUT /api/admin/crm/email/settings
 * Update a sender email setting
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const { id, senderEmail, senderName, resendApiKey, isDefault } = body;

    if (!id) return apiError('VALIDATION_ERROR', 'Setting ID is required');

    await connectDB();
    const EmailSettings = getEmailSettings();

    const doc = await EmailSettings.findById(id);
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');

    if (senderEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(senderEmail.trim())) {
        return apiError('VALIDATION_ERROR', 'Invalid email address');
      }
      // Check duplicate (exclude self)
      const dup = await EmailSettings.findOne({ senderEmail: senderEmail.trim().toLowerCase(), _id: { $ne: id } });
      if (dup) return apiError('VALIDATION_ERROR', 'This sender email already exists');
      doc.senderEmail = senderEmail.trim().toLowerCase();
    }

    if (senderName !== undefined) doc.senderName = senderName.trim();
    if (resendApiKey !== undefined) doc.resendApiKey = resendApiKey.trim();
    if (isDefault) {
      await EmailSettings.updateMany({ _id: { $ne: id } }, { isDefault: false });
      doc.isDefault = true;
    }
    doc.updatedBy = decoded.userId || 'unknown';

    // Re-verify with current key
    const apiKey = doc.resendApiKey || process.env.RESEND_API_KEY || '';
    if (apiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${doc.senderName} <${doc.senderEmail}>`,
            to: doc.senderEmail,
            subject: 'Email Connection Verified - Swar Yoga CRM',
            html: '<p>Your email sender connection has been re-verified.</p>',
          }),
        });
        doc.isVerified = res.ok;
        if (res.ok) doc.lastVerifiedAt = new Date();
      } catch {
        doc.isVerified = false;
      }
    } else {
      doc.isVerified = false;
    }

    await doc.save();

    return apiSuccess({ setting: doc });
  } catch (err: any) {
    console.error('[email-settings PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

/**
 * DELETE /api/admin/crm/email/settings
 * Remove a sender email setting
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return apiError('UNAUTHORIZED');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return apiError('VALIDATION_ERROR', 'Setting ID is required');

    await connectDB();
    const EmailSettings = getEmailSettings();

    const doc = await EmailSettings.findByIdAndDelete(id);
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');

    return apiSuccess({ message: 'Sender email deleted' });
  } catch (err: any) {
    console.error('[email-settings DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
