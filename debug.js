const fs = require('fs');
const file = 'app/admin/crm/broadcast/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// expose variables to component state
content = content.replace('const [searchQuery, setSearchQuery] = useState(\'\');', 
  "const [searchQuery, setSearchQuery] = useState('');\n" +
  "  const [debugData, setDebugData] = useState<any>({});"
);

content = content.replace('return matchesSearch && matchesStatus && matchesWorkshop && matchesMultiWorkshop && matchesLabels && matchesUser && matchesDeliveryStatus && finalLanguageMatch;',
  "return matchesSearch && matchesStatus && matchesWorkshop && matchesMultiWorkshop && matchesLabels && matchesUser && matchesDeliveryStatus && finalLanguageMatch;"
);

content = content.replace('return finalLeads;',
  "setTimeout(() => setDebugData({ src: sourceLeads.length, bat: activeBatches.length, abLeads: activeBatchLeads.length, tab: tabLeads.length }), 100);\n      return finalLeads;"
);

// If I didn't save finalLeads correctly earlier because I reverted, let me just add it before the return of useMemo.
