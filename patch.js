const fs = require('fs');
const file = 'app/admin/crm/broadcast/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('const [searchQuery, setSearchQuery] = useState(\'\');', `const [searchQuery, setSearchQuery] = useState('');\n  const [debugStats, setDebugStats] = useState<any>({});`);

content = content.replace('return mappedLeads.filter((lead: any) => {', `
      const finalLeads = mappedLeads.filter((lead: any) => {
        const matchesSearch = !searchQuery ||
          lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.phoneNumber?.includes(searchQuery);

        const leadStatusNorm = (lead.status || '').toLowerCase();
        let matchesStatus = filterStatuses.length === 0;
        if (!matchesStatus) {
          matchesStatus = filterStatuses.some(status => {
            const filterStatusNorm = status.toLowerCase();
            if (filterStatusNorm === 'new_leads' || filterStatusNorm === 'new' || filterStatusNorm === 'lead') {
              return ['new', 'new_leads', 'lead', 'new_registration', 'new_lead', 'csv'].includes(leadStatusNorm);
            } else if (filterStatusNorm.includes('pending')) {
              return leadStatusNorm.includes('pending');
            } else if (filterStatusNorm.includes('registered')) {
              return leadStatusNorm.includes('register');
            } else if (filterStatusNorm.includes('approval')) {
              return leadStatusNorm.includes('approval');
            } else if (filterStatusNorm.includes('rejected')) {
              return leadStatusNorm.includes('reject');
            } else {
              return leadStatusNorm === filterStatusNorm;
            }
          });
        }

        const matchesWorkshop = filterWorkshop === 'all' || lead.workshopName === filterWorkshop;
        
        const matchesLabels = filterLabels.length === 0 || filterLabels.some(l => Array.isArray(lead.labels) && lead.labels.includes(l));
        const matchesUser = filterAssignedUser === 'all' || lead.assignedToUserId === filterAssignedUser;
        const matchesDeliveryStatus = filterDeliveryStatus.size === 0 || (lead.deliveryStatus ? filterDeliveryStatus.has(lead.deliveryStatus) : false);
        
        const matchesLanguage = filterLanguage === 'all' || 
          lead.workshopName?.toLowerCase().includes(filterLanguage.toLowerCase()) || 
          (Array.isArray(lead.labels) && lead.labels.some(l => String(l).toLowerCase().includes(filterLanguage.toLowerCase())));
        
        const matchesMultiWorkshop = filterWorkshops.length === 0 || activeBatches.length > 0;
        const finalLanguageMatch = activeBatches.length > 0 ? true : matchesLanguage;

        return matchesSearch && matchesStatus && matchesWorkshop && matchesMultiWorkshop && matchesLabels && matchesUser && matchesDeliveryStatus && finalLanguageMatch;
      });
      
      setTimeout(() => setDebugStats({
        sourceLeads: sourceLeads.length,
        allowedBatchNames: allowedBatchNames,
        activeBatches: activeBatches.length,
        activeBatchLeads: activeBatchLeads.length,
        tabLeads: tabLeads.length,
        mappedLeads: mappedLeads.length,
        finalLeads: finalLeads.length,
      }), 0);
      
      return finalLeads;
`);

// Delete the old return block
const startIdx = content.indexOf('return mappedLeads.filter((lead: any) => {');
if(startIdx !== -1) {
  const endIdx = content.indexOf('  }, [leads, csvContacts');
  content = content.slice(0, startIdx) + content.slice(endIdx);
}


const debugUI = `
            {filteredLeads.length === 0 && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-mono mb-4 rounded overflow-auto max-h-40">
                DEBUG INFO:
                <pre>{JSON.stringify(debugStats, null, 2)}</pre>
              </div>
            )}
`;
content = content.replace('{filteredLeads.length === 0 ? (', debugUI + '\n            {filteredLeads.length === 0 ? (');

fs.writeFileSync(file, content);
