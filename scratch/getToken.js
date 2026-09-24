require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');
const token = jwt.sign({ isAdmin: true, role: 'superadmin', username: 'admincrm' }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', { expiresIn: '7d' });
console.log(token);
