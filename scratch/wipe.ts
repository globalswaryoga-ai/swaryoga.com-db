import { uploadToPath, fetchFromStorage } from '../lib/bunny-storage';

async function wipe() {
  try {
    const { buffer } = await fetchFromStorage('admin/crm/new-registration-state.json');
    const data = JSON.parse(buffer.toString('utf-8'));
    
    if (data.crm_workshops) {
      const workshops = JSON.parse(data.crm_workshops);
      console.log('Original count:', workshops.length);
      const filtered = workshops.filter((w: any) => !w.name.toLowerCase().includes('english') || String(w.id).startsWith('master_'));
      console.log('New count:', filtered.length);
      data.crm_workshops = JSON.stringify(filtered);
      
      const newBuffer = Buffer.from(JSON.stringify(data));
      await uploadToPath(newBuffer, 'admin/crm/new-registration-state.json', 'application/json');
      console.log('Successfully updated bunny storage.');
    }
  } catch (e) {
    console.error(e);
  }
}

wipe();
