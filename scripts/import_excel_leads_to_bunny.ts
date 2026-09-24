require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');
const { saveBunnyLead, getBunnyLeadByPhone } = require('../lib/bunnyLeadsRepository');

async function importLeads() {
  console.log('Reading excel file...');
  const filePath = require('os').homedir() + '/Downloads/leads_all_all_all_2026-09-19.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  let updateCount = 0;
  
  console.log(`Found ${data.length - 1} rows to process.`);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const leadId = row[0];
    const userName = row[1];
    const name = row[2];
    const email = row[3];
    const phone = row[4];
    const status = row[5];
    const source = row[6];
    const workshopName = row[7];
    const labelsStr = row[8];
    const createdDate = row[9];
    
    if (!phone) continue;
    
    const cleanPhone = String(phone).replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    
    const labels = labelsStr ? String(labelsStr).split(',').map(s => s.trim()).filter(Boolean) : [];
    
    let createdAt = new Date().toISOString();
    if (createdDate) {
      const d = new Date(createdDate);
      if (!isNaN(d.getTime())) createdAt = d.toISOString();
    }
    
    try {
      const existing = await getBunnyLeadByPhone(finalPhone);
      
      if (existing) {
        // Merge labels and update fields if missing
        const mergedLabels = [...new Set([...(existing.labels || []), ...labels])];
        
        await saveBunnyLead({
          ...existing,
          name: existing.name && existing.name !== 'Unknown User' ? existing.name : (name || existing.name),
          email: existing.email || email,
          labels: mergedLabels,
          source: existing.source || source,
          workshopName: existing.workshopName || workshopName
        }, existing._id);
        
        updateCount++;
      } else {
        const lead = {
          _id: leadId ? String(leadId) : Math.random().toString(36).substring(2, 15),
          leadNumber: 'L' + Math.floor(Math.random() * 1000000),
          phoneNumber: finalPhone,
          name: name ? String(name).trim() : 'Unknown User',
          email: email ? String(email).trim() : null,
          status: status ? String(status).trim() : 'lead',
          source: source ? String(source).trim() : 'manual',
          workshopName: workshopName ? String(workshopName).trim() : null,
          labels: labels,
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
