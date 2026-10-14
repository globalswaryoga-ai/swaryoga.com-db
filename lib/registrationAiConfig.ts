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

export function extractBaseLanguage(str?: string): string {
  if (!str) return '';
  const lower = String(str).toLowerCase();
  if (lower.includes('hindi')) return 'hindi';
  if (lower.includes('marathi')) return 'marathi';
  if (lower.includes('kannada')) return 'kannada';
  if (lower.includes('english')) return 'english';
  return '';
}

export const CRM_TECHNICAL_FIELDS = new Set([
  'id', '_id', 'leadid', 'leadnumber', 'title', 'phonenumber', 'phone', 'mobile', 'whatsapp', 'email', 'name',
  'source', 'workshopname', 'workshopid', 'country', 'countrycode', 'region', 'state', 'city', 'address',
  'languagecode', 'language', 'funnelstage', 'chatstatus', 'lastmessageat', 'googleformid', 'formid',
  'formsource', 'lastinboundat', 'gender', 'paymentstatus', 'currency', 'formdata', 'responseid',
  'submittedat', 'firsttouchedby', 'chatstatusclosedat', 'chatstatusclosedby', 'walastfailcode',
  '_rawrecord', 'dynamicanswers', 'history', 'copies', 'status', 'createdat', 'updatedat',
  'batchid', 'batchname', 'iscsv', 'labels', 'assignedtouserid', 'username', 'deliverystatus',
  'deliverystatusat', 'lastnote', 'notes', 'tags', 'metadata', 'verified', 'registeredat',
  'timestamp', 'emailaddress', 'lead', 'category', 'successcategory', 'action', 'type',
  'assignedto', 'createdby', 'updatedby', 'firstmessage', 'lastmessage', 'customfields',
  'stage', 'keyword', 'question', 'successcolor', 'failcolor', 'directmovecategory'
]);

export function isTechnicalCrmField(field: unknown): boolean {
  if (!field || typeof field !== 'string') return true;
  const clean = field.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return CRM_TECHNICAL_FIELDS.has(clean);
}

export function isQuestionMatchingLanguage(text: string, language: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  const base = extractBaseLanguage(language);

  const hasKannada = /[\u0C80-\u0CFF]/.test(trimmed);
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  const hasLatin = /[a-zA-Z]/.test(trimmed);

  if (base === 'kannada') {
    if (hasDevanagari) return false;
    return hasKannada;
  }

  if (base === 'english') {
    if (hasDevanagari || hasKannada) return false;
    return hasLatin;
  }

  if (hasKannada) return false;

  // For Hindi or Marathi:
  // Reject pure English/Latin questions that have no Devanagari script
  if (!hasDevanagari) {
    return false;
  }

  // Devanagari is present:
  // Marathi distinctive character ळ (\u0933)
  const hasMarathiLa = /[\u0933]/.test(trimmed);

  const marathiRegex = /(?:^|[^\p{L}\p{M}\p{N}])(तुम्ही|तुमचा|तुमची|तुमचे|तुमच्या|आहात|आहे|आहेत|नाही|नाहीत|करणार|ठेवणार|येणार|शिकणार|देण्यास|असाल|दिवसांचा|होय|कधी|शेवटी|वर्कशॉपच्या|क्लासच्या|वेळेस|वेळी)(?:[^\p{L}\p{M}\p{N}]|$)/u;
  const marathiKaRegex = /\s+का\s*[?？\s]*$/;
  const isMarathiPhrasing = hasMarathiLa || marathiRegex.test(trimmed) || marathiKaRegex.test(trimmed);

  const hindiRegex = /(?:^|[^\p{L}\p{M}\p{N}])(आप|आपका|आपकी|आपके|अपने|आपने|क्या|करेंगे|करेंगी|सकते|सकती|होगा|होगी|होंगे|रहेंगे|रखेंगे|चाहते|हाँ|नहीं|हैं|था|थी|थे|अगर|कब|लिखें|दौरान)(?:[^\p{L}\p{M}\p{N}]|$)/u;
  const isHindiPhrasing = hindiRegex.test(trimmed);

  if (base === 'marathi') {
    if (isHindiPhrasing && !isMarathiPhrasing) return false;
    return true;
  }

  if (base === 'hindi') {
    if (isMarathiPhrasing) return false;
    return true;
  }

  return true;
}


export function readRegistrationAiDraft(state: RegistrationState, batchId: string, worker: string, targetLanguage?: string) {
  const directKey = `crm_ai_config_${batchId}_${worker}`;
  const directVal = state[directKey];
  if (directVal !== undefined) {
    const saved = parseRegistrationValue<{ draft?: { conditions: RegistrationFilterCondition[]; copyMode: boolean } }>(directVal, {});
    if (Array.isArray(saved.draft?.conditions)) return saved.draft;
  }
  // Sibling / master fallback if specific batchId has no draft — strictly for the same language
  const targetLang = extractBaseLanguage(targetLanguage) || extractBaseLanguage(batchId);
  const suffix = `_${worker}`;
  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith('crm_ai_config_') && key.endsWith(suffix) && key !== directKey) {
      if (targetLang && !key.toLowerCase().includes(targetLang)) continue;
      const saved = parseRegistrationValue<{ draft?: { conditions: RegistrationFilterCondition[]; copyMode: boolean } }>(value, {});
      if (Array.isArray(saved.draft?.conditions) && saved.draft.conditions.length > 0) return saved.draft;
    }
  }
  return undefined;
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

  // Pass 1: Sibling fallback across state scoped strictly to the target language
  const targetLang = extractBaseLanguage(batchId) || extractBaseLanguage(metadata.language as string);
  for (const [key, value] of Object.entries(state)) {
    if (!key.startsWith('crm_ai_config_')) continue;
    if (targetLang && !key.toLowerCase().includes(targetLang)) continue;
    const match = key.match(/^crm_ai_config_.+?_(AI-4[A-P]?)$/);
    if (!match) continue;
    const worker = match[1];
    const saved = parseRegistrationValue<{ conditions: RegistrationFilterCondition[]; copyMode: boolean; autoEnabled?: boolean; draft?: { conditions: RegistrationFilterCondition[]; copyMode: boolean } }>(value, { conditions: [], copyMode: true });
    const effectiveConditions = (Array.isArray(saved.conditions) && saved.conditions.length > 0)
      ? saved.conditions
      : (Array.isArray(saved.draft?.conditions) && saved.draft.conditions.length > 0 ? saved.draft.conditions : undefined);
    if (effectiveConditions && (!settings[worker] || settings[worker].length === 0)) {
      settings[worker] = effectiveConditions;
      if (saved.copyMode !== undefined) copyModes[worker] = saved.copyMode;
    }
  }

  // Pass 2: Specific batchId overrides
  const prefix = `crm_ai_config_${batchId}_`;
  for (const [key, value] of Object.entries(state)) {
    if (!key.startsWith(prefix)) continue;
    const worker = key.slice(prefix.length);
    const saved = parseRegistrationValue<{ conditions: RegistrationFilterCondition[]; copyMode: boolean; autoEnabled?: boolean; draft?: { conditions: RegistrationFilterCondition[]; copyMode: boolean } }>(value, { conditions: [], copyMode: true });
    if (!Array.isArray(saved.conditions)) throw new Error(`Saved ${worker} rules are invalid`);
    if (saved.conditions.length > 0) {
      settings[worker] = saved.conditions;
    } else if (Array.isArray(saved.draft?.conditions) && saved.draft.conditions.length > 0) {
      settings[worker] = saved.draft.conditions;
    } else {
      settings[worker] = saved.conditions;
    }
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
  const cleanKey = (value: unknown) => normalize(value).replace(/[:?？!.]+/g, '').trim();
  const filters = conditions.filter(condition => condition.question?.trim() || condition.keyword?.trim());
  const direct = conditions.find(condition => condition.directMoveCategory)?.directMoveCategory;
  if (!filters.length) return direct ? { passed: true, category: direct, reason: 'Configured direct move' } : null;
  const failures: string[] = [];
  let failedCategory: string | undefined;
  const groups = new Map<string, RegistrationFilterCondition[]>();
  for (const condition of filters) {
    const question = cleanKey(condition.question);
    groups.set(question, [...(groups.get(question) || []), condition]);
  }
  const destinations = new Set<string>();
  for (const alternatives of groups.values()) {
    let selected: RegistrationFilterCondition | undefined;
    for (const condition of alternatives) {
      const condQ = cleanKey(condition.question);
      const key = Object.keys(raw).find(candidate => {
        const cand = cleanKey(candidate);
        if (cand === condQ) return true;
        if (condQ.length >= 4 && cand.includes(condQ)) return true;
        if (cand.length >= 4 && condQ.includes(cand)) return true;
        return false;
      });
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
          const isNegation = (s: string) => s === 'no' || s === 'नाही' || s === 'नही';
          const isAffirmation = (s: string) => s === 'yes' || s === 'होय' || s === 'हाँ' || s === 'हा';

          const matchOption = (act: string, opt: string) => {
            if (!act || !opt) return false;
            if (act === opt) return true;
            if (isNegation(opt)) {
              return act === opt || /^(no|नाही|नही)[,.\-–]/i.test(act);
            }
            if (isAffirmation(opt)) {
              return act === opt || /^(yes|होय|हाँ|हा)[,.\-–\s]/i.test(act);
            }
            if (opt.length >= 3 && act.includes(opt)) return true;
            if (act.length >= 3 && opt.includes(act)) return true;
            return false;
          };

          const expectedOptions = [expected, ...expected.split(',').map(normalize)].filter(Boolean);
          matched = actual.some(act => expectedOptions.some(opt => matchOption(act, opt)));
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
