import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice('Bearer '.length);
    if (!verifyToken(token)?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const { bunnyExecute } = await import('@/lib/bunnyDatabase');
    
    // Fetch all AI-9W Worker broadcast runs
    const runsRes = await bunnyExecute({ 
        sql: "SELECT data_json FROM broadcast_runs_sql WHERE json_extract(data_json, '$.createdByLabel') = 'AI-9W Worker' ORDER BY created_at DESC LIMIT 50" 
    });
    
    const runs = runsRes.rows.map((r: any) => JSON.parse(r.data_json));

    const reportData = [];

    for (const run of runs) {
        // Fetch messages for this run
        const msgsRes = await bunnyExecute({
            sql: "SELECT data_json FROM broadcast_run_messages_sql WHERE broadcast_run_id = ?",
            args: [run._id]
        });
        
        const leads = msgsRes.rows.map((r: any) => {
            const msg = JSON.parse(r.data_json);
            return {
                id: msg._id,
                leadName: msg.lead?.name || 'Unknown',
                phone: msg.phone || 'Unknown',
                status: msg.status || 'pending',
                reason: msg.failureReason || ''
            };
        });

        reportData.push({
            id: run._id,
            name: run.name,
            template: run.templateSnapshot?.templateName || run.templateId,
            scheduledAt: run.createdAt || run.created_at,
            stats: run.stats || { total: 0, sent: 0, failed: 0 },
            leads: leads
        });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Trigger report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
