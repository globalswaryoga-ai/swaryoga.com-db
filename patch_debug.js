const fs = require('fs');
const file = 'app/admin/crm/broadcast/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const debugBanner = `
      {/* HIDDEN DEBUG INFO FOR AI */}
      <div style={{display: 'none'}} id="ai-debug-stats">
        {JSON.stringify({
          sourceLeads: sourceLeads.length,
          activeBatches: activeBatches.length,
          activeBatchLeads: activeBatchLeads.length,
          tabLeads: tabLeads.length,
          mappedLeads: mappedLeads.length,
          finalLeads: filteredLeads.length
        })}
      </div>
`;

content = content.replace('<div className="flex flex-col h-full bg-slate-50 relative">', '<div className="flex flex-col h-full bg-slate-50 relative">' + debugBanner);
fs.writeFileSync(file, content);
