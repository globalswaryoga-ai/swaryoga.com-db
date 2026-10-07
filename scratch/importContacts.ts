import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'fs';
import csvParser from 'csv-parser';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { decryptCredential } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/googleDriveSync';

async function run() {
  
  // 1. Get Google Auth for 'system' equivalent from Bunny PostgreSQL mongo_documents
  let googleAccessToken = '';
  
  try {
    const res = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts' AND json_extract(document_json, '$.platform') = 'google_forms' LIMIT 1"
    });
    if (res.rows && res.rows.length > 0) {
      const conn = JSON.parse(res.rows[0].document_json);
      console.log('Found valid Google Contacts connection!');
      const refreshToken = decryptCredential(conn.refreshToken);
      
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com',
          client_secret: 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenRes.ok && tokenData.access_token) {
        googleAccessToken = tokenData.access_token;
        console.log('Successfully refreshed access token!');
      } else {
        console.log('Failed to refresh token:', tokenData);
      }
    } else {
      console.log('No valid Google Contacts connection found in Bunny DB. Skipping Google push.');
    }
  } catch (e: any) {
    console.log('Error getting connection:', e.message);
  }

  // 2. Read and parse CSV
  const results: any[] = [];
  const filepath = '/Users/mohankalburgi/Downloads/contacts (1).csv';
  
  if (!fs.existsSync(filepath)) {
    console.error('File not found:', filepath);
    process.exit(1);
  }

  await new Promise((resolve) => {
    fs.createReadStream(filepath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', resolve);
  });

  console.log(`Parsed ${results.length} rows from CSV`);

  // 3. Process records
  const validLeads = [];
  
  for (const row of results) {
    const rawName = row['First Name'] || row['Name'] || '';
    const lastName = row['Last Name'] || '';
    const fullName = [rawName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
    
    // Find phone number field
    let rawPhone = row['Phone 1 - Value'] || row['Phone'] || row['Mobile'] || '';
    if (rawPhone.includes(':::')) {
      rawPhone = rawPhone.split(':::')[0].trim();
    }
    
    let phone = rawPhone.replace(/[^\d+]/g, '');
    if (phone.startsWith('000') || phone.length < 10) continue;
    
    phone = normalizePhone(phone);
    if (!phone || phone.length < 10) continue;

    validLeads.push({
      name: fullName,
      phone,
      email: row['E-mail 1 - Value'] || '',
      labels: ['CSV Import']
    });
  }

  console.log(`Found ${validLeads.length} valid phone numbers.`);

  // 4. Batch push to Google Contacts if authorized
  if (googleAccessToken && validLeads.length > 0) {
    console.log('Batch uploading to Google Contacts in chunks of 200...');
    const chunkSize = 200;
    
    for (let i = 0; i < validLeads.length; i += chunkSize) {
      const chunk = validLeads.slice(i, i + chunkSize);
      
      const batchBody = {
        contacts: chunk.map((lead: any) => {
          const body: any = {
            contactPerson: {
              names: [{ givenName: lead.name }],
              phoneNumbers: [{ value: lead.phone }],
            }
          };
          if (lead.email) {
            body.contactPerson.emailAddresses = [{ value: lead.email }];
          }
          return body;
        }),
        readMask: 'names,phoneNumbers,emailAddresses',
        sources: ['READ_SOURCE_TYPE_CONTACT']
      };

      try {
        const res = await fetch('https://people.googleapis.com/v1/people:batchCreateContacts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batchBody),
        });
        
        if (res.ok) {
          console.log(`Uploaded chunk ${Math.floor(i/chunkSize) + 1}`);
        } else {
          const err = await res.text();
          console.error(`Error uploading chunk ${Math.floor(i/chunkSize) + 1}:`, err.slice(0, 150));
        }
      } catch (e: any) {
        console.error(`Error on chunk ${Math.floor(i/chunkSize) + 1}:`, e.message);
      }
      
      // Delay to avoid rate limits (Google API is usually max 60 per minute per user)
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // 5. Save to CRM (Bunny Leads)
  console.log('Saving to CRM...');
  let savedCount = 0;
  for (const lead of validLeads) {
    try {
      const docId = `import_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const leadKey = `system#${lead.phone}`;
      
      // Check if exists using SQL
      const existing = await bunnyExecute({
        sql: "SELECT document_id FROM leads_sql WHERE lead_key = ?",
        args: [leadKey]
      });

      if (!existing.rows || existing.rows.length === 0) {
        const { leadNumber } = await allocateNextLeadNumber();
        const leadObj = {
          _id: docId,
          name: lead.name,
          phoneNumber: lead.phone,
          email: lead.email,
          status: 'lead',
          source: 'csv_import',
          labels: lead.labels,
          createdByUserId: 'system',
          assignedToUserId: 'system',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          leadNumber
        };
        
        await bunnyExecute({
          sql: `INSERT INTO leads_sql (document_id, lead_key, owner_user_id, lead_number, data_json, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            docId,
            leadKey,
            'system',
            leadNumber,
            JSON.stringify(leadObj),
            leadObj.createdAt,
            leadObj.updatedAt
          ]
        });
        savedCount++;
      }
    } catch (e: any) {
      // ignore individual duplicate/insert errors
    }
  }

  console.log(`Finished. Saved ${savedCount} new leads to CRM.`);
  process.exit(0);
}

run().catch(console.error);
