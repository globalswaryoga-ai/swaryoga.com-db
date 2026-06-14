const https = require('https');
const http = require('http');

const API_BASE = 'https://swaryoga.com';
const BANK_NAME = 'UNION BANK';
const WORKSHOP = 'SWARYOGA WORKSHOP HINDI';

function httpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = { method, headers };
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
    if (body) req.write(body);
    req.end();
  });
}

async function tagAllEntries() {
  try {
    const token = process.env.AUTH_TOKEN;
    if (!token) {
      console.error('❌ AUTH_TOKEN env var not set. Run with: AUTH_TOKEN="your_token" node tag_bank_income.js');
      process.exit(1);
    }

    console.log(`🔑 Token: ${token.substring(0, 20)}...`);
    console.log(`🏷️  Fetching Union Bank entries...`);

    // Fetch all Union Bank entries
    const entriesRes = await httpRequest(
      'GET',
      `${API_BASE}/api/admin/crm/bank-income/entries?bankName=${encodeURIComponent(BANK_NAME)}`,
      { 'Authorization': `Bearer ${token}` }
    );

    if (entriesRes.status !== 200) {
      console.error('❌ Failed to fetch entries:', entriesRes.data.error);
      process.exit(1);
    }

    const entries = entriesRes.data.entries || [];
    console.log(`📊 Found ${entries.length} entries to tag`);

    if (entries.length === 0) {
      console.warn('⚠️  No entries found');
      process.exit(0);
    }

    // Tag each entry
    let taggedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const progress = `[${i + 1}/${entries.length}]`;

      try {
        const patchRes = await httpRequest(
          'PATCH',
          `${API_BASE}/api/admin/crm/bank-income/entries/${entry.id}`,
          {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          JSON.stringify({
            name: 'Union Bank Income',
            workshopName: WORKSHOP,
          })
        );

        if (patchRes.status === 200) {
          taggedCount++;
          console.log(`✅ ${progress} ${entry.description.substring(0, 50).padEnd(50)} ₹${entry.amount}`);
        } else {
          failedCount++;
          console.warn(`❌ ${progress} Failed: ${patchRes.data.error}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ ${progress} Error: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      if (i < entries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(`\n✅ DONE! Tagged: ${taggedCount}, Failed: ${failedCount}`);
    console.log(`📈 Total entries: ${entries.length}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

tagAllEntries();
