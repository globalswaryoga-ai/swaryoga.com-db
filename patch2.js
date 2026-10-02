const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    /newDecisions\[lead\.id\] = \{ \.\.\.\(batchDecisions\[lead\.id\] \|\| \{\}\), status: targetPending, isRegistered: false, reason: reasons\.join\(' \| '\) \};/g,
    `const oldDec = batchDecisions[lead.id] || {};
          const oldStatus = oldDec.status || 'new_leads';
          const history = Array.from(new Set([...(oldDec.history || []), oldStatus, targetPending]));
          newDecisions[lead.id] = { ...oldDec, status: targetPending, isRegistered: false, reason: reasons.join(' | '), history };`
  );

  content = content.replace(
    /newDecisions\[lead\.id\] = \{ \.\.\.\(batchDecisions\[lead\.id\] \|\| \{\}\), status: 'approval_2', isRegistered: true, reason: 'Passed filters' \};/g,
    `const oldDec = batchDecisions[lead.id] || {};
          const oldStatus = oldDec.status || 'new_leads';
          const history = Array.from(new Set([...(oldDec.history || []), oldStatus, 'approval_2']));
          newDecisions[lead.id] = { ...oldDec, status: 'approval_2', isRegistered: true, reason: 'Passed filters', history };`
  );

  content = content.replace(
    /newDecisions\[lead\.id\] = \{ \.\.\.\(batchDecisions\[lead\.id\] \|\| \{\}\), status: 'pending_leads_3', isRegistered: false, reason: reasons\.join\(' \| '\) \};/g,
    `const oldDec = batchDecisions[lead.id] || {};
          const oldStatus = oldDec.status || 'new_leads';
          const history = Array.from(new Set([...(oldDec.history || []), oldStatus, 'pending_leads_3']));
          newDecisions[lead.id] = { ...oldDec, status: 'pending_leads_3', isRegistered: false, reason: reasons.join(' | '), history };`
  );

  content = content.replace(
    /newDecisions\[lead\.id\] = \{ \.\.\.\(batchDecisions\[lead\.id\] \|\| \{\}\), status: 'rejected_leads', isRejected: true, reason: '100% Failed: ' \+ reasons\.join\(' \| '\) \};/g,
    `const oldDec = batchDecisions[lead.id] || {};
          const oldStatus = oldDec.status || 'new_leads';
          const history = Array.from(new Set([...(oldDec.history || []), oldStatus, 'rejected_leads']));
          newDecisions[lead.id] = { ...oldDec, status: 'rejected_leads', isRejected: true, reason: '100% Failed: ' + reasons.join(' | '), history };`
  );

  // Now fix the filter logic
  content = content.replace(
    /return dec\.status === activeTab && !dec\.isRejected && !dec\.isRegistered;/g,
    `return (dec.status === activeTab || dec.history?.includes(activeTab)) && !dec.isRejected && !dec.isRegistered;`
  );

  fs.writeFileSync(file, content);
}

patchFile('app/admin/crm/workshop-offer/_LeadsManagementTab.tsx');
patchFile('app/admin/crm/new-registration/_LeadsManagementTab.tsx');
