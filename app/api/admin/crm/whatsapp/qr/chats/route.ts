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

    // 3. Filter by assignedToUserId for regular admins
    await connectDB();
    const Lead = getLead();
    
    // Extract phone numbers from bridge chats (id format "919876543210@c.us")
    const phoneNumbers = data.chats.map((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      return idStr.split('@')[0];
    }).filter(Boolean);

    // Find leads assigned to this user among these phone numbers
    const leads = await Lead.find({
      phoneNumber: { $in: phoneNumbers },
      assignedToUserId: viewerUserId
    }).select('phoneNumber assignedToUserId');

    const allowedPhones = new Set(leads.map(l => l.phoneNumber));

    const filteredChats = data.chats.filter((c: any) => {
      const idStr = typeof c.id === 'string' ? c.id : (c.id?._serialized || '');
      const phone = idStr.split('@')[0];
      return allowedPhones.has(phone);
    });

    return NextResponse.json({ success: true, chats: filteredChats });
  } catch (err: any) {
    console.error('[QR Chats API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
