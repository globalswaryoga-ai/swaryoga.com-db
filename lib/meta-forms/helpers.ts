/**
 * Helper functions to work with Meta Instant Forms in CRM
 * Includes importing historical data, filtering, and linking
 */

import { connectDB } from '@/lib/db';
import { ObjectId } from 'mongodb';

/**
 * Import historical Meta form leads from Meta API
 * Usage: npm run import:meta-forms
 */
export async function importHistoricalMetaForms(
  formId: string,
  accessToken: string,
  workshopMappings?: Record<string, string> // { "Beginner": "507f1f77bcf86cd..." }
) {
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    console.log('📥 Fetching historical Meta forms...');

    // Fetch leads from Meta Graph API
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${formId}/leads?fields=id,created_time,field_data&limit=100&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Meta API error: ${response.statusText}`);
    }

    const data = await response.json();
    const leads = data.data || [];

    console.log(`✅ Found ${leads.length} historical leads`);

    let imported = 0;
    let duplicates = 0;

    for (const metaLead of leads) {
      try {
        // Check if already imported
        const existing = await leadsCollection.findOne({
          'metaLeadId': metaLead.id,
        });

        if (existing) {
          duplicates++;
          continue;
        }

        // Parse field data
        const fieldData: Record<string, string> = {};
        for (const field of metaLead.field_data || []) {
          fieldData[field.name] = field.values?.[0] || '';
        }

        // Map workshop
        let workshopId: string | null = null;
        let workshopName = fieldData['workshop'] || fieldData['Which workshop are you interested in?'] || 'Unknown';

        if (workshopMappings) {
          for (const [key, id] of Object.entries(workshopMappings)) {
            if (workshopName.toLowerCase().includes(key.toLowerCase())) {
              workshopId = id;
              break;
            }
          }
        }

        // Create lead
        const lead = {
          metaLeadId: metaLead.id,
          phone: (fieldData['phone'] || fieldData['Phone'] || '').replace(/\D/g, ''),
          name: [fieldData['first_name'] || fieldData['First Name'], fieldData['last_name'] || fieldData['Last Name']]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unknown',
          email: fieldData['email'] || fieldData['Email'] || '',
          source: 'meta_instant_form',
          importedFrom: 'historical_import',
          status: 'new',
          workshopId: workshopId ? new ObjectId(workshopId) : null,
          workshopName: workshopName,
          createdAt: new Date(metaLead.created_time),
          importedAt: new Date(),
          tags: ['meta_instant_form', 'imported', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
        };

        await leadsCollection.insertOne(lead);
        imported++;
      } catch (error) {
        console.error(`Error importing lead ${metaLead.id}:`, error);
      }
    }

    console.log(`✅ Import complete: ${imported} new leads, ${duplicates} duplicates skipped`);
    return { imported, duplicates, total: leads.length };
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

/**
 * Get all leads from a specific workshop (from Meta forms)
 */
export async function getMetaLeadsForWorkshop(workshopId: string) {
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    const leads = await leadsCollection
      .find({
        source: 'meta_instant_form',
        workshopId: new ObjectId(workshopId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return leads;
  } catch (error) {
    console.error('Error fetching Meta leads for workshop:', error);
    return [];
  }
}

/**
 * Get all Meta form leads (across all workshops)
 */
export async function getAllMetaFormLeads(limit = 100, skip = 0) {
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    const [leads, total] = await Promise.all([
      leadsCollection
        .find({ source: 'meta_instant_form' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray(),
      leadsCollection.countDocuments({ source: 'meta_instant_form' }),
    ]);

    return { leads, total };
  } catch (error) {
    console.error('Error fetching Meta leads:', error);
    return { leads: [], total: 0 };
  }
}

/**
 * Get lead statistics from Meta forms
 */
export async function getMetaFormStats() {
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    // Total Meta leads
    const totalLeads = await leadsCollection.countDocuments({ source: 'meta_instant_form' });

    // Leads by status
    const byStatus = await leadsCollection
      .aggregate([
        { $match: { source: 'meta_instant_form' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();

    // Leads by workshop
    const byWorkshop = await leadsCollection
      .aggregate([
        { $match: { source: 'meta_instant_form' } },
        { $group: { _id: '$workshopName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Leads by campaign
    const byCampaign = await leadsCollection
      .aggregate([
        { $match: { source: 'meta_instant_form' } },
        { $group: { _id: '$campaignName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Leads in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = await leadsCollection.countDocuments({
      source: 'meta_instant_form',
      createdAt: { $gte: sevenDaysAgo },
    });

    return {
      totalLeads,
      byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
      byWorkshop: Object.fromEntries(byWorkshop.map(w => [w._id, w.count])),
      byCampaign: Object.fromEntries(byCampaign.map(c => [c._id, c.count])),
      lastWeek,
    };
  } catch (error) {
    console.error('Error getting Meta form stats:', error);
    return null;
  }
}

/**
 * Auto-assign Meta leads to sales team based on workshop
 */
export async function autoAssignMetaLeads(workshopAssignments: Record<string, string>) {
  // workshopAssignments = { "507f1f77bcf86cd...": "salesperson_id_1" }
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    let assigned = 0;

    for (const [workshopId, staffId] of Object.entries(workshopAssignments)) {
      const result = await leadsCollection.updateMany(
        {
          source: 'meta_instant_form',
          workshopId: new ObjectId(workshopId),
          assignedTo: { $exists: false },
        },
        { $set: { assignedTo: staffId, assignedAt: new Date() } }
      );

      assigned += result.modifiedCount;
    }

    console.log(`✅ Auto-assigned ${assigned} Meta leads to team`);
    return assigned;
  } catch (error) {
    console.error('Error auto-assigning leads:', error);
    return 0;
  }
}

/**
 * Send welcome message to all new Meta leads via WhatsApp
 */
export async function sendWelcomeToMetaLeads() {
  try {
    const db = await connectDB();
    const crmDb = db.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');

    // Get uncontacted Meta leads
    const leads = await leadsCollection
      .find({
        source: 'meta_instant_form',
        'contact.whatsappSent': { $exists: false },
        phone: { $exists: true, $ne: '' },
      })
      .toArray();

    console.log(`📱 Sending WhatsApp to ${leads.length} new Meta leads...`);

    for (const lead of leads) {
      try {
        // Send WhatsApp message (via your WhatsApp API)
        const message = `Hi ${lead.name}! 🙏\n\nThank you for your interest in ${lead.workshopName}.\n\nWe'll send you details soon!\n\nSwar Yoga Team`;

        // You would integrate with your WhatsApp API here
        // await sendWhatsAppMessage(lead.phone, message);

        // Mark as contacted
        await leadsCollection.updateOne(
          { _id: lead._id },
          { $set: { 'contact.whatsappSent': new Date() } }
        );
      } catch (error) {
        console.error(`Failed to contact ${lead.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending welcome messages:', error);
  }
}

export default {
  importHistoricalMetaForms,
  getMetaLeadsForWorkshop,
  getAllMetaFormLeads,
  getMetaFormStats,
  autoAssignMetaLeads,
  sendWelcomeToMetaLeads,
};
