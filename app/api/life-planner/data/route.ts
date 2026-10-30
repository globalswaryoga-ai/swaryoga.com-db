import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBunnyPlannerData, saveBunnyPlannerField } from '@/lib/bunnyPlannerRepository';

export const dynamic = 'force-dynamic';

function getAuthedOwnerId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const userId = payload.userId || (payload as any)._id || (payload as any).id;
  const username = (payload as any).username ? String((payload as any).username).trim().toLowerCase() : '';

  return email || (userId ? String(userId) : '') || username || null;
}

const EMPTY_LIFE_DATA = {
  data: [],
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
  accounting: { accounts: [], transactions: [], investments: [], budget: null },
};

// GET Life Planner data from Bunny Database
export async function GET(request: NextRequest) {
  try {
    const ownerId = getAuthedOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type');

    const planner = await getBunnyPlannerData(ownerId);

    if (!planner) {
      if (dataType) {
        if (dataType === 'accounting') {
          return NextResponse.json({ data: { accounts: [], transactions: [], investments: [], budget: null } });
        }
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json(EMPTY_LIFE_DATA);
    }

    if (dataType) {
      const fieldName = `lifePlanner${dataType.charAt(0).toUpperCase()}${dataType.slice(1)}`;
      const crmFieldName = `crm${dataType.charAt(0).toUpperCase()}${dataType.slice(1)}`;
      let result = planner[dataType] ?? planner[fieldName] ?? planner[crmFieldName];

      if (dataType === 'accounting') {
        result = result || { accounts: [], transactions: [], investments: [], budget: null };
      } else {
        result = result || [];
      }

      return NextResponse.json({ data: result });
    }

    return NextResponse.json({
      visions: planner.visions || (planner as any).lifePlannerVisions || planner.crmVisions || [],
      actionPlans: planner.actionPlans || (planner as any).lifePlannerActionPlans || planner.crmActionPlans || [],
      goals: planner.goals || (planner as any).lifePlannerGoals || planner.crmGoals || [],
      tasks: planner.tasks || (planner as any).lifePlannerTasks || planner.crmTasks || [],
      todos: planner.todos || (planner as any).lifePlannerTodos || planner.crmTodos || [],
      words: planner.words || (planner as any).lifePlannerWords || planner.crmWords || [],
      reminders: planner.reminders || (planner as any).lifePlannerReminders || planner.crmReminders || [],
      healthRoutines: planner.healthRoutines || (planner as any).lifePlannerHealthRoutines || planner.crmHealthRoutines || [],
      dailyHealthPlans: planner.dailyHealthPlans || (planner as any).lifePlannerDailyHealthPlans || planner.crmDailyHealthPlans || [],
      diamondPeople: planner.diamondPeople || (planner as any).lifePlannerDiamondPeople || planner.crmDiamondPeople || [],
      progress: planner.progress || (planner as any).lifePlannerProgress || planner.crmProgress || [],
      accounting: planner.accounting || (planner as any).lifePlannerAccounting || planner.crmAccounting || { accounts: [], transactions: [], investments: [], budget: null },
    });
  } catch (error) {
    console.error('[BunnyLifePlanner GET error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update Life Planner data in Bunny Database
export async function PUT(request: NextRequest) {
  try {
    const ownerId = getAuthedOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    const fieldName = `lifePlanner${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    const crmFieldName = `crm${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    // Save both the simple key and the legacy prefixed keys in Bunny Database
    await saveBunnyPlannerField(ownerId, 'user', type, data);
    await saveBunnyPlannerField(ownerId, 'user', fieldName, data);
    await saveBunnyPlannerField(ownerId, 'user', crmFieldName, data);

    return NextResponse.json({
      message: 'Data saved successfully to Bunny Database',
      data,
    });
  } catch (error) {
    console.error('[BunnyLifePlanner PUT error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
