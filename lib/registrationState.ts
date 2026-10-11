import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { fetchFromStorage } from '@/lib/bunny-storage';
import { parseRegistrationValue } from '@/lib/registrationValues';
export { parseRegistrationValue } from '@/lib/registrationValues';

export type RegistrationState = Record<string, unknown>;
const LANGUAGES = ['english', 'hindi', 'marathi', 'kannada'];

export function registrationWorkshops(state: RegistrationState): Array<Record<string, any>> {
  const workshops = new Map<string, Record<string, any>>();
  for (const key of ['crm_workshops', ...LANGUAGES.map(language => `crm_${language}_workshops`)]) {
    const list = parseRegistrationValue<Array<Record<string, any>>>(state[key], []);
    if (!Array.isArray(list)) throw new Error(`Invalid workshop list: ${key}`);
    for (const workshop of list) {
      if (workshop?.id) workshops.set(String(workshop.id), workshop);
    }
  }
  return [...workshops.values()];
}

async function ensureState(scope: string) {
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS registration_state_sql (
    scope TEXT NOT NULL, state_key TEXT NOT NULL, value_json TEXT NOT NULL,
    PRIMARY KEY (scope, state_key)
  )`);
  const existing = await bunnyExecute({ sql: 'SELECT state_key FROM registration_state_sql WHERE scope = ? LIMIT 1', args: [scope] });
  if (existing.rows.length) return;
  let legacy: RegistrationState = {};
  if (scope === 'shared') {
    // Storage is only read during initial import; an outage must not replace historical state with defaults.
    const { buffer } = await fetchFromStorage('admin/crm/new-registration-state.json');
    legacy = JSON.parse(buffer.toString('utf8'));
  }
  await bunnyBatch(Object.entries({ ...legacy, __initialized: true }).map(([key, value]) => ({
    sql: 'INSERT INTO registration_state_sql (scope, state_key, value_json) VALUES (?, ?, ?) ON CONFLICT(scope, state_key) DO NOTHING',
    args: [scope, key, JSON.stringify(value)],
  })));
}

export async function readRegistrationState(scope = 'shared'): Promise<RegistrationState> {
  await ensureState(scope);
  const result = await bunnyExecute({ sql: 'SELECT state_key, value_json FROM registration_state_sql WHERE scope = ?', args: [scope] });
  return Object.fromEntries(result.rows.filter(row => row.state_key !== '__initialized').map(row => [String(row.state_key), JSON.parse(String(row.value_json))]));
}

export async function readRegistrationDecisionState(batchId: string, scope = 'shared'): Promise<RegistrationState> {
  await ensureState(scope);
  const prefix = `crm_ai_decision_${batchId}_`;
  const result = await bunnyExecute({
    sql: `SELECT state_key, value_json FROM registration_state_sql
      WHERE scope = ? AND (state_key = 'crm_ai4_decisions' OR substr(state_key, 1, ?) = ?)`,
    args: [scope, prefix.length, prefix],
  });
  return Object.fromEntries(result.rows.map(row => [String(row.state_key), JSON.parse(String(row.value_json))]));
}

export async function writeRegistrationState(patch: RegistrationState, scope = 'shared') {
  await ensureState(scope);
  const entries = Object.entries(patch);
  if (entries.length) await bunnyBatch(entries.map(([key, value]) => ({
    sql: 'INSERT INTO registration_state_sql (scope, state_key, value_json) VALUES (?, ?, ?) ON CONFLICT(scope, state_key) DO UPDATE SET value_json = excluded.value_json',
    args: [scope, key, JSON.stringify(value)],
  })));
}

export async function mergeRegistrationState(patch: RegistrationState, scope = 'shared') {
  await ensureState(scope);
  const entries = Object.entries(patch);
  if (entries.length) await bunnyBatch(entries.map(([key, value]) => ({
    sql: `INSERT INTO registration_state_sql (scope, state_key, value_json) VALUES (?, ?, ?)
      ON CONFLICT(scope, state_key) DO UPDATE SET value_json = json_patch(registration_state_sql.value_json, excluded.value_json)`,
    args: [scope, key, JSON.stringify(value)],
  })));
}

export async function replaceRegistrationStateIfUnchanged(key: string, value: unknown, previous: unknown, scope = 'shared') {
  await ensureState(scope);
  const result = previous === undefined
    ? await bunnyExecute({
      sql: 'INSERT INTO registration_state_sql (scope, state_key, value_json) VALUES (?, ?, ?) ON CONFLICT(scope, state_key) DO NOTHING',
      args: [scope, key, JSON.stringify(value)],
    })
    : await bunnyExecute({
      sql: 'UPDATE registration_state_sql SET value_json = ? WHERE scope = ? AND state_key = ? AND value_json = ?',
      args: [JSON.stringify(value), scope, key, JSON.stringify(previous)],
    });
  return result.rowsAffected === 1;
}

export async function saveRegistrationGate(key: string, patch: unknown, previous: unknown, scope = 'shared') {
  await ensureState(scope);
  const result = previous === undefined
    ? await bunnyExecute({
      sql: 'INSERT INTO registration_state_sql (scope, state_key, value_json) VALUES (?, ?, ?) ON CONFLICT(scope, state_key) DO NOTHING',
      args: [scope, key, JSON.stringify(patch)],
    })
    : await bunnyExecute({
      sql: 'UPDATE registration_state_sql SET value_json = json_patch(value_json, ?) WHERE scope = ? AND state_key = ? AND value_json = ?',
      args: [JSON.stringify(patch), scope, key, JSON.stringify(previous)],
    });
  return result.rowsAffected === 1;
}
