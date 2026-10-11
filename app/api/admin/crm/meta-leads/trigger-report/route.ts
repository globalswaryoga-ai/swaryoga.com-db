import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { ensureBroadcastSchema, markRunStatsBunny } from '@/lib/bunnyBroadcastRepository';
import { registrationViewer } from '@/lib/registrationAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const viewer = registrationViewer(request);
  if (!viewer) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await ensureBroadcastSchema();
    const result = await bunnyExecute({
      sql: `SELECT * FROM broadcast_runs_sql WHERE
        (created_by_label IN ('AI-9W Worker', 'Registration Automation') OR name LIKE 'AI Trigger%' OR name LIKE 'AI-9W%')
        ${viewer.superAdmin ? '' : 'AND created_by_user_id = ?'} ORDER BY created_at DESC LIMIT 50`,
      args: viewer.superAdmin ? [] : [viewer.userId],
    });
    const data = await Promise.all(result.rows.map(async run => {
      const snapshot = JSON.parse(String(run.data_json || '{}'));
      const [stats, messages] = await Promise.all([
        markRunStatsBunny(String(run.document_id)),
        bunnyExecute({
          sql: `SELECT m.*, l.data_json AS lead_json FROM broadcast_run_messages_sql m
            LEFT JOIN leads_sql l ON l.document_id = m.lead_id WHERE m.run_id = ?`,
          args: [String(run.document_id)],
        }),
      ]);
      return {
        id: run.document_id, name: run.name, template: snapshot.templateSnapshot?.templateName || run.template_id,
        scheduledAt: run.scheduled_at || run.created_at, stats,
        leads: messages.rows.map(message => ({
          id: message.document_id, leadName: JSON.parse(String(message.lead_json || '{}')).name || 'Unknown',
          phone: message.phone_number, status: message.status, reason: message.failure_reason || '',
        })),
      };
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Registration trigger report failed:', error);
    return NextResponse.json({ error: 'Failed to load trigger report' }, { status: 500 });
  }
}
