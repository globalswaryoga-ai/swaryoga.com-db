import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';
import { getKpHoraryChart } from '@/lib/schemas/enterpriseSchemas';
import { castHoraryChart } from '@/lib/kpAstro/horary';
import { computeRulingPlanets } from '@/lib/kpAstro/rulingPlanets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const KpHoraryChart = getKpHoraryChart();
    const charts = await (KpHoraryChart as any)
      .find({})
      .select('questionText querentName horaryNumber askedAt createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ success: true, data: charts }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load horary charts';
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

    const questionText = String(body?.questionText || '').trim();
    const horaryNumber = Number(body?.horaryNumber);
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const utcOffsetHours = body?.utcOffsetHours !== undefined ? Number(body.utcOffsetHours) : 5.5;
    const askedAt = body?.askedAt ? new Date(body.askedAt) : new Date();

    if (!questionText) return NextResponse.json({ error: 'questionText is required' }, { status: 400 });
    if (!horaryNumber || horaryNumber < 1 || horaryNumber > 249) {
      return NextResponse.json({ error: 'horaryNumber must be between 1 and 249' }, { status: 400 });
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: 'latitude/longitude are required' }, { status: 400 });
    }

    const result = await castHoraryChart({ horaryNumber, askedAt, latitude, longitude, utcOffsetHours });
    const rulingPlanets = await computeRulingPlanets({ at: askedAt, latitude, longitude, utcOffsetHours });

    await connectDB();

    const KpHoraryChart = getKpHoraryChart();
    const chart = await (KpHoraryChart as any).create({
      questionText,
      querentName: body?.querentName || undefined,
      horaryNumber,
      askedAt,
      askedPlace: body?.askedPlace || undefined,
      latitude,
      longitude,
      utcOffsetHours,
      ascendant: { sign: result.ascendant.sign, degree: result.ascendant.degree },
      houses: result.houses,
      planets: result.planets,
      rulingPlanets,
      createdByUserId: viewerUserId,
    });

    return NextResponse.json({ success: true, data: chart }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create horary chart';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
