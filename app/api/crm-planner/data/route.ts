import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const TENANT_HEADER = 'x-tenant-id';

// Admin's personal email — planner data saved here for admin users
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'swarsakshi9@gmail.com';

function getTenantId(request: NextRequest): string | null {
  return request.headers.get(TENANT_HEADER);
}

// All CRM planner field names
const CRM_FIELDS = [
  'crmVisions', 'crmActionPlans', 'crmGoals', 'crmTasks', 'crmTodos',
  'crmWords', 'crmReminders', 'crmHealthRoutines', 'crmDailyHealthPlans',
  'crmDiamondPeople', 'crmProgress', 'crmEvents',
];

const EMPTY_DATA = {
  data: [],
  visions: [], actionPlans: [], goals: [], tasks: [], todos: [],
  words: [], reminders: [], healthRoutines: [], dailyHealthPlans: [],
  diamondPeople: [], progress: [], events: [],
};

/**
 * Fallback: Get admin planner collection from CRM database.
 * Used only when no User document exists for ADMIN_EMAIL.
 */
function getAdminPlannerCollection() {
  const crmDb = mongoose.connection.useDb(
    process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm',
    { useCache: true }
  );
  return crmDb.collection('admin_planner_data');
}

/**
 * Convert type string to field name: crm_visions → crmVisions
 */
function typeToField(type: string): string {
  return 'crm' + type
    .replace(/^crm_/, '')
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Auth: returns payload or null. Accepts admin and regular user tokens.
 */
function getPayload(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

/**
 * Build a full planner response object from a document (User or admin_planner_data)
 */
function buildPlannerResponse(doc: any) {
  return {
    visions: doc.crmVisions || [],
    actionPlans: doc.crmActionPlans || [],
    goals: doc.crmGoals || [],
    tasks: doc.crmTasks || [],
    todos: doc.crmTodos || [],
    words: doc.crmWords || [],
    reminders: doc.crmReminders || [],
    healthRoutines: doc.crmHealthRoutines || [],
    dailyHealthPlans: doc.crmDailyHealthPlans || [],
    diamondPeople: doc.crmDiamondPeople || [],
    progress: doc.crmProgress || [],
    events: doc.crmEvents || [],
  };
}

// ─────────────────────────────────────────────────────────
// GET /api/crm-planner/data
// ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const dataType = request.nextUrl.searchParams.get('type');
    const fieldName = dataType ? typeToField(dataType) : null;

    // ── Admin users: read from User doc at ADMIN_EMAIL ──
    if (payload.isAdmin && payload.username) {
      // Primary: find User by admin email
      const adminUser = await User.findOne({ email: ADMIN_EMAIL }).lean() as any;

      if (adminUser) {
        if (fieldName) {
          return NextResponse.json({ data: Array.isArray(adminUser[fieldName]) ? adminUser[fieldName] : [] });
        }
        return NextResponse.json(buildPlannerResponse(adminUser));
      }

      // Fallback: read from admin_planner_data collection
      const col = getAdminPlannerCollection();
      const doc = await col.findOne({ adminId: payload.username });

      if (!doc) {
        return fieldName
          ? NextResponse.json({ data: [] })
          : NextResponse.json(EMPTY_DATA);
      }

      if (fieldName) {
        return NextResponse.json({ data: Array.isArray(doc[fieldName]) ? doc[fieldName] : [] });
      }
      return NextResponse.json(buildPlannerResponse(doc));
    }

    // ── Regular users: read from User collection by userId or email ──
    const tenantId = getTenantId(request);
    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;

    if (!userId && !email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orConditions: any[] = [];
    if (userId && Types.ObjectId.isValid(String(userId))) {
      orConditions.push(tenantId ? { _id: userId, tenantId } : { _id: userId });
    }
    if (email) {
      orConditions.push(tenantId
        ? { email: email.trim().toLowerCase(), tenantId }
        : { email: email.trim().toLowerCase() });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
    const user = await User.findOne(query).lean() as any;

    if (!user) {
      return fieldName
        ? NextResponse.json({ data: [] })
        : NextResponse.json(EMPTY_DATA);
    }

    if (fieldName) {
      return NextResponse.json({ data: Array.isArray(user[fieldName]) ? user[fieldName] : [] });
    }

    return NextResponse.json(buildPlannerResponse(user));

  } catch (error: any) {
    console.error('[CRM Planner GET]', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/crm-planner/data  — Save data
// ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const payload = getPayload(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let body: any;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { type, data } = body;
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const fieldName = typeToField(type);

    // ── Admin users: save to User doc at ADMIN_EMAIL ──
    if (payload.isAdmin && payload.username) {
      // Primary: try to update the User document for admin email
      const adminUser = await User.findOneAndUpdate(
        { email: ADMIN_EMAIL },
        { $set: { [fieldName]: data, updatedAt: new Date() } },
        { new: true }
      );

      if (adminUser) {
        console.log(`[CRM Planner POST] ✅ Saved ${type} for admin at ${ADMIN_EMAIL}`);
        return NextResponse.json({ message: 'Data saved successfully', data: (adminUser as any)[fieldName] });
      }

      // Fallback: save to admin_planner_data collection if no User doc for admin email
      const col = getAdminPlannerCollection();
      await col.updateOne(
        { adminId: payload.username },
        {
          $set: { [fieldName]: data, updatedAt: new Date() },
          $setOnInsert: { adminId: payload.username, createdAt: new Date() },
        },
        { upsert: true }
      );

      console.log(`[CRM Planner POST] ✅ Saved ${type} for admin ${payload.username} (fallback collection)`);
      return NextResponse.json({ message: 'Data saved successfully', data });
    }

    // ── Regular users: save to User collection by userId or email ──
    const tenantId = getTenantId(request);
    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;

    if (!userId && !email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orConditions: any[] = [];
    if (userId && Types.ObjectId.isValid(String(userId))) {
      orConditions.push(tenantId ? { _id: userId, tenantId } : { _id: userId });
    }
    if (email) {
      orConditions.push(tenantId
        ? { email: email.trim().toLowerCase(), tenantId }
        : { email: email.trim().toLowerCase() });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
    const user = await User.findOneAndUpdate(
      query,
      { $set: { [fieldName]: data, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      console.warn(`[CRM Planner POST] User not found for query`);
      return NextResponse.json({ message: 'No user found to update', data: [] });
    }

    console.log(`[CRM Planner POST] ✅ Saved ${type} for user ${email || userId}`);
    return NextResponse.json({ message: 'Data saved successfully', data: (user as any)[fieldName] });

  } catch (error: any) {
    console.error('[CRM Planner POST]', error?.message);
    return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 });
  }
}
