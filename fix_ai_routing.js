const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogicStart = `    const newDecisions = { ...batchDecisions };
    let approvedCount = 0;
    let pendingCount = 0;

    let targetApprove = '';
    let targetPending = '';`;

const oldLogicEnd = `      }
    });`;

const splitBy = content.split(oldLogicStart);
if (splitBy.length < 2) {
  console.log("Could not find oldLogicStart");
  process.exit(1);
}
const secondHalf = splitBy[1].split(oldLogicEnd);
if (secondHalf.length < 2) {
  console.log("Could not find oldLogicEnd");
  process.exit(1);
}

const newLogic = `    const newDecisions = { ...batchDecisions };
    let approvedCount = 0;
    let pendingCount = 0;

    const targetLeads = activeBatchLeads.filter(lead => {
      const currentStatus = batchDecisions[lead.id]?.status || 'new_leads';
      if (batchDecisions[lead.id]?.isRejected) return false;
      return currentStatus === activeTab; // Process only leads in the current active tab
    });

    targetLeads.forEach(lead => {
      const raw = lead._rawRecord || {};
      const allText = JSON.stringify(raw).toLowerCase();
      
      let finalCategory = '';
      let finalReason = '';
      let isSuccess = false;

      for (const c of conditions) {
        if (!c.keyword || !c.keyword.trim()) continue;
        const textToSearch = c.question ? String(raw[c.question] || '').toLowerCase() : allText;
        const kw = c.keyword.toLowerCase().trim();
        const subKeywords = kw.split(',').map(k => k.trim()).filter(Boolean);
        
        let matchedAny = false;
        
        // Age check backward compatibility
        if (c.question && c.question.toLowerCase().includes('age')) {
          const ageVal = parseInt(textToSearch.replace(/\\D/g, ''), 10);
          if (!isNaN(ageVal) && ageVal >= 30 && ageVal <= 64) {
             matchedAny = true;
          }
        } else {
          matchedAny = subKeywords.some(subKw => textToSearch.includes(subKw));
        }

        if (matchedAny) {
          if (c.successCategory) {
            finalCategory = c.successCategory;
            finalReason = \`Matched: \${c.keyword}\`;
            isSuccess = true;
            break;
          }
        } else {
          if (c.failCategory) {
            finalCategory = c.failCategory;
            finalReason = \`Failed: \${c.keyword}\`;
            isSuccess = false;
            break;
          }
        }
      }

      if (finalCategory) {
        const currentDec = batchDecisions[lead.id] || {};
        newDecisions[lead.id] = { ...currentDec, status: finalCategory, reason: finalReason };
        if (isSuccess) approvedCount++;
        else pendingCount++;
      }
    });`;

content = splitBy[0] + newLogic + secondHalf.slice(1).join(oldLogicEnd);
fs.writeFileSync(file, content);
console.log("Updated AI routing logic");
