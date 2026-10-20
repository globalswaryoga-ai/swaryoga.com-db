import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch, cleanMongoJson } from '@/lib/bunnyDatabase';

const fields = ['name', 'enabled', 'triggerType', 'keywords', 'conditions', 'throttleMinutesPerLead',
  'actionType', 'actionText', 'actionTemplateId', 'actionTemplateVariables', 'actionLeadUpdates', 'provider', 'imageUrl', 'mediaUrl'];

async function schema() {
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS chatbot_automation_rules_sql (
    document_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, data_json TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  await bunnyExecute('CREATE INDEX IF NOT EXISTS idx_chatbot_rules_owner ON chatbot_automation_rules_sql(owner_id)');
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS chatbot_rule_imports_sql (document_id TEXT PRIMARY KEY)`);
  const archive = await bunnyExecute("SELECT name FROM sqlite_master WHERE type='table' AND name='mongo_documents'");
  if (archive.rows.length) {
    const rows = await bunnyExecute(`SELECT document_id,document_json FROM mongo_documents
      WHERE collection_name='whatsapp_automation_rules'
      AND document_id NOT IN (SELECT document_id FROM chatbot_rule_imports_sql)`);
    for (const row of rows.rows) {
      const value = cleanMongoJson(JSON.parse(String(row.document_json)));
      const id = String(value._id || row.document_id);
      const owner = String(value.createdByUserId || 'admincrm');
      await bunnyBatch([
        { sql: `INSERT INTO chatbot_automation_rules_sql(document_id,owner_id,data_json,created_at,updated_at)
          VALUES (?,?,?,?,?) ON CONFLICT(document_id) DO NOTHING`,
          args: [id, owner, JSON.stringify({ ...value, _id: id }), value.createdAt || new Date().toISOString(), value.updatedAt || new Date().toISOString()] },
        { sql: 'INSERT INTO chatbot_rule_imports_sql(document_id) VALUES (?) ON CONFLICT(document_id) DO NOTHING', args: [row.document_id] },
      ]);
    }
  }
}

export async function listBunnyAutomationRules(owner: string) {
  await schema();
  const rows = await bunnyExecute({ sql: 'SELECT data_json FROM chatbot_automation_rules_sql WHERE owner_id=? ORDER BY created_at DESC', args: [owner] });
  return rows.rows.map(row => JSON.parse(String(row.data_json)) as Record<string, any>);
}

export async function saveBunnyAutomationRule(input: Record<string, any>, owner: string, id: string = crypto.randomUUID()) {
  await schema();
  const existing = (await listBunnyAutomationRules(owner)).find(rule => rule._id === id);
  const patch = Object.fromEntries(fields.filter(field => Object.prototype.hasOwnProperty.call(input, field)).map(field => [field, input[field]]));
  const value = { enabled: false, triggerType: 'keyword', throttleMinutesPerLead: 5, ...existing, ...patch,
    _id: id, createdByUserId: owner, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  const name = patch.name ?? existing?.name;
  const actionType = patch.actionType ?? existing?.actionType;
  const keywords = patch.keywords ?? existing?.keywords;
  if (typeof name !== 'string' || !name.trim()) throw new Error('Rule name is required.');
  if (!['keyword', 'welcome', 'any_message'].includes(value.triggerType)) throw new Error('Unsupported automation trigger.');
  if (!['send_text', 'send_template', 'update_lead', 'send_image'].includes(actionType)) throw new Error('Unsupported automation action.');
  if (value.triggerType === 'keyword' && (!value.keywords || !value.keywords.length) && name?.trim()) {
    value.keywords = [name.trim()];
  }
  const effectiveKeywords = value.keywords;
  if (effectiveKeywords && (!Array.isArray(effectiveKeywords) || effectiveKeywords.some((k: unknown) => typeof k !== 'string' || !k.trim()))) throw new Error('Keywords must be nonempty strings.');
  if (typeof value.enabled !== 'boolean' || !Number.isFinite(value.throttleMinutesPerLead) || value.throttleMinutesPerLead < 0) throw new Error('Invalid enabled state or throttle minutes.');
  await bunnyExecute({ sql: `INSERT INTO chatbot_automation_rules_sql (document_id,owner_id,data_json,created_at,updated_at) VALUES (?,?,?,?,?)
    ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at WHERE owner_id=excluded.owner_id`,
    args: [id, owner, JSON.stringify(value), value.createdAt, value.updatedAt] });
  return value;
}

export async function deleteBunnyAutomationRule(id: string, owner: string) {
  await schema();
  const result = await bunnyExecute({ sql: 'DELETE FROM chatbot_automation_rules_sql WHERE document_id=? AND owner_id=?', args: [id, owner] });
  return Number(result.rowsAffected);
}
