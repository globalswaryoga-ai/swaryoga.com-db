/**
 * Ritucharya Profile API — one saved form per CRM tenant.
 *
 * GET  → load this tenant's saved location + weather + personal profile (+ resolved ritu)
 * POST → upsert the form; recomputes the ritu from the (possibly corrected) weather + date
 *        so that fixing the weather always yields the best-matching diet plan.
 *
 * Tenant isolation: userId comes from the verified JWT (getViewerUserId), never the client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';
import { getRitucharyaProfile } from '@/lib/ritucharya/profileModel';
import { getClimateRitu, getCurrentSeasonByDate, getRituBySeason } from '@/lib/ritucharya/seasons';

export const dynamic = 'force-dynamic';

function auth(req: NextRequest): string | null {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.isAdmin) return null;
  return getViewerUserId(decoded);
}

/** Resolve the best ritu id from corrected weather, falling back to the calendar date. */
function resolveRitu(weather: any): string {
  const byWeather = getClimateRitu(
    Number(weather?.temp ?? 25),
    Number(weather?.humidity ?? 50),
    String(weather?.description || '')
  );
  return byWeather || getCurrentSeasonByDate();
}

export async function GET(req: NextRequest) {
  try {
    const userId = auth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const doc = await getRitucharyaProfile().findOne({ userId }).lean();
    if (!doc) return NextResponse.json({ success: true, profile: null });

    const ritu = (doc as any).rituId ? getRituBySeason((doc as any).rituId) : null;
    return NextResponse.json({ success: true, profile: doc, ritu: ritu || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = auth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const weather = body.weather || {};
    const rituId = resolveRitu(weather);

    await connectDB();
    const doc = await getRitucharyaProfile().findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          country: body.country || '',
          state: body.state || '',
          city: body.city || '',
          weather: {
            temp: Number(weather.temp ?? 25),
            tempMin: Number(weather.tempMin ?? 20),
            tempMax: Number(weather.tempMax ?? 30),
            humidity: Number(weather.humidity ?? 50),
            windSpeed: Number(weather.windSpeed ?? 15),
            aqi: Number(weather.aqi ?? 50),
            description: weather.description || '',
            manuallyCorrected: !!weather.manuallyCorrected,
            fetchedAt: weather.fetchedAt ? new Date(weather.fetchedAt) : new Date(),
          },
          rituId,
          rituPhase: body.rituPhase || '',
          profile: {
            name: body.profile?.name || '',
            age: body.profile?.age != null ? Number(body.profile.age) : undefined,
            gender: body.profile?.gender || '',
            prakriti: body.profile?.prakriti || '',
            healthConditions: Array.isArray(body.profile?.healthConditions) ? body.profile.healthConditions : [],
            notes: body.profile?.notes || '',
          },
        },
      },
      { upsert: true, new: true }
    ).lean();

    const ritu = getRituBySeason(rituId);
    return NextResponse.json({ success: true, profile: doc, ritu: ritu || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
