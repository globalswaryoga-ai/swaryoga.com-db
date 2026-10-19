import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getBunnyPlannerData,
  saveBunnyPlannerField,
} from '@/lib/bunnyPlannerRepository';

export const dynamic = 'force-dynamic';

const EMPTY_DATA = {
  visions: [],
  actionPlans: [],
  goals: [],
  tasks: [],
  todos: [],
  words: [],
  reminders: [],
  healthRoutines: [],
  dailyHealthPlans: [],
  diamondPeople: [],
  progress: [],
  events: [],
  accounting: { accounts: [], transactions: [], investments: [], budget: null },
  expenseBudgets: [],
};

function typeToField(type: string): string {
  // crm_visions → crmVisions, crm_actionPlans → crmActionPlans, etc.
  return (
    'crm' +
    type
      .replace(/^crm_?/, '')
      .split('_')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  );
}

function buildResponse(doc: any) {
  return {
    visions: Array.isArray(doc?.crmVisions) ? doc.crmVisions : [],
    actionPlans: Array.isArray(doc?.crmActionPlans) ? doc.crmActionPlans : [],
    goals: Array.isArray(doc?.crmGoals) ? doc.crmGoals : [],
    tasks: Array.isArray(doc?.crmTasks) ? doc.crmTasks : [],
    todos: Array.isArray(doc?.crmTodos) ? doc.crmTodos : [],
    words: Array.isArray(doc?.crmWords) ? doc.crmWords : [],
    reminders: Array.isArray(doc?.crmReminders) ? doc.crmReminders : [],
    healthRoutines: Array.isArray(doc?.crmHealthRoutines) ? doc.crmHealthRoutines : [],
    dailyHealthPlans: Array.isArray(doc?.crmDailyHealthPlans) ? doc.crmDailyHealthPlans : [],
    diamondPeople: Array.isArray(doc?.crmDiamondPeople) ? doc.crmDiamondPeople : [],
    progress: Array.isArray(doc?.crmProgress) ? doc.crmProgress : [],
    events: Array.isArray(doc?.crmEvents) ? doc.crmEvents : [],
    accounting: doc?.crmAccounting || { accounts: [], transactions: [], investments: [], budget: null },
    expenseBudgets: Array.isArray(doc?.crmExpenseBudgets) ? doc.crmExpenseBudgets : [],
  };
}

function getOwnerId(payload: any): { ownerId: string; ownerType: string } | null {
  if (!payload) return null;

  // Admin token: { username, isAdmin: true }
  if (payload.isAdmin && payload.username) {
    return { ownerId: String(payload.username).trim().toLowerCase(), ownerType: 'admin' };
  }

  // Regular user token: { email, userId }
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
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
// GET /api/crm-planner/data (Bunny Database)
// ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const payload = getPayload(request);
    const owner = getOwnerId(payload);

    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await getBunnyPlannerData(owner.ownerId);
    const dataType = request.nextUrl.searchParams.get('type');

    if (!doc) {
      return dataType ? NextResponse.json({ data: [] }) : NextResponse.json(EMPTY_DATA);
    }

    if (dataType) {
      const field = typeToField(dataType);
      if (dataType === 'accounting') {
        return NextResponse.json({
          data: (doc as any)[field] || { accounts: [], transactions: [], investments: [], budget: null },
        });
      }
      return NextResponse.json({
        data: Array.isArray((doc as any)[field]) ? (doc as any)[field] : [],
      });
    }

    return NextResponse.json(buildResponse(doc));
  } catch (error: any) {
    console.error('[CRM Planner GET BunnyDB]', error?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/crm-planner/data (Bunny Database)
// ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const payload = getPayload(request);
    const owner = getOwnerId(payload);

    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { type, data } = body;
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const fieldName = typeToField(type);

    const dataToSave =
      type === 'accounting'
        ? data || { accounts: [], transactions: [], investments: [], budget: null }
        : Array.isArray(data)
        ? data
        : [];

    await saveBunnyPlannerField(owner.ownerId, owner.ownerType, fieldName, dataToSave);

    console.log(`[CRM Planner POST BunnyDB] ✅ Saved ${type} for ${owner.ownerType} "${owner.ownerId}"`);

    return NextResponse.json({
      message: 'Data saved successfully to Bunny Database',
      data: dataToSave,
    });
  } catch (error: any) {
    console.error('[CRM Planner POST BunnyDB]', error?.message);
    return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 });
  }
}
