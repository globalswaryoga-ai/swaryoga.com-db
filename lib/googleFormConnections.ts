import { bunnyExecute } from '@/lib/bunnyDatabase';
import { extractGoogleFormId, type GoogleFormTarget } from '@/lib/googleFormsSync';

export type GoogleFormConnections = Record<string, { workshop?: string; offer?: string }>;

export async function readGoogleFormConnections(): Promise<GoogleFormConnections> {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS global_crm_config (
      config_key TEXT PRIMARY KEY, config_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )`, args: [],
  });
  const result = await bunnyExecute({ sql: "SELECT config_value FROM global_crm_config WHERE config_key = 'google_form_links'", args: [] });
  if (!result.rows.length) return {};
  const config: unknown = JSON.parse(String(result.rows[0].config_value));
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Saved Google Form connections are invalid.');
  return config as GoogleFormConnections;
}

export function connectedGoogleFormTargets(config: GoogleFormConnections): GoogleFormTarget[] {
  const targets = new Map<string, GoogleFormTarget>();
  for (const [language, links] of Object.entries(config)) {
    if (!links || typeof links !== 'object' || Array.isArray(links)) throw new Error(`Invalid ${language} Google Form connections.`);
    for (const kind of ['workshop', 'offer'] as const) {
      const link = links?.[kind];
      if (!link) continue;
      const formId = extractGoogleFormId(link);
      if (!formId) throw new Error(`The saved ${language} ${kind} Google Form link needs a valid form ID or edit URL.`);
      if (!targets.has(formId)) targets.set(formId, { formId, name: `${language} ${kind === 'workshop' ? 'Workshop' : 'Offer'} Form` });
    }
  }
  return [...targets.values()];
}
