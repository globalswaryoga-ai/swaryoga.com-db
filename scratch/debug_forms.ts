import { NextResponse } from 'next/server';

async function test() {
  const res = await fetch('http://localhost:3000/api/admin/enquiry-forms/sync?formId=1kY6_m7z7V9L0tH3y5wV_xV19fOQJ89Y_J43qj4W_gq4', {
    headers: { 'Authorization': 'Bearer test' } // just a mock
  });
  console.log(res.status);
}
test();
