import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programSlug = searchParams.get('programSlug');
    const limit = parseInt(searchParams.get('limit') || '100');

    let sql = 'SELECT * FROM sadhana_live_chat_sql';
    const args: any[] = [];
    if (programSlug) {
      sql += ' WHERE program_slug = ?';
      args.push(programSlug);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    args.push(limit);

    const result = await bunnyExecute({ sql, args });

    return NextResponse.json({
      success: true,
      messages: (result.rows || []).map((m: any) => ({
        id: String(m.id),
        programSlug: m.program_slug,
        name: m.sender,
        message: m.message,
        createdAt: m.created_at,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET admin/sadhana-chat');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await bunnyExecute({
      sql: 'DELETE FROM sadhana_live_chat_sql WHERE id = ?',
      args: [String(id)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'DELETE admin/sadhana-chat');
  }
}
