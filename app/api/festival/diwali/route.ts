import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_DIWALI_CONFIG = {
  enabled: true,
  frequency: 'once_per_session', // 'every_visit' | 'once_per_session' | 'once_per_day'
  greetingTitleHi: 'शुभ दीपावली',
  greetingTitleEn: 'Happy Diwali!',
  blessingText: 'May the divine light of knowledge remove darkness and bring supreme peace, vibrant health, spiritual awakening, and prosperity into your life.',
  senderText: 'With warm wishes,\nSwar Yoga Team & Mohan Sir',
  showDiyas: true,
  showFireworks: true,
  showRangoli: true,
};

async function initFestiveTable() {
  await bunnyExecute(`
    CREATE TABLE IF NOT EXISTS swar_festive_settings_sql (
      id TEXT PRIMARY KEY,
      festival_key TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).catch(() => {});
}

export async function GET() {
  try {
    await initFestiveTable();
    const res = await bunnyExecute({
      sql: `SELECT settings_json FROM swar_festive_settings_sql WHERE festival_key = 'diwali' LIMIT 1`,
    }).catch(() => ({ rows: [] }));

    if (res.rows && res.rows.length > 0 && (res.rows[0] as any).settings_json) {
      try {
        const parsed = JSON.parse(String((res.rows[0] as any).settings_json));
        return NextResponse.json({ success: true, config: { ...DEFAULT_DIWALI_CONFIG, ...parsed } });
      } catch {}
    }

    return NextResponse.json({ success: true, config: DEFAULT_DIWALI_CONFIG });
  } catch (error: any) {
    return NextResponse.json({ success: true, config: DEFAULT_DIWALI_CONFIG });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = verifyToken(rawToken);

    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    await initFestiveTable();
    const body = await req.json();
    const configToSave = {
      ...DEFAULT_DIWALI_CONFIG,
      ...body,
    };

    const now = new Date().toISOString();
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO swar_festive_settings_sql (id, festival_key, settings_json, updated_at)
            VALUES ('festive_diwali', 'diwali', ?, ?)`,
      args: [JSON.stringify(configToSave), now],
    });

    return NextResponse.json({ success: true, message: 'दीपावली सेटिंग्स सुरक्षित कर दी गई हैं।', config: configToSave });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update Diwali settings' }, { status: 500 });
  }
}
