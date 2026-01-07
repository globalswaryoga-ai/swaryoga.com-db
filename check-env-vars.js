require('dotenv').config();

console.log('\n🔍 WHATSAPP ENVIRONMENT VARIABLES STATUS\n');

const META_VARS = {
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN': process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  'META_APP_SECRET': process.env.META_APP_SECRET,
  'WHATSAPP_APP_SECRET': process.env.WHATSAPP_APP_SECRET,
  'WHATSAPP_PHONE_NUMBER_ID': process.env.WHATSAPP_PHONE_NUMBER_ID,
  'WHATSAPP_ACCESS_TOKEN': process.env.WHATSAPP_ACCESS_TOKEN,
};

const EC2_VARS = {
  'WHATSAPP_WEB_BRIDGE_SECRET': process.env.WHATSAPP_WEB_BRIDGE_SECRET,
  'WHATSAPP_BRIDGE_SECRET': process.env.WHATSAPP_BRIDGE_SECRET,
};

console.log('📱 META API VARIABLES:');
Object.entries(META_VARS).forEach(([key, val]) => {
  const status = val ? '✅ SET' : '❌ MISSING';
  const display = val ? `${val.substring(0, 10)}...` : 'not set';
  console.log(`  ${status} ${key}: ${display}`);
});

console.log('\n🖥️  EC2 BRIDGE VARIABLES:');
Object.entries(EC2_VARS).forEach(([key, val]) => {
  const status = val ? '✅ SET' : '❌ MISSING';
  const display = val ? `${val.substring(0, 10)}...` : 'not set';
  console.log(`  ${status} ${key}: ${display}`);
});

// Determine which system is active
console.log('\n🎯 ACTIVE SYSTEM STATUS:\n');

const metaActive = META_VARS['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] && (META_VARS['META_APP_SECRET'] || META_VARS['WHATSAPP_APP_SECRET']);
const ec2Active = EC2_VARS['WHATSAPP_WEB_BRIDGE_SECRET'] || EC2_VARS['WHATSAPP_BRIDGE_SECRET'];

if (metaActive && ec2Active) {
  console.log('⚠️  BOTH SYSTEMS CONFIGURED (Not recommended!)');
  console.log('   - Meta API: ACTIVE');
  console.log('   - EC2 Bridge: ACTIVE');
  console.log('   → Risk: Duplicate messages');
  console.log('   → Action: Disable one system\n');
} else if (metaActive) {
  console.log('✅ Meta API ACTIVE');
  console.log('   - EC2 Bridge: INACTIVE');
  console.log('   → Status: Ready for Meta webhook\n');
} else if (ec2Active) {
  console.log('✅ EC2 Bridge ACTIVE');
  console.log('   - Meta API: INACTIVE');
  console.log('   → Status: Ready for EC2 bridge\n');
} else {
  console.log('❌ NO SYSTEM CONFIGURED');
  console.log('   - Meta API: NOT SET UP');
  console.log('   - EC2 Bridge: NOT SET UP');
  console.log('   → Action: Configure one system\n');
}
