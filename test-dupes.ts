import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { listSubmissions, deleteSubmission } from './lib/bunny-forms-db';
async function run() {
  const subs = await listSubmissions();
  const formGroup = subs.filter(s => s.formId === '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0');
  
  const emails = new Set();
  const dupes = [];
  for (const s of formGroup) {
    const key = s.email || s.formData;
    if (emails.has(key)) {
      dupes.push(s);
    } else {
      emails.add(key);
    }
  }
  
  console.log('Total duplicates found:', dupes.length);
  if (dupes.length > 0) {
    console.log('Sample duplicate formData:', dupes[0].formData);
  }

  // Delete all duplicates
  for (const d of dupes) {
    await deleteSubmission(d.id);
  }
  console.log('Deleted', dupes.length, 'duplicates.');
}
run();
