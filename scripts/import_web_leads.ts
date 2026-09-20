require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');
const { saveBunnyLead, getBunnyLeadByPhone } = require('../lib/bunnyLeadsRepository');

async function importLeads() {
  console.log('Reading excel file...');
  const filePath = require('os').homedir() + '/Downloads/swaryoga web leads.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;
  
  console.log(`Found ${data.length - 1} rows to process.`);
  
  // Headers: 'Name', 'Email', 'Phone/WhatsApp Number', 'Assign To', 'Workshop Name'
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const name = row[0];
    const email = row[1];
    const phone = row[2];
    const assignedTo = row[3];
    const workshopName = row[4];
    
    if (!phone) continue;
    
    const cleanPhone = String(phone).replace(/\D/g, '');
    let finalPhone = cleanPhone;

    // Handle leading 00 (international prefix)
    if (finalPhone.startsWith('00')) {
      finalPhone = finalPhone.slice(2);
    } else if (finalPhone.startsWith('0') && finalPhone.length > 6) {
      finalPhone = finalPhone.slice(1);
    }

    if (finalPhone.length === 10) {
      finalPhone = '91' + finalPhone;
    }
    
    let createdAt = new Date().toISOString();
    
    try {
      const existing = await getBunnyLeadByPhone(finalPhone);
      
      if (existing) {
        // Merge labels and update fields if missing
        await saveBunnyLead({
          ...existing,
          name: existing.name && existing.name !== 'Unknown User' ? existing.name : (name || existing.name),
          email: existing.email || email,
          workshopName: existing.workshopName || workshopName
        }, existing._id);
        
        updateCount++;
      } else {
        const lead = {
          _id: Math.random().toString(36).substring(2, 15),
          leadNumber: 'L' + Math.floor(Math.random() * 1000000),
          phoneNumber: finalPhone,
          name: name ? String(name).trim() : 'Unknown User',
          email: email ? String(email).trim() : null,
          status: 'new_lead',
          source: 'website',
          workshopName: workshopName ? String(workshopName).trim() : null,
          labels: ['New', 'Website'],
          createdByUserId: 'system',
          assignedToUserId: null,
          createdAt: createdAt,
          updatedAt: createdAt
        };
        
        await saveBunnyLead(lead, lead._id);
        successCount++;
      }
      
      if ((successCount + updateCount) % 500 === 0) console.log(`Processed ${successCount + updateCount} leads...`);
    } catch (err) {
      console.error(`Failed to process lead row ${i} (Phone: ${finalPhone}):`, err.message);
      errorCount++;
    }
  }
  
  console.log('Import complete!');
  console.log(`Successfully inserted: ${successCount}`);
  console.log(`Successfully updated: ${updateCount}`);
  console.log(`Failed to process: ${errorCount}`);
  process.exit(0);
}

importLeads().catch(console.error);
