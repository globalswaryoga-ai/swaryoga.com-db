import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { registrationViewer } from '@/lib/registrationAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const result = await bunnyExecute({
      sql: `UPDATE broadcast_run_messages_sql SET status = 'pending', failure_reason = NULL, updated_at = ?
        WHERE status = 'failed' AND run_id IN (SELECT document_id FROM broadcast_runs_sql
          WHERE created_by_label = 'Registration Automation' ${viewer.superAdmin ? '' : 'AND created_by_user_id = ?'})`,
      args: [new Date().toISOString(), ...(viewer.superAdmin ? [] : [viewer.userId])],
    });
    await bunnyExecute({
      sql: `UPDATE broadcast_runs_sql SET status = 'scheduled', completed_at = NULL
        WHERE created_by_label = 'Registration Automation'
        ${viewer.superAdmin ? '' : 'AND created_by_user_id = ?'}
        AND document_id IN (SELECT run_id FROM broadcast_run_messages_sql WHERE status = 'pending')`,
      args: viewer.superAdmin ? [] : [viewer.userId],
    });
    return NextResponse.json({ success: true, count: Number(result.rowsAffected), message: 'Failed messages queued for retry' });
  } catch (error) {
    console.error('Retry registration triggers failed:', error);
    return NextResponse.json({ error: 'Failed to queue retries' }, { status: 500 });
  }
}
