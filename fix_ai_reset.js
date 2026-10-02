const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const resetLogicStart = `    if (!hasValidCondition) {
      const newDecisions = { ...batchDecisions };
      activeBatchLeads.forEach(lead => {
        const currentDec = batchDecisions[lead.id];
        if (!currentDec) return;
        const currentStatus = currentDec.status || 'new_leads';
        if (type === 'AI-4' && ['approval_1', 'pending_leads_1'].includes(currentStatus)) {
          if (currentDec.isRegistered) {
            newDecisions[lead.id] = { ...currentDec, status: 'new_leads', reason: 'Reset' };
          } else {
            delete newDecisions[lead.id];
          }
        }
        if (type === 'AI-4A' && ['approval_2', 'pending_leads_2'].includes(currentStatus)) {
          newDecisions[lead.id] = { ...currentDec, status: 'approval_1', reason: 'Reset' };
        }
        if (type === 'AI-4B' && (currentDec.isRegistered || currentStatus === 'pending_leads_3')) {
          newDecisions[lead.id] = { ...currentDec, isRegistered: false, status: 'approval_2', reason: 'Reset' };
        }
      });`;

const newResetLogic = `    if (!hasValidCondition) {
      const newDecisions = { ...batchDecisions };
      activeBatchLeads.forEach(lead => {
        const currentDec = batchDecisions[lead.id];
        if (!currentDec) return;
        
        if (currentDec.processedBy === type) {
          delete newDecisions[lead.id];
        } else {
          const currentStatus = currentDec.status || 'new_leads';
          if (type === 'AI-4' && ['approval_1', 'pending_leads_1'].includes(currentStatus)) {
            if (currentDec.isRegistered) {
              newDecisions[lead.id] = { ...currentDec, status: 'new_leads', reason: 'Reset' };
            } else {
              delete newDecisions[lead.id];
            }
          }
          if (type === 'AI-4A' && ['approval_2', 'pending_leads_2'].includes(currentStatus)) {
            newDecisions[lead.id] = { ...currentDec, status: 'approval_1', reason: 'Reset' };
          }
          if (type === 'AI-4B' && (currentDec.isRegistered || currentStatus === 'pending_leads_3')) {
            newDecisions[lead.id] = { ...currentDec, isRegistered: false, status: 'approval_2', reason: 'Reset' };
          }
        }
      });`;

const processSaveStart = `      if (finalCategory) {
        const currentDec = batchDecisions[lead.id] || {};
        newDecisions[lead.id] = { ...currentDec, status: finalCategory, reason: finalReason };`;

const newProcessSave = `      if (finalCategory) {
        const currentDec = batchDecisions[lead.id] || {};
        newDecisions[lead.id] = { ...currentDec, status: finalCategory, reason: finalReason, processedBy: type };`;

if (content.includes(resetLogicStart)) {
  content = content.replace(resetLogicStart, newResetLogic);
} else {
  console.log("Could not find reset logic start");
}

if (content.includes(processSaveStart)) {
  content = content.replace(processSaveStart, newProcessSave);
} else {
  console.log("Could not find process save start");
}

fs.writeFileSync(file, content);
console.log("Updated AI Reset tracking");
