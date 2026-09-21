import { bunnyBatch, bunnyExecute } from './bunnyDatabase';
import { randomBytes } from 'crypto';

const id = () => randomBytes(12).toString('hex');
const now = () => new Date().toISOString();
const json = (val: any, def = {}) => { try { return JSON.stringify(val); } catch { return JSON.stringify(def); } };
const parse = (val: string | null, def: any = {}) => { try { return val ? JSON.parse(val) : def; } catch { return def; } };
const bool = (val: any) => (val ? 1 : 0);

let schemaInitialized = false;

export async function initEmailBunnySchema() {
  if (schemaInitialized) return;
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS email_templates_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        variables_json TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL DEFAULT 'general',
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`, args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates_sql(category)`, args: [] },
    
    {
      sql: `CREATE TABLE IF NOT EXISTS email_campaigns_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        template_id TEXT,
        recipients_json TEXT NOT NULL DEFAULT '[]',
        attachments_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        sent_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        scheduled_at TEXT,
        sent_at TEXT,
        created_by TEXT,
        sent_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`, args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns_sql(status)`, args: [] },

    {
      sql: `CREATE TABLE IF NOT EXISTS email_logs_sql (
        id TEXT PRIMARY KEY,
        campaign_id TEXT,
        lead_id TEXT,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        attachments_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        opened_at TEXT,
        clicked_at TEXT,
        sent_at TEXT,
        sent_by TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`, args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs_sql(campaign_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs_sql(recipient_email)`, args: [] },

    {
      sql: `CREATE TABLE IF NOT EXISTS email_settings_sql (
        id TEXT PRIMARY KEY,
        sender_email TEXT NOT NULL UNIQUE,
        sender_name TEXT NOT NULL,
        resend_api_key TEXT,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`, args: []
    }
  ]);
  schemaInitialized = true;
}

// ------------------------------------------------------------------
// TEMPLATES
// ------------------------------------------------------------------
function mapTemplate(row: any) {
  return {
    _id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    variables: parse(row.variables_json, []),
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listEmailTemplates() {
  await initEmailBunnySchema();
  const res = await bunnyExecute('SELECT * FROM email_templates_sql ORDER BY created_at DESC');
  return res.rows.map(mapTemplate);
}

export async function getEmailTemplate(templateId: string) {
  await initEmailBunnySchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM email_templates_sql WHERE id = ?', args: [templateId] });
  if (!res.rows.length) return null;
  return mapTemplate(res.rows[0]);
}

export async function saveEmailTemplate(input: any) {
  await initEmailBunnySchema();
  const templateId = input._id || id();
  const ts = now();
  await bunnyExecute({
    sql: `INSERT INTO email_templates_sql (id, name, subject, body, variables_json, category, created_by, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, subject=excluded.subject, body=excluded.body, variables_json=excluded.variables_json, 
            category=excluded.category, updated_at=excluded.updated_at`,
    args: [
      templateId, input.name || '', input.subject || '', input.body || '', json(input.variables, []),
      input.category || 'general', input.createdBy || null, ts, ts
    ]
  });
  return getEmailTemplate(templateId);
}

export async function deleteEmailTemplate(templateId: string) {
  await initEmailBunnySchema();
  await bunnyExecute({ sql: 'DELETE FROM email_templates_sql WHERE id = ?', args: [templateId] });
  return true;
}

// ------------------------------------------------------------------
// CAMPAIGNS
// ------------------------------------------------------------------
function mapCampaign(row: any) {
  return {
    _id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    templateId: row.template_id,
    recipients: parse(row.recipients_json, []),
    attachments: parse(row.attachments_json, []),
    status: row.status,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdBy: row.created_by,
    sentBy: row.sent_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listEmailCampaigns() {
  await initEmailBunnySchema();
  const res = await bunnyExecute('SELECT * FROM email_campaigns_sql ORDER BY created_at DESC');
  return res.rows.map(mapCampaign);
}

export async function getEmailCampaign(campaignId: string) {
  await initEmailBunnySchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM email_campaigns_sql WHERE id = ?', args: [campaignId] });
  if (!res.rows.length) return null;
  return mapCampaign(res.rows[0]);
}

export async function saveEmailCampaign(input: any) {
  await initEmailBunnySchema();
  const campaignId = input._id || id();
  const ts = now();
  await bunnyExecute({
    sql: `INSERT INTO email_campaigns_sql (id, name, subject, body, template_id, recipients_json, attachments_json, status, sent_count, failed_count, scheduled_at, sent_at, created_by, sent_by, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, subject=excluded.subject, body=excluded.body, template_id=excluded.template_id, 
            recipients_json=excluded.recipients_json, attachments_json=excluded.attachments_json, status=excluded.status, 
            sent_count=excluded.sent_count, failed_count=excluded.failed_count, scheduled_at=excluded.scheduled_at, 
            sent_at=excluded.sent_at, sent_by=excluded.sent_by, updated_at=excluded.updated_at`,
    args: [
      campaignId, input.name || '', input.subject || '', input.body || '', input.templateId || null,
      json(input.recipients, []), json(input.attachments, []), input.status || 'draft', input.sentCount || 0, input.failedCount || 0,
      input.scheduledAt || null, input.sentAt || null, input.createdBy || null, input.sentBy || null, ts, ts
    ]
  });
  return getEmailCampaign(campaignId);
}

export async function deleteEmailCampaign(campaignId: string) {
  await initEmailBunnySchema();
  await bunnyExecute({ sql: 'DELETE FROM email_campaigns_sql WHERE id = ?', args: [campaignId] });
  return true;
}

// ------------------------------------------------------------------
// LOGS
// ------------------------------------------------------------------
function mapLog(row: any) {
  return {
    _id: row.id,
    campaignId: row.campaign_id,
    leadId: row.lead_id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    attachments: parse(row.attachments_json, []),
    status: row.status,
    error: row.error,
    openedAt: row.opened_at,
    clickedAt: row.clicked_at,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listEmailLogs(campaignId?: string) {
  await initEmailBunnySchema();
  let query = 'SELECT * FROM email_logs_sql';
  const args = [];
  if (campaignId) {
    query += ' WHERE campaign_id = ?';
    args.push(campaignId);
  }
  query += ' ORDER BY created_at DESC LIMIT 1000';
  const res = await bunnyExecute({ sql: query, args });
  return res.rows.map(mapLog);
}

export async function saveEmailLog(input: any) {
  await initEmailBunnySchema();
  const logId = input._id || id();
  const ts = now();
  await bunnyExecute({
    sql: `INSERT INTO email_logs_sql (id, campaign_id, lead_id, recipient_email, subject, body, attachments_json, status, error, opened_at, clicked_at, sent_at, sent_by, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
            status=excluded.status, error=excluded.error, opened_at=excluded.opened_at, clicked_at=excluded.clicked_at, 
            sent_at=excluded.sent_at, updated_at=excluded.updated_at`,
    args: [
      logId, input.campaignId || null, input.leadId || null, input.recipientEmail || '', input.subject || '', input.body || '',
      json(input.attachments, []), input.status || 'pending', input.error || null, input.openedAt || null, input.clickedAt || null,
      input.sentAt || null, input.sentBy || null, ts, ts
    ]
  });
  return true;
}

export async function saveEmailLogsBulk(logs: any[]) {
  await initEmailBunnySchema();
  const ts = now();
  const statements = logs.map(input => ({
    sql: `INSERT INTO email_logs_sql (id, campaign_id, lead_id, recipient_email, subject, body, attachments_json, status, error, opened_at, clicked_at, sent_at, sent_by, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
            status=excluded.status, error=excluded.error, opened_at=excluded.opened_at, clicked_at=excluded.clicked_at, 
            sent_at=excluded.sent_at, updated_at=excluded.updated_at`,
    args: [
      input._id || id(), input.campaignId || null, input.leadId || null, input.recipientEmail || '', input.subject || '', input.body || '',
      json(input.attachments, []), input.status || 'pending', input.error || null, input.openedAt || null, input.clickedAt || null,
      input.sentAt || null, input.sentBy || null, ts, ts
    ]
  }));
  if (statements.length > 0) {
    await bunnyBatch(statements);
  }
}

// ------------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------------
function mapSettings(row: any) {
  return {
    _id: row.id,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
    resendApiKey: row.resend_api_key,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpPass: row.smtp_pass,
    isDefault: bool(row.is_default),
    isActive: bool(row.is_active),
    isVerified: bool(row.is_verified),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listEmailSettings() {
  await initEmailBunnySchema();
  const res = await bunnyExecute('SELECT * FROM email_settings_sql ORDER BY created_at DESC');
  return res.rows.map(mapSettings);
}

export async function getEmailSettings(id: string) {
  await initEmailBunnySchema();
  const res = await bunnyExecute({ sql: 'SELECT * FROM email_settings_sql WHERE id = ?', args: [id] });
  if (!res.rows.length) return null;
  return mapSettings(res.rows[0]);
}

export async function saveEmailSettings(input: any) {
  await initEmailBunnySchema();
  const settingsId = input._id || id();
  const ts = now();
  
  if (input.isDefault) {
    await bunnyExecute('UPDATE email_settings_sql SET is_default = 0');
  }
  
  await bunnyExecute({
    sql: `INSERT INTO email_settings_sql (id, sender_email, sender_name, resend_api_key, smtp_host, smtp_port, smtp_user, smtp_pass, is_default, is_active, is_verified, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
          ON CONFLICT(id) DO UPDATE SET 
            sender_email=excluded.sender_email, sender_name=excluded.sender_name, resend_api_key=excluded.resend_api_key, 
            smtp_host=excluded.smtp_host, smtp_port=excluded.smtp_port, smtp_user=excluded.smtp_user, smtp_pass=excluded.smtp_pass, 
            is_default=excluded.is_default, is_active=excluded.is_active, is_verified=excluded.is_verified, updated_at=excluded.updated_at`,
    args: [
      settingsId, input.senderEmail, input.senderName, input.resendApiKey || null, input.smtpHost || null, input.smtpPort || null,
      input.smtpUser || null, input.smtpPass || null, bool(input.isDefault), bool(input.isActive), bool(input.isVerified), ts, ts
    ]
  });
  return getEmailSettings(settingsId);
}

export async function deleteEmailSettings(id: string) {
  await initEmailBunnySchema();
  await bunnyExecute({ sql: 'DELETE FROM email_settings_sql WHERE id = ?', args: [id] });
  return true;
}
