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

    // ── PRIVACY COMPARTMENT CHECK ──
    // Non-super-admin users must have their own bridge OR be explicitly enabled
    if (!superAdmin) {
      const CRMUserSettings = getCRMUserSettings();
      const userSettings = await CRMUserSettings.findOne(
        { userId: viewerUserId },
        { qrBridgeUrl: 1, qrWhatsappEnabled: 1 }
      ).lean();
      
      if (!userSettings?.qrBridgeUrl && !userSettings?.qrWhatsappEnabled) {
        return NextResponse.json({ 
          success: false, 
          error: 'QR WhatsApp access not configured. Contact your super admin or set up your own bridge.' 
        }, { status: 403 });
      }
    }

    // Determine bridge URL for this user
    let bridgeUrl = BRIDGE_URL;
    let bridgeSecret = BRIDGE_SECRET;
    if (!superAdmin) {
      const CRMUserSettings = getCRMUserSettings();
      const userSettings = await CRMUserSettings.findOne(
        { userId: viewerUserId },
        { qrBridgeUrl: 1, qrBridgeSecret: 1 }
      ).lean();
      if (userSettings?.qrBridgeUrl) {
        bridgeUrl = userSettings.qrBridgeUrl;
        bridgeSecret = userSettings.qrBridgeSecret || BRIDGE_SECRET;
      }
    }

    // 0. Find the active session key — bridge requires it to return chats
    let sessionKey: string | null = null;
    try {
      const sessionsRes = await fetch(`${bridgeUrl}/sessions`, {
        method: 'GET',
        headers: { 'x-bridge-secret': bridgeSecret },
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        const sessions: any[] = sessionsData?.sessions || [];
        // Prefer session owned by this user
        const ownSession = sessions.find(s => s.userId === viewerUserId && s.status === 'connected');
        const anySession = sessions.find(s => s.status === 'connected');
        sessionKey = ownSession?.sessionKey || anySession?.sessionKey || null;
        console.log(`[QR Chats API] Session key resolved: ${sessionKey || 'NONE'} (user: ${viewerUserId})`);
      }
    } catch (e: any) {
      console.warn('[QR Chats API] Failed to resolve session key:', e.message);
    }

    const sessionHeaders: Record<string, string> = {
      'x-bridge-secret': bridgeSecret,
      'x-user-id': viewerUserId,
    };
    if (sessionKey) sessionHeaders['x-session-key'] = sessionKey;

    // 1. Fetch chats and groups from bridge
    const bridgeChatsUrl = `${bridgeUrl}/chats`;
    const bridgeGroupsUrl = `${bridgeUrl}/groups`;
    console.log('[QR Chats API] Calling bridge chats:', bridgeChatsUrl, '| sessionKey:', sessionKey);

    const [chatsRes, groupsRes] = await Promise.all([
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

    // Log each chat BEFORE filtering to see what bridge returned
    console.log('[QR Chats API] ============ ALL CHATS FROM BRIDGE ============');
    data.chats.forEach((c: any, idx: number) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const isGroup = idStr.endsWith('@g.us');
      console.log(`[QR Chats API] Chat ${idx}:`, {
        id: idStr,
        name: c.name,
        isGroup,
        isGroupChat: c.isGroupChat,
        hasGroupMetadata: !!c.groupMetadata,
      });
    });
    console.log('[QR Chats API] ============ END BRIDGE CHATS ============');

    // ── Merge DB-persisted chats (qr_whatsapp_chats) with bridge chats ──
    // This ensures chats survive bridge restarts / PC off. Privacy: userId strictly isolates tenants.
    try {
      const QrChat = getQrWhatsAppChat();
      const dbChatDocs = await QrChat.find({ userId: viewerUserId })
        .sort({ conversationTimestamp: -1 })
        .limit(500)
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
    } catch (dbMergeErr: any) {
      console.warn('[QR Chats API] DB chat merge failed (non-fatal):', dbMergeErr.message);
    }

    // 2. If Super Admin, return everything
    if (superAdmin) {
      return NextResponse.json({ success: true, chats: data.chats });
    }

    // 3. Filter for regular admins: Show their assigned leads OR leads they created (user compartment).
    const Lead = getLead();

    // Extract phone numbers from all chats (bridge + DB merged)
    const phoneNumbers = data.chats.map((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      return idStr.split('@')[0];
    }).filter(Boolean);

    // Find all leads for these numbers
    const leads = await Lead.find({
      phoneNumber: { $in: phoneNumbers }
    }).select('phoneNumber assignedToUserId createdByUserId name displayName');

    const leadMap = new Map();
    leads.forEach((l: any) => leadMap.set(l.phoneNumber, {
      assignedToUserId: l.assignedToUserId,
      createdByUserId: l.createdByUserId,
      name: l.displayName || l.name,
    }));

    const filteredChats = data.chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const isGroup = idStr.endsWith('@g.us');

      // ALWAYS show groups (@g.us) - they are not filtered by lead records
      if (isGroup) {
        return true;
      }

      // For individual chats: filter by lead assignment (user compartment)
      const phone = idStr.split('@')[0];
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
