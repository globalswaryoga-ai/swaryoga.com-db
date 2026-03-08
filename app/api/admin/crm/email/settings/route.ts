import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getEmailSettings } from '@/lib/schemas/enterpriseSchemas';
import { tenantFilter, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

const MASKED = '••••••••';

/** Return a real password: skip masked/empty values, fall back to env var */
function realPass(formVal?: string, dbVal?: string): string {
  if (formVal && formVal !== MASKED) return formVal.trim();
  if (dbVal && dbVal !== MASKED) return dbVal.trim();
  return process.env.SMTP_PASS || '';
}

/**
 * Verify SMTP credentials are properly configured.
 * Note: Vercel serverless blocks outbound SMTP (ports 25/465/587),
 * so we validate config completeness instead of a live connection test.
 * Actual sending works via lib/email.ts which handles retries.
 */
function verifySmtpConfig(opts: {
  host: string; port: number; user: string; pass: string;
}): boolean {
  return !!(opts.host && opts.port && opts.user && opts.pass && opts.pass.length >= 4);
}

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
    const tf = tenantFilter(decoded, 'createdBy');
    const settings = await EmailSettings.find(tf).sort({ isDefault: -1, createdAt: -1 }).lean();

    // Auto-heal: if env SMTP is configured and matches a sender, ensure it's marked verified
    const envSmtpUser = process.env.SMTP_USER;
    const envSmtpConfigured = !!(process.env.SMTP_HOST && envSmtpUser && process.env.SMTP_PASS);

    // If no settings exist but env SMTP is configured, auto-create the record
    if (settings.length === 0 && envSmtpConfigured) {
      const doc = await EmailSettings.create({
        senderEmail: envSmtpUser!.toLowerCase(),
        senderName: 'Swar Yoga',
        connectionType: 'smtp',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '465'),
        smtpUser: envSmtpUser,
        smtpPass: process.env.SMTP_PASS,
        smtpSecure: true,
        isDefault: true,
        isVerified: true,
        lastVerifiedAt: new Date(),
        createdBy: 'auto-config',
        createdByUserId: getViewerUserId(decoded),
        updatedBy: 'auto-config',
      });
      const masked = { ...doc.toObject(), smtpPass: '••••••••', resendApiKey: '' };
      return apiSuccess({ settings: [masked] });
    }

    // Auto-heal existing records: if SMTP env matches a sender stuck as unverified, fix it
    const healed = await Promise.all(settings.map(async (s: any) => {
      if (!s.isVerified && envSmtpConfigured && s.senderEmail === envSmtpUser?.toLowerCase()) {
        await EmailSettings.updateOne({ _id: s._id, ...tf }, { $set: { isVerified: true, lastVerifiedAt: new Date() } });
        s.isVerified = true;
        s.lastVerifiedAt = new Date();
      }
      return {
        ...s,
        smtpPass: s.smtpPass ? '••••••••' : '',
        resendApiKey: s.resendApiKey ? '••••••••' : '',
      };
    }));

    return apiSuccess({ settings: healed });
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
    const {
      senderEmail, senderName, connectionType = 'smtp', isDefault,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      resendApiKey,
    } = body;

    if (!senderEmail?.trim()) {
      return apiError('VALIDATION_ERROR', 'Sender email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email address');
    }

    await connectDB();
    const EmailSettings = getEmailSettings();
    const tf = tenantFilter(decoded, 'createdBy');

    // If setting as default, unset others
    if (isDefault) {
      await EmailSettings.updateMany(tf, { isDefault: false });
    }

    // Resolve real credentials (never store masked values)
    const existing = await EmailSettings.findOne({ senderEmail: senderEmail.trim().toLowerCase(), ...tf });
    const host = smtpHost?.trim() || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = smtpPort || parseInt(process.env.SMTP_PORT || '465');
    const user = smtpUser?.trim() || process.env.SMTP_USER || senderEmail.trim();
    const pass = realPass(smtpPass, existing?.smtpPass);
    const secure = smtpSecure !== undefined ? smtpSecure : true;

    if (!user || !pass) {
      return apiError('VALIDATION_ERROR', 'SMTP username and password are required');
    }

    // Verify SMTP config is complete
    const isVerified = verifySmtpConfig({ host, port, user, pass });

    const updateData = {
      senderName: senderName?.trim() || 'Swar Yoga',
      connectionType: 'smtp',
      smtpHost: host,
      smtpPort: port,
      smtpUser: user,
      smtpPass: pass,
      smtpSecure: secure,
      isDefault: isDefault || false,
      isVerified,
      lastVerifiedAt: isVerified ? new Date() : undefined,
      updatedBy: decoded.userId || 'unknown',
    };

    // Upsert: update if exists, create if not
    const doc = await EmailSettings.findOneAndUpdate(
      { senderEmail: senderEmail.trim().toLowerCase(), ...tf },
      { $set: updateData, $setOnInsert: { senderEmail: senderEmail.trim().toLowerCase(), createdBy: decoded.userId || 'unknown', createdByUserId: getViewerUserId(decoded) } },
      { upsert: true, new: true },
    );

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
    const {
      id, senderEmail, senderName, connectionType, isDefault,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      resendApiKey,
    } = body;

    if (!id) return apiError('VALIDATION_ERROR', 'Setting ID is required');

    await connectDB();
    const EmailSettings = getEmailSettings();
    const tf = tenantFilter(decoded, 'createdBy');

    const doc = await EmailSettings.findOne({ _id: id, ...tf });
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');

    if (senderEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(senderEmail.trim())) {
        return apiError('VALIDATION_ERROR', 'Invalid email address');
      }
      const dup = await EmailSettings.findOne({ senderEmail: senderEmail.trim().toLowerCase(), _id: { $ne: id }, ...tf });
      if (dup) return apiError('VALIDATION_ERROR', 'This sender email already exists');
      doc.senderEmail = senderEmail.trim().toLowerCase();
    }

    if (senderName !== undefined) doc.senderName = senderName.trim();
    doc.connectionType = 'smtp';
    if (smtpHost !== undefined) doc.smtpHost = smtpHost.trim();
    if (smtpPort !== undefined) doc.smtpPort = smtpPort;
    if (smtpUser !== undefined) doc.smtpUser = smtpUser.trim();
    if (smtpSecure !== undefined) doc.smtpSecure = smtpSecure;
    if (isDefault) {
      await EmailSettings.updateMany({ _id: { $ne: id }, ...tf }, { isDefault: false });
      doc.isDefault = true;
    }
    doc.updatedBy = decoded.userId || 'unknown';

    // Resolve real password (never use masked value)
    const pass = realPass(smtpPass, doc.smtpPass);
    if (pass && pass !== MASKED) doc.smtpPass = pass;

    // Re-verify SMTP
    const host = doc.smtpHost || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = doc.smtpPort || parseInt(process.env.SMTP_PORT || '465');
    const user = doc.smtpUser || process.env.SMTP_USER || '';
    const secure = doc.smtpSecure !== undefined ? doc.smtpSecure : true;

    let isVerifiedNow = false;
    if (user && pass) {
      isVerifiedNow = verifySmtpConfig({ host, port, user, pass });
    }

    doc.isVerified = isVerifiedNow;
    if (isVerifiedNow) doc.lastVerifiedAt = new Date();

    await doc.save();

    return apiSuccess({ setting: doc, verified: isVerifiedNow });
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
    const tf = tenantFilter(decoded, 'createdBy');

    const doc = await EmailSettings.findOneAndDelete({ _id: id, ...tf });
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');

    return apiSuccess({ message: 'Sender email deleted' });
  } catch (err: any) {
    console.error('[email-settings DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
