import { loadBunnyLeads } from './lib/bunnyLeadsRepository';

async function run() {
  const leads = await loadBunnyLeads();
  console.log('Total leads:', leads.length);
  const found = leads.filter(l => String(l._id) === 'google-csv-1791173953847-0' || String(l.id) === 'google-csv-1791173953847-0' || String(l.document_id) === 'google-csv-1791173953847-0');
  console.log('Found google-csv lead?', found.length > 0 ? found[0] : 'No');
  
  const oauthFound = leads.filter(l => String(l._id).includes('oauth-form') || String(l.id).includes('oauth-form'));
  console.log('Found oauth-form leads?', oauthFound.length, 'Example:', oauthFound[0]?._id);
}
run();
