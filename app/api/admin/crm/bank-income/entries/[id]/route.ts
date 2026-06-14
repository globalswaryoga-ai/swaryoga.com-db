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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    verifyAdmin(request);
    await connectDB();

    const body = await request.json();
    const update: Record<string, any> = {};

    if (body.date !== undefined) {
      const date = new Date(body.date);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      update.date = date;
      update.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (body.description !== undefined) update.description = String(body.description).trim();
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (isNaN(amount)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      update.amount = amount;
    }
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.workshopName !== undefined) update.workshopName = String(body.workshopName).trim();

    if ('name' in update) {
      update.tagged = update.name.length > 0;
    }

    const entry = await BankIncomeEntry.findByIdAndUpdate(params.id, update, { new: true }).lean();
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, entry: { ...entry, id: (entry as any)._id.toString() } });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank income entry update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update entry' }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    verifyAdmin(request);
    await connectDB();

    const result = await BankIncomeEntry.findByIdAndDelete(params.id);
    if (!result) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    console.error('Bank income entry delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete entry' }, { status });
  }
}
