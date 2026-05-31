/**
 * Multi-Tenant SaaS — Module Catalog (Bundled / Grouped)
 *
 * Single source of truth for the full set of pages/features a tenant can be
 * granted. Used by:
 *   - Tenant edit/create UI (renders grouped checkboxes)
 *   - Plan definitions (which bundles a tier unlocks by default)
 *   - Runtime gating (which sidebar items / routes a tenant may access)
 *
 * Structure: a flat list of GROUPS. Each group has a stable `key` and an
 * optional list of `children` (sub-pages). A tenant's `moduleKeys` array
 * stores enabled keys — both group keys (e.g. "lead_management") and child
 * keys (e.g. "lead_management.leads").
 *
 * IMPORTANT: keys are permanent identifiers. Never rename an existing key;
 * add new ones instead. Labels can change freely.
 */

export interface ModuleChild {
  /** Stable child key, namespaced under the group: "lead_management.leads" */
  key: string;
  /** Human label shown in the UI */
  label: string;
}

export interface ModuleGroup {
  /** Stable group key, e.g. "lead_management" */
  key: string;
  /** Human label */
  label: string;
  /** Short description shown under the group title */
  description?: string;
  /** Emoji / icon hint for the UI */
  icon?: string;
  /** Sub-pages. Empty array = standalone toggle with no children. */
  children: ModuleChild[];
}

// ---------------------------------------------------------------------------
// The catalog
// ---------------------------------------------------------------------------

export const MODULE_CATALOG: ModuleGroup[] = [
  {
    key: 'lead_management',
    label: 'Lead Management',
    description: 'Leads, sales pipeline & funnel',
    icon: '👥',
    children: [
      { key: 'lead_management.leads', label: 'Leads' },
      { key: 'lead_management.sales', label: 'Sales' },
      { key: 'lead_management.funnel_manager', label: 'Funnel Manager' },
      { key: 'lead_management.reports', label: 'Reports' },
      { key: 'lead_management.settings', label: 'Settings' },
    ],
  },
  {
    key: 'whatsapp_qr',
    label: 'QR WhatsApp',
    description: 'Unofficial QR-linked WhatsApp',
    icon: '🟢',
    children: [
      { key: 'whatsapp_qr.inbox', label: 'Inbox' },
      { key: 'whatsapp_qr.broadcast', label: 'Broadcast' },
      { key: 'whatsapp_qr.groups', label: 'Groups / Merge' },
      { key: 'whatsapp_qr.templates', label: 'Templates' },
      { key: 'whatsapp_qr.schedule', label: 'Schedule' },
      { key: 'whatsapp_qr.reports', label: 'Reports' },
    ],
  },
  {
    key: 'whatsapp_meta',
    label: 'Meta WhatsApp',
    description: 'Official Meta Cloud API',
    icon: '🔵',
    children: [
      { key: 'whatsapp_meta.inbox', label: 'Inbox' },
      { key: 'whatsapp_meta.broadcast', label: 'Broadcast' },
      { key: 'whatsapp_meta.templates', label: 'Templates' },
      { key: 'whatsapp_meta.schedule', label: 'Schedule' },
      { key: 'whatsapp_meta.reports', label: 'Reports' },
    ],
  },
  {
    key: 'community',
    label: 'Community',
    description: 'Member community & feed',
    icon: '🌐',
    children: [],
  },
  {
    key: 'planner',
    label: 'Planner',
    description: 'Life / goal planner',
    icon: '🗓️',
    children: [],
  },
  {
    key: 'landing_page',
    label: 'Landing Page',
    description: 'Public landing & form builder',
    icon: '📄',
    children: [],
  },
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Telegram broadcasts & bot',
    icon: '✈️',
    children: [],
  },
  {
    key: 'email',
    label: 'Email',
    description: 'Email campaigns & templates',
    icon: '✉️',
    children: [],
  },
  {
    key: 'sms',
    label: 'SMS',
    description: 'SMS campaigns',
    icon: '💬',
    children: [],
  },
  {
    key: 'ai_calling',
    label: 'AI Calling',
    description: 'Voice AI / auto-dialer',
    icon: '📞',
    children: [],
  },
  {
    key: 'chatbot',
    label: 'Chatbot & Automation',
    description: 'Flows & automations',
    icon: '🤖',
    children: [
      { key: 'chatbot.flows', label: 'Chat Flows' },
      { key: 'chatbot.automation', label: 'Automation' },
    ],
  },
  {
    key: 'elearning',
    label: 'E-Learning',
    description: 'Courses, students & materials',
    icon: '🎓',
    children: [
      { key: 'elearning.courses', label: 'Courses' },
      { key: 'elearning.students', label: 'Students' },
      { key: 'elearning.materials', label: 'Materials' },
    ],
  },
  {
    key: 'sadhana_program',
    label: 'Sadhana Program',
    description: 'Sadhana programs & participants',
    icon: '🧘',
    children: [],
  },
  {
    key: 'sadhana_schedule',
    label: 'Sadhana Schedule',
    description: 'Daily sadhana scheduling',
    icon: '⏰',
    children: [],
  },
  {
    key: 'report',
    label: 'Report',
    description: 'Cross-module analytics',
    icon: '📊',
    children: [],
  },
  {
    key: 'tally',
    label: 'Tally',
    description: 'Accounting / Tally sync',
    icon: '🧾',
    children: [],
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Tenant configuration',
    icon: '⚙️',
    children: [],
  },
];

// ---------------------------------------------------------------------------
// Default bundles per plan tier — selecting a plan pre-fills these groups.
// Keyed by PlanTier string. Each value is a list of GROUP keys (children are
// expanded automatically via expandGroups()).
// ---------------------------------------------------------------------------

export const PLAN_DEFAULT_GROUPS: Record<string, string[]> = {
  free: ['lead_management', 'settings'],
  basic: ['lead_management', 'whatsapp_qr', 'settings'],
  starter: ['lead_management', 'whatsapp_qr', 'whatsapp_meta', 'chatbot', 'settings'],
  growth: [
    'lead_management', 'whatsapp_qr', 'whatsapp_meta', 'chatbot',
    'community', 'email', 'sms', 'report', 'settings',
  ],
  professional: [
    'lead_management', 'whatsapp_qr', 'whatsapp_meta', 'chatbot',
    'community', 'email', 'sms', 'telegram', 'planner', 'landing_page',
    'elearning', 'report', 'settings',
  ],
  enterprise: ALL_GROUP_KEYS_PLACEHOLDER(),
};

// Placeholder resolved below (ALL_GROUP_KEYS defined later in file).
function ALL_GROUP_KEYS_PLACEHOLDER(): string[] {
  return MODULE_CATALOG.map((g) => g.key);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All group keys. */
export const ALL_GROUP_KEYS: string[] = MODULE_CATALOG.map((g) => g.key);

/** Every valid key (groups + children) — used to validate incoming payloads. */
export const ALL_MODULE_KEYS: string[] = MODULE_CATALOG.flatMap((g) => [
  g.key,
  ...g.children.map((c) => c.key),
]);

const VALID_KEY_SET = new Set(ALL_MODULE_KEYS);

/**
 * Expand a group key to include all of its child keys.
 * Returns the group key itself for standalone groups.
 */
export function expandGroup(groupKey: string): string[] {
  const group = MODULE_CATALOG.find((g) => g.key === groupKey);
  if (!group) return [];
  return [group.key, ...group.children.map((c) => c.key)];
}

/**
 * Given a flat set of enabled group keys, return the fully-expanded key list
 * (every group + all its children). Convenience for "enable whole bundle".
 */
export function expandGroups(groupKeys: string[]): string[] {
  const out = new Set<string>();
  for (const gk of groupKeys) for (const k of expandGroup(gk)) out.add(k);
  return Array.from(out);
}

/**
 * Drop any keys not present in the catalog (defends against stale/garbage
 * keys arriving from the client). Order-preserving, de-duplicated.
 */
export function sanitizeModuleKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const s = String(k || '').trim();
    if (s && VALID_KEY_SET.has(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/** Quick check used by gating: is a key enabled in a tenant's moduleKeys? */
export function hasModuleKey(moduleKeys: string[] | undefined, key: string): boolean {
  if (!moduleKeys || moduleKeys.length === 0) return false;
  return moduleKeys.includes(key);
}
