import { NextRequest, NextResponse } from 'next/server';
import { listBunnyLeads } from '@/lib/bunnyLeadsRepository';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const workshopId = url.searchParams.get('workshopId');

    if (!workshopId) {
      return NextResponse.json({ error: 'workshopId is required' }, { status: 400 });
    }

    // Fetch leads for this workshop
    const bunnyResult = await listBunnyLeads({ 
      visibleUserIds: null, 
      viewerUserId: 'system',
      limit: 5000,
      skip: 0
    });
    
    // We want to return raw Meta leads (source: meta_instant_form)
    const leadsList = Array.isArray(bunnyResult) ? bunnyResult : (bunnyResult?.leads || []);
    const metaLeads = leadsList.filter((l: any) => 
      (l.workshopId === workshopId) && 
      (l.source === 'meta_instant_form' || (l.labels || []).includes('meta_instant_form'))
    );

    // We don't mangle them so that _MetaLeadsTab.tsx can access l.metadata.rawFieldData
    return NextResponse.json({ success: true, data: metaLeads });
  } catch (error: any) {
    console.error('Error fetching meta leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
