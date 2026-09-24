import { bunnyExecute } from '@/lib/bunnyDatabase';

const collections = ['community_experiences', 'community_questions', 'community_tips', 'community_transformations'] as const;
type ModerationCollection = typeof collections[number];

function parse(value: unknown): any | null { try { return JSON.parse(String(value)); } catch { return null; } }
function oid(value: any, fallback: string) { return String(value?.$oid || value || fallback); }

export async function listBunnyModerationItems(collection: ModerationCollection, status = 'approved', limit = 50) {
  const rows = await bunnyExecute({ sql: 'SELECT document_id, document_json FROM mongo_documents WHERE collection_name = ?', args: [collection] });
  const items = rows.rows.flatMap((row: any) => {
    const item = parse(row.document_json);
    if (!item || (status !== 'all' && item.status !== status)) return [];
    return [{ ...item, _id: oid(item._id, String(row.document_id)) }];
  }).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, Math.max(1, Math.min(limit, 200)));
  return items;
}

export async function countBunnyModerationPending(collection: ModerationCollection) {
  const rows = await bunnyExecute({ sql: 'SELECT document_json FROM mongo_documents WHERE collection_name = ?', args: [collection] });
  return rows.rows.reduce((count: number, row: any) => count + (parse(row.document_json)?.status === 'pending' ? 1 : 0), 0);
}
