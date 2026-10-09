import fs from 'fs';
const file = '/Users/mohankalburgi/swaryoga.com-db/app/api/webhooks/meta-instant-forms/route.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `  // Create lead in CRM
  try {
    const { saveBunnyLead } = await import('@/lib/bunnyLeadsRepository');
    const result = await saveBunnyLead(lead);

    console.log(\`✅ Lead created: \${result._id}\`);

    return {
      success: true,
      leadId: result._id,
      workshopId: workshop_id,
    };
  } catch (error) {`;

const newCode = `  // Create lead in CRM
  try {
    const { saveBunnyLead, getBunnyLeadByPhone } = await import('@/lib/bunnyLeadsRepository');
    
    // Check if exists
    let existing = await getBunnyLeadByPhone(lead.phoneNumber, 'system');
    
    let result;
    if (existing) {
      result = await saveBunnyLead({
        ...existing,
        ...lead, // overwrite with new data (or you might want to selectively merge)
        labels: Array.from(new Set([...(existing.labels || []), ...(lead.labels || [])])),
        notes: existing.notes ? existing.notes + '\\n' + lead.notes : lead.notes
      }, existing._id || existing.id);
      console.log(\`✅ Lead updated: \${result._id}\`);
    } else {
      result = await saveBunnyLead(lead);
      console.log(\`✅ Lead created: \${result._id}\`);
    }

    return {
      success: true,
      leadId: result._id,
      workshopId: workshop_id,
    };
  } catch (error) {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(file, code);
