import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';
import crypto from 'crypto';

function parse(value: unknown): any | null {
  try { return JSON.parse(String(value)); } catch { return null; }
}

export async function initBunnySalesSchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS sales_reports_sql (
        document_id TEXT PRIMARY KEY,
        user_id TEXT,
        lead_id TEXT,
        reported_by_user_id TEXT,
        sale_amount REAL,
        sale_date TEXT,
        batch_date TEXT,
        payment_mode TEXT,
        bank_name TEXT,
        workshop_name TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: []
    },
    { sql: `CREATE INDEX IF NOT EXISTS idx_sales_reported_by ON sales_reports_sql(reported_by_user_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON sales_reports_sql(lead_id)`, args: [] },
    { sql: `CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales_reports_sql(sale_date)`, args: [] }
  ]);
}

function normalizeSale(row: any) {
  const sale = parse(row.data_json) || {};
  return {
    ...sale,
    _id: String(sale._id?.$oid || sale._id || row.document_id),
    saleDate: sale.saleDate?.$date ? new Date(Number(sale.saleDate.$date.$numberLong || sale.saleDate.$date)).toISOString() : (sale.saleDate || row.sale_date),
    batchDate: sale.batchDate?.$date ? new Date(Number(sale.batchDate.$date.$numberLong || sale.batchDate.$date)).toISOString() : (sale.batchDate || row.batch_date),
    createdAt: sale.createdAt?.$date ? new Date(Number(sale.createdAt.$date.$numberLong || sale.createdAt.$date)).toISOString() : (sale.createdAt || row.created_at),
    updatedAt: sale.updatedAt?.$date ? new Date(Number(sale.updatedAt.$date.$numberLong || sale.updatedAt.$date)).toISOString() : (sale.updatedAt || row.updated_at)
  };
}

export async function loadBunnySales() {
  await initBunnySalesSchema();
  const result = await bunnyExecute('SELECT document_id, data_json, sale_date, batch_date, created_at, updated_at FROM sales_reports_sql ORDER BY sale_date DESC');
  return result.rows.map(normalizeSale);
}

export async function getBunnySaleById(id: string) {
  await initBunnySalesSchema();
  const result = await bunnyExecute({
    sql: 'SELECT document_id, data_json, sale_date, batch_date, created_at, updated_at FROM sales_reports_sql WHERE document_id = ?',
    args: [id]
  });
  if (!result.rows[0]) return null;
  return normalizeSale(result.rows[0]);
}

export async function createBunnySale(input: any) {
  await initBunnySalesSchema();
  const id = input._id || crypto.randomUUID();
  const now = new Date().toISOString();
  const saleDate = input.saleDate ? new Date(input.saleDate).toISOString() : now;
  const batchDate = input.batchDate ? new Date(input.batchDate).toISOString() : null;

  const data = { ...input, _id: id, createdAt: now, updatedAt: now };

  await bunnyExecute({
    sql: `INSERT INTO sales_reports_sql (
      document_id, user_id, lead_id, reported_by_user_id, sale_amount, sale_date, batch_date, payment_mode, bank_name, workshop_name, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      String(input.userId || ''),
      String(input.leadId || ''),
      String(input.reportedByUserId || ''),
      Number(input.saleAmount || 0),
      saleDate,
      batchDate,
      String(input.paymentMode || ''),
      String(input.bankName || ''),
      String(input.workshopName || ''),
      JSON.stringify(data),
      now,
      now
    ]
  });

  return getBunnySaleById(id);
}

export async function updateBunnySale(id: string, updates: any) {
  await initBunnySalesSchema();
  const existing = await getBunnySaleById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedData = { ...existing, ...updates, updatedAt: now };
  
  const saleDate = updatedData.saleDate ? new Date(updatedData.saleDate).toISOString() : existing.saleDate;
  const batchDate = updatedData.batchDate ? new Date(updatedData.batchDate).toISOString() : existing.batchDate;

  await bunnyExecute({
    sql: `UPDATE sales_reports_sql SET 
      user_id = ?, lead_id = ?, reported_by_user_id = ?, sale_amount = ?, sale_date = ?, batch_date = ?, payment_mode = ?, bank_name = ?, workshop_name = ?, data_json = ?, updated_at = ?
      WHERE document_id = ?`,
    args: [
      String(updatedData.userId || ''),
      String(updatedData.leadId || ''),
      String(updatedData.reportedByUserId || ''),
      Number(updatedData.saleAmount || 0),
      saleDate,
      batchDate,
      String(updatedData.paymentMode || ''),
      String(updatedData.bankName || ''),
      String(updatedData.workshopName || ''),
      JSON.stringify(updatedData),
      now,
      id
    ]
  });

  return getBunnySaleById(id);
}

export async function deleteBunnySale(id: string) {
  await initBunnySalesSchema();
  const result = await bunnyExecute({
    sql: 'DELETE FROM sales_reports_sql WHERE document_id = ?',
    args: [id]
  });
  return result.rowsAffected > 0;
}
