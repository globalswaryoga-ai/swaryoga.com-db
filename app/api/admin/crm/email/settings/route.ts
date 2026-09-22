import { NextRequest } from 'next/server';

import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { listEmailSettings, saveEmailSettings, deleteEmailSettings, getEmailSettings } from '@/lib/emailBunnyRepository';
import { tenantFilter, getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

const MASKED = '••••••••';

function realPass(formVal?: string, dbVal?: string): string {
  if (formVal && formVal !== MASKED) return formVal.trim();
  if (dbVal && dbVal !== MASKED) return dbVal.trim();
  return process.env.SMTP_PASS || '';
}

function verifySmtpConfig(opts: {
  host: string; port: number; user: string; pass: string;
}): boolean {
  return !!(opts.host && opts.port && opts.user && opts.pass && opts.pass.length >= 4);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const tf = tenantFilter(decoded, 'createdBy');
    let settings = await listEmailSettings();
    
    if (tf.createdBy) {
      settings = settings.filter(s => s.createdBy === tf.createdBy);
    }

    const envSmtpUser = process.env.SMTP_USER;
    const envSmtpConfigured = !!(process.env.SMTP_HOST && envSmtpUser && process.env.SMTP_PASS);

    if (settings.length === 0 && envSmtpConfigured && isSuperAdmin(decoded)) {
      const doc = await saveEmailSettings({
        senderEmail: envSmtpUser!.toLowerCase(),
        senderName: 'Swar Yoga',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '465'),
        smtpUser: envSmtpUser,
        smtpPass: process.env.SMTP_PASS,
        isDefault: true,
        isActive: true,
        isVerified: true
      });
      const masked = { ...doc, smtpPass: '••••••••', resendApiKey: '' };
      return apiSuccess({ settings: [masked] });
    }

    if (settings.length === 0) {
      return apiSuccess({ settings: [] });
    }

    const healed = await Promise.all(settings.map(async (s: any) => {
      if (!s.isVerified && envSmtpConfigured && s.senderEmail === envSmtpUser?.toLowerCase()) {
        s.isVerified = true;
        await saveEmailSettings(s);
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

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

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

    const tf = tenantFilter(decoded, 'createdBy');
    const allSettings = await listEmailSettings();
    let existing = allSettings.find(s => s.senderEmail.toLowerCase() === senderEmail.trim().toLowerCase());
    
    if (existing && tf.createdBy && existing.createdBy !== tf.createdBy) {
      return apiError('VALIDATION_ERROR', 'Sender email already used by another tenant');
    }

    const host = smtpHost?.trim() || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = smtpPort || parseInt(process.env.SMTP_PORT || '465');
    const user = smtpUser?.trim() || process.env.SMTP_USER || senderEmail.trim();
    const pass = realPass(smtpPass, existing?.smtpPass);
    const secure = smtpSecure !== undefined ? smtpSecure : true;

    if (!user || !pass) {
      return apiError('VALIDATION_ERROR', 'SMTP username and password are required');
    }

    const isVerified = verifySmtpConfig({ host, port, user, pass });

    const updateData = {
      id: existing?._id,
      senderEmail: senderEmail.trim().toLowerCase(),
      senderName: senderName?.trim() || 'Swar Yoga',
      smtpHost: host,
      smtpPort: port,
      smtpUser: user,
      smtpPass: pass,
      isDefault: isDefault || false,
      isActive: true,
      isVerified,
      createdBy: existing?.createdBy || decoded.userId || 'unknown'
    };

    const doc = await saveEmailSettings(updateData);
    return apiSuccess({ setting: doc, verified: isVerified }, 201);
  } catch (err: any) {
    console.error('[email-settings POST]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const body = await request.json();
    const {
      id, senderEmail, senderName, connectionType, isDefault,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
      resendApiKey,
    } = body;

    if (!id) return apiError('VALIDATION_ERROR', 'Setting ID is required');

    const tf = tenantFilter(decoded, 'createdBy');
    let doc = await getEmailSettings(id);
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');
    
    if (tf.createdBy && doc.createdBy !== tf.createdBy) {
      return apiError('NOT_FOUND', 'Email setting not found');
    }

    const allSettings = await listEmailSettings();

    if (senderEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(senderEmail.trim())) {
        return apiError('VALIDATION_ERROR', 'Invalid email address');
      }
      const dup = allSettings.find(s => s.senderEmail.toLowerCase() === senderEmail.trim().toLowerCase() && s._id !== id);
      if (dup) return apiError('VALIDATION_ERROR', 'This sender email already exists');
      doc.senderEmail = senderEmail.trim().toLowerCase();
    }

    if (senderName !== undefined) doc.senderName = senderName.trim();
    if (smtpHost !== undefined) doc.smtpHost = smtpHost.trim();
    if (smtpPort !== undefined) doc.smtpPort = smtpPort;
    if (smtpUser !== undefined) doc.smtpUser = smtpUser.trim();
    if (isDefault) doc.isDefault = true;

    const pass = realPass(smtpPass, doc.smtpPass);
    if (pass && pass !== MASKED) doc.smtpPass = pass;

    const host = doc.smtpHost || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = doc.smtpPort || parseInt(process.env.SMTP_PORT || '465');
    const user = doc.smtpUser || process.env.SMTP_USER || '';

    let isVerifiedNow = false;
    if (user && pass) {
      isVerifiedNow = verifySmtpConfig({ host, port, user, pass });
    }
    doc.isVerified = isVerifiedNow;

    const saved = await saveEmailSettings({
       id: doc._id,
       ...doc
    });

    return apiSuccess({ setting: saved, verified: isVerifiedNow });
  } catch (err: any) {
    console.error('[email-settings PUT]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return apiError('VALIDATION_ERROR', 'Setting ID is required');

    const tf = tenantFilter(decoded, 'createdBy');
    let doc = await getEmailSettings(id);
    if (!doc) return apiError('NOT_FOUND', 'Email setting not found');
    
    if (tf.createdBy && doc.createdBy !== tf.createdBy) {
      return apiError('NOT_FOUND', 'Email setting not found');
    }

    await deleteEmailSettings(id);
    return apiSuccess({ message: 'Sender email deleted' });
  } catch (err: any) {
    console.error('[email-settings DELETE]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
