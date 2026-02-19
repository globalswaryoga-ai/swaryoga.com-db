#!/usr/bin/env node
/**
 * Backfill Global Community Membership
 * 
 * This script adds all existing users and leads to the Global Community
 * if they're not already members.
 * 
 * Usage: node scripts/backfill-global-community.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function backfillGlobalCommunity() {
  console.log('🚀 Starting Global Community Backfill...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    console.log('✅ Connected to database\n');

    const User = mongoose.connection.collection('users');
    const Lead = mongoose.connection.collection('leads');
    const CommunityMember = mongoose.connection.collection('communitymembers');

    // Get existing global community members
    const existingMembers = await CommunityMember.find({ communityId: 'global' }).toArray();
    const existingMobiles = new Set(existingMembers.map(m => m.mobile).filter(Boolean));
    const existingEmails = new Set(existingMembers.map(m => m.email?.toLowerCase()).filter(Boolean));

    console.log(`📊 Existing global members: ${existingMembers.length}`);
    console.log(`   - Unique mobiles: ${existingMobiles.size}`);
    console.log(`   - Unique emails: ${existingEmails.size}\n`);

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 1. Process all users
    console.log('👤 Processing Users...');
    const users = await User.find({}).toArray();
    console.log(`   Found ${users.length} users\n`);

    for (const user of users) {
      try {
        const phone = user.phone?.replace(/\D/g, '') || '';
        const email = user.email?.toLowerCase();
        const name = user.name || 'Unknown User';

        // Skip if already a member
        if ((phone && existingMobiles.has(phone)) || (email && existingEmails.has(email))) {
          skippedCount++;
          continue;
        }

        if (!phone && !email) {
          console.log(`   ⚠️ Skipping user ${user._id} - no phone or email`);
          skippedCount++;
          continue;
        }

        // Add to global community
        await CommunityMember.insertOne({
          name: name,
          email: email || null,
          mobile: phone || null,
          countryCode: user.countryCode || '+91',
          userId: user.profileId || user._id.toString(),
          communityId: 'global',
          communityName: 'Global Community',
          status: 'active',
          approved: true,
          joinedAt: user.createdAt || new Date(),
          chatEnabled: true,
          chatPermissions: {
            canSend: true,
            allowText: true,
            allowLinks: true,
            allowImages: true,
            allowVideos: true,
            allowDocuments: true,
          },
          messageCount: 0,
          reactions: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Track added
        if (phone) existingMobiles.add(phone);
        if (email) existingEmails.add(email);
        addedCount++;
        
        if (addedCount % 50 === 0) {
          console.log(`   ✅ Added ${addedCount} users so far...`);
        }
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key - already exists
          skippedCount++;
        } else {
          console.error(`   ❌ Error adding user ${user._id}:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n   Users: Added ${addedCount}, Skipped ${skippedCount}, Errors ${errorCount}\n`);

    // 2. Process all leads (who might not have user accounts)
    console.log('📋 Processing Leads...');
    const usersAddedFromLeads = { added: 0, skipped: 0, errors: 0 };
    
    // Connect to CRM database if different
    const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    const crmDb = mongoose.connection.useDb(crmDbName);
    const CrmLead = crmDb.collection('leads');
    
    const leads = await CrmLead.find({}).toArray();
    console.log(`   Found ${leads.length} leads\n`);

    for (const lead of leads) {
      try {
        const phone = lead.phoneNumber?.replace(/\D/g, '') || '';
        const email = lead.email?.toLowerCase();
        const name = lead.name || 'Unknown Lead';

        // Skip if already a member
        if ((phone && existingMobiles.has(phone)) || (email && existingEmails.has(email))) {
          usersAddedFromLeads.skipped++;
          continue;
        }

        if (!phone && !email) {
          usersAddedFromLeads.skipped++;
          continue;
        }

        // Add to global community
        await CommunityMember.insertOne({
          name: name,
          email: email || null,
          mobile: phone || null,
          countryCode: '+91',
          userId: lead.leadNumber || lead._id.toString(),
          communityId: 'global',
          communityName: 'Global Community',
          status: 'active',
          approved: true,
          joinedAt: lead.createdAt || new Date(),
          chatEnabled: true,
          chatPermissions: {
            canSend: true,
            allowText: true,
            allowLinks: true,
            allowImages: true,
            allowVideos: true,
            allowDocuments: true,
          },
          messageCount: 0,
          reactions: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Track added
        if (phone) existingMobiles.add(phone);
        if (email) existingEmails.add(email);
        usersAddedFromLeads.added++;
        
        if (usersAddedFromLeads.added % 50 === 0) {
          console.log(`   ✅ Added ${usersAddedFromLeads.added} leads so far...`);
        }
      } catch (err) {
        if (err.code === 11000) {
          usersAddedFromLeads.skipped++;
        } else {
          console.error(`   ❌ Error adding lead ${lead._id}:`, err.message);
          usersAddedFromLeads.errors++;
        }
      }
    }

    console.log(`\n   Leads: Added ${usersAddedFromLeads.added}, Skipped ${usersAddedFromLeads.skipped}, Errors ${usersAddedFromLeads.errors}\n`);

    // Final count
    const finalCount = await CommunityMember.countDocuments({ communityId: 'global', status: 'active' });
    
    console.log('═══════════════════════════════════════════');
    console.log('📊 BACKFILL COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`Total added from Users: ${addedCount}`);
    console.log(`Total added from Leads: ${usersAddedFromLeads.added}`);
    console.log(`Total Global Community Members: ${finalCount}`);
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from database');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

backfillGlobalCommunity();
