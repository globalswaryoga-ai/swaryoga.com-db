import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { BankStatement, BankIncomeEntry } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  if (!isSuperAdmin(decoded)) throw new Error('Forbidden');
  return decoded;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    verifyAdmin(request);
    await connectDB();

    const statement = await BankStatement.findByIdAndDelete(params.id);
    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    await BankIncomeEntry.deleteMany({ statementId: statement._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank statement delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete statement' }, { status });
  }
}
