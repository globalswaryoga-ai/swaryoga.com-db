#!/usr/bin/env node

/**
 * Script to import historical Meta Instant Form leads
 * Usage: node scripts/import-meta-forms.js
 *
 * Before running:
 * 1. Get your Meta Form ID from Meta Business Account
 * 2. Create a Meta App with lead_gen permission
 * 3. Set META_FORM_ID and META_ACCESS_TOKEN in .env.local
 * 4. Map workshop names to IDs in the script below
 */

const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const META_FORM_ID = process.env.META_FORM_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Map workshop names to ObjectIDs
// Get these IDs from your workshops collection in MongoDB
const WORKSHOP_MAPPINGS = {
  'Beginner Yoga': '507f1f77bcf86cd799439011',
  'Advanced Yoga': '507f1f77bcf86cd799439012',
  'Pranayama Masters': '507f1f77bcf86cd799439013',
  'Meditation': '507f1f77bcf86cd799439014',
  'Kundalini': '507f1f77bcf86cd799439015',
};

async function importMetaForms() {
  let client;
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI_MAIN not set in .env.local');
    }
    if (!META_FORM_ID || !META_ACCESS_TOKEN) {
      console.log('⚠️  META_FORM_ID or META_ACCESS_TOKEN not set');
      console.log('To use this script:');
      console.log('1. Go to https://developers.facebook.com/tools/explorer');
      console.log('2. Get your access token with lead_gen permission');
      console.log('3. Get your form ID from Meta Business Account > Forms');
      console.log('4. Add to .env.local:');
      console.log('   META_FORM_ID=your_form_id');
      console.log('   META_ACCESS_TOKEN=your_access_token');
      return;
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(CRM_DB_NAME);
    const leadsCollection = db.collection('leads');

    console.log('📥 Fetching Meta Instant Form leads...');
    console.log(`📋 Form ID: ${META_FORM_ID}`);

    // Fetch leads from Meta Graph API
    let allLeads = [];
    let after = null;
    let pageCount = 0;

    do {
      const url = new URL(`https://graph.instagram.com/v18.0/${META_FORM_ID}/leads`);
      url.searchParams.set('fields', 'id,created_time,field_data');
      url.searchParams.set('limit', '100');
      url.searchParams.set('access_token', META_ACCESS_TOKEN);
      if (after) url.searchParams.set('after', after);

      console.log(`📡 Fetching page ${pageCount + 1}...`);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Meta API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const leads = data.data || [];
      allLeads = allLeads.concat(leads);

      console.log(`   ✓ Got ${leads.length} leads`);

      // Pagination
      after = data.paging?.cursors?.after;
      pageCount++;
      if (pageCount >= 100) break; // Safety limit: max 10,000 leads
    } while (after);

    console.log(`✅ Total leads fetched: ${allLeads.length}`);

    if (allLeads.length === 0) {
      console.log('⚠️  No leads found. Check your Form ID and Access Token.');
      return;
    }

    // Import into MongoDB
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const metaLead of allLeads) {
      try {
        // Check if already imported
        const existing = await leadsCollection.findOne({ metaLeadId: metaLead.id });
        if (existing) {
          duplicates++;
          continue;
        }

        // Parse field data
        const fieldData = {};
        for (const field of metaLead.field_data || []) {
          fieldData[field.name] = field.values?.[0] || '';
        }

        // Map workshop
        let workshopId = null;
        let workshopName = 'Unknown Workshop';

        // Try to find matching workshop
        const possibleWorkshop = fieldData['workshop'] || 
                                 fieldData['Which workshop are you interested in?'] || 
                                 fieldData['Workshop'];
        
        if (possibleWorkshop) {
          for (const [key, id] of Object.entries(WORKSHOP_MAPPINGS)) {
            if (possibleWorkshop.toLowerCase().includes(key.toLowerCase())) {
              workshopId = id;
              workshopName = key;
              break;
            }
          }
          
          // If not matched, use the form value
          if (!workshopId) {
            workshopName = possibleWorkshop;
          }
        }

        // Normalize phone
        let phone = (fieldData['phone'] || fieldData['Phone'] || '').replace(/\D/g, '');
        // Add country code if needed (10-digit Indian number)
        if (phone.length === 10) {
          phone = '91' + phone;
        }

        // Create lead
        const lead = {
          metaLeadId: metaLead.id,
          phone: phone,
          name: [
            fieldData['first_name'] || fieldData['First Name'] || '',
            fieldData['last_name'] || fieldData['Last Name'] || ''
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unknown',
          email: fieldData['email'] || fieldData['Email'] || '',
          source: 'meta_instant_form',
          importedFrom: 'historical_import',
          status: 'new',
          workshopId: workshopId,
          workshopName: workshopName,
          campaignName: fieldData['campaign'] || fieldData['Campaign'] || 'Unknown Campaign',
          createdAt: new Date(metaLead.created_time),
          importedAt: new Date(),
          tags: [
            'meta_instant_form',
            'imported',
            workshopId ? `workshop_${workshopId}` : ''
          ].filter(Boolean),
        };

        await leadsCollection.insertOne(lead);
        imported++;

        if (imported % 10 === 0) {
          console.log(`   ✓ Imported ${imported} leads...`);
        }
      } catch (error) {
        console.error(`❌ Error importing lead ${metaLead.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Import Complete!');
    console.log(`   📊 New leads imported: ${imported}`);
    console.log(`   ⏭️  Duplicates skipped: ${duplicates}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    console.log(`   📈 Total processed: ${allLeads.length}`);

    // Show statistics
    const stats = await leadsCollection
      .aggregate([
        { $match: { source: 'meta_instant_form' } },
        {
          $group: {
            _id: '$workshopName',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    console.log('\n📊 Leads by Workshop:');
    for (const stat of stats) {
      console.log(`   ${stat._id}: ${stat.count}`);
    }
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run
importMetaForms();
