import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface PromotionalOffer {
  _id: string;
  title: string;
  description: string;
  discountPercentage: number;
  offerCode: string;
  validFrom: string;
  validUntil: string;
  targetUsers?: string;
  selectedUserEmails?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

let schemaPromise: Promise<void> | null = null;
async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await bunnyExecute(`CREATE TABLE IF NOT EXISTS promotional_offers_sql (
        document_id TEXT PRIMARY KEY,
        offer_code TEXT UNIQUE,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);
      await bunnyExecute('CREATE INDEX IF NOT EXISTS idx_promotional_offers_code ON promotional_offers_sql(offer_code)');
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

export async function listOffers(): Promise<PromotionalOffer[]> {
  await ensureSchema();
  const res = await bunnyExecute('SELECT data_json FROM promotional_offers_sql ORDER BY created_at DESC');
  return res.rows.map((row) => JSON.parse(String(row.data_json)));
}

export async function getOfferByCode(code: string): Promise<PromotionalOffer | null> {
  await ensureSchema();
  const normalized = String(code || '').trim().toUpperCase();
  const res = await bunnyExecute({
    sql: 'SELECT data_json FROM promotional_offers_sql WHERE offer_code = ?',
    args: [normalized],
  });
  if (!res.rows.length) return null;
  return JSON.parse(String(res.rows[0].data_json));
}

export async function saveOffer(data: Partial<PromotionalOffer> & { offerCode: string }): Promise<PromotionalOffer> {
  await ensureSchema();
  const id = data._id || `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const offerCode = String(data.offerCode).trim().toUpperCase();

  const record: PromotionalOffer = {
    _id: id,
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    discountPercentage: Number(data.discountPercentage || 0),
    offerCode,
    validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : now,
    validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : now,
    targetUsers: data.targetUsers || 'all',
    selectedUserEmails: Array.isArray(data.selectedUserEmails) ? data.selectedUserEmails : [],
    isActive: data.isActive !== false,
    createdBy: data.createdBy || 'admin@swaryoga.com',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  await bunnyExecute({
    sql: `INSERT INTO promotional_offers_sql (document_id, offer_code, data_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(document_id) DO UPDATE SET
            offer_code = excluded.offer_code,
            data_json = excluded.data_json,
            updated_at = excluded.updated_at`,
    args: [id, offerCode, JSON.stringify(record), record.createdAt, record.updatedAt],
  });

  return record;
}

export async function deleteOffer(id: string): Promise<boolean> {
  await ensureSchema();
  const res = await bunnyExecute({
    sql: 'DELETE FROM promotional_offers_sql WHERE document_id = ? OR offer_code = ?',
    args: [id, id.toUpperCase()],
  });
  return Number(res.rowsAffected || 0) > 0;
}
