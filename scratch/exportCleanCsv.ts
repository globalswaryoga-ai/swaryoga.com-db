import fs from 'fs';
import csvParser from 'csv-parser';
import { normalizePhone } from '@/lib/whatsapp';

async function run() {
  const results: any[] = [];
  const filepath = '/Users/mohankalburgi/Downloads/contacts (1).csv';
  
  await new Promise((resolve) => {
    fs.createReadStream(filepath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', resolve);
  });

  const validLeads = [];
  
  for (const row of results) {
    const rawName = row['First Name'] || row['Name'] || '';
    const lastName = row['Last Name'] || '';
    const fullName = [rawName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
    
    let rawPhone = row['Phone 1 - Value'] || row['Phone'] || row['Mobile'] || '';
    if (rawPhone.includes(':::')) {
      rawPhone = rawPhone.split(':::')[0].trim();
    }
    
    let phone = rawPhone.replace(/[^\d+]/g, '');
    if (phone.startsWith('000') || phone.length < 10) continue;
    
    phone = normalizePhone(phone);
    if (!phone || phone.length < 10) continue;
    
    // Filter out "cracked" numbers: ending in 0000 or having 5+ repeating digits anywhere
    if (/0{4,}$/.test(phone) || /(\d)\1{4,}/.test(phone)) continue;

    validLeads.push({
      Name: fullName,
      'Phone 1 - Value': phone,
      'E-mail 1 - Value': row['E-mail 1 - Value'] || '',
      Labels: 'CSV Import'
    });
  }

  // Create clean CSV
  const header = 'Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,E-mail 1 - Type,E-mail 1 - Value,Phone 1 - Type,Phone 1 - Value\n';
  let csvContent = header;
  
  for (const lead of validLeads) {
    csvContent += `"${lead.Name}","${lead.Name}",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,,"${lead['E-mail 1 - Value']}",Mobile,"${lead['Phone 1 - Value']}"\n`;
  }
  
  fs.writeFileSync('/Users/mohankalburgi/Downloads/Cleaned_Contacts.csv', csvContent);
  console.log(`Saved ${validLeads.length} clean contacts to /Users/mohankalburgi/Downloads/Cleaned_Contacts.csv`);
}

run().catch(console.error);
