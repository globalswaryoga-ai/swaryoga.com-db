import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

function parse(value: unknown): any | null {
  try { return JSON.parse(String(value)); } catch { return null; }
}

export async function initBunnyReceiptsSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS crm_receipts_sql (
        document_id TEXT PRIMARY KEY,
        lead_id TEXT,
        sale_id TEXT,
        receipt_number TEXT UNIQUE,
        issued_by_user_id TEXT,
        customer_phone TEXT,
        issued_at TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_lead_id ON crm_receipts_sql(lead_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_sale_id ON crm_receipts_sql(sale_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_crm_receipts_customer_phone ON crm_receipts_sql(customer_phone)`, args: [] }
  ]);
}

function normalizeReceipt(row: any) {
  const receipt = parse(row.data_json) || {};
  return {
    ...receipt,
    _id: String(receipt._id?.$oid || receipt._id || row.document_id),
    issuedAt: receipt.issuedAt?.$date ? new Date(Number(receipt.issuedAt.$date.$numberLong || receipt.issuedAt.$date)).toISOString() : (receipt.issuedAt || row.issued_at),
    createdAt: receipt.createdAt?.$date ? new Date(Number(receipt.createdAt.$date.$numberLong || receipt.createdAt.$date)).toISOString() : (receipt.createdAt || row.created_at),
    updatedAt: receipt.updatedAt?.$date ? new Date(Number(receipt.updatedAt.$date.$numberLong || receipt.updatedAt.$date)).toISOString() : (receipt.updatedAt || row.updated_at)
  };
}

export async function getBunnyReceiptById(id: string) {
  await initBunnyReceiptsSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, created_at, updated_at FROM crm_receipts_sql WHERE document_id = ?',
    args: [id]
  });
  if (!result.rows[0]) return null;
  return normalizeReceipt(result.rows[0]);
}

export async function getBunnyReceiptBySaleId(saleId: string) {
  await initBunnyReceiptsSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, created_at, updated_at FROM crm_receipts_sql WHERE sale_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [saleId]
  });
  if (!result.rows[0]) return null;
  return normalizeReceipt(result.rows[0]);
}

export async function getBunnyReceiptByLeadId(leadId: string) {
  await initBunnyReceiptsSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, created_at, updated_at FROM crm_receipts_sql WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [leadId]
  });
  if (!result.rows[0]) return null;
  return normalizeReceipt(result.rows[0]);
}

export async function createBunnyReceipt(input: any) {
  await initBunnyReceiptsSchema();
  const id = input._id || crypto.randomUUID();
  const now = new Date().toISOString();
  const issuedAt = input.issuedAt ? new Date(input.issuedAt).toISOString() : now;

  const data = { ...input, _id: id, createdAt: now, updatedAt: now };

  await bunnyExecute({
    sql: `INSERT INTO crm_receipts_sql (
      document_id, receipt_key, lead_id, sale_id, lead_number, receipt_number, issued_by_user_id, customer_name, customer_phone, customer_email, workshop_name, status, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.receiptNumber ? String(input.receiptNumber) : id,
      String(input.leadId || ''),
      String(input.saleId || ''),
      String(input.leadNumber || ''),
      input.receiptNumber ? String(input.receiptNumber) : null,
      String(input.issuedByUserId || ''),
      String(input.customerName || ''),
      String(input.customerPhone || ''),
      String(input.customerEmail || ''),
      String(input.workshopName || ''),
      'completed',
      JSON.stringify(data),
      now,
      now
    ]
  });

  return getBunnyReceiptById(id);
}

export async function updateBunnyReceipt(id: string, updates: any) {
  await initBunnyReceiptsSchema();
  const existing = await getBunnyReceiptById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedData = { ...existing, ...updates, updatedAt: now };

  await bunnyExecute({
    sql: `UPDATE crm_receipts_sql SET 
      lead_id = ?, sale_id = ?, receipt_number = ?, issued_by_user_id = ?, customer_phone = ?, data_json = ?, updated_at = ?
      WHERE document_id = ?`,
    args: [
      String(updatedData.leadId || ''),
      String(updatedData.saleId || ''),
      updatedData.receiptNumber ? String(updatedData.receiptNumber) : null,
      String(updatedData.issuedByUserId || ''),
      String(updatedData.customerPhone || ''),
      JSON.stringify(updatedData),
      now,
      id
    ]
  });

  return getBunnyReceiptById(id);
}

export async function getBunnyReceiptsByLeadId(leadId: string, limit: number = 50) {
  await initBunnyReceiptsSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, created_at, updated_at FROM crm_receipts_sql WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [leadId, limit]
  });
  return result.rows.map(normalizeReceipt);
}

export async function getBunnyReceiptsByPhone(phone: string, limit: number = 50) {
  await initBunnyReceiptsSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, created_at, updated_at FROM crm_receipts_sql WHERE customer_phone = ? ORDER BY created_at DESC LIMIT ?',
    args: [phone, limit]
  });
  return result.rows.map(normalizeReceipt);
}

