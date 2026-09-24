require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_MAIN;
console.log('Connecting to', uri ? 'URI exists' : 'NO URI');
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => { console.log('Connected'); process.exit(0); })
  .catch(err => { console.error('Failed:', err.message); process.exit(1); });
