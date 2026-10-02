require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: 'test_admin_user', isAdmin: true },
  process.env.JWT_SECRET || 'fallback_secret',
  { expiresIn: '1h' }
);

fetch('http://localhost:3000/api/admin/crm/receipts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    leadId: 'test_google_form_row_99',
    customerName: 'Test Customer',
    customerPhone: '+919999999999',
    customerEmail: 'test@swaryoga.com',
    workshopName: 'Swar Yoga Level 1',
    payment: {
      amount: 1999,
      paidAmount: 1999,
      method: 'upi',
      provider: 'upi',
      paidAt: new Date().toISOString()
    }
  })
})
.then(res => res.text())
.then(text => {
  console.log("Response:", text);
  process.exit(0);
})
.catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
