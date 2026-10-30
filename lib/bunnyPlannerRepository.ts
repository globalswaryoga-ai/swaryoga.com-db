import { bunnyExecute } from '@/lib/bunnyDatabase';

let initialized = false;

async function ensureTable() {
  if (initialized) return;
  try {
    await bunnyExecute({
      sql: `CREATE TABLE IF NOT EXISTS crm_planner_data_sql (
        owner_id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL DEFAULT 'user',
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    });
    initialized = true;
  } catch (err) {
    console.warn('[BunnyPlannerRepo] ensureTable error (may already exist):', err);
    initialized = true;
  }
}

export interface BunnyPlannerRecord {
  ownerId: string;
  ownerType: string;
  visions?: any[];
  actionPlans?: any[];
  goals?: any[];
  tasks?: any[];
  todos?: any[];
  words?: any[];
  reminders?: any[];
  healthRoutines?: any[];
  dailyHealthPlans?: any[];
  diamondPeople?: any[];
  progress?: any[];
  events?: any[];
  accounting?: any;
  dailyTasks?: Record<string, any>;
  [key: string]: any;
  createdAt?: string;
  updatedAt?: string;
}

export async function getBunnyPlannerData(ownerId: string): Promise<BunnyPlannerRecord | null> {
  await ensureTable();
  const normalizedOwner = ownerId.trim().toLowerCase();
  const result = await bunnyExecute({
    sql: 'SELECT owner_id, owner_type, data_json, created_at, updated_at FROM crm_planner_data_sql WHERE lower(owner_id) = ? LIMIT 1',
    args: [normalizedOwner],
  });

  const row = result.rows[0];
  if (!row) return null;

  try {
    const parsed = JSON.parse(String(row.data_json || '{}'));
    return {
      ownerId: String(row.owner_id),
      ownerType: String(row.owner_type || 'user'),
      ...parsed,
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    };
  } catch {
    return null;
  }
}

export async function saveBunnyPlannerField(
  ownerId: string,
  ownerType: string,
  fieldName: string,
  dataToSave: any
): Promise<any> {
  await ensureTable();
  const normalizedOwner = ownerId.trim().toLowerCase();
  const existing = await getBunnyPlannerData(normalizedOwner);

  const timestamp = new Date().toISOString();
  const currentData = existing || {
    ownerId: normalizedOwner,
    ownerType,
    createdAt: timestamp,
  };

  const updatedData: Record<string, any> = {
    ...currentData,
    [fieldName]: dataToSave,
    updatedAt: timestamp,
  };

  // Strip top-level metadata from JSON payload to avoid redundancy
  const { ownerId: _o, ownerType: _t, createdAt: _c, updatedAt: _u, ...fieldsOnly } = updatedData;

  await bunnyExecute({
    sql: `INSERT INTO crm_planner_data_sql (owner_id, owner_type, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET
        owner_type = excluded.owner_type,
        data_json = excluded.data_json,
        updated_at = excluded.updated_at`,
    args: [
      normalizedOwner,
      ownerType,
      JSON.stringify(fieldsOnly),
      currentData.createdAt || timestamp,
      timestamp,
    ],
  });

  return updatedData;
}

export async function getBunnyDailyTasks(ownerId: string, date: string): Promise<any> {
  const planner = await getBunnyPlannerData(ownerId);
  const dailyTasksMap = planner?.dailyTasks || (planner as any)?.lifePlannerDailyTasks || {};
  return dailyTasksMap[date] || {
    workshopTasks: [],
    sadhana: null,
    date,
  };
}

export async function saveBunnyDailyTasks(
  ownerId: string,
  date: string,
  tasksData: { workshopTasks?: any[]; sadhana?: any }
): Promise<any> {
  const planner = await getBunnyPlannerData(ownerId);
  const dailyTasksMap = planner?.dailyTasks || (planner as any)?.lifePlannerDailyTasks || {};
  dailyTasksMap[date] = {
    ...(dailyTasksMap[date] || {}),
    ...tasksData,
    date,
    updatedAt: new Date().toISOString(),
  };

  await saveBunnyPlannerField(ownerId, 'user', 'dailyTasks', dailyTasksMap);
  return dailyTasksMap[date];
}
