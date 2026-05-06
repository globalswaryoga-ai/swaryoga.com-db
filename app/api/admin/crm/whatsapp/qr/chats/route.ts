import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead, getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
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

    // 1. Fetch chats and groups from bridge
    const bridgeChatsUrl = `${bridgeUrl}/chats`;
    const bridgeGroupsUrl = `${bridgeUrl}/groups`;
    console.log('[QR Chats API] Calling bridge chats:', bridgeChatsUrl);
    console.log('[QR Chats API] Calling bridge groups:', bridgeGroupsUrl);

    const [chatsRes, groupsRes] = await Promise.all([
      fetch(bridgeChatsUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': bridgeSecret,
          'x-user-id': viewerUserId,
        }
      }),
      fetch(bridgeGroupsUrl, {
        method: 'GET',
        headers: {
          'x-bridge-secret': bridgeSecret,
          'x-user-id': viewerUserId,
        }
      }).catch(err => {
        console.warn('[QR Chats API] Groups endpoint failed:', err.message);
        return null;
      })
    ]);

    if (!chatsRes.ok) {
      const errorText = await chatsRes.text();
      console.error('[QR Chats API] Chats endpoint error:', chatsRes.status, errorText);
      return NextResponse.json({ success: false, error: 'Bridge error', details: errorText }, { status: chatsRes.status });
    }

    const chatsData = await chatsRes.json();
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

    // 2. If Super Admin, return everything
    if (superAdmin) {
      return NextResponse.json({ success: true, chats: data.chats });
    }

    // 3. Filter for regular admins: Show their assigned leads OR leads they created (user compartment).
    const Lead = getLead();
    
    // Extract phone numbers from bridge chats
    const phoneNumbers = data.chats.map((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      return idStr.split('@')[0];
    }).filter(Boolean);

    // Find all leads for these numbers
    const leads = await Lead.find({
      phoneNumber: { $in: phoneNumbers }
    }).select('phoneNumber assignedToUserId createdByUserId');

    const leadMap = new Map();
    leads.forEach(l => leadMap.set(l.phoneNumber, { 
      assignedToUserId: l.assignedToUserId, 
      createdByUserId: l.createdByUserId 
    }));

    const filteredChats = data.chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const isGroup = idStr.endsWith('@g.us');

      // ALWAYS show groups (@g.us) - they are not filtered by lead records
      if (isGroup) {
        console.log('[QR Chats API] Passing group:', idStr, c.name || c.subject);
        return true;
      }

      // For individual chats: filter by lead assignment (user compartment)
      const phone = idStr.split('@')[0];
      const leadInfo = leadMap.get(phone);
      if (!leadInfo) {
        console.log('[QR Chats API] Filtering out (no lead):', phone);
        return false;
      }

      const passes = leadInfo.assignedToUserId === viewerUserId || leadInfo.createdByUserId === viewerUserId;
      if (passes) {
        console.log('[QR Chats API] Passing people:', phone, c.name);
      }
      return passes;
    });

    console.log('[QR Chats API] Final result:', {
      totalBefore: data.chats.length,
      totalAfter: filteredChats.length,
      groups: filteredChats.filter(c => (typeof c.id === 'string' ? c.id : c.id?._serialized)?.endsWith('@g.us')).length,
    });

    return NextResponse.json({ success: true, chats: filteredChats });
  } catch (err: any) {
    console.error('[QR Chats API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
