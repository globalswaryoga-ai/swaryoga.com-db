require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const secret = (process.env.JWT_SECRET || 'your-secret-key-change-in-production').trim();
const token = jwt.sign({ userId: 'test', isAdmin: true }, secret, { expiresIn: '1h' });

(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = c.db('swaryoga_admin_crm');
  const v = await db.collection('tally_manual_vouchers').findOne({ voucherNumber: 'INV-0003' });
  console.log('INV-0003 _id:', v._id.toString(), 'type:', v._id.constructor.name);
  await c.close();

  const res = await fetch('http://localhost:3000/api/admin/crm/tally/manual-vouchers', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id: v._id.toString(), partyName: 'Subir Jha', amount: 1000 })
  });
  const data = await res.json();
  console.log('Status:', res.status, 'Success:', data.success, 'Msg:', data.message || data.error);
})();
