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

    // 1. Fetch from bridge
    const bridgeCallUrl = `${bridgeUrl}/chats`;
    console.log('[QR Chats API] Calling bridge:', bridgeCallUrl, { userIdHeader: viewerUserId });

    const res = await fetch(bridgeCallUrl, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'x-user-id': viewerUserId,
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[QR Chats API] Bridge error:', res.status, errorText);
      return NextResponse.json({ success: false, error: 'Bridge error', details: errorText }, { status: res.status });
    }

    const data = await res.json();
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
