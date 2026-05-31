/**
 * Bridge between the NEW grouped module catalog (moduleCatalog.ts) and the
 * LEGACY CRM gating flags (moduleOverrides + channelAccess used by
 * lib/crm-site/tenantPlanAccess.ts).
 *
 * The CRM Users admin page now selects bundles from the new catalog, but the
 * runtime still gates features via the legacy boolean flags. These helpers
 * translate in both directions so:
 *   - selecting a bundle correctly turns the legacy flags on/off (gating works)
 *   - existing tenants with only legacy flags map back to catalog bundles
 *     (so the new picker shows their current access)
 */

import { MODULE_CATALOG, expandGroups } from './moduleCatalog';

// Legacy CrmModule flags we care about (subset of planConfig CrmModule keys).
type LegacyModuleFlag =
  | 'leads' | 'whatsapp' | 'broadcasting' | 'templates' | 'reports'
  | 'community' | 'emailMarketing' | 'landingPages' | 'automation'
  | 'chatbot' | 'aiCalls' | 'helpdesk' | 'accounting' | 'lifePlanner';

type LegacyChannel =
  | 'metaWhatsApp' | 'qrWhatsApp' | 'emailMarketing' | 'landingPages'
  | 'community' | 'automation' | 'helpdesk';

interface LegacyMap {
  modules?: LegacyModuleFlag[];
  channels?: LegacyChannel[];
}

/**
 * New catalog GROUP key → the legacy flags it controls.
 * Groups with no legacy equivalent (telegram, sms, elearning, sadhana_*,
 * settings) map to nothing — they are new-catalog-only features.
 */
export const GROUP_TO_LEGACY: Record<string, LegacyMap> = {
  lead_management: { modules: ['leads', 'reports'] },
  whatsapp_qr: { modules: ['whatsapp', 'broadcasting', 'templates'], channels: ['qrWhatsApp'] },
  whatsapp_meta: { modules: ['whatsapp'], channels: ['metaWhatsApp'] },
  community: { modules: ['community'], channels: ['community'] },
  planner: { modules: ['lifePlanner', 'accounting'] },
  landing_page: { modules: ['landingPages'], channels: ['landingPages'] },
  telegram: {},
  email: { modules: ['emailMarketing'], channels: ['emailMarketing'] },
  sms: {},
  ai_calling: { modules: ['aiCalls'] },
  chatbot: { modules: ['chatbot', 'automation'], channels: ['automation'] },
  elearning: {},
  sadhana_program: {},
  sadhana_schedule: {},
  report: { modules: ['reports'] },
  tally: { modules: ['accounting'] },
  settings: {},
};

const ALL_LEGACY_MODULE_FLAGS = Array.from(
  new Set(Object.values(GROUP_TO_LEGACY).flatMap((m) => m.modules || [])),
) as LegacyModuleFlag[];

const ALL_LEGACY_CHANNELS = Array.from(
  new Set(Object.values(GROUP_TO_LEGACY).flatMap((m) => m.channels || [])),
) as LegacyChannel[];

/**
 * Given enabled catalog keys, produce the legacy flag objects for gating.
 * Every known legacy flag is set explicitly (true if any enabled group maps
 * to it, false otherwise) so disabling a bundle actually revokes access.
 */
export function moduleKeysToLegacy(moduleKeys: string[]): {
  moduleOverrides: Record<string, boolean>;
  channelAccess: Record<string, boolean>;
} {
  const enabledGroups = new Set(
    moduleKeys.filter((k) => !k.includes('.')), // group keys only
  );

  const moduleOverrides: Record<string, boolean> = {};
  const channelAccess: Record<string, boolean> = {};
  for (const f of ALL_LEGACY_MODULE_FLAGS) moduleOverrides[f] = false;
  for (const c of ALL_LEGACY_CHANNELS) channelAccess[c] = false;

  for (const groupKey of enabledGroups) {
    const map = GROUP_TO_LEGACY[groupKey];
    if (!map) continue;
    for (const f of map.modules || []) moduleOverrides[f] = true;
    for (const c of map.channels || []) channelAccess[c] = true;
  }

  return { moduleOverrides, channelAccess };
}

/**
 * Reverse: given a tenant's legacy flags, infer which catalog GROUPS are on.
 * A group is considered enabled if ANY of its mapped legacy flags is truthy.
 * Returns the fully-expanded key list (groups + their children).
 */
export function legacyToModuleKeys(
  channelAccess: Record<string, any> | undefined,
  moduleOverrides: Record<string, any> | undefined,
): string[] {
  const ch = channelAccess || {};
  const mo = moduleOverrides || {};
  const enabledGroups: string[] = [];

  for (const group of MODULE_CATALOG) {
    const map = GROUP_TO_LEGACY[group.key];
    if (!map) continue;
    const anyModule = (map.modules || []).some((f) => mo[f] === true);
    const anyChannel = (map.channels || []).some((c) => ch[c] === true);
    if (anyModule || anyChannel) enabledGroups.push(group.key);
  }

  return expandGroups(enabledGroups);
}
