import { listBunnyLeads } from './lib/bunnyLeadsRepository.ts';

async function test() {
  const result = await listBunnyLeads({ 
      visibleUserIds: null, 
      viewerUserId: 'system',
      limit: 100,
      skip: 0
  });
  const leads = result.leads || result;
  const metaLeads = leads.filter((l: any) => l.source === 'meta_instant_form' || l.source === 'meta_leadgen');
  console.log(`Found ${metaLeads.length} meta leads.`);
  
  if (metaLeads.length > 0) {
      console.log('Sample rawFieldData from first lead:');
      console.log(JSON.stringify(metaLeads[0].metadata?.rawFieldData, null, 2));
  }
}

test().catch(console.error);
