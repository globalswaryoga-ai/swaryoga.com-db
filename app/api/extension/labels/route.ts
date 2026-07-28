import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * GET /api/extension/labels
 * Returns this user's label presets and the full chat->labels map, so the
 * sidebar/injected header tabs can render counts and filter without a
 * round-trip per chat.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings: any = await CRMUserSettings.findOne(
      { userId: decoded.userId },
      { extensionLabelPresets: 1, extensionChatLabels: 1 }
    ).lean();

    return extensionJson({
      success: true,
      presets: settings?.extensionLabelPresets || [],
      chatLabels: settings?.extensionChatLabels || {},
    });
  } catch (err) {
    console.error('[extension/labels]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}

/**
 * POST /api/extension/labels
 * Body: { action: 'create_preset', label: string, color?: string }
 *     | { action: 'assign', chatKey: string, labelKey: string, on: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    const body = await req.json();
    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    if (body.action === 'create_preset') {
      const label = String(body.label || '').trim();
      if (!label) return extensionJson({ success: false, error: 'label is required' }, 400);
      if (label.length > 30) return extensionJson({ success: false, error: 'Keep the label under 30 characters' }, 400);
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || `label_${Date.now()}`;
      const color = String(body.color || '#2d6a4f');

      const existing: any = await CRMUserSettings.findOne(
        { userId: decoded.userId, 'extensionLabelPresets.key': key },
        { _id: 1 }
      ).lean();
      if (existing) {
        return extensionJson({ success: true, preset: { key, label, color }, alreadyExisted: true });
      }

      await CRMUserSettings.updateOne(
        { userId: decoded.userId },
        { $push: { extensionLabelPresets: { key, label, color } } },
        { upsert: true }
      );

      return extensionJson({ success: true, preset: { key, label, color } });
    }

    if (body.action === 'assign') {
      const chatKey = String(body.chatKey || '').trim();
      const labelKey = String(body.labelKey || '').trim();
      if (!chatKey || !labelKey) {
        return extensionJson({ success: false, error: 'chatKey and labelKey are required' }, 400);
      }

      const settings: any = await CRMUserSettings.findOne({ userId: decoded.userId }, { extensionChatLabels: 1 }).lean();
      const current: string[] = (settings?.extensionChatLabels || {})[chatKey] || [];
      const next = body.on
        ? Array.from(new Set([...current, labelKey]))
        : current.filter((k) => k !== labelKey);

      await CRMUserSettings.updateOne(
        { userId: decoded.userId },
        { $set: { [`extensionChatLabels.${chatKey}`]: next } },
        { upsert: true }
      );

      return extensionJson({ success: true, chatKey, labels: next });
    }

    return extensionJson({ success: false, error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('[extension/labels POST]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
