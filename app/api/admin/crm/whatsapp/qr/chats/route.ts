import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getCRMUserSettings, getQrWhatsAppChat, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
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
    // The bridge uses the OWNER's own push name as a fallback chat name when it
    // never captured the contact's name — detect it so we can treat it as a
    // placeholder (same as bare digits) during name enrichment below.
    let ownerName = '';
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
        ownerName = String(liveSession?.phone?.name || '').trim();
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
    // Persisted chat names/markers by JID — used both to restore previously
    // harvested contact names onto placeholder-named bridge chats and to skip
    // re-harvesting chats we already checked recently.
    const dbChatMeta = new Map<string, { name: string; nameCheckedAt?: Date }>();
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
        if (!dc.chatJid) continue;
        if (!dbChatMeta.has(dc.chatJid)) {
          dbChatMeta.set(dc.chatJid, {
            name: String(dc.name || ''),
            nameCheckedAt: dc.metadata?.nameCheckedAt ? new Date(dc.metadata.nameCheckedAt) : undefined,
          });
        }
        if (bridgeJidSet.has(dc.chatJid)) continue;
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

    const Lead = getLead();

    // ── Merge CRM leads with legacy WhatsApp history but no qr_whatsapp_chats doc ──
    // Older leads were messaged before qr_whatsapp_chats existed (or before history
    // sync was enabled on the bridge), so they have no chat record yet under this
    // session even though they have real conversation history in WhatsAppMessage.
    try {
      const presentPhones = new Set<string>();
      for (const c of data.chats as any[]) {
        const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
        if (idStr.endsWith('@g.us')) continue;
        const phone = idStr.split('@')[0].replace(/\D/g, '');
        if (phone) presentPhones.add(phone);
      }

      const leadFilter: any = {
        phoneNumber: { $exists: true, $nin: ['', ...Array.from(presentPhones)] },
      };
      if (!superAdmin) {
        leadFilter.$or = [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }];
      }

      const extraLeads = await Lead.find(leadFilter)
        .select('phoneNumber displayName name updatedAt')
        .sort({ updatedAt: -1 })
        .limit(300)
        .lean();

      if (extraLeads.length > 0) {
        const WhatsAppMessage = getWhatsAppMessage();
        const extraPhones = extraLeads.map((l: any) => l.phoneNumber);
        const lastMsgs = await WhatsAppMessage.aggregate([
          { $match: { phoneNumber: { $in: extraPhones } } },
          { $sort: { sentAt: -1 } },
          { $group: { _id: '$phoneNumber', lastMessage: { $first: '$messageContent' }, lastMessageTime: { $first: '$sentAt' } } },
        ]);
        const lastMsgMap = new Map(lastMsgs.map((m: any) => [m._id, m]));

        let addedCount = 0;
        for (const lead of extraLeads as any[]) {
          const phone = String(lead.phoneNumber || '').replace(/\D/g, '');
          if (!phone) continue;
          const lm: any = lastMsgMap.get(phone);
          if (!lm) continue; // No conversation history — don't clutter the inbox
          data.chats.push({
            id: `${phone}@s.whatsapp.net`,
            name: lead.displayName || lead.name || phone,
            lastMessage: lm.lastMessage || '',
            lastMessageTime: lm.lastMessageTime ? new Date(lm.lastMessageTime).toISOString() : null,
            unreadCount: 0,
            isGroup: false,
            fromLead: true,
          });
          addedCount++;
        }
        console.log(`[QR Chats API] Merged ${addedCount} additional chats from CRM leads with legacy history`);
      }
    } catch (leadMergeErr: any) {
      console.warn('[QR Chats API] Lead chat merge failed (non-fatal):', leadMergeErr.message);
    }

    // A "placeholder" chat name carries no information about the contact:
    // empty, bare digits, a JID, or the bridge's owner-name fallback.
    const isPlaceholderName = (name: any): boolean => {
      const v = String(name || '').trim();
      return !v || /^\d+$/.test(v) || v.includes('@') || (!!ownerName && v === ownerName);
    };

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

    // Find leads for these numbers in one batch query — scoped to the viewer's
    // own leads (super admin additionally matches unowned/global leads). The
    // query MUST be ownership-scoped: an unscoped phone lookup could surface
    // another tenant's lead for the same number.
    const leadScope: any[] = [
      { assignedToUserId: viewerUserId },
      { createdByUserId: viewerUserId },
    ];
    if (superAdmin) {
      leadScope.push({
        $and: [
          { $or: [{ assignedToUserId: { $in: [null, ''] } }, { assignedToUserId: { $exists: false } }] },
          { $or: [{ createdByUserId: { $in: [null, ''] } }, { createdByUserId: { $exists: false } }] },
        ],
      });
    }
    const leadMap = new Map();
    if (phoneNumbers.size > 0) {
      const leads = await Lead.find({
        phoneNumber: { $in: Array.from(phoneNumbers) },
        $or: leadScope,
      }).select('phoneNumber assignedToUserId createdByUserId displayName name').lean();

      leads.forEach((l: any) => leadMap.set(l.phoneNumber, {
        assignedToUserId: l.assignedToUserId,
        createdByUserId: l.createdByUserId,
        name: l.displayName || l.name,
      }));
    }

    // ── NAME ENRICHMENT (all users, super admin included) ──
    // Priority for placeholder-named individual chats:
    //   1. CRM lead name (user-curated), 2. previously harvested name from DB.
    for (const c of data.chats) {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      if (!idStr || idStr.endsWith('@g.us') || c.isGroup) continue;
      if (!isPlaceholderName(c.name)) continue;
      const phone = chatPhones.get(idStr);
      const leadName = phone ? leadMap.get(phone)?.name : '';
      if (leadName && !isPlaceholderName(leadName)) { c.name = leadName; continue; }
      const dbName = dbChatMeta.get(idStr)?.name;
      if (dbName && !isPlaceholderName(dbName)) c.name = dbName;
    }

    // ── PUSH-NAME HARVEST ──
    // For chats still showing just a number: the bridge's chat list has no name,
    // but the contact's own WhatsApp display name (pushName) is present on their
    // inbound messages. Fetch a few recent messages for the most recent unnamed
    // chats, take the sender's pushName, and persist it so each chat is only
    // harvested once (24h retry marker for contacts with no pushName).
    try {
      const candidates = (data.chats as any[])
        .filter((c) => {
          const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
          if (!idStr || idStr.endsWith('@g.us') || c.isGroup) return false;
          if (!isPlaceholderName(c.name)) return false;
          const checkedAt = dbChatMeta.get(idStr)?.nameCheckedAt;
          return !(checkedAt && Date.now() - checkedAt.getTime() < 24 * 3600 * 1000);
        })
        .sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime())
        .slice(0, 12);

      if (candidates.length) {
        const QrChat = getQrWhatsAppChat();
        await Promise.allSettled(candidates.map(async (c) => {
          const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
          let resolved = '';
          let fetchOk = false;
          try {
            const res = await fetch(`${bridgeUrl}/messages/${encodeURIComponent(idStr)}?limit=10`, {
              headers: sessionHeaders,
              signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
              fetchOk = true;
              const json = await res.json();
              const msgs: any[] = Array.isArray(json) ? json : (json?.messages || []);
              for (let i = msgs.length - 1; i >= 0; i--) {
                const pn = String(msgs[i]?.pushName || '').trim();
                if (!msgs[i]?.fromMe && pn && !isPlaceholderName(pn)) { resolved = pn; break; }
              }
            }
          } catch { /* bridge slow/unreachable — no marker, retry on a later poll */ }

          if (resolved) c.name = resolved;
          // Persist the name (or just the checked-marker) — but only write the
          // marker when the bridge actually answered, so transient bridge
          // failures don't suppress retries for 24h.
          if (connectedPhone && (resolved || fetchOk)) {
            await QrChat.updateOne(
              { userId: viewerUserId, connectedPhone, chatJid: idStr },
              {
                $set: { ...(resolved ? { name: resolved } : {}), 'metadata.nameCheckedAt': new Date() },
                $setOnInsert: { isGroup: false },
              },
              { upsert: true }
            ).catch(() => {});
          }
          // Propagate to the viewer's own lead when it still has the bare number as name.
          if (resolved) {
            const realPhone = String(
              c.resolvedPhone ||
              ((idStr.endsWith('@s.whatsapp.net') || idStr.endsWith('@c.us')) ? idStr.split('@')[0] : '')
            ).replace(/\D/g, '');
            if (realPhone) {
              await Lead.updateOne(
                {
                  phoneNumber: realPhone,
                  $and: [{ $or: [{ name: realPhone }, { name: '' }, { name: null }] }],
                  $or: [{ assignedToUserId: viewerUserId }, { createdByUserId: viewerUserId }],
                },
                { $set: { name: resolved } }
              ).catch(() => {});
            }
          }
        }));
        console.log(`[QR Chats API] Push-name harvest attempted for ${candidates.length} unnamed chat(s)`);
      }
    } catch (harvestErr: any) {
      console.warn('[QR Chats API] Push-name harvest failed (non-fatal):', harvestErr.message);
    }

    // 2. If Super Admin, return everything
    if (superAdmin) {
      return NextResponse.json({ success: true, chats: data.chats });
    }

    // 3. Filter for regular admins: Show their assigned leads OR leads they created (user compartment).

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
