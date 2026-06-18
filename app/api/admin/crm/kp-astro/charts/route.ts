import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getKpHoroscopeChart } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    await connectDB();

    const KpHoroscopeChart = getKpHoroscopeChart();
    const charts = await (KpHoroscopeChart as any)
      .find({})
      .select('personName gender dob createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: charts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load charts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) return unauthorized();
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const body = await request.json().catch(() => ({} as any));

    const personName = String(body?.personName || '').trim();
    if (!personName) {
      return NextResponse.json({ error: 'personName is required' }, { status: 400 });
    }

    await connectDB();

    const KpHoroscopeChart = getKpHoroscopeChart();
    const chart = await (KpHoroscopeChart as any).create({
      personName,
      gender: body?.gender || undefined,
      dob: body?.dob ? new Date(body.dob) : undefined,
      birthTime: body?.birthTime || undefined,
      birthPlace: body?.birthPlace || undefined,
      ascendant: body?.ascendant || undefined,
      houses: Array.isArray(body?.houses) ? body.houses : [],
      planets: Array.isArray(body?.planets) ? body.planets : [],
      mahadashas: Array.isArray(body?.mahadashas) ? body.mahadashas : [],
      doshas: body?.doshas || undefined,
      createdByUserId: viewerUserId,
    });

    return NextResponse.json({ success: true, data: chart }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create chart';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
