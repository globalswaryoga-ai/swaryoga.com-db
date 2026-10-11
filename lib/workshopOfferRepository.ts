import { bunnyBatch, bunnyExecute, getBunnyDatabase } from './bunnyDatabase';
import { readRegistrationState } from './registrationState';

export async function initOfferSchema() {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS workshop_offer_state_sql (scope TEXT NOT NULL, state_key TEXT NOT NULL, value_json TEXT NOT NULL, PRIMARY KEY(scope,state_key))', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS workshop_offer_records_sql (scope TEXT NOT NULL, lead_id TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(scope,lead_id))', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS workshop_offer_designs_sql (scope TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(scope,id))', args: [] },
  ]);
}

export async function readOfferState(scope: string): Promise<Record<string, unknown>> {
  await initOfferSchema();
  const existing = await bunnyExecute({ sql: 'SELECT state_key,value_json FROM workshop_offer_state_sql WHERE scope = ?', args: [scope] });
  if (!existing.rows.length) {
    const legacy = await readRegistrationState(scope);
    const keys = ['crm_offers', 'crm_offer_data'];
    await bunnyBatch(Object.entries({ ...Object.fromEntries(Object.entries(legacy).filter(([key]) => keys.includes(key) || key.startsWith('crm_offer_'))), __initialized: true }).map(([key, value]) => ({
      sql: 'INSERT INTO workshop_offer_state_sql(scope,state_key,value_json) VALUES (?,?,?) ON CONFLICT(scope,state_key) DO NOTHING', args: [scope, key, JSON.stringify(value)],
    })));
    return readOfferState(scope);
  }
  return Object.fromEntries(existing.rows.filter(row => row.state_key !== '__initialized').map(row => [String(row.state_key), JSON.parse(String(row.value_json))]));
}

export async function writeOfferState(scope: string, patch: Record<string, unknown>) {
  await initOfferSchema();
  if (!Object.keys(patch).length) return;
  await bunnyBatch(Object.entries(patch).map(([key, value]) => ({
    sql: 'INSERT INTO workshop_offer_state_sql(scope,state_key,value_json) VALUES (?,?,?) ON CONFLICT(scope,state_key) DO UPDATE SET value_json=excluded.value_json',
    args: [scope, key, JSON.stringify(value)],
  })));
}

export async function listOfferRecords(scope: string): Promise<Record<string, Record<string, unknown>>> {
  await initOfferSchema();
  const state = await readOfferState(scope);
  let legacy = state.crm_offer_data;
  if (typeof legacy === 'string') legacy = JSON.parse(legacy);
  if (!state.__payment_imported && legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    const statements = Object.entries(legacy).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)).map(([id, value]) => {
      const record = value as Record<string, unknown>;
      const draft = Object.fromEntries(['amount', 'date', 'paymentMode', 'remark', 'batchId', 'workshopName'].filter(key => key in record).map(key => [key, record[key]]));
      return { sql: 'INSERT INTO workshop_offer_records_sql(scope,lead_id,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(scope,lead_id) DO NOTHING',
        args: [scope, id, JSON.stringify({ ...draft, status: 'pending', legacyStatus: record.status || null, needsVerification: true }), new Date().toISOString()] };
    });
    await bunnyBatch([...statements, { sql: "INSERT INTO workshop_offer_state_sql(scope,state_key,value_json) VALUES(?,'__payment_imported','true') ON CONFLICT(scope,state_key) DO NOTHING", args: [scope] }]);
  }
  const rows = await bunnyExecute({ sql: 'SELECT lead_id,data_json FROM workshop_offer_records_sql WHERE scope=?', args: [scope] });
  return Object.fromEntries(rows.rows.map(row => [String(row.lead_id), JSON.parse(String(row.data_json))]));
}

export async function savedOfferGoogleTargets() {
  await initOfferSchema();
  const rows = await bunnyExecute("SELECT scope,value_json FROM workshop_offer_state_sql WHERE state_key='crm_offers'");
  return rows.rows.map(row => {
    let batches = JSON.parse(String(row.value_json));
    if (typeof batches === 'string') batches = JSON.parse(batches);
    return { scope: String(row.scope), batches: Array.isArray(batches) ? batches : [] };
  });
}

export async function patchOfferRecord(scope: string, leadId: string, patch: Record<string, unknown>, expected?: Record<string, unknown>) {
  await initOfferSchema();
  if (expected) {
    const result = await bunnyExecute(Object.keys(expected).length ? {
      sql: 'UPDATE workshop_offer_records_sql SET data_json=json_patch(data_json,?),updated_at=? WHERE scope=? AND lead_id=? AND data_json=?',
      args: [JSON.stringify(patch), new Date().toISOString(), scope, leadId, JSON.stringify(expected)],
    } : {
      sql: 'INSERT INTO workshop_offer_records_sql(scope,lead_id,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(scope,lead_id) DO NOTHING',
      args: [scope, leadId, JSON.stringify(patch), new Date().toISOString()],
    });
    if (!result.rowsAffected) throw new Error('Payment changed in another request; refresh and retry');
    return;
  }
  await bunnyExecute({
    sql: `INSERT INTO workshop_offer_records_sql(scope,lead_id,data_json,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(scope,lead_id) DO UPDATE SET data_json=json_patch(workshop_offer_records_sql.data_json,excluded.data_json),updated_at=excluded.updated_at`,
    args: [scope, leadId, JSON.stringify(patch), new Date().toISOString()],
  });
}

export async function listOfferDesigns(scope: string) {
  await initOfferSchema();
  const rows = await bunnyExecute({ sql: 'SELECT data_json FROM workshop_offer_designs_sql WHERE scope=? ORDER BY updated_at DESC', args: [scope] });
  return rows.rows.map(row => JSON.parse(String(row.data_json)));
}

export async function saveOfferDesign(scope: string, id: string, kind: string, data: Record<string, unknown>) {
  await initOfferSchema();
  await bunnyExecute({
    sql: 'INSERT INTO workshop_offer_designs_sql(scope,id,kind,data_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(scope,id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at',
    args: [scope, id, kind, JSON.stringify({ ...data, id, kind }), new Date().toISOString()],
  });
}

export async function finalizeOfferDocument(scope: string, id: string, kind: string, design: Record<string, unknown>, leadId: string, expected: Record<string, unknown>, patch: Record<string, unknown>) {
  const transaction = await getBunnyDatabase().transaction('write');
  try {
    const record = await transaction.execute({ sql: 'SELECT data_json FROM workshop_offer_records_sql WHERE scope=? AND lead_id=?', args: [scope, leadId] });
    const existing = await transaction.execute({ sql: 'SELECT data_json FROM workshop_offer_designs_sql WHERE scope=? AND id=?', args: [scope, id] });
    if (String(record.rows[0]?.data_json) !== JSON.stringify(expected)) throw new Error('Payment changed during document creation. Refresh and retry.');
    if (existing.rows[0] && JSON.parse(String(existing.rows[0].data_json)).status === 'final') throw new Error('This payment already has a final document.');
    const now = new Date().toISOString();
    await transaction.execute({ sql: 'INSERT INTO workshop_offer_designs_sql(scope,id,kind,data_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(scope,id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at', args: [scope, id, kind, JSON.stringify(design), now] });
    await transaction.execute({ sql: 'UPDATE workshop_offer_records_sql SET data_json=json_patch(data_json,?),updated_at=? WHERE scope=? AND lead_id=?', args: [JSON.stringify(patch), now, scope, leadId] });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally { transaction.close(); }
}
