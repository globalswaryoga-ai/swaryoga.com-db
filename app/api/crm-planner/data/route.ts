import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const TENANT_HEADER = 'x-tenant-id';

// ── Schema: dedicated planner data collection ──────────────
// One document per owner — owner = admin username or user email/id
// Stored in the CRM database (swaryoga_admin_crm)
let CrmPlannerModel: mongoose.Model<any> | null = null;

function getPlannerModel() {
  if (CrmPlannerModel) return CrmPlannerModel;

  const crmDb = mongoose.connection.useDb(
    process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    { useCache: true }
  );

  if (crmDb.models['CrmPlannerData']) {
    CrmPlannerModel = crmDb.models['CrmPlannerData'];
    return CrmPlannerModel;
  }

  const schema = new mongoose.Schema({
    ownerId:           { type: String, required: true, unique: true, index: true },
    ownerType:         { type: String, default: 'user' }, // 'admin' | 'user'
    crmVisions:        { type: mongoose.Schema.Types.Mixed, default: [] },
    crmActionPlans:    { type: mongoose.Schema.Types.Mixed, default: [] },
    crmGoals:          { type: mongoose.Schema.Types.Mixed, default: [] },
    crmTasks:          { type: mongoose.Schema.Types.Mixed, default: [] },
    crmTodos:          { type: mongoose.Schema.Types.Mixed, default: [] },
    crmWords:          { type: mongoose.Schema.Types.Mixed, default: [] },
    crmReminders:      { type: mongoose.Schema.Types.Mixed, default: [] },
    crmHealthRoutines: { type: mongoose.Schema.Types.Mixed, default: [] },
    crmDailyHealthPlans: { type: mongoose.Schema.Types.Mixed, default: [] },
    crmDiamondPeople:  { type: mongoose.Schema.Types.Mixed, default: [] },
    crmProgress:       { type: mongoose.Schema.Types.Mixed, default: [] },
    crmEvents:         { type: mongoose.Schema.Types.Mixed, default: [] },
    updatedAt:         { type: Date, default: Date.now },
    createdAt:         { type: Date, default: Date.now },
  }, { strict: false });

  CrmPlannerModel = crmDb.model('CrmPlannerData', schema, 'crm_planner_data');
  return CrmPlannerModel;
}

// ── helpers ────────────────────────────────────────────────

const EMPTY_DATA = {
  visions: [], actionPlans: [], goals: [], tasks: [], todos: [],
  words: [], reminders: [], healthRoutines: [], dailyHealthPlans: [],
  diamondPeople: [], progress: [], events: [],
};

function typeToField(type: string): string {
  // crm_visions → crmVisions, crm_actionPlans → crmActionPlans, etc.
  return 'crm' + type
    .replace(/^crm_?/, '')
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function buildResponse(doc: any) {
  return {
    visions:          Array.isArray(doc?.crmVisions)          ? doc.crmVisions          : [],
    actionPlans:      Array.isArray(doc?.crmActionPlans)      ? doc.crmActionPlans      : [],
    goals:            Array.isArray(doc?.crmGoals)            ? doc.crmGoals            : [],
    tasks:            Array.isArray(doc?.crmTasks)            ? doc.crmTasks            : [],
    todos:            Array.isArray(doc?.crmTodos)            ? doc.crmTodos            : [],
    words:            Array.isArray(doc?.crmWords)            ? doc.crmWords            : [],
    reminders:        Array.isArray(doc?.crmReminders)        ? doc.crmReminders        : [],
    healthRoutines:   Array.isArray(doc?.crmHealthRoutines)   ? doc.crmHealthRoutines   : [],
    dailyHealthPlans: Array.isArray(doc?.crmDailyHealthPlans) ? doc.crmDailyHealthPlans : [],
    diamondPeople:    Array.isArray(doc?.crmDiamondPeople)    ? doc.crmDiamondPeople    : [],
    progress:         Array.isArray(doc?.crmProgress)         ? doc.crmProgress         : [],
    events:           Array.isArray(doc?.crmEvents)           ? doc.crmEvents           : [],
  };
}

/**
 * Resolve the owner ID from the JWT token.
 * Admin: uses username (e.g. 'admincrm')
 * Tenant/user: uses email or userId
 */
function getOwnerId(payload: any): { ownerId: string; ownerType: string } | null {
  if (!payload) return null;

  // Admin token: { username, isAdmin: true }
  if (payload.isAdmin && payload.username) {
    return { ownerId: String(payload.username).trim().toLowerCase(), ownerType: 'admin' };
  }

  // Regular user token: { email, userId }
  const email  = payload.email ? String(payload.email).trim().toLowerCase() : null;
  const userId = payload.userId || payload._id || payload.id;

  if (email) return { ownerId: email, ownerType: 'user' };
  if (userId) return { ownerId: String(userId), ownerType: 'user' };

  return null;
}

function getPayload(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// ─────────────────────────────────────────────────────────
// GET /api/crm-planner/data
// ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request);
    const owner   = getOwnerId(payload);

    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const Model = getPlannerModel();

    const dataType = request.nextUrl.searchParams.get('type');

    const doc = await Model.findOne({ ownerId: owner.ownerId }).lean() as any;

    if (!doc) {
      return dataType
        ? NextResponse.json({ data: [] })
        : NextResponse.json(EMPTY_DATA);
    }

    if (dataType) {
      const field = typeToField(dataType);
      return NextResponse.json({ data: Array.isArray(doc[field]) ? doc[field] : [] });
    }

    return NextResponse.json(buildResponse(doc));

  } catch (error: any) {
    console.error('[CRM Planner GET]', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/crm-planner/data
// ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const payload = getPayload(request);
    const owner   = getOwnerId(payload);

    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const { type, data } = body;
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const fieldName = typeToField(type);

    await connectDB();
    const Model = getPlannerModel();

    // Upsert — always succeeds even if no document exists yet
    await Model.findOneAndUpdate(
      { ownerId: owner.ownerId },
      {
        $set: {
          [fieldName]: Array.isArray(data) ? data : [],
          ownerType: owner.ownerType,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          ownerId: owner.ownerId,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    console.log(`[CRM Planner POST] ✅ Saved ${type} for ${owner.ownerType} "${owner.ownerId}"`);

    return NextResponse.json({
      message: 'Data saved successfully',
      data: Array.isArray(data) ? data : [],
    });

  } catch (error: any) {
    console.error('[CRM Planner POST]', error?.message);
    return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 });
  }
}
