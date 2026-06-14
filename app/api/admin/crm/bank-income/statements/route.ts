import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { BankStatement } from '@/lib/schemas/enterpriseSchemas';

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

    const statements = await BankStatement.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      statements: statements.map((s: any) => ({
        id: s._id.toString(),
        bankName: s.bankName,
        fileName: s.fileName,
        fileUrl: s.fileUrl,
        status: s.status,
        entryCount: s.entryCount,
        createdAt: s.createdAt,
      })),
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank statements fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch statements' }, { status });
  }
}
