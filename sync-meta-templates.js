/**
 * Sync All Templates from Meta to CRM
 * Imports all existing approved templates from Meta
 * 
 * Run: node sync-meta-templates.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const META_API_VERSION = 'v24.0';

function buildAppSecretProof(accessToken, appSecret) {
  if (!appSecret) return '';
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(accessToken);
  return hmac.digest('hex');
}

function mapMetaStatusToLocal(metaStatus) {
  const statusMap = {
    'APPROVED': 'approved',
    'PENDING': 'pending_approval',
    'REJECTED': 'rejected',
    'DISABLED': 'disabled',
    'IN_APPEAL': 'pending_approval',
    'PENDING_DELETION': 'disabled',
  };
  return statusMap[metaStatus] || 'draft';
}

function mapMetaCategoryToLocal(metaCategory) {
  const categoryMap = {
    'MARKETING': 'MARKETING',
    'UTILITY': 'UTILITY',
    'AUTHENTICATION': 'AUTHENTICATION',
  };
  return categoryMap[metaCategory] || 'MARKETING';
}

async function syncTemplates() {
  // Connect to CRM database
  const crmUri = process.env.MONGODB_URI_MAIN.replace(/\/[^/]+\?/, '/' + (process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm') + '?');
  await mongoose.connect(crmUri);
  console.log('✅ Connected to CRM database\n');
  
  const WhatsAppTemplate = mongoose.connection.collection('whatsapp_templates');
  
  // Get Meta credentials
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  if (!accessToken || !wabaId) {
    console.error('❌ Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID');
    await mongoose.disconnect();
    return;
  }
  
  const proof = buildAppSecretProof(accessToken, appSecret);
  
  // Fetch all templates from Meta
  console.log('📥 Fetching templates from Meta...\n');
  
  let url = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score,rejected_reason&limit=200`;
  if (proof) {
    url += `&appsecret_proof=${proof}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.data) {
    console.error('❌ Failed to fetch from Meta:', data.error?.message || 'Unknown error');
    await mongoose.disconnect();
    return;
  }
  
  const metaTemplates = data.data;
  console.log(`📋 Found ${metaTemplates.length} templates on Meta\n`);
  
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const metaTemplate of metaTemplates) {
    // Find existing local template
    const existing = await WhatsAppTemplate.findOne({
      $or: [
        { metaTemplateId: metaTemplate.id },
        { metaTemplateName: metaTemplate.name },
        { templateName: metaTemplate.name },
      ],
    });
    
    const localStatus = mapMetaStatusToLocal(metaTemplate.status);
    
    if (existing) {
      // Update existing template
      await WhatsAppTemplate.updateOne(
        { _id: existing._id },
        {
          $set: {
            metaTemplateId: metaTemplate.id,
            metaTemplateName: metaTemplate.name,
            status: localStatus,
            metaStatus: metaTemplate.status,
            metaRejectionReason: metaTemplate.rejected_reason || null,
            metaQualityScore: metaTemplate.quality_score?.score || null,
            lastMetaSyncAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      console.log(`  ♻️  Updated: ${metaTemplate.name} (${metaTemplate.status})`);
      updated++;
    } else {
      // Import new template
      const bodyComponent = metaTemplate.components?.find(c => c.type === 'BODY');
      const headerComponent = metaTemplate.components?.find(c => c.type === 'HEADER');
      const footerComponent = metaTemplate.components?.find(c => c.type === 'FOOTER');
      const buttonsComponent = metaTemplate.components?.find(c => c.type === 'BUTTONS');
      
      const newTemplate = {
        templateName: metaTemplate.name,
        metaTemplateId: metaTemplate.id,
        metaTemplateName: metaTemplate.name,
        category: mapMetaCategoryToLocal(metaTemplate.category),
        language: metaTemplate.language || 'en',
        provider: 'meta',
        templateContent: bodyComponent?.text || '',
        headerFormat: headerComponent?.format || null,
        headerContent: headerComponent?.text || null,
        footerText: footerComponent?.text || null,
        buttons: buttonsComponent?.buttons?.map(b => ({ title: b.text })) || [],
        status: localStatus,
        metaStatus: metaTemplate.status,
        metaRejectionReason: metaTemplate.rejected_reason || null,
        metaQualityScore: metaTemplate.quality_score?.score || null,
        lastMetaSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await WhatsAppTemplate.insertOne(newTemplate);
      console.log(`  ✅ Imported: ${metaTemplate.name} (${metaTemplate.status}) - ${metaTemplate.category}`);
      imported++;
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Sync Complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total on Meta: ${metaTemplates.length}`);
  console.log('═'.repeat(50));
  
  // Show all templates in CRM
  console.log('\n📋 All templates in CRM now:\n');
  const allTemplates = await WhatsAppTemplate.find({}).sort({ templateName: 1 }).toArray();
  allTemplates.forEach(t => {
    const statusIcon = t.status === 'approved' ? '✅' : t.status === 'pending_approval' ? '⏳' : t.status === 'rejected' ? '❌' : '📝';
    console.log(`   ${statusIcon} ${t.templateName} | ${t.category} | ${t.status} | ${t.language}`);
  });
  
  await mongoose.disconnect();
}

syncTemplates().catch(console.error);
