import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getCRMUserSettings, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';
import { resolveOwnerSessionKey } from '@/lib/qrTenantSession';

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

    const ownerSessionKey = superAdmin ? null : await resolveOwnerSessionKey({ userId: viewerUserId, tenantSlug: decoded?.tenantSlug });
    const ownerSettings: any = ownerSessionKey
      ? await CRMUserSettings.findOne({ permanentTenantId: ownerSessionKey }, { userId: 1, qrConnectedPhoneNumber: 1 }).lean()
      : null;
    const sessionOwnerUserId = String(ownerSettings?.userId || viewerUserId);

    let bridgeUrl = BRIDGE_URL;
    let bridgeSecret = BRIDGE_SECRET;
    let sessionKey: string | null = ownerSessionKey || userSettings?.permanentTenantId || null;

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
      'x-owner-user-id': sessionOwnerUserId,
      'x-session-key': sessionKey,
      'x-tenant-id': sessionKey,
    };

    // Authoritative "currently connected phone" for this session — used to scope
    // the DB chat merge so OLD sessions/phones under the same userId never leak.
    // Prefer the live bridge session phone; fall back to the stored phone.
    let connectedPhone: string = String(ownerSettings?.qrConnectedPhoneNumber || userSettings?.qrConnectedPhoneNumber || '').replace(/\D/g, '');
    // The bridge uses the OWNER's own push name as a fallback chat name when it
    // never captured the contact's name — detect it so we can treat it as a
    // placeholder (same as bare digits) during name enrichment below.
    let ownerName = '';
    try {
      const sessionsRes = await fetch(`${bridgeUrl}/status`, {
        method: 'GET',
        headers: sessionHeaders,
      });
      if (sessionsRes.ok) {
        const liveSession = await sessionsRes.json();
        const livePhone = String(liveSession?.phone?.id || liveSession?.phoneNumber || '').split(':')[0].replace(/\D/g, '');
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

    const [chatsRes, groupsRes, lidMapRes]: [Response | null, Response | null, Response | null] = await Promise.all([
      fetch(bridgeChatsUrl, { method: 'GET', headers: sessionHeaders }).catch(err => {
        console.warn('[QR Chats API] Chats bridge unreachable:', err.message);
        return null;
      }),
      fetch(bridgeGroupsUrl, { method: 'GET', headers: sessionHeaders }).catch(err => {
        console.warn('[QR Chats API] Groups endpoint failed:', err.message);
        return null;
      }),
      fetch(`${bridgeUrl}/lid-map`, { method: 'GET', headers: sessionHeaders }).catch(() => null),
    ]);

    // Resolves a chat's stable phone digits for the same-contact dedup below —
    // either straight from an @s.whatsapp.net/@c.us JID, or via the bridge's
    // learned lid→phone map for an @lid JID.
    let lidToPhone: Record<string, string> = {};
    if (lidMapRes?.ok) {
      try {
        const lidJson = await lidMapRes.json();
        lidToPhone = lidJson?.map || {};
      } catch { /* non-fatal */ }
    }
    const phoneDigitsForJid = (jid: string): string => {
      if (!jid) return '';
      if (jid.endsWith('@lid')) {
        const mapped = lidToPhone[jid];
        return mapped ? mapped.split('@')[0].replace(/\D/g, '') : '';
      }
      return jid.split('@')[0].replace(/\D/g, '');
    };

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
    // Persisted chat names/markers by JID — used both to restore previously
    // harvested contact names onto placeholder-named bridge chats and to skip
    // re-harvesting chats we already checked recently.
    const dbChatMeta = new Map<string, { name: string; nameCheckedAt?: Date }>();
    if (!connectedPhone) {
      // FAIL CLOSED: isolation is keyed by (userId, connectedPhone). Without a
      // known current phone we cannot scope this query — querying by userId
      // alone would return chats from EVERY number ever connected on this
      // account (including previously-banned/replaced numbers), leaking that
      // history into whatever number is connected now.
      console.warn(`[QR Chats API] connectedPhone unknown for user ${viewerUserId} — skipping DB chat history merge to avoid cross-number leak`);
    } else {
    try {
      const QrChat = getQrWhatsAppChat();

      // Isolation: scoped to THIS user's THIS connected number only.
      const query: any = { userId: viewerUserId, connectedPhone };

      const dbChatDocs = await QrChat.find(query)
        .sort({ lastMessageTime: -1, conversationTimestamp: -1, createdAt: -1 })
        .limit(1000)  // Increased from 500 to include more historical
        .lean();

      const bridgeIds = data.chats.map((c: any) => (typeof c.id === 'string' ? c.id : (c.id?._serialized || '')));
      const bridgeJidSet = new Set<string>(bridgeIds);
      // A contact can be persisted under both its @lid JID and its resolved
      // phone JID as the bridge learns the mapping over time (see
      // phoneDigitsForJid above). Track phones already shown by the bridge so
      // a stale @lid record for the SAME contact isn't re-added as a second,
      // unmerged row once the bridge has already reconciled it.
      const bridgePhoneSet = new Set<string>(
        data.chats
          .map((c: any) => String(c.resolvedPhone || '').replace(/\D/g, '') || phoneDigitsForJid(typeof c.id === 'string' ? c.id : ''))
          .filter(Boolean)
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
        if (!dc.isGroup) {
          const dcPhone = phoneDigitsForJid(dc.chatJid);
          if (dcPhone && bridgePhoneSet.has(dcPhone)) continue;
        }
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
      console.log(`[QR Chats API] Merged ${dbChatDocs.length} historical chats from DB (userId: ${viewerUserId}, connectedPhone: ${connectedPhone})`);
    } catch (dbMergeErr: any) {
      console.warn('[QR Chats API] DB chat merge failed (non-fatal):', dbMergeErr.message);
    }
    }

    const Lead = getLead();

    // NOTE: A previous version of this route also merged in CRM leads whose only
    // history was a provider:'meta' (Cloud API/Business API) WhatsAppMessage —
    // i.e. conversations from a DIFFERENT WhatsApp channel/number entirely. That
    // surfaced ~200+ unrelated chats into this QR personal-number inbox, which is
    // exactly the kind of cross-number/cross-channel leak isolation requires we
    // avoid. The QR inbox should only ever show chats tied to qr_whatsapp_chats
    // for THIS connectedPhone (handled above) plus the live bridge session.

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
