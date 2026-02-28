/**
 * Add 4 new funnel stages to existing config:
 *   Inactive, Repeater, Old Sadhak, Only for Post
 *
 * Usage: node add-funnel-stages.js
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

const NEW_STAGES = [
  { key: 'inactive',       name: 'Inactive',       color: '#6B7280', colorGradient: '#9CA3AF', icon: 'pause-circle', isDefault: false, description: 'Lead is currently inactive or unresponsive' },
  { key: 'repeater',       name: 'Repeater',       color: '#F97316', colorGradient: '#FB923C', icon: 'repeat',       isDefault: false, description: 'Returning student, repeat enrollment' },
  { key: 'old_sadhak',     name: 'Old Sadhak',     color: '#14B8A6', colorGradient: '#2DD4BF', icon: 'lotus',        isDefault: false, description: 'Long-time practitioner / experienced sadhak' },
  { key: 'only_for_post',  name: 'Only for Post',  color: '#A855F7', colorGradient: '#C084FC', icon: 'megaphone',    isDefault: false, description: 'Lead used only for social media posting' },
];

async function run() {
  const conn = await mongoose.connect(MONGODB_URI, { dbName: CRM_DB });
  const db = conn.connection.db;
  const col = db.collection('funnel_configs');

  const config = await col.findOne({ isActive: true });
  if (!config) {
    console.log('❌ No active funnel config found. The app will create one with all 11 stages on next load.');
    await mongoose.disconnect();
    return;
  }

  const existingKeys = new Set((config.stages || []).map(s => s.key));
  const toAdd = NEW_STAGES.filter(s => !existingKeys.has(s.key));

  if (toAdd.length === 0) {
    console.log('✅ All 4 stages already exist. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const maxOrder = Math.max(...config.stages.map(s => s.order));
  const newStages = toAdd.map((s, i) => ({ ...s, order: maxOrder + 1 + i }));

  await col.updateOne(
    { _id: config._id },
    { $push: { stages: { $each: newStages } } }
  );

  console.log(`✅ Added ${newStages.length} new stage(s): ${newStages.map(s => s.name).join(', ')}`);
  console.log('   Orders:', newStages.map(s => `${s.name} → ${s.order}`).join(', '));

  await mongoose.disconnect();
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
