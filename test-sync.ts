import { GET } from './app/api/admin/google-forms/sync/route';

async function run() {
  // Mock request
  const req = new Request('http://localhost:3000/api/admin/google-forms/sync?url=18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0');
  const res = await GET(req as any);
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
}
run();
