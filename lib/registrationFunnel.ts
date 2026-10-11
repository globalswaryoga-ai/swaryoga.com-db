import { assembleRegistrationLeads, registrationBatchRows } from '@/lib/registrationLeads';
import { evaluateRegistrationConditions, readRegistrationAiConfig, readRegistrationDecisions, registrationDecisionKey } from '@/lib/registrationAiConfig';
import { parseRegistrationValue, registrationWorkshops, mergeRegistrationState, type RegistrationState } from '@/lib/registrationState';

type RecordData = Record<string, any>;

export async function processRegistrationFunnel({
  state, leads, forms, submissions, scope, batchId, worker, selectedIds,
}: {
  state: RegistrationState; leads: RecordData[]; forms: RecordData[]; submissions: RecordData[];
  scope: string; batchId?: string; worker?: string; selectedIds?: string[];
}) {
  const rows = assembleRegistrationLeads(leads, submissions, forms);
  const categories = parseRegistrationValue<RecordData[]>(state.crm_custom_categories, []);
  const assignments: Record<string, string> = {
    'AI-4': 'new_leads', 'AI-4A': 'pending_leads_1', 'AI-4B': 'pending_leads_2',
    'AI-4C': 'pending_leads_3', 'AI-4D': 'pending_leads_4', 'AI-4E': 'approval_1',
    'AI-4F': 'approval_2', 'AI-4G': 'approval_3', 'AI-4H': 'approval_4',
  };
  for (const category of categories) if (category.aiAssignment) assignments[category.aiAssignment] = category.id;
  const patch: RegistrationState = {};
  const errors: string[] = [];
  let processed = 0;
  let passed = 0;
  for (const workshop of registrationWorkshops(state)) {
    if (batchId && workshop.id !== batchId) continue;
    const config = readRegistrationAiConfig(state, String(workshop.id), workshop.metadata);
    const enabledWorkers = Object.entries(config.settings).filter(([type]) => worker ? worker === type : config.enabledWorkers.includes(type));
    if (!enabledWorkers.length) continue;
    if (!workshop.formId) {
      errors.push(`Batch ${workshop.id}: connect its language form before enabling workers`);
      continue;
    }
    const decisions = readRegistrationDecisions(state, String(workshop.id));
    const batchRows = registrationBatchRows(rows, workshop);
    for (const row of batchRows) {
      if (selectedIds?.length && !selectedIds.includes(String(row.id)) && !selectedIds.includes(String(row.leadId))) continue;
      const previous = decisions[row.id] || decisions[row.leadId] || {};
      if (previous.isRejected || previous.isRegistered || previous.zoomStatus === 'rejected') continue;
      const status = previous.status || 'new_leads';
      // One stage per response per run; later stages must not bypass this stage's decision.
      const candidate = enabledWorkers.find(([type]) => assignments[type] === status);
      if (!candidate) continue;
      const [type, conditions] = candidate;
      const evaluated = evaluateRegistrationConditions(row._rawRecord || {}, conditions);
      if (!evaluated) continue;
      if (evaluated.passed && !evaluated.category) {
        errors.push(`Batch ${workshop.id}, ${type}: select an approval destination; saved rules have no routing output`);
        continue;
      }
      const category = evaluated.category || status;
      const next = {
        status: category, reason: evaluated.reason, processedBy: type,
        screeningPassed: evaluated.passed, updatedAt: new Date().toISOString(),
        history: [...new Set([...(previous.history || []), status, category])],
        keepCopy: config.copyModes[type] !== false,
        ...(config.copyModes[type] !== false ? {
          copies: [...new Set([...(previous.copies || []), category])],
          sourceTabs: [...new Set([...(previous.sourceTabs || []), status])],
        } : {}),
      };
      if (previous.status === next.status && previous.reason === next.reason && previous.screeningPassed === next.screeningPassed) continue;
      const key = registrationDecisionKey(String(workshop.id), String(row.id));
      patch[key] = next;
      processed++;
      if (evaluated.passed) passed++;
    }
  }
  if (Object.keys(patch).length) await mergeRegistrationState(patch, scope);
  return { processed, passed, pending: processed - passed, errors };
}
