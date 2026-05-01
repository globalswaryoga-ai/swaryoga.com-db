import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead, getQrWhatsAppChat, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { logApiError } from '@/lib/error-logger';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { clearQrSessionContamination, findOtherUsersWithConnectedPhone, getAuthStatePhone, normalizeConnectedPhone, reconcileQrConnectedPhone } from '@/lib/qrSessionIsolation';

export const dynamic = 'force-dynamic';

/**
 * WhatsApp QR Bridge Proxy Endpoint
 * Proxies requests to the WhatsApp bridge service (Baileys).
 *
 * ── USER ROLES ──
 * Super Admin:          Owner of CRM (userId: 'admin' | 'admincrm').
 * Super Admin Team:     Team users under super admin. Have qrWhatsappEnabled=true.
 * CRM Admin (Tenant):   Independent users who signed up at crm.swaryoga.com.
 * CRM Admin Team:       Team users added by a CRM Admin.
 * Leads:                End-users / contacts. Not CRM users.
 *
 * ── BRIDGE SESSION ARCHITECTURE (Permanent Tenant ID) ──
 * ALL QR users:         base production bridge URL + unique session headers
 *                       x-user-id     = CRM owner / audit identity
 *                       x-session-key = permanentTenantId (preferred live session identity)
 *                       x-tenant-id   = same 7-digit tenant ID for diagnostics/context
 *                       This allows 1000+ simultaneous isolated WhatsApp sessions on one bridge instance
 *
 * ── ACCESS CONTROL ──
 * resolveUserBridge() is the SOLE gate:
 *   - Any user with permanentTenantId → own isolated session on production bridge
 *   - Legacy qrBridgeUrl (backward compat) → custom isolated bridge URL
 *   - No permanentTenantId AND no custom bridge → BLOCKED (returns {ok:false} → 422)
 *
 * ── CHAT PRIVACY FILTER ──
 * Legacy shared/team bridge sessions are filtered server-side by lead ownership.
 * Isolated tenant-owned sessions are protected by per-user bridge isolation plus
 * post-scan session-change filtering, so they keep full inbox/send/group access.
 * On filter error → returns empty (fail-safe, never leaks chats).
 */

const { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET } = getWhatsAppBridgeConfig();
const AUTH_COLLECTION = 'baileys_auth_state';
const AUTH_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// Mark as dynamic (uses request.nextUrl for query parameters)
// Allow large media payloads (base64 encoded images/videos up to 50MB)
export const maxDuration = 60; // 60s function timeout for Vercel

/**
 * Resolve the bridge URL and secret for the authenticated user.
 *
 * Access matrix:
 *   Any user with permanentTenantId → isolated production session (hasOwnBridge=true)
 *   Legacy qrBridgeUrl             → custom bridge URL (hasOwnBridge=true)
 *   No permanentTenantId/custom bridge → blocked
 */

// ── In-memory cache for resolveUserBridge (avoids MongoDB hit on every poll) ──
const bridgeCache = new Map<string, { result: BridgeResolution; expiry: number }>();
const BRIDGE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function invalidateBridgeCache(userId: string) {
  if (!userId) return;
  bridgeCache.delete(userId);
}

/** Evict stale entries periodically (prevent memory leak on long-running server) */
function evictStaleBridgeCache() {
  const now = Date.now();
  for (const [key, entry] of bridgeCache) {
    if (entry.expiry <= now) bridgeCache.delete(key);
  }
}

type BridgeResolution = 
  | { ok: true; url: string; secret: string; userId: string; bridgeSessionId: string; isSuperAdmin: boolean; hasOwnBridge: boolean; storedPhone: string; phoneChangedAt: Date | null; senderDisplayName: string; tenantId?: string }
  | { ok: false; reason: 'no_bridge' | 'unauthorized' };

async function resolveUserBridge(authHeader: string | null): Promise<BridgeResolution> {
  try {
    const decoded = verifyToken(authHeader || '');
    if (decoded?.userId && decoded?.isAdmin) {
      // ── Check cache first ──
      const cacheKey = decoded.userId;
      const cached = bridgeCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.result;
      }

      const superAdmin = checkSuperAdmin(decoded);

      // Check if user has a custom bridge URL or permanent tenant ID
      await connectDB();
      const CRMUserSettings = getCRMUserSettings();
      const settings = await CRMUserSettings.findOne(
        { userId: decoded.userId },
        { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1, qrConnectedPhoneNumber: 1, qrPhoneChangedAt: 1, senderDisplayName: 1 }
      ).lean();

      const rawStoredPhone = (settings as any)?.qrConnectedPhoneNumber || '';
      const reconciledPhone = await reconcileQrConnectedPhone(decoded.userId, {
        isSuperAdmin: superAdmin,
        storedPhone: rawStoredPhone,
        phoneChangedAt: (settings as any)?.qrPhoneChangedAt || null,
      });
      const authStatePhone = reconciledPhone.authStatePhone;
      const storedPhone = reconciledPhone.resolvedPhone;
      const phoneChangedAt = reconciledPhone.phoneChangedAt;
      const senderDisplayName = (settings as any)?.senderDisplayName || '';
      const permanentTenantId = (settings as any)?.permanentTenantId || '';

      // ── PERMANENT TENANT ID ──
      // The live bridge isolates users by x-user-id header, not /tenant/{id} path.
      // Users with permanentTenantId still get their own isolated session, but through
      // the base bridge URL plus their unique user/session headers.
      if (permanentTenantId) {
        console.log(`[QR Bridge Resolve] User ${decoded.userId} has permanentTenantId=${permanentTenantId} → hasOwnBridge=true`);
        const tenantResult: BridgeResolution = {
          ok: true,
          url: FALLBACK_BRIDGE_URL,
          secret: FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
          bridgeSessionId: permanentTenantId,
          isSuperAdmin: superAdmin,
          hasOwnBridge: true,
          storedPhone,
          phoneChangedAt,
          senderDisplayName,
          tenantId: permanentTenantId,
        };
        bridgeCache.set(cacheKey, { result: tenantResult, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
        if (bridgeCache.size > 50) evictStaleBridgeCache();
        return tenantResult;
      }

      console.warn(`[QR Bridge Resolve] User ${decoded.userId} has NO permanentTenantId - checking legacy qrBridgeUrl`);

      // ── LEGACY: Custom qrBridgeUrl (backward compatibility) ──
      if (settings?.qrBridgeUrl) {
        const legacyResult: BridgeResolution = {
          ok: true,
          url: settings.qrBridgeUrl,
          secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
          bridgeSessionId: decoded.userId,
          isSuperAdmin: superAdmin,
          hasOwnBridge: true,
          storedPhone,
          phoneChangedAt,
          senderDisplayName,
        };
        bridgeCache.set(cacheKey, { result: legacyResult, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
        if (bridgeCache.size > 50) evictStaleBridgeCache();
        return legacyResult;
      }

      console.warn(`[QR Bridge Proxy] BLOCKED: User ${decoded.userId} has no permanentTenantId or custom bridge URL; isolated QR session is required`);
      const noBridge: BridgeResolution = { ok: false, reason: 'no_bridge' };
      bridgeCache.set(cacheKey, { result: noBridge, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
      if (bridgeCache.size > 50) evictStaleBridgeCache();
      return noBridge;
    }
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to resolve user bridge:', (e as Error).message);
  }
  return { ok: false, reason: 'unauthorized' };
}

/**
 * Save the connected phone AND mark the change timestamp.
 * @param isChange - true when the phone CHANGED (different from stored). Sets qrPhoneChangedAt.
 */
async function saveConnectedPhone(userId: string, phoneId: string, isChange = false): Promise<void> {
  try {
    // Strip the @s.whatsapp.net suffix if present: "919876543210:xx@s.whatsapp.net" → "919876543210"
    const phone = phoneId.split(':')[0].split('@')[0].replace(/\D/g, '');
    if (!phone) return;
    const CRMUserSettings = getCRMUserSettings();
    const normalizedPhone = normalizeConnectedPhone(phoneId);
    const authStatePhone = await getAuthStatePhone(userId);
    const nextPhone = authStatePhone || normalizedPhone;
    const update: any = { qrConnectedPhoneNumber: phone };
    if (isChange) {
      update.qrPhoneChangedAt = new Date();
    }
    await CRMUserSettings.updateOne(
      { userId },
      { $set: { ...update, qrConnectedPhoneNumber: nextPhone || phone } },
      { upsert: true }
    );
    invalidateBridgeCache(userId);
    console.log(`[QR Bridge Proxy] Saved connected phone ${phone} for user ${userId}${isChange ? ' (PHONE CHANGED)' : ''}`);
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to save connected phone:', (e as Error).message);
  }
}

/**
 * Clear the phoneChangedAt flag (called after chats have been cleared once).
 */
async function clearPhoneChangedFlag(userId: string): Promise<void> {
  try {
    const CRMUserSettings = getCRMUserSettings();
    await CRMUserSettings.updateOne(
      { userId },
      { $unset: { qrPhoneChangedAt: 1 } }
    );
    invalidateBridgeCache(userId);
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to clear phoneChangedAt:', (e as Error).message);
  }
}

/**
 * Extract the connected phone number from bridge /status response.
 * Returns digits-only phone number or empty string.
 */
function extractBridgePhone(statusData: any): string {
  const rawPhone = typeof statusData?.phone === 'string'
    ? statusData.phone
    : statusData?.phone?.id || statusData?.phone?.name || '';
  const raw = rawPhone || statusData?.me?.id || statusData?.phoneNumber || '';
  return String(raw).split(':')[0].split('@')[0].replace(/\D/g, '');
}

function ensureStatusPhoneShape(statusData: any, phone: string) {
  if (!statusData?.connected || !phone) return statusData;

  return {
    ...statusData,
    phone: {
      ...(statusData?.phone && typeof statusData.phone === 'object' ? statusData.phone : {}),
      id: statusData?.phone?.id || phone,
      name: statusData?.phone?.name || phone,
    },
    phoneNumber: statusData?.phoneNumber || phone,
  };
}

async function validateOwnBridgeLivePhone(resolved: Extract<BridgeResolution, { ok: true }>, livePhone: string) {
  const normalizedPhone = normalizeConnectedPhone(livePhone);
  if (!resolved.hasOwnBridge || !normalizedPhone || resolved.isSuperAdmin) {
    return { allowed: true, normalizedPhone, duplicateOwners: [] as Array<{ userId: string }> };
  }

  const duplicateOwners = await findOtherUsersWithConnectedPhone(resolved.userId, normalizedPhone);
  if (duplicateOwners.length === 0) {
    return { allowed: true, normalizedPhone, duplicateOwners };
  }

  const cleanup = await clearQrSessionContamination(resolved.userId, {
    connectedPhone: normalizedPhone,
    clearAuth: true,
    clearAllSnapshots: true,
  });
  invalidateBridgeCache(resolved.userId);

  // Force-disconnect the contaminated session on the bridge so it doesn't
  // stay connected in-memory after we've cleared the DB auth state.
  try {
    await fetch(`${resolved.url}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': resolved.secret,
        'x-user-id': resolved.userId,
        'x-session-key': resolved.bridgeSessionId,
        ...(resolved.tenantId ? { 'x-tenant-id': resolved.tenantId } : {}),
      },
    });
  } catch (e) {
    console.warn(`[QR Bridge Proxy] Failed to disconnect contaminated bridge session for ${resolved.userId}:`, (e as Error).message);
  }

  console.warn(
    `[QR Bridge Proxy] Foreign live phone blocked for ${resolved.userId}: ${normalizedPhone} already belongs to ${duplicateOwners.map((owner) => owner.userId).join(', ')}`,
    cleanup
  );

  return { allowed: false, normalizedPhone, duplicateOwners, cleanup };
}

function getUnverifiedOwnBridgeResponse(existingData?: any) {
  const sessionMessage = 'QR session not verified yet. Please reconnect and scan your own WhatsApp account again.';
  if (Array.isArray(existingData)) {
    return [];
  }
  return {
    ...(existingData && typeof existingData === 'object' ? existingData : {}),
    chats: [],
    messages: [],
    source: 'awaiting_verified_session',
    sessionMessage,
    sessionContaminated: true,
  };
}

function getChatTimestampMs(chat: any): number {
  if (!chat) return 0;
  const direct = chat.lastMessageTime ? new Date(chat.lastMessageTime).getTime() : 0;
  if (direct) return direct;

  const nestedTs = chat?.lastMessage?.timestamp || chat?.conversationTimestamp || chat?.timestamp || 0;
  if (!nestedTs) return 0;
  return nestedTs > 1e12 ? nestedTs : nestedTs * 1000;
}

function applySessionChangeFilter(data: any, phoneChangedAt: Date | null) {
  if (!phoneChangedAt) return { data, filtered: false, total: 0, visible: 0 };

  const chats = data?.chats || (Array.isArray(data) ? data : []);
  if (!Array.isArray(chats) || chats.length === 0) {
    return { data, filtered: false, total: 0, visible: 0 };
  }

  const cutoffMs = new Date(phoneChangedAt).getTime();
  // Groups always pass — they belong to the currently connected WhatsApp account,
  // not to a specific phone number. Only filter individual (non-group) chats by timestamp.
  const filteredChats = chats.filter((chat: any) => {
    if (chat.isGroup || String(chat.id || '').endsWith('@g.us')) return true;
    return getChatTimestampMs(chat) >= cutoffMs;
  });
  const wrapped = data?.chats
    ? {
        ...data,
        chats: filteredChats,
        sessionChanged: filteredChats.length !== chats.length,
        sessionMessage: filteredChats.length !== chats.length
          ? 'Showing only chats from the currently scanned number.'
          : data?.sessionMessage,
      }
    : filteredChats;

  return {
    data: wrapped,
    filtered: filteredChats.length !== chats.length,
    total: chats.length,
    visible: filteredChats.length,
  };
}

async function getMongoSessionChats(userId: string, connectedPhone: string) {
  if (!userId || !connectedPhone) return [];

  try {
    const QrChat = getQrWhatsAppChat();
    const docs = await QrChat.find({ userId, connectedPhone })
      .sort({ conversationTimestamp: -1, lastMessageTime: -1 })
      .limit(1000)
      .lean();

    return docs.map((chat: any) => ({
      id: chat.chatJid,
      name: chat.name || chat.chatJid,
      isGroup: !!chat.isGroup,
      lastMessage: chat.lastMessage || '',
      lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime).toISOString() : null,
      unreadCount: Number(chat.unreadCount || 0),
      conversationTimestamp: Number(chat.conversationTimestamp || 0),
      profilePicUrl: chat.profilePicUrl || '',
      pinned: !!chat.pinned,
      archived: !!chat.archived,
      metadata: chat.metadata || {},
    }));
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to load Mongo session chats:', err);
    return [];
  }
}

function getChatArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chats)) return data.chats;
  return [];
}

function hasVisibleChatActivity(chat: any): boolean {
  if (!chat) return false;
  // Groups always pass through — synthetic group placeholders from groupSubjectCache
  // have no lastMessage/timestamp/unread but should still be visible so users can open them.
  if (chat.isGroup) return true;
  const lastMessageText = typeof chat?.lastMessage === 'string'
    ? chat.lastMessage.trim()
    : String(chat?.lastMessage?.body || '').trim();

  return Boolean(
    getChatTimestampMs(chat) > 0 ||
    lastMessageText ||
    Number(chat?.unreadCount || 0) > 0
  );
}

async function syncMongoSessionChats(userId: string, connectedPhone: string, chats: any[]) {
  if (!userId || !connectedPhone || !Array.isArray(chats)) return;

  try {
    const QrChat = getQrWhatsAppChat();
    const validChatIds = Array.from(new Set(
      chats
        .map((chat: any) => String(chat?.id || '').trim())
        .filter(Boolean)
    ));

    const ops = chats
      .filter((chat: any) => chat?.id)
      .map((chat: any) => ({
        updateOne: {
          filter: { userId, connectedPhone, chatJid: chat.id },
          update: {
            $set: {
              userId,
              connectedPhone,
              chatJid: chat.id,
              name: chat.name || chat.id,
              isGroup: !!chat.isGroup,
              lastMessage: typeof chat.lastMessage === 'string' ? chat.lastMessage : (chat?.lastMessage?.body || ''),
              lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime) : undefined,
              lastMessageFromMe: !!chat.lastMessageFromMe,
              unreadCount: Number(chat.unreadCount || 0),
              conversationTimestamp: Number(chat.conversationTimestamp || 0),
              pinned: !!chat.pinned,
              archived: !!chat.archived,
              profilePicUrl: chat.profilePicUrl || '',
              metadata: chat.metadata || {},
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));

    if (ops.length > 0) {
      await QrChat.bulkWrite(ops, { ordered: false });
    }

    // Treat each successful /chats sync as the exact current-session snapshot.
    // Remove older chat rows for this user+phone that are no longer in the latest list,
    // otherwise stale/foreign chat IDs can linger forever in Mongo and reappear in the UI.
    if (validChatIds.length > 0) {
      await QrChat.deleteMany({
        userId,
        connectedPhone,
        chatJid: { $nin: validChatIds },
      });
    }
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to sync Mongo session chats:', err);
  }
}

function decodePathFully(rawPath: string): string {
  let decoded = rawPath || '';
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  if (!decoded.startsWith('/')) {
    decoded = `/${decoded}`;
  }
  return decoded;
}

function extractChatJidFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return '';
  try {
    return decodeURIComponent(parts[1]);
  } catch {
    return parts[1] || '';
  }
}

async function isChatAllowedInCurrentSession(userId: string, connectedPhone: string, chatJid: string): Promise<boolean> {
  if (!userId || !connectedPhone || !chatJid) return false;

  try {
    const QrChat = getQrWhatsAppChat();
    const exists = await QrChat.exists({ userId, connectedPhone, chatJid });
    return !!exists;
  } catch (err) {
    console.error('[QR Bridge Proxy] Failed to verify current-session chat access:', err);
    return false;
  }
}

// ============================================
// SHARED LEAD OWNERSHIP CHECK
// ============================================

/**
 * Extract phone number from a JID or path segment.
 * e.g. "919309986820@s.whatsapp.net" → "919309986820"
 *      "919309986820@c.us" → "919309986820"
 *      "919309986820" → "919309986820"
 */
function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0].replace(/\D/g, '');
}

/**
 * Normalize JID format - convert @c.us (compressed) to @s.whatsapp.net (standard).
 * This ensures fallback MongoDB queries can find stored messages regardless of
 * which JID format the bridge returns.
 */
function normalizeJidFormat(jid: string): string {
  if (jid.includes('@c.us')) {
    return jid.replace('@c.us', '@s.whatsapp.net');
  }
  // Also handle group JIDs if they come in @c.us format
  if (jid.includes('@c-us')) {
    return jid.replace('@c-us', '@g.us');
  }
  return jid;
}

/**
 * Check if a user owns a lead (assigned to or created by them).
 * Handles dual phone format (with/without 91 prefix).
 * Returns true if user is allowed, false if blocked.
 * 
 * For group chats (phone contains '-'), always returns true (groups are shared).
 * For non-existent leads, returns false (fail-safe — block unknown contacts).
/**
 * Check if a phone number belongs to a lead assigned to the user.
 * Dual phone number support (10-digit + 91-digit) for Indian numbers.
 * Returns true for group chats (safety-first).
 * For own-bridge (tenant) users: Allow unassigned messages to be viewed (no lead needed yet).
 * For shared-bridge: Block unassigned messages (strict tenant isolation).
 */
async function isLeadOwnedByUser(phone: string, userId: string, isOwnBridge = false): Promise<boolean> {
  if (!phone || phone.includes('-')) return true; // Group chats allowed
  if (phone.length < 10) return true; // Too short to be a real phone, let it pass
  
  try {
    const Lead = getLead();
    const phonesToCheck = [phone];
    if (phone.startsWith('91') && phone.length === 12) {
      phonesToCheck.push(phone.substring(2));
    } else if (phone.length === 10) {
      phonesToCheck.push('91' + phone);
    }
    
    const lead = await Lead.findOne(
      { phoneNumber: { $in: phonesToCheck } },
      { assignedToUserId: 1, createdByUserId: 1 }
    ).lean() as any;
    
    if (!lead) {
      // For own-bridge (tenant) users: Allow unassigned messages from their session
      if (isOwnBridge) {
        console.log(`[QR Bridge] Tenant ${userId}: allowing unassigned contact ${phone} on own bridge`);
        return true;
      }
      // For shared bridge: Block unassigned messages (strict isolation)
      console.warn(`[QR Bridge] Shared-bridge user ${userId}: blocking unassigned contact ${phone}`);
      return false;
    }
    return lead.assignedToUserId === userId || lead.createdByUserId === userId;
  } catch (err) {
    console.error(`[QR Bridge] Lead check error for ${phone}:`, err);
    // For own-bridge, be lenient on errors (will be reconciled when lead is created)
    if (isOwnBridge) {
      console.warn(`[QR Bridge] Tenant ${userId}: allowing on error (own bridge recovery path)`);
      return true;
    }
    return false; // Fail-safe: block on error for shared bridge
  }
}

/**
 * Extract phone from a bridge path like /messages/919309986820@s.whatsapp.net
 * or /contact-about/919309986820@s.whatsapp.net
 */
function extractPhoneFromPath(path: string): string {
  // Match patterns like /something/JID or /something/JID/more
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const jid = decodeURIComponent(parts[1]);
    return extractPhoneFromJid(jid);
  }
  return '';
}

/**
 * Endpoints that are ALWAYS allowed (no per-chat ownership check needed).
 * These are session-level or read-only operations that don't expose other users' data.
 */
const ALWAYS_ALLOWED_PATHS = new Set([
  '/status',
  '/qr',
  '/chats',        // Filtered separately by chat privacy filter
  '/statuses',     // WhatsApp status updates (stories)
]);

/**
 * Endpoints that ONLY Super Admin can use (session management).
 * Non-super-admin users on shared bridge MUST NOT control the session.
 */
const SUPER_ADMIN_ONLY_PATHS = new Set([
  '/reconnect',
  '/disconnect', 
  '/logout',
  '/group-create',   // Creating groups from Super Admin's WhatsApp
]);

/**
 * POST endpoints where the target phone is in body.to or body.jid
 */
const BODY_TARGET_PATHS = new Set([
  '/send',
  '/reply',
  '/react',
  '/delete-message',
  '/typing',
  '/read',
  '/presence/subscribe',
]);

/**
 * GET/POST endpoints where the target JID is in the URL path
 */
function isPathTargetEndpoint(path: string): boolean {
  return path.startsWith('/messages/') ||
    path.startsWith('/contact-about/') ||
    path.startsWith('/profile-pic/') ||
    path.startsWith('/media/') ||
    path.startsWith('/presence/') ||
    path.startsWith('/read/') ||
    path.startsWith('/group-info/') ||
    path.startsWith('/group-invite/') ||
    path.startsWith('/group-revoke-invite/') ||
    path.startsWith('/group-settings/') ||
    path.startsWith('/group-participants/') ||
    path.startsWith('/group-update-desc/') ||
    path.startsWith('/group-update-subject/') ||
    path.startsWith('/group-leave/');
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolution = await resolveUserBridge(authHeader);
    if (!resolution.ok) {
      if (resolution.reason === 'no_bridge') {
        return NextResponse.json(
          { error: 'No WhatsApp bridge configured. Please set up your bridge URL in Settings tab.', noBridge: true },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: 'Unauthorized — please log in again.' },
        { status: 401 }
      );
    }
    const resolved = resolution;
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId, bridgeSessionId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.
    // Users reach here only if they are: (a) super admin, (b) have own bridge, or (c) have qrWhatsappEnabled.

    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle double-encoded values like %2540 (@)
    const decodedPath = decodePathFully(path);
    const basePath = '/' + decodedPath.split('/').filter(Boolean)[0];

    console.log(`[QR Bridge POST] userId=${userId}, basePath=${basePath}, decodedPath=${decodedPath}, hasOwnBridge=${resolved.hasOwnBridge}, isSuperAdmin=${resolved.isSuperAdmin}`);

    // ════════════════════════════════════════════════════════════
    // ── COMPREHENSIVE PER-CHAT SECURITY GATE (POST) ──
    // Runs BEFORE the request reaches the bridge.
    // Shared/team bridge sessions must pass lead-ownership validation.
    // Isolated tenant-owned bridge sessions keep full access to their own bridge.
    // ════════════════════════════════════════════════════════════
    const requiresLeadOwnershipFilter = !resolved.hasOwnBridge;
    console.log(`[QR Bridge POST Security] requiresLeadOwnershipFilter=${requiresLeadOwnershipFilter} (hasOwnBridge=${resolved.hasOwnBridge})`);
    
    if (requiresLeadOwnershipFilter) {
      // 1. Super Admin-only endpoints (session management)
      // BUT: CRM tenants (with permanentTenantId) can manage their own tenant session
      if (SUPER_ADMIN_ONLY_PATHS.has(basePath) && !resolved.isSuperAdmin && !resolved.tenantId) {
        // BLOCKED: Non-Super Admin, no tenantId, trying to use Super Admin endpoint
        console.warn(`[QR Bridge Proxy] BLOCKED: ${userId} tried ${decodedPath} (Super Admin only)`);
        return NextResponse.json(
          { success: false, error: 'This action is restricted to Super Admin.' },
          { status: 403 }
        );
      }
      // ALLOWED: Super Admin OR CRM tenant can use /reconnect, /disconnect, /logout

      // 2. Body-target endpoints (/send, /reply, /react, etc.) — check body.to or body.jid
      if (BODY_TARGET_PATHS.has(basePath) && body) {
        const targetJid = body.to || body.jid || body.chatId || '';
        const targetPhone = extractPhoneFromJid(typeof targetJid === 'string' ? targetJid : '');
        if (targetPhone && targetPhone.length >= 10) {
          // For body-target endpoints in POST: check strict lead ownership for shared-bridge only
          const allowed = await isLeadOwnedByUser(targetPhone, userId, resolved.hasOwnBridge);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy] BLOCKED: ${userId} tried ${basePath} to ${targetPhone} (not their lead)`);
            return NextResponse.json(
              { success: false, error: 'Access denied. This contact is not assigned to you.' },
              { status: 403 }
            );
          }
        }
      }

      // 3. Path-target endpoints (/messages/{jid}, /contact-about/{jid}, etc.)
      if (isPathTargetEndpoint(decodedPath)) {
        const targetPhone = extractPhoneFromPath(decodedPath);
        if (targetPhone && targetPhone.length >= 10 && !targetPhone.includes('-')) {
          // For path-target endpoints: Allow own-bridge full access; filter shared-bridge by lead
          const allowed = await isLeadOwnedByUser(targetPhone, userId, resolved.hasOwnBridge);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy] BLOCKED POST: ${userId} tried ${decodedPath} (not their lead, shared bridge)`);
            // Return appropriate empty response based on endpoint type
            if (decodedPath.startsWith('/messages/')) {
              return NextResponse.json({ success: true, data: { messages: [], blocked: true } }, { status: 200 });
            }
            return NextResponse.json(
              { success: false, error: 'Access denied. This contact is not assigned to you.' },
              { status: 403 }
            );
          }
        }
      }
    }

    if (resolved.hasOwnBridge && !resolved.storedPhone) {
      if (decodedPath === '/chats') {
        return NextResponse.json(
          { success: true, data: getUnverifiedOwnBridgeResponse() },
          { status: 200 }
        );
      }

      if (BODY_TARGET_PATHS.has(basePath) || isPathTargetEndpoint(decodedPath)) {
        return NextResponse.json(
          { success: false, error: 'QR session not verified yet. Please reconnect and scan your own WhatsApp account.' },
          { status: 409 }
        );
      }
    }

    // ── OWN-BRIDGE CURRENT-SESSION GATE (POST) ──
    // Even on isolated sessions, never allow stale/foreign chat actions unless the
    // target chat exists in the current user's QR session store.
    if (resolved.hasOwnBridge && resolved.storedPhone) {
      const basePath = '/' + decodedPath.split('/').filter(Boolean)[0];

      if (BODY_TARGET_PATHS.has(basePath) && body && basePath !== '/send') {
        const targetJid = String(body.chatId || body.jid || body.to || '');
        const normalizedChatJid = targetJid.includes('@')
          ? targetJid
          : (extractPhoneFromJid(targetJid) ? `${extractPhoneFromJid(targetJid)}@s.whatsapp.net` : '');

        if (normalizedChatJid) {
          const allowed = await isChatAllowedInCurrentSession(userId, resolved.storedPhone, normalizedChatJid);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy] BLOCKED stale/foreign own-bridge POST for ${userId}: ${basePath} -> ${normalizedChatJid}`);
            return NextResponse.json(
              { success: false, error: 'Access denied. This chat is not in your current QR session.' },
              { status: 403 }
            );
          }
        }
      }

      if (isPathTargetEndpoint(decodedPath)) {
        const chatJid = extractChatJidFromPath(decodedPath);
        if (chatJid) {
          const allowed = await isChatAllowedInCurrentSession(userId, resolved.storedPhone, chatJid);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy] BLOCKED stale/foreign own-bridge POST path for ${userId}: ${decodedPath}`);
            if (decodedPath.startsWith('/messages/')) {
              return NextResponse.json({ success: true, data: { messages: [], blocked: true } }, { status: 200 });
            }
            return NextResponse.json(
              { success: false, error: 'Access denied. This chat is not in your current QR session.' },
              { status: 403 }
            );
          }
        }
      }
    }

    // ── SENDER DISPLAY NAME SIGNATURE ──
    // Append the user's configured display name (e.g. "Swar Yoga") as a bold
    // signature at the bottom of every sent TEXT ONLY message.
    // Do NOT append to media captions as it breaks media formatting.
    if ((decodedPath === '/send' || decodedPath.startsWith('/send') || decodedPath === '/reply' || decodedPath.startsWith('/reply')) && body && resolved.senderDisplayName) {
      // Only append signature if:
      // 1. Not a media message (no media field in body)
      // 2. Has actual text content
      // 3. Signature is not empty
      const hasNoMedia = !body.media && !body.hasMedia && !body.mediaBase64;
      const displayName = String(resolved.senderDisplayName).trim();
      const sig = `\n\n*${displayName}*`;
      
      if (hasNoMedia && displayName.length > 0) {
        if (body.message && typeof body.message === 'string' && !body.message.includes(sig)) {
          body.message = body.message + sig;
        } else if (body.text && typeof body.text === 'string' && !body.text.includes(sig)) {
          body.text = body.text + sig;
        }
      }
      // For media messages, only append to caption if it exists
      if (!hasNoMedia && displayName.length > 0) {
        if (body.caption && typeof body.caption === 'string' && !body.caption.includes(sig)) {
          body.caption = body.caption + sig;
        }
      }
    }

    const method = (action || 'GET').toUpperCase();
    const bridgeUrl = `${BRIDGE_URL}${decodedPath}`;

    // Diagnostic logs
    console.log(`[QR Bridge Proxy] ════════════════════════════════════════`);
    console.log(`[QR Bridge Proxy] userId=${userId}`);
    console.log(`[QR Bridge Proxy] bridgeSessionId=${bridgeSessionId}`);
    console.log(`[QR Bridge Proxy] isSuperAdmin=${resolved.isSuperAdmin}, hasOwnBridge=${resolved.hasOwnBridge}`);
    console.log(`[QR Bridge Proxy] BRIDGE_URL=${BRIDGE_URL}`);
    console.log(`[QR Bridge Proxy] decodedPath=${decodedPath}`);
    console.log(`[QR Bridge Proxy] Final bridgeUrl=${bridgeUrl}`);
    console.log(`[QR Bridge Proxy] ════════════════════════════════════════`);

    // Determine timeout based on endpoint type
    // /send with media: 45s (large base64 payloads)
    // Messages polling: 12s (can be slow, needs more time)
    // Status check: 8s
    // Contact/Group details: 3s (timeout quickly, use fallback)
    // Other endpoints: 8s
    let timeoutMs = 8000;
    if (decodedPath.includes('/send')) timeoutMs = 45000; // Large media uploads need more time
    if (decodedPath.includes('/messages')) timeoutMs = 12000;
    if (decodedPath.includes('/contact') || decodedPath.includes('/group')) timeoutMs = 3000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'x-user-id': userId,
        'x-session-key': bridgeSessionId,
        ...(resolved.tenantId ? { 'x-tenant-id': resolved.tenantId } : {}),
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'SwarYoga-Bridge-Proxy/1.0'
      },
      signal: controller.signal
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`[QR Bridge Proxy] ${method} ${bridgeUrl} (timeout: ${timeoutMs}ms)`);

    let res;
    try {
      res = await fetch(bridgeUrl, fetchOptions);
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${decodedPath}`);
          return NextResponse.json(
            { 
              error: `Bridge timeout (${timeoutMs}ms)`,
              path: decodedPath,
              message: 'Bridge service is taking too long to respond. Please check your bridge configuration.',
              timestamp: new Date().toISOString()
            },
            { status: 504 }
          );
        } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
          console.error(`[QR Bridge Proxy] Bridge unreachable: ${err.message}`);
          return NextResponse.json(
            {
              error: 'Bridge service unreachable',
              message: 'Cannot connect to WhatsApp bridge. Check your bridge URL and network connection.',
              bridgeUrl: BRIDGE_URL,
              timestamp: new Date().toISOString()
            },
            { status: 503 }
          );
        } else {
          console.error(`[QR Bridge Proxy] Network error: ${err.message}`);
          return NextResponse.json(
            {
              error: 'Network error connecting to bridge',
              message: err.message,
              timestamp: new Date().toISOString()
            },
            { status: 502 }
          );
        }
      }
      throw err;
    }
    clearTimeout(timeout);
    
    // Check if response is successful before parsing as JSON
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      
      // Try to extract bridge's specific error message from JSON
      let bridgeSpecificMessage = null;
      try {
        const errorJson = JSON.parse(errorText);
        bridgeSpecificMessage = errorJson.message || errorJson.error;
      } catch (e) {
        // Not JSON, use generic message
      }
      
      // Handle specific error codes with helpful messages
      let errorMessage = 'Bridge error';
      if (res.status === 404) {
        errorMessage = `Endpoint not found: ${decodedPath}`;
      } else if (res.status === 503 || res.status === 502) {
        errorMessage = 'Bridge service temporarily unavailable';
      } else if (res.status === 401 || res.status === 403) {
        errorMessage = 'Bridge authentication failed';
      } else if (res.status === 400) {
        // Use bridge's specific message if available (e.g., "QR not available")
        errorMessage = bridgeSpecificMessage || 'Invalid request format';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: res.status,
          details: errorText.substring(0, 100),
          timestamp: new Date().toISOString()
        },
        { status: res.status }
      );
    }
    
    // Try to parse as JSON, fallback if not valid JSON
    let data: any;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.warn('[QR Bridge Proxy] Response is not JSON, returning as text');
      const text = await res.text();
      return NextResponse.json(
        { success: true, data: text, note: 'Response was not JSON' },
        { status: res.status }
      );
    }

    // ── SESSION PHONE TRACKING (POST) ──
    if (decodedPath === '/status' && data?.connected) {
      const bridgePhone = extractBridgePhone(data);
      if (resolved.hasOwnBridge && bridgePhone) {
        const livePhoneValidation = await validateOwnBridgeLivePhone(resolved, bridgePhone);
        if (!livePhoneValidation.allowed) {
          const contaminatedStatus = {
            ...data,
            connected: false,
            phone: undefined,
            me: undefined,
            phoneNumber: '',
            sessionContaminated: true,
            sessionMessage: 'Another user\'s WhatsApp session was detected here. Please reconnect and scan your own account.',
          };
          return NextResponse.json({ success: true, data: contaminatedStatus }, { status: 200 });
        }
      }
      if (bridgePhone && bridgePhone !== resolved.storedPhone) {
        // Phone CHANGED → save with timestamp so /chats can detect stale data
        await saveConnectedPhone(userId, bridgePhone, true);
        console.log(`[QR Bridge Proxy POST /status] Phone changed: ${resolved.storedPhone} → ${bridgePhone}`);
      } else if (bridgePhone && !resolved.storedPhone) {
        // First-time save (no previous phone)
        await saveConnectedPhone(userId, bridgePhone, false);
      }
      if (!bridgePhone && resolved.storedPhone) {
        data.phone = {
          ...(data.phone || {}),
          id: resolved.storedPhone,
          name: data?.phone?.name || resolved.storedPhone,
        };
      }
      data = ensureStatusPhoneShape(data, bridgePhone || resolved.storedPhone);
    }

    // ── SESSION ISOLATION (POST /chats) ──
    // After a new QR scan, keep only chats whose activity is newer than the phone-change timestamp.
    // This prevents stale chats from the previously scanned number from leaking into the tenant inbox.
    if (decodedPath === '/chats') {
      const rawBridgeData = data; // preserve unfiltered bridge data for MongoDB sync
      const sessionFiltered = applySessionChangeFilter(data, resolved.phoneChangedAt);
      if (sessionFiltered.filtered) {
        console.log(`[QR Bridge Proxy POST /chats] Session filter for ${userId}: ${sessionFiltered.total} total → ${sessionFiltered.visible} current-session chats`);
        data = sessionFiltered.data;
        // Clear the phone changed flag after the first filter pass so subsequent calls show all chats
        await clearPhoneChangedFlag(userId);
      }

      if (resolved.hasOwnBridge && !resolved.storedPhone) {
        const bridgeChats = getChatArray(data).filter(hasVisibleChatActivity);
        if (bridgeChats.length > 0) {
          console.warn(`[QR Bridge Proxy POST /chats] Blocking ${bridgeChats.length} chats for ${userId} because the own-bridge session has no verified phone yet.`);
        }
        data = getUnverifiedOwnBridgeResponse(data);
      } else if (resolved.hasOwnBridge && resolved.storedPhone) {
        // Sync the FULL unfiltered bridge chat list to MongoDB so we don't delete real chats
        const allBridgeChats = getChatArray(rawBridgeData).filter(hasVisibleChatActivity);
        const filteredBridgeChats = getChatArray(data).filter(hasVisibleChatActivity);
        if (allBridgeChats.length > 0) {
          await syncMongoSessionChats(userId, resolved.storedPhone, allBridgeChats);
        }
        if (filteredBridgeChats.length > 0) {
          data = data?.chats
            ? { ...data, chats: filteredBridgeChats, source: data?.source || 'bridge_current_session' }
            : { chats: filteredBridgeChats, source: 'bridge_current_session' };
        } else {
          const mongoChats = await getMongoSessionChats(userId, resolved.storedPhone);
          if (mongoChats.length > 0) {
            console.log(`[QR Bridge Proxy POST /chats] Falling back to Mongo session chats for ${userId}: ${mongoChats.length} chats (connectedPhone=${resolved.storedPhone})`);
            data = data?.chats ? { ...data, chats: mongoChats, source: 'qr_mongodb_fallback' } : { chats: mongoChats, source: 'qr_mongodb_fallback' };
          }
        }
      }
    }

    // ── CHAT PRIVACY FILTER (POST handler) ──
    // Applied to shared/team bridge users. Each user only sees chats for leads
    // assigned to or created by them. Uses dual phone lookup (with/without 91 prefix)
    // to handle inconsistent lead phone formats in the database.
    if (decodedPath === '/chats' && requiresLeadOwnershipFilter) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          const Lead = getLead();
          // Extract all phone numbers from chat IDs and build both formats
          const rawPhones = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter((p: string) => p && !p.includes('-')); // Skip group chats

          // Build lookup with both 91-prefixed and raw formats
          const allPhonesToQuery = new Set<string>();
          for (const phone of rawPhones) {
            allPhonesToQuery.add(phone);
            if (phone.startsWith('91') && phone.length === 12) {
              allPhonesToQuery.add(phone.substring(2)); // 10-digit
            } else if (phone.length === 10) {
              allPhonesToQuery.add('91' + phone); // 12-digit
            }
          }

          const leads = await Lead.find(
            { phoneNumber: { $in: Array.from(allPhonesToQuery) } },
            { phoneNumber: 1, assignedToUserId: 1, createdByUserId: 1 }
          ).lean();

          // Map both phone formats to lead info
          const leadMap = new Map<string, { assignedToUserId?: string; createdByUserId?: string }>();
          for (const l of leads) {
            const lp = (l as any).phoneNumber;
            leadMap.set(lp, {
              assignedToUserId: (l as any).assignedToUserId,
              createdByUserId: (l as any).createdByUserId,
            });
            // Also map the alternate format
            if (lp.startsWith('91') && lp.length === 12) {
              leadMap.set(lp.substring(2), { assignedToUserId: (l as any).assignedToUserId, createdByUserId: (l as any).createdByUserId });
            } else if (lp.length === 10) {
              leadMap.set('91' + lp, { assignedToUserId: (l as any).assignedToUserId, createdByUserId: (l as any).createdByUserId });
            }
          }

          const filteredChats = chats.filter((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            const phone = idStr.split('@')[0];
            if (phone.includes('-')) return false; // Skip group chats for non-own bridge
            const leadInfo = leadMap.get(phone);
            if (!leadInfo) return false;
            return leadInfo.assignedToUserId === userId || leadInfo.createdByUserId === userId;
          });

          console.log(`[QR Bridge Proxy POST] Chat filter for ${userId}: ${chats.length} total → ${filteredChats.length} visible`);
          const filteredData = data?.chats ? { ...data, chats: filteredChats } : filteredChats;
          return NextResponse.json({ success: true, data: filteredData }, { status: res.status });
        } catch (filterErr) {
          console.error('[QR Bridge Proxy POST] Chat filter error:', filterErr);
          const emptyData = data?.chats ? { ...data, chats: [] } : [];
          return NextResponse.json({ success: true, data: emptyData }, { status: res.status });
        }
      }
    }

    // ── OUTBOUND MESSAGE SAVE (POST /send) ──
    // Save sent message immediately to QrWhatsAppMessage + QrWhatsAppChat so it
    // appears in the inbox right away without waiting for the bridge webhook.
    // The bridge webhook will also save it later — the unique messageId index deduplicates.
    if ((decodedPath === '/send' || decodedPath === '/reply') && data?.success !== false && resolved.storedPhone && body) {
      try {
        const toJid = String(body.to || body.chatId || body.jid || '').trim();
        const messageText = String(body.message || body.text || body.caption || '').trim();
        const sentMsgId = String(data?.messageId || data?.id || data?.key?.id || '').trim();
        if (toJid && (messageText || body.media || body.hasMedia)) {
          const QrMsg = getQrWhatsAppMessage();
          const QrChat = getQrWhatsAppChat();
          const chatJid = toJid.includes('@') ? toJid : `${toJid.replace(/\D/g, '')}@s.whatsapp.net`;
          const nowSeconds = Math.floor(Date.now() / 1000);
          const msgFilter: any = { userId, connectedPhone: resolved.storedPhone, chatJid };
          if (sentMsgId) msgFilter.messageId = sentMsgId;
          await QrMsg.updateOne(
            msgFilter,
            {
              $set: {
                userId, connectedPhone: resolved.storedPhone, chatJid,
                messageId: sentMsgId || `proxy-${Date.now()}`,
                direction: 'outbound', fromMe: true,
                text: messageText, type: body.media ? 'media' : 'text',
                timestamp: nowSeconds, status: 1,
                hasMedia: !!(body.media || body.hasMedia),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          await QrChat.updateOne(
            { userId, connectedPhone: resolved.storedPhone, chatJid },
            {
              $set: {
                userId, connectedPhone: resolved.storedPhone, chatJid,
                lastMessage: messageText || '[media]',
                lastMessageTime: new Date(),
                lastMessageFromMe: true,
                conversationTimestamp: nowSeconds,
              },
              $setOnInsert: { name: toJid.split('@')[0], isGroup: chatJid.endsWith('@g.us'), unreadCount: 0, pinned: false, archived: false, profilePicUrl: '', createdAt: new Date() },
            },
            { upsert: true }
          );
          console.log(`[QR Bridge Proxy POST /send] Saved outbound message to MongoDB: ${chatJid}`);
        }
      } catch (saveErr) {
        console.error('[QR Bridge Proxy POST /send] Failed to save outbound message:', (saveErr as Error).message);
      }
    }

    // Wrap in { success, data } so useCRM hook accepts the response
    return NextResponse.json({ success: true, data }, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    logApiError('qr-bridge/POST', err, { method: 'POST' }).catch(() => {});
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolution = await resolveUserBridge(authHeader);
    if (!resolution.ok) {
      if (resolution.reason === 'no_bridge') {
        return NextResponse.json(
          { error: 'No WhatsApp bridge configured. Please set up your bridge URL in Settings tab.', noBridge: true },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: 'Unauthorized — please log in again.' },
        { status: 401 }
      );
    }
    const resolved = resolution;
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId, bridgeSessionId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.

    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle double-encoded values like %2540 (@)
    path = decodePathFully(path);
    const basePath = '/' + path.split('/').filter(Boolean)[0];

    // ════════════════════════════════════════════════════════════
    // ── COMPREHENSIVE PER-CHAT SECURITY GATE (GET) ──
    // Same logic as POST gate — validates lead ownership before
    // allowing any endpoint that targets a specific phone/chat.
    // Shared/team bridge sessions are filtered server-side.
    // Isolated tenant-owned sessions keep full access to their own bridge.
    // ════════════════════════════════════════════════════════════
    const requiresLeadOwnershipFilter = !resolved.hasOwnBridge;
    if (requiresLeadOwnershipFilter) {
      // Super Admin-only endpoints (session management)
      // BUT: CRM tenants (with permanentTenantId) can manage their own tenant session
      if (SUPER_ADMIN_ONLY_PATHS.has(basePath) && !resolved.isSuperAdmin && !resolved.tenantId) {
        // BLOCKED: Non-Super Admin, no tenantId, trying to use Super Admin endpoint
        console.warn(`[QR Bridge Proxy GET] BLOCKED: ${userId} tried ${path} (Super Admin only)`);
        return NextResponse.json(
          { success: false, error: 'This action is restricted to Super Admin.' },
          { status: 403 }
        );
      }
      // ALLOWED: Super Admin OR CRM tenant can use /reconnect, /disconnect, /logout

      // Path-target endpoints (/messages/{jid}, /contact-about/{jid}, /profile-pic/{jid}, etc.)
      if (isPathTargetEndpoint(path)) {
        const targetPhone = extractPhoneFromPath(path);
        if (targetPhone && targetPhone.length >= 10 && !targetPhone.includes('-')) {
          // For path-target endpoints: Allow own-bridge full access; filter shared-bridge by lead
          const allowed = await isLeadOwnedByUser(targetPhone, userId, resolved.hasOwnBridge);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy GET] BLOCKED: ${userId} tried ${path} (not their lead, shared bridge)`);
            if (path.startsWith('/messages/')) {
              return NextResponse.json({ success: true, data: { messages: [], blocked: true } }, { status: 200 });
            }
            if (path.startsWith('/profile-pic/') || path.startsWith('/contact-about/')) {
              return NextResponse.json({ success: true, data: {} }, { status: 200 });
            }
            return NextResponse.json(
              { success: false, error: 'Access denied. This contact is not assigned to you.' },
              { status: 403 }
            );
          }
        }
      }
    }

    if (resolved.hasOwnBridge && !resolved.storedPhone) {
      if (path === '/chats') {
        return NextResponse.json(
          { success: true, data: getUnverifiedOwnBridgeResponse() },
          { status: 200 }
        );
      }

      if (isPathTargetEndpoint(path)) {
        if (path.startsWith('/messages/')) {
          return NextResponse.json({ success: true, data: getUnverifiedOwnBridgeResponse() }, { status: 200 });
        }
        return NextResponse.json(
          { success: false, error: 'QR session not verified yet. Please reconnect and scan your own WhatsApp account.' },
          { status: 409 }
        );
      }
    }

    // ── OWN-BRIDGE CURRENT-SESSION GATE (GET) ──
    // Isolated bridge users must still be constrained to chats that belong to the
    // current stored QR session. This prevents stale or foreign bridge data from leaking.
    if (resolved.hasOwnBridge && resolved.storedPhone && isPathTargetEndpoint(path)) {
      const chatJid = extractChatJidFromPath(path);
      if (chatJid) {
        const allowed = await isChatAllowedInCurrentSession(userId, resolved.storedPhone, chatJid);
        if (!allowed) {
          console.warn(`[QR Bridge Proxy GET] BLOCKED stale/foreign own-bridge path for ${userId}: ${path}`);
          if (path.startsWith('/messages/')) {
            return NextResponse.json({ success: true, data: { messages: [], blocked: true } }, { status: 200 });
          }
          if (path.startsWith('/profile-pic/') || path.startsWith('/contact-about/') || path.startsWith('/presence/')) {
            return NextResponse.json({ success: true, data: {} }, { status: 200 });
          }
          return NextResponse.json(
            { success: false, error: 'Access denied. This chat is not in your current QR session.' },
            { status: 403 }
          );
        }
      }
    }

    // ── OWN-BRIDGE MESSAGE READS (GET /messages) ──
    // Live bridge data must win so delivery/read ticks and fresh replies stay current.
    // Persistent QR Mongo storage remains as the fallback lower in this handler when
    // bridge memory is empty or after a reconnect.

    const bridgeUrl = `${BRIDGE_URL}${path}`;

    // Diagnostic logs
    console.log(`[QR Bridge Proxy GET] ════════════════════════════════════════`);
    console.log(`[QR Bridge Proxy GET] userId=${userId}`);
    console.log(`[QR Bridge Proxy GET] bridgeSessionId=${bridgeSessionId}`);
    console.log(`[QR Bridge Proxy GET] isSuperAdmin=${resolved.isSuperAdmin}, hasOwnBridge=${resolved.hasOwnBridge}`);
    console.log(`[QR Bridge Proxy GET] BRIDGE_URL=${BRIDGE_URL}`);
    console.log(`[QR Bridge Proxy GET] path=${path}`);
    console.log(`[QR Bridge Proxy GET] Final bridgeUrl=${bridgeUrl}`);
    console.log(`[QR Bridge Proxy GET] ════════════════════════════════════════`);

    // Determine timeout based on endpoint type
    // Media downloads: 30s (can be large files)
    // Messages polling: 12s (can be slow, needs more time)
    // Status check: 8s
    // Contact/Group details: 3s (timeout quickly, use fallback)
    // Other endpoints: 8s
    let timeoutMs = 8000;
    if (path.includes('/media')) timeoutMs = 30000; // Long timeout for media downloads
    if (path.includes('/messages')) timeoutMs = 12000; // Increased from 5s to 12s
    if (path.includes('/contact') || path.includes('/group')) timeoutMs = 3000;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[QR Bridge Proxy GET] ${path} for user=${userId} (timeout: ${timeoutMs}ms)`);

    let res;
    try {
      res = await fetch(bridgeUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': BRIDGE_SECRET,
          'x-user-id': userId,
          'x-session-key': bridgeSessionId,
          ...(resolved.tenantId ? { 'x-tenant-id': resolved.tenantId } : {}),
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'SwarYoga-Bridge-Proxy/1.0'
        },
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${path}`);
          return NextResponse.json(
            {
              error: `Bridge timeout (${timeoutMs}ms)`,
              path,
              message: 'Bridge service is taking too long to respond. Please check your bridge configuration.',
              timestamp: new Date().toISOString()
            },
            { status: 504 }
          );
        } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
          console.error(`[QR Bridge Proxy] Bridge unreachable: ${err.message}`);
          return NextResponse.json(
            {
              error: 'Bridge service unreachable',
              message: 'Cannot connect to WhatsApp bridge. Check your bridge URL and network connection.',
              bridgeUrl: BRIDGE_URL,
              timestamp: new Date().toISOString()
            },
            { status: 503 }
          );
        } else {
          console.error(`[QR Bridge Proxy] Network error: ${err.message}`);
          return NextResponse.json(
            {
              error: 'Network error connecting to bridge',
              message: err.message,
              timestamp: new Date().toISOString()
            },
            { status: 502 }
          );
        }
      }
      throw err;
    }
    clearTimeout(timeout);

    // Check if this is media (binary) content
    const contentType = res.headers.get('content-type') || '';
    if (path.includes('/media') && !contentType.includes('application/json')) {
      // This is binary media - pass through directly
      console.log(`[QR Bridge Proxy] Proxying binary media (${contentType})`);
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': buffer.byteLength.toString()
        }
      });
    }

    // Check if response is successful before parsing
    if (!res.ok) {
      let errorText = '';
      try {
        errorText = await res.text();
      } catch (e) {
        errorText = `Status ${res.status}`;
      }
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      
      // Try to extract bridge's specific error message from JSON
      let bridgeSpecificMessage = null;
      try {
        const errorJson = JSON.parse(errorText);
        bridgeSpecificMessage = errorJson.message || errorJson.error;
      } catch (e) {
        // Not JSON, use generic message
      }
      
      // Handle specific error codes with helpful messages
      let errorMessage = 'Bridge error';
      if (res.status === 404) {
        errorMessage = `Endpoint not found: ${path}`;
      } else if (res.status === 503 || res.status === 502) {
        errorMessage = 'Bridge service temporarily unavailable';
      } else if (res.status === 401 || res.status === 403) {
        errorMessage = 'Bridge authentication failed';
      } else if (res.status === 400) {
        // Use bridge's specific message if available (e.g., "QR not available")
        errorMessage = bridgeSpecificMessage || 'Invalid request format';
      }
      
      // For group chats that fail, return empty messages instead of error
      if (path.includes('/messages') && path.includes('@lid')) {
        console.warn(`[QR Bridge Proxy] Group chat message fetch failed (${res.status}), returning empty array`);
        return NextResponse.json(
          { messages: [], note: 'Group chat messages unavailable' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: res.status,
          details: errorText.substring(0, 100),
          timestamp: new Date().toISOString()
        },
        { status: res.status }
      );
    }

    // Try to parse as JSON, fallback if not valid JSON
    let data: any;
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.warn('[QR Bridge Proxy] Response is not JSON, returning as text');
      try {
        const text = await res.text();
        return NextResponse.json(
          { success: true, data: text, note: 'Response was not JSON' },
          { status: res.status }
        );
      } catch (textErr) {
        return NextResponse.json(
          { success: true, data: 'Unable to read response', note: 'Response body unavailable' },
          { status: res.status }
        );
      }
    }

    // ── SESSION PHONE TRACKING (GET) ──
    if (path === '/status' && data?.connected) {
      const bridgePhone = extractBridgePhone(data);
      if (resolved.hasOwnBridge && bridgePhone) {
        const livePhoneValidation = await validateOwnBridgeLivePhone(resolved, bridgePhone);
        if (!livePhoneValidation.allowed) {
          const contaminatedStatus = {
            ...data,
            connected: false,
            phone: undefined,
            me: undefined,
            phoneNumber: '',
            sessionContaminated: true,
            sessionMessage: 'Another user\'s WhatsApp session was detected here. Please reconnect and scan your own account.',
          };
          return NextResponse.json({ success: true, data: contaminatedStatus }, { status: 200 });
        }
      }
      if (bridgePhone && bridgePhone !== resolved.storedPhone) {
        // Phone CHANGED → save with timestamp so /chats can detect stale data
        await saveConnectedPhone(userId, bridgePhone, true);
        console.log(`[QR Bridge Proxy GET /status] Phone changed: ${resolved.storedPhone} → ${bridgePhone}`);
      } else if (bridgePhone && !resolved.storedPhone) {
        await saveConnectedPhone(userId, bridgePhone, false);
      }
      if (!bridgePhone && resolved.storedPhone) {
        data.phone = {
          ...(data.phone || {}),
          id: resolved.storedPhone,
          name: data?.phone?.name || resolved.storedPhone,
        };
      }
      data = ensureStatusPhoneShape(data, bridgePhone || resolved.storedPhone);
    }

    // ── SESSION ISOLATION (GET /chats) ──
    // Keep only chats newer than the current scan timestamp so previous-number chats stay hidden.
    if (path === '/chats') {
      const rawBridgeData = data; // preserve unfiltered bridge data for MongoDB sync
      const sessionFiltered = applySessionChangeFilter(data, resolved.phoneChangedAt);
      if (sessionFiltered.filtered) {
        console.log(`[QR Bridge Proxy GET /chats] Session filter for ${userId}: ${sessionFiltered.total} total → ${sessionFiltered.visible} current-session chats`);
        data = sessionFiltered.data;
        // Clear the phone changed flag after the first filter pass so subsequent calls show all chats
        await clearPhoneChangedFlag(userId);
      }

      if (resolved.hasOwnBridge && !resolved.storedPhone) {
        const bridgeChats = getChatArray(data).filter(hasVisibleChatActivity);
        if (bridgeChats.length > 0) {
          console.warn(`[QR Bridge Proxy GET /chats] Blocking ${bridgeChats.length} chats for ${userId} because the own-bridge session has no verified phone yet.`);
        }
        data = getUnverifiedOwnBridgeResponse(data);
      } else if (resolved.hasOwnBridge && resolved.storedPhone) {
        // Sync the FULL unfiltered bridge chat list to MongoDB so we don't delete real chats
        const allBridgeChats = getChatArray(rawBridgeData).filter(hasVisibleChatActivity);
        const filteredBridgeChats = getChatArray(data).filter(hasVisibleChatActivity);
        if (allBridgeChats.length > 0) {
          await syncMongoSessionChats(userId, resolved.storedPhone, allBridgeChats);
        }
        if (filteredBridgeChats.length > 0) {
          data = data?.chats
            ? { ...data, chats: filteredBridgeChats, source: data?.source || 'bridge_current_session' }
            : { chats: filteredBridgeChats, source: 'bridge_current_session' };
        } else {
          const mongoChats = await getMongoSessionChats(userId, resolved.storedPhone);
          if (mongoChats.length > 0) {
            console.log(`[QR Bridge Proxy GET /chats] Falling back to Mongo session chats for ${userId}: ${mongoChats.length} chats (connectedPhone=${resolved.storedPhone})`);
            data = data?.chats ? { ...data, chats: mongoChats, source: 'qr_mongodb_fallback' } : { chats: mongoChats, source: 'qr_mongodb_fallback' };
          }
        }
      }
    }

    // ── CHAT PRIVACY FILTER (GET /chats) ──
    // Applied to shared/team bridge users. Uses dual phone lookup.
    if (path === '/chats' && requiresLeadOwnershipFilter) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          const Lead = getLead();
          const rawPhones = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter((p: string) => p && !p.includes('-'));

          const allPhonesToQuery = new Set<string>();
          for (const phone of rawPhones) {
            allPhonesToQuery.add(phone);
            if (phone.startsWith('91') && phone.length === 12) {
              allPhonesToQuery.add(phone.substring(2));
            } else if (phone.length === 10) {
              allPhonesToQuery.add('91' + phone);
            }
          }

          const leads = await Lead.find(
            { phoneNumber: { $in: Array.from(allPhonesToQuery) } },
            { phoneNumber: 1, assignedToUserId: 1, createdByUserId: 1 }
          ).lean();

          const leadMap = new Map<string, { assignedToUserId?: string; createdByUserId?: string }>();
          for (const l of leads) {
            const lp = (l as any).phoneNumber;
            leadMap.set(lp, { assignedToUserId: (l as any).assignedToUserId, createdByUserId: (l as any).createdByUserId });
            if (lp.startsWith('91') && lp.length === 12) {
              leadMap.set(lp.substring(2), { assignedToUserId: (l as any).assignedToUserId, createdByUserId: (l as any).createdByUserId });
            } else if (lp.length === 10) {
              leadMap.set('91' + lp, { assignedToUserId: (l as any).assignedToUserId, createdByUserId: (l as any).createdByUserId });
            }
          }

          const filteredChats = chats.filter((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            const phone = idStr.split('@')[0];
            if (phone.includes('-')) return false;
            const leadInfo = leadMap.get(phone);
            if (!leadInfo) return false;
            return leadInfo.assignedToUserId === userId || leadInfo.createdByUserId === userId;
          });

          console.log(`[QR Bridge Proxy GET] Chat filter for ${userId}: ${chats.length} total → ${filteredChats.length} visible`);
          const filteredData = data?.chats ? { ...data, chats: filteredChats } : filteredChats;
          return NextResponse.json({ success: true, data: filteredData }, { status: res.status });
        } catch (filterErr) {
          console.error('[QR Bridge Proxy GET] Chat filter error:', filterErr);
          const emptyData = data?.chats ? { ...data, chats: [] } : [];
          return NextResponse.json({ success: true, data: emptyData }, { status: res.status });
        }
      }
    }

    // ── MONGODB FALLBACK FOR /messages ──
    // When bridge returns empty messages (memory wiped on restart),
    // fall back to persistent MongoDB storage
    if (path.startsWith('/messages/') && data?.messages?.length === 0) {
      try {
        const chatJidRaw = decodeURIComponent(path.replace('/messages/', ''));
        // Normalize JID format: @c.us → @s.whatsapp.net for consistent lookups
        const chatJid = normalizeJidFormat(chatJidRaw);
        const connectedPhone = resolved.storedPhone || '';
        if (connectedPhone && chatJid) {
          const QrMsg = getQrWhatsAppMessage();

          // Build query filter: filter out old messages from before phone was changed
          const queryFilter: any = {
            userId,
            connectedPhone,
            chatJid,
          };

          // Apply session change filter: only show messages from current phone session
          // This prevents old chats from previous QR scans from appearing
          // NOTE: Messages are stored with timestamp in SECONDS (Unix epoch), not milliseconds
          if (resolved.phoneChangedAt) {
            const cutoffMs = new Date(resolved.phoneChangedAt).getTime();
            const cutoffSeconds = Math.floor(cutoffMs / 1000);
            queryFilter.timestamp = { $gte: cutoffSeconds };
          }

          const dbMessages = await QrMsg.find(queryFilter)
            .sort({ timestamp: 1 })
            .limit(200)
            .lean();
          
          const filterNote = resolved.phoneChangedAt ? ` (filtered after ${resolved.phoneChangedAt.toISOString()})` : '';
          console.log(`[QR Bridge Proxy] MongoDB fallback query: userId=${userId}, connectedPhone=${connectedPhone}, chatJid=${chatJid} (raw was ${chatJidRaw})${filterNote} → found ${dbMessages.length} messages`);

          if (dbMessages.length > 0) {
            console.log(`[QR Bridge Proxy] ✅ MongoDB fallback SUCCESS: ${dbMessages.length} messages for ${chatJid}`);
            const mapped = dbMessages.map((m: any) => ({
              id: m.messageId,
              from: m.participant || m.chatJid,
              fromMe: m.fromMe,
              text: m.text,
              body: m.text,
              type: m.type,
              timestamp: m.timestamp,
              status: m.status,
              participant: m.participant,
              pushName: m.pushName,
              hasMedia: m.hasMedia,
              mediaUrl: m.mediaUrl,
              mediaMimetype: m.mediaMimetype,
              mediaFileName: m.mediaFileName,
              quoted: m.quotedId ? { id: m.quotedId, text: m.quotedText, participant: m.quotedParticipant } : null,
              quotedId: m.quotedId || null,
              reactions: {},
            }));
            // Return in same format as bridge: { messages: [...], source: 'mongodb' }
            const responseData = Array.isArray(data) ? [{ messages: mapped, source: 'mongodb' }] : { messages: mapped, source: 'mongodb' };
            return NextResponse.json({ success: true, data: responseData }, { status: 200 });
          } else {
            console.warn(`[QR Bridge Proxy] ⚠️ MongoDB fallback: NO MESSAGES found (chatJid=${chatJid}, raw=${chatJidRaw})`);
          }
        }
      } catch (dbErr) {
        console.error('[QR Bridge Proxy] MongoDB fallback error:', dbErr);
      }
    }

    // Wrap in { success, data } so useCRM hook accepts the response
    return NextResponse.json({ success: true, data }, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    logApiError('qr-bridge/GET', err, { method: 'GET' }).catch(() => {});
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

