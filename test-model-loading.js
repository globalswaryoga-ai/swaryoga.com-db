// Test if models can be loaded
const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    // Import the models
    const { Lead, WhatsAppMessage } = await import('./lib/schemas/enterpriseSchemas.js');
    
    console.log('✅ Models imported successfully');
    console.log('Lead type:', typeof Lead);
    console.log('WhatsAppMessage type:', typeof WhatsAppMessage);
    
    // Check if they have Mongoose methods
    console.log('Lead.find type:', typeof Lead.find);
    console.log('WhatsAppMessage.findOne type:', typeof WhatsAppMessage.findOne);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
