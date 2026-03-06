/**
 * Test script replicating the EXACT inbox send-template flow to find the real error.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

function generateAppSecretProof(at, as) {
  return crypto.createHmac('sha256', as).update(at).digest('hex');
}

function extractVars(text) {
  const vars = new Set();
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) vars.add(String(m[1]).trim());
  return Array.from(vars);
}

function toBodyParams(opts) {
  if (Array.isArray(opts.bodyParams)) return opts.bodyParams.map(v => String(v || ''));
  if (Array.isArray(opts.variables) && opts.variables.length > 0)
    return opts.variables.map(v => String(v && v.name ? v.name : '')).filter(Boolean);
  return extractVars(String(opts.templateContent || ''));
}

function buildComponents(input) {
  var c = [];
  if (input.headerMedia && input.headerMedia.url) {
    var f = input.headerMedia.kind === 'video' ? 'video' : 'image';
    c.push({ type: 'header', parameters: [{ type: f, [f]: { link: input.headerMedia.url } }] });
  }
  if (Array.isArray(input.bodyParams) && input.bodyParams.length > 0)
    c.push({ type: 'body', parameters: input.bodyParams.map(function(p) { return { type: 'text', text: String(p || '') }; }) });
  if (Array.isArray(input.buttons)) {
    input.buttons.forEach(function(b, i) {
      if (!b || b.kind === 'quick_reply') return;
      if (b.kind === 'catalog') { c.push({ type: 'button', sub_type: 'CATALOG', index: i, parameters: [] }); return; }
      if (b.kind === 'url') {
        var url = String(b.url || '');
        var np = url.includes('{{') && url.includes('}}');
        var param = np ? url.replace(/.*\{\{\s*([^}]+)\s*\}\}.*/, '$1') : '';
        c.push({ type: 'button', sub_type: 'url', index: String(i), ...(param ? { parameters: [{ type: 'text', text: param }] } : {}) });
      }
    });
  }
  return c;
}

async function run() {
  var AT = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  var PID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  var AS = (process.env.META_APP_SECRET || '').trim();

  console.log('Token:', AT ? 'SET (' + AT.length + ' chars)' : 'MISSING');
  console.log('PhoneNumberId:', PID || 'MISSING');
  console.log('AppSecret:', AS ? 'SET' : 'MISSING');

  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });

  // Use hello_world - simplest template
  var t = await mongoose.connection.db.collection('whatsapp_templates').findOne({ templateName: 'hello_world' });
  if (!t) { console.log('hello_world template not found'); process.exit(1); }

  var testPhone = '919309986820';
  
  // Build input same as inbox route
  var hUrl = String((t.headerMedia && t.headerMedia.url) || '').trim();
  var hKind = String((t.headerMedia && t.headerMedia.kind) || '').trim();
  if (!hUrl && t.imageFile && t.imageFile.url) { hUrl = t.imageFile.url; hKind = 'image'; }
  var hm = (hUrl && (hKind === 'image' || hKind === 'video')) ? { kind: hKind, url: hUrl } : null;

  var buttons = [];
  if (Array.isArray(t.buttons)) {
    t.buttons.forEach(function(b) {
      var title = String(b.title || '').trim();
      if (!title) return;
      var kind = String(b.kind || '').trim();
      var bt = String(b.type || '').trim().toUpperCase();
      var url = String(b.url || '').trim();
      if (kind === 'catalog' || bt === 'CATALOG') buttons.push({ kind: 'catalog', title: title });
      else if (kind === 'url' || bt === 'URL' || (url && url.startsWith('http'))) buttons.push({ kind: 'url', title: title, url: url });
      else buttons.push({ kind: 'quick_reply', title: title });
    });
  }

  var bp = toBodyParams({ templateContent: t.templateContent, variables: t.variables });

  var input = { to: testPhone, templateName: t.templateName, language: t.language || 'en', bodyParams: bp, headerMedia: hm, buttons: buttons };
  var components = buildComponents(input);

  var proof = AS ? generateAppSecretProof(AT, AS) : '';
  var url = 'https://graph.facebook.com/v24.0/' + PID + '/messages' + (proof ? '?appsecret_proof=' + proof : '');

  var payload = {
    messaging_product: 'whatsapp',
    to: testPhone,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.language },
      ...(components.length ? { components: components } : {}),
    },
  };

  console.log('\nPayload:', JSON.stringify(payload, null, 2));
  console.log('Sending to:', url.substring(0, 80) + '...');

  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + AT, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  var data = await res.json().catch(function() { return {}; });
  console.log('\nStatus:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (res.ok) console.log('SUCCESS: waId =', data.messages && data.messages[0] && data.messages[0].id);
  else console.log('FAILED:', data.error && data.error.message);

  process.exit(0);
}

run().catch(function(e) { console.error(e); process.exit(1); });
