const fs = require('fs');

function patch(file) {
  let c = fs.readFileSync(file, 'utf8');

  // Replace rowBg logic
  c = c.replace(
    /const rowBg = [^;]+;/,
    `const hasApproval = leadStatus.includes('approval') || leadStatus.includes('aprovel') || leadStatus === 'registered_leads' || (leadDec.history || []).some((h: string) => h.includes('approval') || h.includes('aprovel') || h === 'registered_leads');
                            const hasPending = leadStatus.includes('pending') || (leadDec.history || []).some((h: string) => h.includes('pending'));
                            const rowBg = activeTab.includes('approval') || isRegistered || hasApproval
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70'
                              : isRejected
                                ? 'bg-purple-100/70 hover:bg-purple-200/70'
                                : hasPending
                                  ? 'bg-yellow-50/70 hover:bg-yellow-100/70'
                                  : 'hover:bg-slate-50 transition-colors';`
  );

  // Replace badge logic
  c = c.replace(
    /leadStatus\.includes\('approval'\) \|\| leadStatus\.includes\('aprovel'\)/g,
    `(leadStatus.includes('approval') || leadStatus.includes('aprovel') || (batchDecisions[lead.id]?.history || []).some((h: string) => h.includes('approval') || h.includes('aprovel')))`
  );

  c = c.replace(
    /leadStatus\.includes\('pending'\)\s*\?\s*'bg-yellow-50/g,
    `(leadStatus.includes('pending') || (batchDecisions[lead.id]?.history || []).some((h: string) => h.includes('pending'))) ? 'bg-yellow-50`
  );

  fs.writeFileSync(file, c);
}

patch('app/admin/crm/new-registration/_LeadsManagementTab.tsx');
patch('app/admin/crm/workshop-offer/_LeadsManagementTab.tsx');
