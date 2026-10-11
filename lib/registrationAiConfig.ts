import { type RegistrationState } from '@/lib/registrationState';
import { parseRegistrationValue } from '@/lib/registrationValues';

export type RegistrationFilterCondition = {
  question: string;
  keyword: string;
  successCategory?: string;
  successColor?: string;
  failCategory?: string;
  failColor?: string;
  directMoveCategory?: string;
};

const REGISTRATION_STAGE_CATEGORY = /^(?:pending_leads_[1-4]|approval_[1-4])$/;

export function isRegistrationStageCategory(categoryId: string) {
  return REGISTRATION_STAGE_CATEGORY.test(categoryId);
}

export function isRegistrationStageMember(
  decision: { status?: string; isRejected?: boolean; copies?: string[] },
  categoryId: string,
) {
  return isRegistrationStageCategory(categoryId) &&
    (decision.copies?.includes(categoryId) === true ||
      (!decision.isRejected && decision.status === categoryId));
}

export function copyRegistrationDecisionToCategory<T extends Record<string, any>>(decision: T, categoryId: string) {
  return {
    ...decision,
    copies: [...new Set([...(decision.copies || []), categoryId])],
    keepCopy: true,
    reason: 'Manual Copy',
    history: [...new Set([...(decision.history || []), categoryId])],
    updatedAt: new Date().toISOString(),
  };
}

export function moveRegistrationDecisionToCategory<T extends Record<string, any>>(
  decision: T,
  targetCategory: string,
  sourceCategory: string,
) {
  const currentStatus = decision.status || 'new_leads';
  const sourceCategories = new Set([currentStatus, sourceCategory]);
  return {
    ...decision,
    status: targetCategory,
    isRejected: targetCategory === 'rejected_leads',
    copies: (decision.copies || []).filter((category: string) => !sourceCategories.has(category)),
    reason: 'Manual Move',
    history: [...new Set([...(decision.history || []), currentStatus, targetCategory])],
    updatedAt: new Date().toISOString(),
  };
}

export function registrationAiConfigKey(batchId: string, worker: string) {
  if (!batchId || !/^AI-4[A-P]?$/.test(worker)) throw new Error('Select a batch and a valid AI worker before saving');
  return `crm_ai_config_${batchId}_${worker}`;
}

export function readRegistrationAiDraft(state: RegistrationState, batchId: string, worker: string) {
  const saved = parseRegistrationValue<{ draft?: { conditions: RegistrationFilterCondition[]; copyMode: boolean } }>(
    state[registrationAiConfigKey(batchId, worker)], {});
  return Array.isArray(saved.draft?.conditions) ? saved.draft : undefined;
}

export function validateRegistrationConditions(conditions: RegistrationFilterCondition[]) {
  const routes = new Map<string, string>();
  for (const condition of conditions) {
    if (!condition.question?.trim() && !condition.keyword?.trim() && !condition.directMoveCategory) continue;
    if (condition.directMoveCategory) continue;
    if (!condition.question?.trim() || !condition.keyword?.trim() || !condition.successCategory) {
      throw new Error('Each answer rule needs a question, an answer and a destination category');
    }
    const key = `${condition.question.trim().toLowerCase()}\n${condition.keyword.trim().toLowerCase()}`;
    const previous = routes.get(key);
    if (previous && previous !== condition.successCategory) throw new Error('The same question and answer cannot route to different categories');
    routes.set(key, condition.successCategory);
  }
}

export function readRegistrationAiConfig(state: RegistrationState, batchId: string, metadata: Record<string, unknown> = {}) {
  const settings = {
    ...parseRegistrationValue<Record<string, RegistrationFilterCondition[]>>(state.crm_ai_settings_v3, {}),
    ...parseRegistrationValue<Record<string, RegistrationFilterCondition[]>>(metadata.aiSettings, {}),
  };
  const copyModes = { ...parseRegistrationValue<Record<string, boolean>>(state.crm_ai_copy_modes, {}) };
  const enabledWorkers: string[] = [];
  const prefix = `crm_ai_config_${batchId}_`;
  for (const [key, value] of Object.entries(state)) {
    if (!key.startsWith(prefix)) continue;
    const worker = key.slice(prefix.length);
    const saved = parseRegistrationValue<{ conditions: RegistrationFilterCondition[]; copyMode: boolean; autoEnabled?: boolean }>(value, { conditions: [], copyMode: true });
    if (!Array.isArray(saved.conditions)) throw new Error(`Saved ${worker} rules are invalid`);
    settings[worker] = saved.conditions;
    copyModes[worker] = saved.copyMode;
    if (saved.autoEnabled === true) enabledWorkers.push(worker);
  }
  return { settings, copyModes, enabledWorkers };
}

export function registrationDecisionKey(batchId: string, leadId: string) {
  if (!batchId || !leadId) throw new Error('Batch and form response identity are required');
  return `crm_ai_decision_${batchId}_${leadId}`;
}

export function readRegistrationDecisions(state: RegistrationState, batchId: string) {
  const decisions = { ...parseRegistrationValue<Record<string, Record<string, any>>>(state.crm_ai4_decisions, {}) };
  const prefix = `crm_ai_decision_${batchId}_`;
  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith(prefix)) {
      const id = key.slice(prefix.length);
      decisions[id] = { ...decisions[id], ...parseRegistrationValue<Record<string, any>>(value, {}) };
    }
  }
  return decisions;
}

export function evaluateRegistrationConditions(raw: Record<string, unknown>, conditions: RegistrationFilterCondition[]) {
  const normalize = (value: unknown) => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const filters = conditions.filter(condition => condition.question?.trim() || condition.keyword?.trim());
  const direct = conditions.find(condition => condition.directMoveCategory)?.directMoveCategory;
  if (!filters.length) return direct ? { passed: true, category: direct, reason: 'Configured direct move' } : null;
  const failures: string[] = [];
  let failedCategory: string | undefined;
  const groups = new Map<string, RegistrationFilterCondition[]>();
  for (const condition of filters) {
    const question = normalize(condition.question);
    groups.set(question, [...(groups.get(question) || []), condition]);
  }
  const destinations = new Set<string>();
  for (const alternatives of groups.values()) {
    let selected: RegistrationFilterCondition | undefined;
    for (const condition of alternatives) {
      const key = Object.keys(raw).find(candidate => normalize(candidate) === normalize(condition.question));
      const answer = key === undefined ? undefined : raw[key];
      const expected = normalize(condition.keyword);
      let matched = false;
      if (answer !== undefined && expected) {
        const actual = Array.isArray(answer) ? answer.map(normalize) : [normalize(answer)];
        const range = expected.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (range && /age|वय|उम्र|आयु|ವಯಸ್ಸು/i.test(condition.question)) {
          const digits = actual[0].replace(/[०-९]/g, character => String(character.charCodeAt(0) - '०'.charCodeAt(0)));
          const age = /^\d+(?:\s*(?:years?|yrs?))?$/.test(digits) ? Number.parseInt(digits, 10) : NaN;
          matched = age >= Number(range[1]) && age <= Number(range[2]);
        } else {
          matched = actual.includes(expected) || expected.split(',').map(normalize).some(option => Boolean(option) && actual.includes(option));
        }
      }
      if (matched) {
        if (selected?.successCategory && condition.successCategory && selected.successCategory !== condition.successCategory) {
          return { passed: false, category: '', reason: `Conflicting matching destinations for: ${condition.question}` };
        }
        selected = selected?.successCategory ? selected : condition;
      }
    }
    if (!selected) {
      failures.push(alternatives[0].question || 'Unmapped question');
      failedCategory ||= alternatives.find(condition => condition.failCategory)?.failCategory;
    } else if (selected.successCategory) {
      destinations.add(selected.successCategory);
    }
  }
  if (failures.length) return { passed: false, category: failedCategory || '', reason: `Required answers failed: ${failures.join(', ')}` };
  const pendingCategory = [...destinations].find(destination => destination.startsWith('pending'));
  if (pendingCategory) return { passed: false, category: pendingCategory, reason: 'Matched configured pending answer; pending takes priority across questions' };
  if (destinations.size > 1) return { passed: false, category: '', reason: 'Conflicting destinations across required questions; review configuration' };
  const category = [...destinations][0] || direct || '';
  const pending = category.startsWith('pending');
  return { passed: !pending, category, reason: pending ? 'Matched configured pending answer' : 'All required questions matched an allowed answer' };
}
