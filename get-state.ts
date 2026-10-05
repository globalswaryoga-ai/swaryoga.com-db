import { fetchFromStorage } from './lib/bunny-storage';

async function run() {
  try {
    const { buffer } = await fetchFromStorage('admin/crm/new-registration-state.json');
    const data = JSON.parse(buffer.toString('utf-8'));
    const workshops = JSON.parse(data.crm_workshops || '[]');
    workshops.forEach((w: any) => {
      console.log(`${w.id} -> ${w.name} (${w.language})`);
    });
  } catch (error) {
    console.error(error);
  }
}
run();
