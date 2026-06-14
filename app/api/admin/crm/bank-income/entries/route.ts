import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { BankIncomeEntry } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin) throw new Error('Unauthorized');
  if (!isSuperAdmin(decoded)) throw new Error('Forbidden');
  return decoded;
}

export async function GET(request: NextRequest) {
  try {
    verifyAdmin(request);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const tagged = searchParams.get('tagged');
    const bankName = searchParams.get('bankName');

    const filter: Record<string, any> = {};
    if (month) filter.month = month;
    if (tagged === 'true') filter.tagged = true;
    if (tagged === 'false') filter.tagged = false;
    if (bankName) filter.bankName = bankName;

    const entries = await BankIncomeEntry.find(filter).sort({ date: 1 }).lean();

    return NextResponse.json({
      success: true,
      entries: entries.map((e: any) => ({
        id: e._id.toString(),
        statementId: e.statementId?.toString(),
        bankName: e.bankName,
        date: e.date,
        month: e.month,
        description: e.description,
        amount: e.amount,
        name: e.name,
        workshopName: e.workshopName,
        tagged: e.tagged,
      })),
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank income entries fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch entries' }, { status });
  }
}
