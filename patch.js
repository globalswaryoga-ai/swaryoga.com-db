const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Update updateLeadStatus
  content = content.replace(
    /const newDecisions = \{\s*\.\.\.prev,\s*\[leadId\]: \{ \.\.\.\(prev\[leadId\] \|\| \{\}\), status: newStatus, isRegistered, isRejected \}\s*\};/,
    `const oldDec = prev[leadId] || {};
      const oldStatus = oldDec.status || 'new_leads';
      const history = Array.from(new Set([...(oldDec.history || []), oldStatus, newStatus]));
      const newDecisions = {
        ...prev,
        [leadId]: { ...oldDec, status: newStatus, isRegistered, isRejected, history }
      };`
  );

  // Update saveAiFilter in new-registration
  content = content.replace(
    /const currentDec = batchDecisions\[lead\.id\] \|\| \{\};\s*newDecisions\[lead\.id\] = \{ \.\.\.currentDec, status: finalCategory, reason: finalReason, processedBy: type \};/,
    `const currentDec = batchDecisions[lead.id] || {};
        const oldStatus = currentDec.status || 'new_leads';
        const history = Array.from(new Set([...(currentDec.history || []), oldStatus, finalCategory]));
        newDecisions[lead.id] = { ...currentDec, status: finalCategory, reason: finalReason, processedBy: type, history };`
  );

  // Update saveAiFilter in workshop-offer AI-4
  content = content.replace(
    /newDecisions\[lead\.id\] = \{ \.\.\.\(batchDecisions\[lead\.id\] \|\| \{\}\), status: targetApprove, reason: 'Passed filters' \};/g,
    `const oldDec = batchDecisions[lead.id] || {};
          const oldStatus = oldDec.status || 'new_leads';
          const history = Array.from(new Set([...(oldDec.history || []), oldStatus, targetApprove]));
          newDecisions[lead.id] = { ...oldDec, status: targetApprove, reason: 'Passed filters', history };`
  );

  fs.writeFileSync(file, content);
}

patchFile('app/admin/crm/new-registration/_LeadsManagementTab.tsx');
patchFile('app/admin/crm/workshop-offer/_LeadsManagementTab.tsx');
