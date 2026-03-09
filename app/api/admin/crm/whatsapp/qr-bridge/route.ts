import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

/**
 * WhatsApp QR Bridge Proxy Endpoint
 * Proxies requests to the user's own WhatsApp bridge service (Baileys).
 * Each CRM user has their own bridge instance — URL stored in crm_user_settings.
 * 
 * Fallback: uses WHATSAPP_BRIDGE_HTTP_URL env var (for legacy / superadmin bridge).
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
 * Returns per-user bridge from crm_user_settings if configured.
 * 
 * PRIVACY COMPARTMENT:
 * - Super admins: Always have access (fall back to shared bridge).
 * - Non-super-admin users WITH their own bridge URL: Use their own bridge.
 * - Non-super-admin users WITH qrWhatsappEnabled=true (but no own bridge): Use shared bridge with user isolation.
 * - Non-super-admin users WITHOUT qrWhatsappEnabled and WITHOUT own bridge: BLOCKED (returns null).
 * 
 * This prevents non-super-admin users from seeing the super admin's WhatsApp chats.
 */
async function resolveUserBridge(authHeader: string | null): Promise<{ url: string; secret: string; userId: string; superAdmin: boolean } | null> {
  try {
    const decoded = verifyToken(authHeader || '');
    if (decoded?.userId && decoded?.isAdmin) {
      const superAdmin = isSuperAdmin(decoded);
      
      await connectDB();
      const CRMUserSettings = getCRMUserSettings();
      const settings = await CRMUserSettings.findOne(
        { userId: decoded.userId },
        { qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 }
      ).lean();

      if (settings?.qrBridgeUrl) {
        // Check if user's "own" bridge is actually the shared admin bridge
        const isSharedBridge = settings.qrBridgeUrl === FALLBACK_BRIDGE_URL
          || settings.qrBridgeUrl === process.env.WHATSAPP_BRIDGE_HTTP_URL
          || settings.qrBridgeUrl === process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL;
        
        if (isSharedBridge && !superAdmin) {
          // User was incorrectly given the admin's bridge URL — treat as shared bridge
          // Apply chat filtering (superAdmin=false ensures filtering happens)
          return {
            url: settings.qrBridgeUrl,
            secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
            userId: decoded.userId,
            superAdmin: false,
          };
        }
        
        // User has their own DISTINCT bridge configured — use it (fully isolated)
        return {
          url: settings.qrBridgeUrl,
          secret: settings.qrBridgeSecret || FALLBACK_BRIDGE_SECRET,
          userId: decoded.userId,
          superAdmin,
        };
      }

      // No per-user bridge configured — check access rights
      if (superAdmin) {
        // Super admin always has access to the shared bridge
        return { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET, userId: decoded.userId, superAdmin: true };
      }

      // Non-super-admin: only allow shared bridge if explicitly enabled by super admin
      if (settings?.qrWhatsappEnabled) {
        return { url: FALLBACK_BRIDGE_URL, secret: FALLBACK_BRIDGE_SECRET, userId: decoded.userId, superAdmin: false };
      }

      // BLOCKED: Non-super-admin user without own bridge and not enabled
      // This is the critical privacy fix — prevents seeing super admin's chats
      console.warn(`[QR Bridge Proxy] BLOCKED: User ${decoded.userId} has no bridge configured and qrWhatsappEnabled=false`);
      return null;
    }
  } catch (e) {
    console.warn('[QR Bridge Proxy] Failed to resolve user bridge:', (e as Error).message);
  }
  // Auth failed — no bridge access
  return null;
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
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId, superAdmin } = resolved;

    const { action, path, body } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Decode the path to handle double-encoded values like %2540 (@)
    const decodedPath = decodePathFully(path);

    // ── MULTI-TENANT: Block non-super-admin from accessing other users' chats ──
    // For paths like /messages/:jid or /send, verify the JID belongs to this user
    if (!superAdmin) {
      const jidMatch = decodedPath.match(/^\/(messages|send|profile-pic|contact)\/([\d]+@[a-z.]+)/i)
        || decodedPath.match(/^\/(messages|send|profile-pic|contact)\/(.+)/);
      if (jidMatch) {
        const jid = decodeURIComponent(jidMatch[2]);
        const allowed = await isJidAllowedForUser(jid, userId);
        if (!allowed) {
          console.warn(`[QR Bridge Proxy] BLOCKED: User ${userId} tried to access JID ${jid} (not their lead)`);
          return NextResponse.json(
            { error: 'Access denied: This contact is not in your CRM leads.' },
            { status: 403 }
          );
        }
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
    // ── CHAT COMPARTMENT: Filter /chats response for non-super-admin users ──
    if (decodedPath === '/chats' && !superAdmin && data?.chats) {
      data.chats = await filterChatsForUser(data.chats, userId);
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
    const { url: BRIDGE_URL, secret: BRIDGE_SECRET, userId, superAdmin } = resolved;

    let path = req.nextUrl.searchParams.get('path') || '/status';
    
    // Decode the path to handle double-encoded values like %2540 (@)
    path = decodePathFully(path);

    // ── MULTI-TENANT: Block non-super-admin from accessing other users' chats via GET ──
    if (!superAdmin) {
      const jidMatch = path.match(/^\/(messages|media|profile-pic|contact)\/([\d]+@[a-z.]+)/i)
        || path.match(/^\/(messages|media|profile-pic|contact)\/(.+)/);
      if (jidMatch) {
        const jid = decodeURIComponent(jidMatch[2]);
        const allowed = await isJidAllowedForUser(jid, userId);
        if (!allowed) {
          console.warn(`[QR Bridge Proxy] BLOCKED GET: User ${userId} tried to access JID ${jid}`);
          return NextResponse.json(
            { error: 'Access denied: This contact is not in your CRM leads.' },
            { status: 403 }
          );
        }
      }
    }

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

    // ── CHAT COMPARTMENT: Filter /chats response for non-super-admin users ──
    if (path === '/chats' && !superAdmin && data?.chats) {
      data.chats = await filterChatsForUser(data.chats, userId);
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

/**
 * Filter bridge chats for a non-super-admin user.
 * Only returns chats where:
 * - A CRM lead exists with that phone number AND is assigned to / created by this user
 * - Or the user has their own bridge (already isolated at session level)
 *
 * This prevents users on the shared bridge from seeing the super admin's private chat list.
 */
async function filterChatsForUser(chats: any[], userId: string): Promise<any[]> {
  try {
    await connectDB();
    const Lead = getLead();

    // Extract phone numbers from bridge chats
    const phoneNumbers = chats.map((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      return idStr.split('@')[0];
    }).filter(Boolean);

    if (phoneNumbers.length === 0) return [];

    // Find all leads for these phone numbers
    const leads = await Lead.find({
      phoneNumber: { $in: phoneNumbers }
    }).select('phoneNumber assignedToUserId createdByUserId').lean();

    const leadMap = new Map<string, { assignedToUserId?: string; createdByUserId?: string }>();
    for (const l of leads) {
      leadMap.set(l.phoneNumber, {
        assignedToUserId: l.assignedToUserId,
        createdByUserId: l.createdByUserId,
      });
    }

    // Filter: only chats matching this user's leads
    const filtered = chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const phone = idStr.split('@')[0];

      const leadInfo = leadMap.get(phone);
      if (!leadInfo) return false; // No CRM lead = not visible to this user

      return leadInfo.assignedToUserId === userId || leadInfo.createdByUserId === userId;
    });

    console.log(`[QR Bridge Proxy] Chat filter for ${userId}: ${chats.length} total → ${filtered.length} visible`);
    return filtered;
  } catch (e) {
    console.error('[QR Bridge Proxy] Chat filter error:', (e as Error).message);
    // On error, return empty to be safe (don't leak admin data)
    return [];
  }
}

/**
 * MULTI-TENANT: Verify that a non-super-admin user on the shared bridge
 * is allowed to access the specified JID (phone number).
 * Returns true if the user owns a CRM lead for that phone, false otherwise.
 */
async function isJidAllowedForUser(jid: string, userId: string): Promise<boolean> {
  try {
    // Extract phone from JID  (e.g. "919876543210@s.whatsapp.net" → "919876543210")
    const phone = jid.split('@')[0];
    if (!phone || !/^\d+$/.test(phone)) return false;

    await connectDB();
    const Lead = getLead();

    const lead = await Lead.findOne({
      phoneNumber: phone,
      $or: [{ assignedToUserId: userId }, { createdByUserId: userId }],
    }).select('_id').lean();

    return !!lead;
  } catch (e) {
    console.error('[QR Bridge Proxy] JID access check error:', (e as Error).message);
    return false; // Fail closed — deny access on error
  }
}

