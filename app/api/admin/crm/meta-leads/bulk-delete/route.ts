import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = await bunnyExecute({
      sql: `DELETE FROM leads_sql WHERE document_id IN (${placeholders})`,
      args: ids
    });

    return NextResponse.json({ success: true, deletedCount: result.rowsAffected });
  } catch (error: any) {
    console.error('Error deleting leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
