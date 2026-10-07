import fs from 'fs';
import { bunnyExecute } from '../lib/bunnyDatabase';
import { normalizePhone } from '../lib/whatsapp';

async function run() {
  console.log('Fetching all leads from DB...');
  const res = await bunnyExecute({ sql: 'SELECT lead_key, data_json FROM leads_sql' });
  
  console.log(`Found ${res.rows.length} total leads in DB.`);
  
  // Load the ones we already gave the user
  const oldCsvPath = '/Users/mohankalburgi/Downloads/Cleaned_Contacts.csv';
  let oldNumbers = new Set<string>();
  if (fs.existsSync(oldCsvPath)) {
    const oldCsv = fs.readFileSync(oldCsvPath, 'utf8');
    const lines = oldCsv.split('\n');
    for (const line of lines) {
      if (line.trim() === '' || line.startsWith('Name,')) continue;
      const parts = line.split(',');
      const phone = parts[parts.length - 1]?.replace(/"/g, '').trim();
      if (phone) {
        const last10 = phone.slice(-10);
        if (last10.length === 10) oldNumbers.add(last10);
      }
    }
  }
  
  console.log(`Found ${oldNumbers.size} leads already in Cleaned_Contacts.csv`);
  
  const remainingLeads = [];
  
  for (const row of res.rows) {
    let phone = '';
    let name = 'Unknown';
    try {
      const data = JSON.parse(row.data_json as string);
      name = data.name || data.firstName || 'Unknown';
      phone = data.phoneNumber || data.phone || data.mobile || '';
    } catch(e){}
    
    phone = normalizePhone(phone);
    if (!phone || phone.length < 10) continue;
    
    // Check if it was already exported
    const last10 = phone.slice(-10);
    if (oldNumbers.has(last10)) continue;
    
    // Filter cracked
    if (/0{4,}$/.test(phone) || /(\d)\1{4,}/.test(phone)) continue;
    
    remainingLeads.push({ Name: name, Phone: phone });
  }
  
  console.log(`Found ${remainingLeads.length} remaining clean leads to export.`);
  
  // Create clean CSV
  const header = 'Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,E-mail 1 - Type,E-mail 1 - Value,Phone 1 - Type,Phone 1 - Value\n';
  let csvContent = header;
  
  for (const lead of remainingLeads) {
    csvContent += `"${lead.Name}","${lead.Name}",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,,,Mobile,"${lead.Phone}"\n`;
  }
  
  fs.writeFileSync('/Users/mohankalburgi/Downloads/Remaining_Leads.csv', csvContent);
  console.log(`Saved ${remainingLeads.length} clean contacts to /Users/mohankalburgi/Downloads/Remaining_Leads.csv`);
}

run().catch(console.error);
