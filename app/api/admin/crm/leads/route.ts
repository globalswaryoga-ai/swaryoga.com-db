import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Lead } from '@/lib/schemas/enterpriseSchemas';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      const query = String(q).trim();
      if (query) {
        filter.$or = [
          { name: { $regex: query, $options: 'i' } },
          { phoneNumber: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ];
      }
    }

    const leads = await Lead.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Lead.countDocuments(filter);

    return NextResponse.json({ success: true, data: { leads, total, limit, skip } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load leads';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const phoneNumber = String(body?.phoneNumber || '').trim();
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Missing: phoneNumber' }, { status: 400 });
    }

    const name = body?.name ? String(body.name).trim() : undefined;
    const email = body?.email ? String(body.email).trim() : undefined;
    const status = body?.status ? String(body.status).trim() : undefined;
    const labels = Array.isArray(body?.labels) ? body.labels.map((x: any) => String(x)) : undefined;
    const source = body?.source ? String(body.source).trim() : undefined;

    await connectDB();

    const lead = await Lead.create({
      phoneNumber,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(status ? { status } : {}),
      ...(labels ? { labels } : {}),
      ...(source ? { source } : {}),
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
