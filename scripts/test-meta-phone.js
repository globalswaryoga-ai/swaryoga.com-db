require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const https = require('https');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  console.log('Config check:');
  console.log('- accessToken:', accessToken ? 'set (' + accessToken.slice(0,10) + '...)' : 'MISSING');
  console.log('- phoneNumberId:', phoneNumberId || 'MISSING');
  console.log('- appSecret:', appSecret ? 'set' : 'MISSING');
  console.log('- wabaId:', wabaId || 'MISSING');
  console.log('');

  if (!accessToken || !phoneNumberId || !appSecret) {
    console.log('Missing required config!');
    process.exit(1);
  }

  // Generate appsecret_proof
  const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');

  // 1. Check phone number status
  console.log('=== Phone Number Status ===');
  const phoneUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,code_verification_status,quality_rating,platform_type,throughput,display_phone_number,name_status,is_official_business_account,account_mode,eligibility_for_api_business_global_search,messaging_limit_tier&appsecret_proof=${proof}`;
  
  const phoneRes = await fetch(phoneUrl, {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  const phoneData = await phoneRes.json();
  console.log(JSON.stringify(phoneData, null, 2));

  // 2. Check WABA status
  if (wabaId) {
    console.log('\n=== WhatsApp Business Account Status ===');
    const wabaUrl = `https://graph.facebook.com/v21.0/${wabaId}?fields=name,timezone_id,message_template_namespace,account_review_status,on_behalf_of_business_info,primary_funding_id,purchase_order_number,currency&appsecret_proof=${proof}`;
    
    const wabaRes = await fetch(wabaUrl, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const wabaData = await wabaRes.json();
    console.log(JSON.stringify(wabaData, null, 2));
  }

  // 3. Check subscribed apps for WABA to see if billing is connected
  if (wabaId) {
    console.log('\n=== WABA Subscribed Apps ===');
    const subsUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?appsecret_proof=${proof}`;
    
    const subsRes = await fetch(subsUrl, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    const subsData = await subsRes.json();
    console.log(JSON.stringify(subsData, null, 2));
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
