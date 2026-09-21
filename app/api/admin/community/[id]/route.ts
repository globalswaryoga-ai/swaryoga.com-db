import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Community ID required' }, { status: 400 });

    await bunnyExecute({
      sql: "DELETE FROM mongo_documents WHERE collection_name = 'communities' AND document_id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error deleting community:', errorMsg);
    return NextResponse.json({ error: 'Failed to delete community' }, { status: 500 });
  }
}
