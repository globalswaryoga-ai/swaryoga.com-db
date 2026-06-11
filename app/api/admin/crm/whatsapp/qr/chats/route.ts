import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getCRMUserSettings, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const decoded: any = verifyToken(token);
    
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = isSuperAdmin(decoded);

    await connectDB();

    // ── CANONICAL SESSION RESOLUTION ──
    // Every QR user (super admin included) is isolated by a single stable session
    // key = their permanentTenantId (same logic as the send & qr-bridge routes).
    // We must NOT scan live bridge sessions and fall back to "any connected
    // session" — that leaked one account's chats/groups into another's inbox.
    const CRMUserSettings = getCRMUserSettings();
    const userSettings = await CRMUserSettings.findOne(
      { userId: viewerUserId },
      { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1, qrConnectedPhoneNumber: 1 }
    ).lean() as any;

    let bridgeUrl = BRIDGE_URL;
    let bridgeSecret = BRIDGE_SECRET;
    let sessionKey: string | null = userSettings?.permanentTenantId || null;

    // Legacy: user with their own custom bridge URL keys by userId.
    if (!sessionKey && userSettings?.qrBridgeUrl) {
      bridgeUrl = userSettings.qrBridgeUrl;
      bridgeSecret = userSettings.qrBridgeSecret || BRIDGE_SECRET;
      sessionKey = viewerUserId;
    }

    // ── ACCESS GATE ──
    // An isolated session (permanentTenantId or custom bridge) is required.
    // Without it we cannot scope the bridge or DB safely, so deny rather than
    // fall through to an unscoped query that would expose another account's data.
    if (!sessionKey) {
      if (!superAdmin && !userSettings?.qrWhatsappEnabled) {
        return NextResponse.json({
          success: false,
          error: 'QR WhatsApp access not configured. Contact your super admin or set up your own bridge.'
        }, { status: 403 });
      }
      console.warn(`[QR Chats API] No session key for user ${viewerUserId} (superAdmin: ${superAdmin}) — serving empty`);
      return NextResponse.json({ success: true, chats: [] });
    }

    const sessionHeaders: Record<string, string> = {
      'x-bridge-secret': bridgeSecret,
      'x-user-id': viewerUserId,
      'x-session-key': sessionKey,
    };

    // Authoritative "currently connected phone" for this session — used to scope
    // the DB chat merge so OLD sessions/phones under the same userId never leak.
    // Prefer the live bridge session phone; fall back to the stored phone.
    let connectedPhone: string = String(userSettings?.qrConnectedPhoneNumber || '').replace(/\D/g, '');
    try {
      const sessionsRes = await fetch(`${bridgeUrl}/sessions`, {
        method: 'GET',
        headers: { 'x-bridge-secret': bridgeSecret },
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        const sessions: any[] = sessionsData?.sessions || [];
        const liveSession = sessions.find(s => s.sessionKey === sessionKey && s.status === 'connected');
        const livePhone = String(liveSession?.phone?.id || '').split(':')[0].replace(/\D/g, '');
        if (livePhone) connectedPhone = livePhone;
      }
    } catch (e: any) {
      console.warn('[QR Chats API] Failed to read live session phone:', e.message);
    }

    console.log(`[QR Chats API] Resolved session ${sessionKey} | phone ${connectedPhone || 'UNKNOWN'} (user: ${viewerUserId}, superAdmin: ${superAdmin})`);

    // 1. Fetch chats and groups from bridge (always scoped to x-session-key above)
    const bridgeChatsUrl = `${bridgeUrl}/chats`;
    const bridgeGroupsUrl = `${bridgeUrl}/groups`;
    console.log('[QR Chats API] Calling bridge chats:', bridgeChatsUrl, '| sessionKey:', sessionKey);

    const [chatsRes, groupsRes]: [Response | null, Response | null] = await Promise.all([
      fetch(bridgeChatsUrl, { method: 'GET', headers: sessionHeaders }).catch(err => {
        console.warn('[QR Chats API] Chats bridge unreachable:', err.message);
        return null;
      }),
      fetch(bridgeGroupsUrl, { method: 'GET', headers: sessionHeaders }).catch(err => {
        console.warn('[QR Chats API] Groups endpoint failed:', err.message);
        return null;
      })
    ]);

    let chatsData: any = { chats: [] };
    if (!chatsRes || !chatsRes.ok) {
      console.warn('[QR Chats API] Bridge unavailable — serving from DB only');
    } else {
      chatsData = await chatsRes.json();
    }
    console.log('[QR Chats API] ✅ Chats endpoint:', {
      hasChats: !!chatsData?.chats,
      chatsCount: chatsData?.chats?.length || 0
    });

    let groupsData: any[] = [];

    if (groupsRes?.ok) {
      try {
        const groupsJson = await groupsRes.json();
        console.log('[QR Chats API] 📋 Groups endpoint response:', JSON.stringify(groupsJson).substring(0, 800));
        groupsData = Array.isArray(groupsJson) ? groupsJson : (groupsJson?.groups || groupsJson?.data || []);
        console.log('[QR Chats API] ✅ Got groups from bridge:', groupsData.length);

        // Log each group
        groupsData.forEach((g: any, idx: number) => {
          console.log(`[QR Chats API] Group ${idx}:`, {
            id: g.id || g.jid,
            name: g.subject || g.name,
            participants: g.participants?.length || 0
          });
        });
      } catch (e) {
        console.error('[QR Chats API] Failed to parse groups response:', e);
      }
    } else if (groupsRes) {
      const errorText = await groupsRes.text();
      console.error('[QR Chats API] ❌ Groups endpoint failed:', {
        status: groupsRes.status,
        error: errorText.substring(0, 200)
      });
    } else {
      console.warn('[QR Chats API] ⚠️ Groups endpoint request was aborted/null');
    }

    // Combine chats and groups
    const combinedChats = [
      ...(Array.isArray(chatsData?.chats) ? chatsData.chats : []),
      ...groupsData.map((g: any) => ({
        id: g.id || g.jid,
        name: g.subject || g.name || 'Unnamed Group',
        subject: g.subject || g.name,
        isGroup: true,
        isGroupChat: true,
        participants: g.participants || []
      }))
    ];

    const data = { chats: combinedChats };

    console.log('[QR Chats API] 📊 Combined result:', {
      totalChats: combinedChats.length,
      fromChatsEndpoint: chatsData?.chats?.length || 0,
      fromGroupsEndpoint: groupsData.length,
      groups: combinedChats.filter(c => c.isGroup).length
    });
    console.log('[QR Chats API] Bridge response:', {
      hasChats: !!data.chats,
      chatsCount: data.chats?.length || 0,
      keys: Object.keys(data),
      dataSnapshot: JSON.stringify(data).substring(0, 500)
    });

    if (!data.chats) {
      console.warn('[QR Chats API] No chats in bridge response, returning empty array');
      return NextResponse.json({ success: true, chats: [] });
    }

    // ── Merge DB-persisted chats (qr_whatsapp_chats) with bridge chats ──
    // This ensures chats survive bridge restarts / PC off.
    // Always merge historical chats for the user (don't skip based on connectedPhone).
    // Even without a known current phone, historical chats should be visible.
    try {
      const QrChat = getQrWhatsAppChat();
      
      // Build query: always include user's chats, optionally filtered by connectedPhone if known
      const query: any = { userId: viewerUserId };
      if (connectedPhone) {
        query.connectedPhone = connectedPhone;
      }
      
      const dbChatDocs = await QrChat.find(query)
        .sort({ lastMessageTime: -1, conversationTimestamp: -1, createdAt: -1 })
        .limit(1000)  // Increased from 500 to include more historical
        .lean();

      const bridgeJidSet = new Set<string>(
        data.chats.map((c: any) => {
          const id = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
          return id;
        })
      );

      for (const dc of dbChatDocs as any[]) {
        if (!dc.chatJid || bridgeJidSet.has(dc.chatJid)) continue;
        // Enrich name from Lead if only phone stored
        let chatName = dc.name || dc.chatJid.split('@')[0];
        data.chats.push({
          id: dc.chatJid,
          name: chatName,
          lastMessage: dc.lastMessage || '',
          lastMessageTime: dc.lastMessageTime ? new Date(dc.lastMessageTime).toISOString() : null,
          conversationTimestamp: dc.conversationTimestamp || 0,
          unreadCount: dc.unreadCount || 0,
          isGroup: dc.isGroup || false,
          fromDb: true,
        });
      }
      console.log(`[QR Chats API] Merged ${dbChatDocs.length} historical chats from DB (connectedPhone: ${connectedPhone || 'UNKNOWN'})`);
    } catch (dbMergeErr: any) {
      console.warn('[QR Chats API] DB chat merge failed (non-fatal):', dbMergeErr.message);
    }

    // 2. If Super Admin, return everything
    if (superAdmin) {
      return NextResponse.json({ success: true, chats: data.chats });
    }

    // 3. Filter for regular admins: Show their assigned leads OR leads they created (user compartment).
    // Optimization: Pre-extract phone numbers and batch query leads
    const Lead = getLead();

    // Cache phone extraction to avoid recomputing in filter
    const chatPhones = new Map<string, string>();
    const phoneNumbers = new Set<string>();

    for (const c of data.chats) {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const isGroup = idStr.endsWith('@g.us');
      if (isGroup) continue; // Skip groups early
      
      const phone = idStr.split('@')[0];
      if (phone) {
        chatPhones.set(idStr, phone);
        phoneNumbers.add(phone);
      }
    }

    // Find all leads for these numbers in one batch query
    const leadMap = new Map();
    if (phoneNumbers.size > 0) {
      const leads = await Lead.find({
        phoneNumber: { $in: Array.from(phoneNumbers) }
      }).select('phoneNumber assignedToUserId createdByUserId displayName name').lean();

      leads.forEach((l: any) => leadMap.set(l.phoneNumber, {
        assignedToUserId: l.assignedToUserId,
        createdByUserId: l.createdByUserId,
        name: l.displayName || l.name,
      }));
    }

    const filteredChats = data.chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const isGroup = idStr.endsWith('@g.us');

      // ALWAYS show groups (@g.us) - they are not filtered by lead records.
      // Safe for tenant isolation because non-super-admins only ever reach the
      // bridge with their OWN session key (see session resolution above), so any
      // group here belongs to this tenant's own connected WhatsApp account.
      if (isGroup) {
        return true;
      }

      // For individual chats: filter by lead assignment (user compartment)
      const phone = chatPhones.get(idStr);
      if (!phone) return false;
      
      const leadInfo = leadMap.get(phone);
      if (!leadInfo) return false;

      const passes = leadInfo.assignedToUserId === viewerUserId || leadInfo.createdByUserId === viewerUserId;
      // Enrich name from lead record if available
      if (passes && leadInfo.name && (!c.name || c.name === phone)) {
        c.name = leadInfo.name;
      }
      return passes;
    });

    return NextResponse.json({ success: true, chats: filteredChats });
  } catch (err: any) {
    console.error('[QR Chats API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
