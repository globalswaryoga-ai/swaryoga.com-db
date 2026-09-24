import { bunnyExecute, bunnyBatch } from './bunnyDatabase';
import crypto from 'node:crypto';

export async function listTemplates(filter: any, limit = 50, skip = 0) {
  let sql = 'SELECT * FROM whatsapp_templates_sql WHERE 1=1';
  const args: any[] = [];
  
  if (filter.createdBy) {
    sql += ' AND created_by = ?';
    args.push(filter.createdBy);
  }
  
  if (filter.category) {
    sql += ' AND category = ?';
    args.push(filter.category);
  }
  
  if (filter.status) {
    sql += ' AND status = ?';
    args.push(filter.status);
  }
  
  if (filter.provider) {
    if (filter.provider === 'meta') {
      sql += ' AND (provider = ? OR provider IS NULL)';
      args.push('meta');
    } else {
      sql += ' AND provider = ?';
      args.push(filter.provider);
    }
  }
  
  const countSql = sql.replace('*', 'COUNT(*) as count');
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, skip);

  const [dataRes, countRes] = await Promise.all([
    bunnyExecute({ sql, args }),
    bunnyExecute({ sql: countSql, args: args.slice(0, -2) })
  ]);
  
  const templates = dataRes.rows.map(r => ({
    _id: String(r.document_id),
    ...JSON.parse(String(r.data_json)),
    // Merge any override fields if necessary
    templateName: String(r.template_name),
    category: String(r.category),
    status: String(r.status),
    provider: r.provider ? String(r.provider) : null,
    metaTemplateId: r.meta_template_id ? String(r.meta_template_id) : null,
    createdBy: r.created_by ? String(r.created_by) : null,
  }));
  
  const total = Number(countRes.rows[0].count);
  return { templates, total };
}

export async function getTemplateById(id: string) {
  const res = await bunnyExecute({ sql: 'SELECT data_json FROM whatsapp_templates_sql WHERE document_id = ?', args: [id] });
  if (res.rows.length === 0) return null;
  return {
    _id: id,
    ...JSON.parse(String(res.rows[0].data_json))
  };
}

export async function createTemplate(data: any) {
  const documentId = crypto.randomUUID();
  const templateKey = `${data.templateName}:${data.provider}:${data.category}:${data.language}:${data.metaTemplateId || ''}`;
  
  const now = new Date().toISOString();
  
  await bunnyExecute({
    sql: `INSERT INTO whatsapp_templates_sql (
      document_id, template_key, template_name, provider, category, language, status, created_by, meta_template_id, data_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      documentId,
      templateKey,
      data.templateName,
      data.provider || null,
      data.category,
      data.language || 'en',
      data.status || 'draft',
      String(data.createdBy || data.createdByUserId || ''),
      data.metaTemplateId || null,
      JSON.stringify(data),
      now,
      now
    ]
  });
  
  return { _id: documentId, ...data };
}

export async function updateTemplate(id: string, updates: any) {
  const existing = await getTemplateById(id);
  if (!existing) return null;
  
  const merged = { ...existing, ...updates };
  
  // Extract indexable fields
  const templateKey = `${merged.templateName}:${merged.provider}:${merged.category}:${merged.language}:${merged.metaTemplateId || ''}`;
  const now = new Date().toISOString();
  
  await bunnyExecute({
    sql: `UPDATE whatsapp_templates_sql SET
      template_key = ?,
      template_name = ?,
      provider = ?,
      category = ?,
      language = ?,
      status = ?,
      created_by = ?,
      meta_template_id = ?,
      data_json = ?,
      updated_at = ?
    WHERE document_id = ?`,
    args: [
      templateKey,
      merged.templateName,
      merged.provider || null,
      merged.category,
      merged.language || 'en',
      merged.status || 'draft',
      String(merged.createdBy || merged.createdByUserId || ''),
      merged.metaTemplateId || null,
      JSON.stringify(merged),
      now,
      id
    ]
  });
  
  return merged;
}

export async function deleteTemplate(id: string) {
  await bunnyExecute({ sql: 'DELETE FROM whatsapp_templates_sql WHERE document_id = ?', args: [id] });
}

export async function findMetaTemplate(metaId: string, name: string) {
  const sql = `SELECT * FROM whatsapp_templates_sql WHERE meta_template_id = ? OR template_name = ? LIMIT 1`;
  const res = await bunnyExecute({ sql, args: [metaId, name] });
  if (res.rows.length === 0) return null;
  
  return {
    _id: String(res.rows[0].document_id),
    ...JSON.parse(String(res.rows[0].data_json)),
    templateName: String(res.rows[0].template_name),
    metaTemplateId: res.rows[0].meta_template_id ? String(res.rows[0].meta_template_id) : null,
  };
}
