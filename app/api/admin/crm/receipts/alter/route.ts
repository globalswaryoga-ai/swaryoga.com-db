import { NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function GET() {
  try {
    const res = await bunnyExecute({ sql: `PRAGMA table_info(crm_receipts_sql)`, args: [] });
    return NextResponse.json({ success: true, columns: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
