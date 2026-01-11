import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin } from '@/lib/crm-handlers';

const BRIDGE_URL = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
const BRIDGE_SECRET = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

export const dynamic = 'force-dynamic';
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

    // 1. Fetch from bridge
    const res = await fetch(`${BRIDGE_URL}/chats`, {
      method: 'GET',
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: 'Bridge error', details: errorText }, { status: res.status });
    }

    const data = await res.json();
    
    if (!data.chats) return NextResponse.json({ success: true, chats: [] });

    // 2. If Super Admin, return everything
    if (superAdmin) {
      return NextResponse.json({ success: true, chats: data.chats });
    }

    // 3. Filter for regular admins: Show their assigned leads OR unassigned ones.
    await connectDB();
    const Lead = getLead();
    
    // Extract phone numbers from bridge chats
    const phoneNumbers = data.chats.map((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      return idStr.split('@')[0];
    }).filter(Boolean);

    // Find all leads for these numbers
    const leads = await Lead.find({
      phoneNumber: { $in: phoneNumbers }
    }).select('phoneNumber assignedToUserId');

    const leadMap = new Map();
    leads.forEach(l => leadMap.set(l.phoneNumber, l.assignedToUserId));

    const filteredChats = data.chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const phone = idStr.split('@')[0];
      
      const assignedTo = leadMap.get(phone);
      // Show if unassigned OR assigned to viewer
      return !assignedTo || assignedTo === viewerUserId;
    });

    return NextResponse.json({ success: true, chats: filteredChats });
  } catch (err: any) {
    console.error('[QR Chats API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
