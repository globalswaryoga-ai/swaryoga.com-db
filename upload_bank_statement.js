const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

const PDF_PATH = '/Users/mohankalburgi/Downloads/62680XXXX_DownloadStatement_1781449417.pdf';
const BANK_NAME = 'Union Bank';
const PASSWORD = 'MOHA1112';
const WORKSHOP = 'SWARYOGA WORKSHOP HINDI';
const API_BASE = 'https://swaryoga.com-db';

function httpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers,
    };

    const req = client.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (body.pipe && typeof body.pipe === 'function') {
        // It's a stream (like FormData)
        body.pipe(req);
      } else {
        // It's a string or buffer
        req.write(body);
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function uploadAndTag() {
  try {
    // Read PDF file
    const fileBuffer = fs.readFileSync(PDF_PATH);
    const fileName = path.basename(PDF_PATH);

    console.log(`📄 Uploading ${fileName} (${Math.round(fileBuffer.length / 1024)}KB)...`);

    // Get auth token from localStorage (you'll need to provide this)
    const token = process.env.AUTH_TOKEN;
    if (!token) {
      console.error('❌ AUTH_TOKEN env var not set. Run with: AUTH_TOKEN="your_token" node upload_bank_statement.js');
      process.exit(1);
    }

    console.log(`🔑 Token: ${token.substring(0, 20)}...`);

    // Prepare FormData
    const form = new FormData();
    form.append('file', fileBuffer, fileName);
    form.append('bankName', BANK_NAME);
    form.append('password', PASSWORD);

    // Upload - merge form headers with auth header
    const formHeaders = form.getHeaders();
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...formHeaders,
    };

    console.log(`📤 Sending with headers:`, Object.keys(headers).join(', '));

    const uploadRes = await httpRequest('POST', `${API_BASE}/api/admin/crm/bank-income/upload`, headers, form);

    const uploadData = uploadRes.data;

    if (uploadRes.status !== 200) {
      console.error('❌ Upload failed:', uploadData.error);
      process.exit(1);
    }

    console.log(`✅ Upload successful!`);
    console.log(`   Statement ID: ${uploadData.statementId}`);
    console.log(`   Entries found: ${uploadData.entryCount}`);

    if (uploadData.entryCount === 0) {
      console.warn('⚠️  No income entries were extracted. Check PDF or password.');
      process.exit(0);
    }

    // Fetch entries and tag them
    console.log(`\n🏷️  Tagging ${uploadData.entryCount} entries with workshop "${WORKSHOP}"...`);

    const entriesRes = await httpRequest('GET', `${API_BASE}/api/admin/crm/bank-income/entries?statementId=${uploadData.statementId}`, {
      'Authorization': `Bearer ${token}`,
    });

    const entriesData = entriesRes.data;
    const entries = entriesData.entries || [];

    let taggedCount = 0;
    for (const entry of entries) {
      const patchRes = await httpRequest('PATCH', `${API_BASE}/api/admin/crm/bank-income/entries/${entry.id}`, {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }, JSON.stringify({
        name: `${BANK_NAME} Income`,
        workshopName: WORKSHOP,
      }));

      if (patchRes.status === 200) {
        taggedCount++;
        console.log(`   ✓ Entry ${taggedCount}/${entries.length}: ${entry.description.slice(0, 40)}... → ₹${entry.amount}`);
      } else {
        const err = patchRes.data;
        console.warn(`   ✗ Failed to tag entry ${entry.id}:`, err.error);
      }
    }

    console.log(`\n✅ Done! Tagged ${taggedCount}/${entries.length} entries.`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

uploadAndTag();
