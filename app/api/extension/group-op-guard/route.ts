import { NextRequest } from 'next/server';
import { reserveExtensionGroupOpSlot, EXT_GROUP_OP_DAILY_LIMIT, EXT_GROUP_OP_HOURLY_LIMIT } from '@/lib/extensionGroupOpLimit';
import { isExtensionGroupOpAllowedNow, getExtensionTimeGuardError } from '@/lib/extensionTimeGuard';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * POST /api/extension/group-op-guard
 * Call once immediately BEFORE each group mutation (one member add/remove,
 * one group creation, one group-targeted scheduled send) — if this returns
 * allowed:false, do not perform the WhatsApp action. Caps: 150/day, 15/hour,
 * 5:00 AM-10:30 PM IST only. Does not apply to 1:1 messages — those aren't
 * gated at all, call this only for group operations.
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, allowed: false, error: 'Extension access not approved for this user' }, 403);
    }

    if (!isExtensionGroupOpAllowedNow()) {
      return extensionJson({ success: true, allowed: false, reason: 'outside_hours', error: getExtensionTimeGuardError() });
    }

    const result = await reserveExtensionGroupOpSlot(String(decoded.userId));
    if (!result.allowed) {
      const label = result.reason === 'daily_cap' ? `daily limit (${EXT_GROUP_OP_DAILY_LIMIT}/day)` : `hourly limit (${EXT_GROUP_OP_HOURLY_LIMIT}/hour)`;
      return extensionJson({
        success: true,
        allowed: false,
        reason: result.reason,
        resetAt: result.resetAt,
        error: `Reached the ${label} for group operations — this protects your WhatsApp number from bans. Try again after ${new Date(result.resetAt).toLocaleTimeString()}. For higher volume, use the official Meta WhatsApp Business API.`,
      });
    }

    return extensionJson({ success: true, allowed: true, dayRemaining: result.dayRemaining, hourRemaining: result.hourRemaining });
  } catch (err) {
    console.error('[extension/group-op-guard]', err);
    return extensionJson({ success: false, allowed: false, error: 'Internal error' }, 500);
  }
}
