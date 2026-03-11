import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';

/**
 * WhatsApp QR Bridge Proxy Endpoint
 * Proxies requests to the WhatsApp bridge service (Baileys).
 *
 * ── USER ROLES ──
 * Super Admin:          Owner of CRM (userId: 'admin' | 'admincrm'). Owns the shared bridge session.
 * Super Admin Team:     Team users under super admin. Have qrWhatsappEnabled=true. Use shared bridge.
 * CRM Admin (Tenant):   Independent users who signed up at crm.swaryoga.com. Have their own bridge.
 * CRM Admin Team:       Team users added by a CRM Admin. Use that admin's bridge.
 * Leads:                End-users / contacts. Not CRM users.
 *
 * ── ACCESS CONTROL ──
 * resolveUserBridge() is the SOLE gate:
 *   - Super Admin → shared bridge (full access, sees all chats)
 *   - Super Admin Team (qrWhatsappEnabled) → shared bridge (filtered: only assigned/created leads)
 *   - CRM Admin (own qrBridgeUrl) → personal bridge (full access to own bridge)
 *   - CRM Admin Team (qrWhatsappEnabled under tenant) → tenant's bridge (filtered)
 *   - No qrBridgeUrl AND no qrWhatsappEnabled → BLOCKED (returns null → 422)
 *
 * ── CHAT PRIVACY FILTER ──
 * For /chats endpoint: non-super-admin on shared bridge only sees chats
 * where the phone matches a Lead with assignedToUserId or createdByUserId = their userId.
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
 *   Super Admin        → shared bridge, isSuperAdmin=true
 *   Super Admin Team   → shared bridge (if qrWhatsappEnabled), isSuperAdmin=false
 *   CRM Admin (tenant) → own qrBridgeUrl, hasOwnBridge=true
 *   CRM Admin Team     → own bridge via tenant OR qrWhatsappEnabled
 *   Unauthorized       → returns null (blocked)
 */
// Super Admin user IDs — these users own the shared bridge session
const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);

async function resolveUserBridge(authHeader: string | null): Promise<{ url: string; secret: string; userId: string; isSuperAdmin: boolean; hasOwnBridge: boolean; storedPhone: string; senderDisplayName: string } | null> {
  try {
    const decoded = verifyToken(authHeader || '');
    if (decoded?.userId && decoded?.isAdmin) {
      const superAdmin = checkSuperAdmin(decoded);

      // Check if user has a custom bridge URL
      await connectDB();
      const CRMUserSettings = getCRMUserSettings();
      const settings = await CRMUserSettings.findOne(
        { userId: decoded.userId },
        { qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1, qrConnectedPhoneNumber: 1, senderDisplayName: 1 }
      ).lean();

      const storedPhone = (settings as any)?.qrConnectedPhoneNumber || '';
      const senderDisplayName = (settings as any)?.senderDisplayName || '';

      if (settings?.qrBridgeUrl) {
        return {
          url: settings.qrBridgeUrl,
          secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
          isSuperAdmin: superAdmin,
          hasOwnBridge: true,
          storedPhone,
          senderDisplayName,
        };
      }

      // ── SUPER ADMIN PROTECTION ──
      // Non-super-admin users without their own bridge MUST NOT access
      // the shared/default bridge (which is the super admin's WhatsApp session).
      // They need either: (a) their own qrBridgeUrl, or (b) explicit qrWhatsappEnabled.
      if (!superAdmin) {
        // Only allow if explicitly enabled by super admin
        if (!settings?.qrWhatsappEnabled) {
          console.warn(`[QR Bridge Proxy] BLOCKED: User ${decoded.userId} tried to access shared bridge without own bridge or explicit access`);
          return null;
        }
      }

      // Use shared bridge — only super admin or explicitly enabled users
      return { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET, userId: decoded.userId, isSuperAdmin: superAdmin, hasOwnBridge: false, storedPhone, senderDisplayName };
    }
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to resolve user bridge:', (e as Error).message);
  }
  return null;
}

/**
 * Save the currently connected WhatsApp phone number to CRM user settings.
 * Called when /status returns a connected session with a phone ID.
 */
async function saveConnectedPhone(userId: string, phoneId: string): Promise<void> {
  try {
    // Strip the @s.whatsapp.net suffix if present: "919876543210:xx@s.whatsapp.net" → "919876543210"
    const phone = phoneId.split(':')[0].split('@')[0].replace(/\D/g, '');
    if (!phone) return;
    const CRMUserSettings = getCRMUserSettings();
    await CRMUserSettings.updateOne(
      { userId },
      { $set: { qrConnectedPhoneNumber: phone } },
      { upsert: true }
    );
    console.log(`[QR Bridge Proxy] Saved connected phone ${phone} for user ${userId}`);
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to save connected phone:', (e as Error).message);
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolved = await resolveUserBridge(authHeader);
    if (!resolved) {
      return NextResponse.json(
        { error: 'No WhatsApp bridge configured. Please set up your bridge URL in QR WhatsApp settings.' },
        { status: 422 }
      );
    }
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.
    // Users reach here only if they are: (a) super admin, (b) have own bridge, or (c) have qrWhatsappEnabled.

    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle double-encoded values like %2540 (@)
    const decodedPath = decodePathFully(path);

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
        saveConnectedPhone(userId, bridgePhone).catch(() => {});
      }
    }

    // ── SESSION ISOLATION (POST /chats) ──
    // If user has a stored connected phone, verify bridge chats belong to the current session.
    // When a new WhatsApp number is scanned, old chats from the previous number must not show.
    if (decodedPath === '/chats' && resolved.hasOwnBridge && resolved.storedPhone) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          // Fetch current bridge status to get the connected phone
          const statusRes = await fetch(`${BRIDGE_URL}/status`, {
            headers: { 'x-bridge-secret': BRIDGE_SECRET, 'x-user-id': userId },
          });
          const statusJson = await statusRes.json();
          const currentPhone = extractBridgePhone(statusJson);

          if (currentPhone && currentPhone !== resolved.storedPhone) {
            console.log(`[QR Bridge Proxy POST] Session phone changed: stored=${resolved.storedPhone}, current=${currentPhone}. Updating and returning empty.`);
            saveConnectedPhone(userId, currentPhone).catch(() => {});
            const emptyData = data?.chats ? { ...data, chats: [] } : [];
            return NextResponse.json({ success: true, data: emptyData, sessionChanged: true, newPhone: currentPhone }, { status: 200 });
          }
        } catch (e) {
          console.warn('[QR Bridge Proxy POST] Session isolation check failed:', (e as Error).message);
        }
      }
    }

    // ── CHAT PRIVACY FILTER (POST handler) ──
    // Same filter as GET: non-super-admin on shared bridge only sees assigned/created chats
    if (decodedPath === '/chats' && !resolved.isSuperAdmin && !resolved.hasOwnBridge) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          const Lead = getLead();
          const phoneNumbers = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter(Boolean);

          const leads = await Lead.find(
            { phoneNumber: { $in: phoneNumbers } },
            { phoneNumber: 1, assignedToUserId: 1, createdByUserId: 1 }
          ).lean();

          const leadMap = new Map<string, { assignedToUserId?: string; createdByUserId?: string }>();
          for (const l of leads) {
            leadMap.set((l as any).phoneNumber, {
              assignedToUserId: (l as any).assignedToUserId,
              createdByUserId: (l as any).createdByUserId,
            });
          }

          const filteredChats = chats.filter((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            const phone = idStr.split('@')[0];
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
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const resolved = await resolveUserBridge(authHeader);
    if (!resolved) {
      return NextResponse.json(
        { error: 'No WhatsApp bridge configured. Please set up your bridge URL in QR WhatsApp settings.' },
        { status: 422 }
      );
    }
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId } = resolved;

    // Access control is handled by resolveUserBridge() — it returns null for unauthorized users.

    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle double-encoded values like %2540 (@)
    path = decodePathFully(path);

    const bridgeUrl = `${BRIDGE_URL}${path}`;

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

    console.log(`[QR Bridge Proxy] GET ${bridgeUrl} user=${userId} (timeout: ${timeoutMs}ms)`);

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

    // ── SESSION PHONE TRACKING ──
    // When /status returns a connected session, save the phone number to DB.
    // This enables session isolation: old chats from a previous phone won't show.
    if (path === '/status' && data?.connected) {
      const bridgePhone = extractBridgePhone(data);
      if (bridgePhone && bridgePhone !== resolved.storedPhone) {
        // Phone changed — save the new one (fire-and-forget)
        saveConnectedPhone(userId, bridgePhone).catch(() => {});
      }
    }

    // ── SESSION ISOLATION (GET /chats) ──
    // If user has their own bridge with a stored phone number, verify the current session
    // matches. Prevents old chats from a previously connected WhatsApp number from appearing
    // when a new number is scanned.
    if (path === '/chats' && resolved.hasOwnBridge && resolved.storedPhone) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          const statusRes = await fetch(`${BRIDGE_URL}/status`, {
            headers: { 'x-bridge-secret': BRIDGE_SECRET, 'x-user-id': userId },
          });
          const statusJson = await statusRes.json();
          const currentPhone = extractBridgePhone(statusJson);

          if (currentPhone && currentPhone !== resolved.storedPhone) {
            console.log(`[QR Bridge Proxy] Session phone changed: stored=${resolved.storedPhone}, current=${currentPhone}. Updating and returning empty.`);
            saveConnectedPhone(userId, currentPhone).catch(() => {});
            const emptyData = data?.chats ? { ...data, chats: [] } : [];
            return NextResponse.json({ success: true, data: emptyData, sessionChanged: true, newPhone: currentPhone }, { status: 200 });
          }
        } catch (e) {
          console.warn('[QR Bridge Proxy] Session isolation check failed:', (e as Error).message);
        }
      }
    }

    // ── CHAT PRIVACY FILTER ──
    // For /chats endpoint: non-super-admin users on shared bridge
    // must only see chats for leads assigned to or created by them.
    if (path === '/chats' && !resolved.isSuperAdmin && !resolved.hasOwnBridge) {
      const chats = data?.chats || (Array.isArray(data) ? data : []);
      if (chats.length > 0) {
        try {
          const Lead = getLead();
          const phoneNumbers = chats.map((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            return idStr.split('@')[0];
          }).filter(Boolean);

          const leads = await Lead.find(
            { phoneNumber: { $in: phoneNumbers } },
            { phoneNumber: 1, assignedToUserId: 1, createdByUserId: 1 }
          ).lean();

          const leadMap = new Map<string, { assignedToUserId?: string; createdByUserId?: string }>();
          for (const l of leads) {
            leadMap.set((l as any).phoneNumber, {
              assignedToUserId: (l as any).assignedToUserId,
              createdByUserId: (l as any).createdByUserId,
            });
          }

          const filteredChats = chats.filter((c: any) => {
            const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
            const phone = idStr.split('@')[0];
            const leadInfo = leadMap.get(phone);
            if (!leadInfo) return false;
            return leadInfo.assignedToUserId === userId || leadInfo.createdByUserId === userId;
          });

          console.log(`[QR Bridge Proxy] Chat filter for ${userId}: ${chats.length} total → ${filteredChats.length} visible`);

          const filteredData = data?.chats ? { ...data, chats: filteredChats } : filteredChats;
          return NextResponse.json({ success: true, data: filteredData }, { status: res.status });
        } catch (filterErr) {
          console.error('[QR Bridge Proxy] Chat filter error:', filterErr);
          // On filter error, return empty for safety (don't leak super admin chats)
          const emptyData = data?.chats ? { ...data, chats: [] } : [];
          return NextResponse.json({ success: true, data: emptyData }, { status: res.status });
        }
      }
    }

    // Wrap in { success, data } so useCRM hook accepts the response
    return NextResponse.json({ success: true, data }, { status: res.status });
  } catch (err) {
    console.error('[QR Bridge Proxy] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Bridge proxy error' },
      { status: 500 }
    );
  }
}

