import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function ensureConfigTable() {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS global_crm_config (
      config_key TEXT PRIMARY KEY,
      config_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    args: []
  });
}

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { verifyToken(token); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    await ensureConfigTable();
    const res = await bunnyExecute({ sql: `SELECT * FROM global_crm_config WHERE config_key = 'google_form_links'`, args: [] });
    if (res.rows && res.rows.length > 0) {
      return NextResponse.json({ success: true, config: JSON.parse(res.rows[0].config_value) });
    }
    return NextResponse.json({ success: true, config: null });
  } catch (err: any) {
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let decoded;
  try { decoded = verifyToken(token); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!decoded?.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    await ensureConfigTable();
    const { config } = await req.json();
    if (!config) return NextResponse.json({ error: 'Config missing' }, { status: 400 });

    const jsonString = JSON.stringify(config);
    await bunnyExecute({
      sql: `INSERT INTO global_crm_config (config_key, config_value, updated_at) VALUES ('google_form_links', ?, datetime('now')) ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')`,
      args: [jsonString]
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Database error', detail: err?.message }, { status: 500 });
  }
}
