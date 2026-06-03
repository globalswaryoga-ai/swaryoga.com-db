/**
 * Ritucharya Daily Plans API — per-tenant daily food log.
 *
 * POST → save (upsert) the plan for a given date (location, weather, meals, rasa breakdown)
 * GET  → load this tenant's plan for ?date=YYYY-MM-DD (or today)
 *
 * Tenant isolation: userId from the verified JWT (getViewerUserId), never the client.
 */
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

const DailyPlanSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // free-form date label as shown on the page
    location: { type: Object, default: {} },
    weather: { type: Object, default: {} },
    meals: { type: Object, default: {} },
    rasaBreakdown: { type: Object, default: {} },
  },
  { collection: 'ritucharya_daily_plans', timestamps: true }
);
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

function getModel() {
  return mongoose.models.RitucharyaDailyPlan || mongoose.model('RitucharyaDailyPlan', DailyPlanSchema);
}

function auth(req: NextRequest): string | null {
  const token = req.headers.get('authorization')?.split('Bearer ')[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.isAdmin) return null;
  return getViewerUserId(decoded);
}

export async function GET(req: NextRequest) {
  try {
    const userId = auth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const date = new URL(req.url).searchParams.get('date');
    const query: any = { userId };
    if (date) query.date = date;
    const plan = await getModel().findOne(query).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, plan: plan || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = auth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.date) return NextResponse.json({ error: 'Missing date' }, { status: 400 });
    await connectDB();
    const plan = await getModel().findOneAndUpdate(
      { userId, date: String(body.date) },
      {
        $set: {
          userId,
          date: String(body.date),
          location: body.location || {},
          weather: body.weather || {},
          meals: body.meals || {},
          rasaBreakdown: body.rasaBreakdown || {},
        },
      },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
