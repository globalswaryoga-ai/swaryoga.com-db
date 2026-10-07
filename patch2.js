const fs = require('fs');
const file = 'app/admin/crm/broadcast/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const debugUI = `
            {filteredLeads.length === 0 && (
              <div className="p-4 bg-red-100 text-red-800 text-lg font-bold mb-4 rounded border-2 border-red-500">
                Hi! Please copy/paste or screenshot this exact text for me:
                <br/>
                sourceLeads: {sourceLeads.length}
                <br/>
                activeBatches: {activeBatches.length}
                <br/>
                filterWorkshops: {filterWorkshops.join(', ')}
              </div>
            )}
`;
// We cannot access sourceLeads from here. We must expose them.
