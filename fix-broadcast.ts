import fs from 'fs';

const path = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/broadcast/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add state for batch decisions and workshops
content = content.replace(
  "const [bulkStats, setBulkStats] = useState<any>({});",
  `const [bulkStats, setBulkStats] = useState<any>({});
  const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>({});
  const [formWorkshops, setFormWorkshops] = useState<any[]>([]);`
);

// Fetch state
content = content.replace(
  "fetch('/api/admin/crm/bulk-status', { headers: { Authorization: \`Bearer \${token}\` } }),",
  `fetch('/api/admin/crm/bulk-status', { headers: { Authorization: \`Bearer \${token}\` } }),
        fetch('/api/admin/crm/new-registration/state'),`
);

content = content.replace(
  "bulkRes.json(),",
  `bulkRes.json(),
        stateRes.json().catch(() => ({})),`
);

content = content.replace(
  "const [leadsData, templatesData, runsData, bulkData] = await Promise.all([",
  `const [leadsData, templatesData, runsData, bulkData, stateData] = await Promise.all([`
);

content = content.replace(
  "// Delivery status is intentionally lazy.",
  `
      if (stateData) {
        if (stateData.crm_ai4_decisions) {
          try {
            setBatchDecisions(typeof stateData.crm_ai4_decisions === 'string' ? JSON.parse(stateData.crm_ai4_decisions) : stateData.crm_ai4_decisions);
          } catch(e) {}
        }
        if (stateData.crm_english_workshops) {
          try {
            setFormWorkshops(typeof stateData.crm_english_workshops === 'string' ? JSON.parse(stateData.crm_english_workshops) : stateData.crm_english_workshops);
          } catch(e) {}
        }
      }

      // Delivery status is intentionally lazy.`
);

// Update lead status logic
content = content.replace(
  "status: l._effectiveStatus || l.status || '',",
  "status: batchDecisions[l._id || l.id]?.status || (batchDecisions[l._id || l.id]?.isRegistered ? 'registered' : '') || l._effectiveStatus || l.status || '',"
);

fs.writeFileSync(path, content);
