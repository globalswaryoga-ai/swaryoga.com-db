import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { logApiError } from '@/lib/error-logger';
import mongoose from 'mongoose';

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
 * ── BRIDGE URL ARCHITECTURE (Permanent Tenant ID) ──
 * ALL users:            {BRIDGE_BASE_URL}/tenant/{permanentTenantId}
 *                       Each user has a unique 7-digit permanentTenantId (e.g. 0002456)
 *                       Each user has a unique qrBridgeSecret for authentication
 *                       This allows 1000+ simultaneous WhatsApp sessions on one bridge instance
 *
 * ── ACCESS CONTROL ──
 * resolveUserBridge() is the SOLE gate:
 *   - Any user with permanentTenantId → /tenant/{id} bridge (own isolated session)
 *   - Legacy qrBridgeUrl (backward compat) → custom bridge URL
 *   - Super Admin Team (qrWhatsappEnabled, no permanentTenantId) → shared bridge (filtered)
 *   - No permanentTenantId AND no qrWhatsappEnabled → BLOCKED (returns {ok:false} → 422)
 *
 * ── CHAT PRIVACY FILTER ──
 * For /chats endpoint on shared bridge (hasOwnBridge=false): user only sees chats
 * where the phone matches a Lead with assignedToUserId or createdByUserId = their userId.
 * Users with hasOwnBridge=true (permanentTenantId or own qrBridgeUrl) are NOT filtered.
 * On filter error → returns empty (fail-safe, never leaks chats).
 */

// Fallback: env var or local dev
const DEFAULT_BRIDGE_URL = 'http://localhost:3333';

const FALLBACK_BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  DEFAULT_BRIDGE_URL;

const FALLBACK_BRIDGE_SECRET =
  process.env.WHATSAPP_BRIDGE_SECRET ||
  process.env.WHATSAPP_WEB_BRIDGE_SECRET ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET ||
  'swar-bridge-secret-2024';

// Mark as dynamic (uses request.nextUrl for query parameters)
export const dynamic = 'force-dynamic';
// Allow large media payloads (base64 encoded images/videos up to 50MB)
export const maxDuration = 60; // 60s function timeout for Vercel

/**
 * Resolve the bridge URL and secret for the authenticated user.
 *
 * Access matrix:
 *   Any user with permanentTenantId → /tenant/{id} bridge (own session, hasOwnBridge=true)
 *   Legacy qrBridgeUrl             → custom bridge URL (hasOwnBridge=true)
 *   Super Admin Team (qrWhatsappEnabled) → shared bridge (hasOwnBridge=false, chat filter applied)
 *   No access                      → returns null (blocked)
 */
// Super Admin user IDs — these users own the shared bridge session
const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);

// ── In-memory cache for resolveUserBridge (avoids MongoDB hit on every poll) ──
const bridgeCache = new Map<string, { result: BridgeResolution; expiry: number }>();
const BRIDGE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/** Evict stale entries periodically (prevent memory leak on long-running server) */
function evictStaleBridgeCache() {
  const now = Date.now();
  for (const [key, entry] of bridgeCache) {
    if (entry.expiry <= now) bridgeCache.delete(key);
  }
}

type BridgeResolution = 
  | { ok: true; url: string; secret: string; userId: string; isSuperAdmin: boolean; hasOwnBridge: boolean; storedPhone: string; phoneChangedAt: Date | null; senderDisplayName: string; tenantId?: string }
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
      // Normalize stored phone the same way extractBridgePhone does (digits only)
      const storedPhone = String(rawStoredPhone).split(':')[0].split('@')[0].replace(/\D/g, '');
      const phoneChangedAt = (settings as any)?.qrPhoneChangedAt || null;
      const senderDisplayName = (settings as any)?.senderDisplayName || '';
      const permanentTenantId = (settings as any)?.permanentTenantId || '';

      // ── PERMANENT TENANT ID ──
      // Each user gets a permanent 7-digit ID (e.g. 0002456).
      // Bridge does NOT yet support /tenant/{id} routing — ALL users share FALLBACK_BRIDGE_URL.
      // Therefore: only Super Admin + explicitly enabled team users may access the shared bridge.
      // Tenants without qrWhatsappEnabled are BLOCKED — they'd see Super Admin's WhatsApp session.
      // hasOwnBridge=false forces the chat privacy filter for ALL users on the shared bridge.
      if (permanentTenantId) {
        // Non-super-admin users MUST have qrWhatsappEnabled to access the shared bridge.
        // Without it, they'd see all of Super Admin's chats (data leak).
        if (!superAdmin && !settings?.qrWhatsappEnabled) {
          console.warn(`[QR Bridge Proxy] BLOCKED: User ${decoded.userId} has permanentTenantId=${permanentTenantId} but qrWhatsappEnabled=false — cannot access shared bridge`);
          const blocked: BridgeResolution = { ok: false, reason: 'no_bridge' };
          bridgeCache.set(cacheKey, { result: blocked, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
          return blocked;
        }
        const tenantResult: BridgeResolution = {
          ok: true,
          url: FALLBACK_BRIDGE_URL,
          secret: FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
          isSuperAdmin: superAdmin,
          hasOwnBridge: false,
          storedPhone,
          phoneChangedAt,
          senderDisplayName,
          tenantId: permanentTenantId,
        };
        bridgeCache.set(cacheKey, { result: tenantResult, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
        if (bridgeCache.size > 50) evictStaleBridgeCache();
        return tenantResult;
      }

      // ── LEGACY: Custom qrBridgeUrl (backward compatibility) ──
      if (settings?.qrBridgeUrl) {
        const legacyResult: BridgeResolution = {
          ok: true,
          url: settings.qrBridgeUrl,
          secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
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

      // ── SUPER ADMIN PROTECTION ──
      // Non-super-admin users without their own bridge MUST NOT access
      // the shared/default bridge (which is the super admin's WhatsApp session).
      // They need either: (a) their own qrBridgeUrl, or (b) explicit qrWhatsappEnabled
      // AND they must NOT be a tenant owner (tenant owners must use their own bridge).
      if (!superAdmin) {
        if (!settings?.qrWhatsappEnabled) {
          console.warn(`[QR Bridge Proxy] BLOCKED: User ${decoded.userId} — no bridge URL configured and not enabled for shared bridge`);
          const noBridge: BridgeResolution = { ok: false, reason: 'no_bridge' };
          bridgeCache.set(cacheKey, { result: noBridge, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
          return noBridge;
        }

        // Even with qrWhatsappEnabled, tenant owners MUST NOT use the shared bridge.
        // Only Super Admin Team members (non-tenant users explicitly enabled) may access it.
        try {
          const db = mongoose.connection.db;
          if (db) {
            const tenantDoc = await db.collection('tenants').findOne({
              $or: [
                { ownerUserId: decoded.userId },
                { adminUserId: decoded.userId },
                { ownerEmail: decoded.email || decoded.userId },
              ],
            }, { projection: { _id: 1 } });
            if (tenantDoc) {
              console.warn(`[QR Bridge Proxy] BLOCKED: Tenant owner ${decoded.userId} — cannot use shared bridge, must configure own bridge`);
              const tenantBlocked: BridgeResolution = { ok: false, reason: 'no_bridge' };
              bridgeCache.set(cacheKey, { result: tenantBlocked, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
              return tenantBlocked;
            }
          }
        } catch (tenantCheckErr) {
          // Fail-safe: if tenant check fails, still block (don't leak shared bridge)
          console.error('[QR Bridge Proxy] Tenant check error (blocking as precaution):', tenantCheckErr);
          return { ok: false, reason: 'no_bridge' };
        }
      }

      // Use shared bridge — only super admin or explicitly enabled users
      const sharedResult: BridgeResolution = { ok: true, url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET, userId: decoded.userId, isSuperAdmin: superAdmin, hasOwnBridge: false, storedPhone, phoneChangedAt, senderDisplayName };
      bridgeCache.set(cacheKey, { result: sharedResult, expiry: Date.now() + BRIDGE_CACHE_TTL_MS });
      if (bridgeCache.size > 50) evictStaleBridgeCache();
      return sharedResult;
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
    const update: any = { qrConnectedPhoneNumber: phone };
    if (isChange) {
      update.qrPhoneChangedAt = new Date();
    }
    await CRMUserSettings.updateOne(
      { userId },
      { $set: update },
      { upsert: true }
    );
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
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to clear phoneChangedAt:', (e as Error).message);
  }
}

/**
 * Extract the connected phone number from bridge /status response.
 * Returns digits-only phone number or empty string.
 */
function extractBridgePhone(statusData: any): string {
  const raw = statusData?.phone?.id || statusData?.me?.id || statusData?.phoneNumber || '';
  return String(raw).split(':')[0].split('@')[0].replace(/\D/g, '');
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
 * Check if a user owns a lead (assigned to or created by them).
 * Handles dual phone format (with/without 91 prefix).
 * Returns true if user is allowed, false if blocked.
 * 
 * For group chats (phone contains '-'), always returns true (groups are shared).
 * For non-existent leads, returns false (fail-safe — block unknown contacts).
 */
async function isLeadOwnedByUser(phone: string, userId: string): Promise<boolean> {
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
    
    if (!lead) return false; // No lead record → block (fail-safe)
    return lead.assignedToUserId === userId || lead.createdByUserId === userId;
  } catch (err) {
    console.error(`[QR Bridge] Lead check error for ${phone}:`, err);
    return false; // Fail-safe: block on error
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
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.
    // Users reach here only if they are: (a) super admin, (b) have own bridge, or (c) have qrWhatsappEnabled.

    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle double-encoded values like %2540 (@)
    const decodedPath = decodePathFully(path);

    // ════════════════════════════════════════════════════════════
    // ── COMPREHENSIVE PER-CHAT SECURITY GATE (POST) ──
    // Runs BEFORE the request reaches the bridge.
    // On shared bridge (!hasOwnBridge): every action that targets
    // a specific phone/chat must pass lead-ownership validation.
    // ════════════════════════════════════════════════════════════
    if (!resolved.hasOwnBridge) {
      // 1. Super Admin-only endpoints (session management)
      const basePath = '/' + decodedPath.split('/').filter(Boolean)[0];
      if (SUPER_ADMIN_ONLY_PATHS.has(basePath) && !resolved.isSuperAdmin) {
        console.warn(`[QR Bridge Proxy] BLOCKED: ${userId} tried ${decodedPath} (Super Admin only)`);
        return NextResponse.json(
          { success: false, error: 'This action is restricted to Super Admin.' },
          { status: 403 }
        );
      }

      // 2. Body-target endpoints (/send, /reply, /react, etc.) — check body.to or body.jid
      if (BODY_TARGET_PATHS.has(basePath) && body) {
        const targetJid = body.to || body.jid || body.chatId || '';
        const targetPhone = extractPhoneFromJid(typeof targetJid === 'string' ? targetJid : '');
        if (targetPhone && targetPhone.length >= 10) {
          const allowed = await isLeadOwnedByUser(targetPhone, userId);
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
          const allowed = await isLeadOwnedByUser(targetPhone, userId);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy] BLOCKED: ${userId} tried ${decodedPath} (not their lead)`);
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

    // ── SENDER DISPLAY NAME SIGNATURE ──
    // Append the user's configured display name (e.g. "Swar Yoga") as a bold
    // signature at the bottom of every sent text/media message so the recipient
    // can see who sent it — just like Meta WhatsApp's sender name feature.
    if ((decodedPath === '/send' || decodedPath.startsWith('/send') || decodedPath === '/reply' || decodedPath.startsWith('/reply')) && body && resolved.senderDisplayName) {
      const sig = `\n\n*${resolved.senderDisplayName}*`;
      if (body.message && typeof body.message === 'string') {
        body.message = body.message + sig;
      }
      if (body.caption && typeof body.caption === 'string') {
        body.caption = body.caption + sig;
      }
      // For text messages without body.message but with body.text
      if (body.text && typeof body.text === 'string') {
        body.text = body.text + sig;
      }
    }

    const method = (action || 'GET').toUpperCase();
    const bridgeUrl = `${BRIDGE_URL}${decodedPath}`;

    // Diagnostic logs
    console.log(`[QR Bridge Proxy] ════════════════════════════════════════`);
    console.log(`[QR Bridge Proxy] userId=${userId}`);
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
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${decodedPath}`);
        return NextResponse.json(
          { error: `Bridge timeout (${timeoutMs}ms)`, path: decodedPath },
          { status: 504 }
        );
      }
      throw err;
    }
    clearTimeout(timeout);
    
    // Check if response is successful before parsing as JSON
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[QR Bridge Proxy] Bridge error (${res.status}):`, errorText.substring(0, 200));
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
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
      if (bridgePhone && bridgePhone !== resolved.storedPhone) {
        // Phone CHANGED → save with timestamp so /chats can detect stale data
        saveConnectedPhone(userId, bridgePhone, true).catch(() => {});
        console.log(`[QR Bridge Proxy POST /status] Phone changed: ${resolved.storedPhone} → ${bridgePhone}`);
      } else if (bridgePhone && !resolved.storedPhone) {
        // First-time save (no previous phone)
        saveConnectedPhone(userId, bridgePhone, false).catch(() => {});
      }
    }

    // ── SESSION ISOLATION (POST /chats) ──
    // Uses qrPhoneChangedAt timestamp to detect recent phone changes.
    // The old approach (comparing stored vs current phone) had a race condition:
    // /status polling would update the stored phone BEFORE /chats ran, so they always matched.
    // Now we check the timestamp: if phoneChangedAt is recent (<2h), the bridge may still
    // be serving cached chats from the old session → return empty.
    if (decodedPath === '/chats') {
      if (resolved.phoneChangedAt) {
        const ageMs = Date.now() - new Date(resolved.phoneChangedAt).getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        if (ageMs < TWO_HOURS) {
          console.log(`[QR Bridge Proxy POST /chats] Phone changed ${Math.round(ageMs / 1000)}s ago. Returning empty to prevent stale chats.`);
          // Clear the flag so the NEXT request (after a page reload) will show chats
          clearPhoneChangedFlag(userId).catch(() => {});
          const emptyData = data?.chats ? { ...data, chats: [], sessionChanged: true, sessionMessage: 'Phone number changed. Please reload to see your chats.' } : { chats: [], sessionChanged: true };
          return NextResponse.json({ success: true, data: emptyData }, { status: 200 });
        }
      }
    }

    // ── CHAT PRIVACY FILTER (POST handler) ──
    // Applied to ALL users on shared bridge. Each user only sees chats for leads
    // assigned to or created by them. Uses dual phone lookup (with/without 91 prefix)
    // to handle inconsistent lead phone formats in the database.
    if (decodedPath === '/chats' && !resolved.hasOwnBridge) {
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
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.

    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle double-encoded values like %2540 (@)
    path = decodePathFully(path);

    // ════════════════════════════════════════════════════════════
    // ── COMPREHENSIVE PER-CHAT SECURITY GATE (GET) ──
    // Same logic as POST gate — validates lead ownership before
    // allowing any endpoint that targets a specific phone/chat.
    // ════════════════════════════════════════════════════════════
    if (!resolved.hasOwnBridge) {
      const basePath = '/' + path.split('/').filter(Boolean)[0];

      // Super Admin-only endpoints
      if (SUPER_ADMIN_ONLY_PATHS.has(basePath) && !resolved.isSuperAdmin) {
        console.warn(`[QR Bridge Proxy GET] BLOCKED: ${userId} tried ${path} (Super Admin only)`);
        return NextResponse.json(
          { success: false, error: 'This action is restricted to Super Admin.' },
          { status: 403 }
        );
      }

      // Path-target endpoints (/messages/{jid}, /contact-about/{jid}, /profile-pic/{jid}, etc.)
      if (isPathTargetEndpoint(path)) {
        const targetPhone = extractPhoneFromPath(path);
        if (targetPhone && targetPhone.length >= 10 && !targetPhone.includes('-')) {
          const allowed = await isLeadOwnedByUser(targetPhone, userId);
          if (!allowed) {
            console.warn(`[QR Bridge Proxy GET] BLOCKED: ${userId} tried ${path} (not their lead)`);
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

    const bridgeUrl = `${BRIDGE_URL}${path}`;

    // Diagnostic logs
    console.log(`[QR Bridge Proxy GET] ════════════════════════════════════════`);
    console.log(`[QR Bridge Proxy GET] userId=${userId}`);
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
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'SwarYoga-Bridge-Proxy/1.0'
        },
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(`[QR Bridge Proxy] Bridge timeout (${timeoutMs}ms) for ${path}`);
        return NextResponse.json(
          { error: `Bridge timeout (${timeoutMs}ms)`, path },
          { status: 504 }
        );
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
      
      // For group chats that fail, return empty messages instead of error
      if (path.includes('/messages') && path.includes('@lid')) {
        console.warn(`[QR Bridge Proxy] Group chat message fetch failed, returning empty array`);
        return NextResponse.json(
          { messages: [], note: 'Group chat messages unavailable' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: `Bridge error: ${res.status}`, details: errorText.substring(0, 100) },
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
      if (bridgePhone && bridgePhone !== resolved.storedPhone) {
        // Phone CHANGED → save with timestamp so /chats can detect stale data
        saveConnectedPhone(userId, bridgePhone, true).catch(() => {});
        console.log(`[QR Bridge Proxy GET /status] Phone changed: ${resolved.storedPhone} → ${bridgePhone}`);
      } else if (bridgePhone && !resolved.storedPhone) {
        saveConnectedPhone(userId, bridgePhone, false).catch(() => {});
      }
    }

    // ── SESSION ISOLATION (GET /chats) ──
    // Uses qrPhoneChangedAt timestamp — immune to the /status race condition.
    if (path === '/chats') {
      if (resolved.phoneChangedAt) {
        const ageMs = Date.now() - new Date(resolved.phoneChangedAt).getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        if (ageMs < TWO_HOURS) {
          console.log(`[QR Bridge Proxy GET /chats] Phone changed ${Math.round(ageMs / 1000)}s ago. Returning empty to prevent stale chats.`);
          clearPhoneChangedFlag(userId).catch(() => {});
          const emptyData = data?.chats ? { ...data, chats: [], sessionChanged: true, sessionMessage: 'Phone number changed. Please reload to see your chats.' } : { chats: [], sessionChanged: true };
          return NextResponse.json({ success: true, data: emptyData }, { status: 200 });
        }
      }
    }

    // ── CHAT PRIVACY FILTER (GET /chats) ──
    // Applied to ALL users on shared bridge. Uses dual phone lookup.
    if (path === '/chats' && !resolved.hasOwnBridge) {
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
        const chatJid = decodeURIComponent(path.replace('/messages/', ''));
        const connectedPhone = resolved.storedPhone || '';
        if (connectedPhone && chatJid) {
          const QrMsg = getQrWhatsAppMessage();
          const dbMessages = await QrMsg.find({
            userId,
            connectedPhone,
            chatJid,
          })
            .sort({ timestamp: 1 })
            .limit(200)
            .lean();

          if (dbMessages.length > 0) {
            console.log(`[QR Bridge Proxy] MongoDB fallback: ${dbMessages.length} messages for ${chatJid}`);
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
            return NextResponse.json({ success: true, data: { messages: mapped, source: 'mongodb' } }, { status: 200 });
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

