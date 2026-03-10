#!/usr/bin/env node
/**
 * Setup Telegram Bot for Super Admin
 * 
 * Usage:
 *   node scripts/setup-telegram-bot.js
 * 
 * This script:
 * 1. Reads TELEGRAM_BOT_TOKEN from .env.local
 * 2. Verifies the bot token with Telegram API
 * 3. Saves configuration to super admin's CRM user settings
 * 4. Sets up webhook to receive messages
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const SUPER_ADMIN_USER_ID = process.env.ADMIN_USERID || 'admincrm';
const PRODUCTION_URL = 'https://swaryoga.com';

const TELEGRAM_API = 'https://api.telegram.org/bot';

// ─── Telegram API Functions ───────────────────────────────────────────

async function verifyBotToken(token) {
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/getMe`);
    const data = await res.json();
    return data;
  } catch (err) {
    return { ok: false, description: err.message };
  }
}

async function setWebhook(token, webhookUrl, secretToken) {
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'],
        secret_token: secretToken,
      }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, description: err.message };
  }
}

async function getWebhookInfo(token) {
  try {
    const res = await fetch(`${TELEGRAM_API}${token}/getWebhookInfo`);
    return await res.json();
  } catch (err) {
    return { ok: false, description: err.message };
  }
}

// ─── MongoDB Schema (simplified) ──────────────────────────────────────

const CRMUserSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  telegramBotToken: { type: String, default: '' },
  telegramBotUsername: { type: String, default: '' },
  telegramBotName: { type: String, default: '' },
  telegramBotId: { type: Number },
  telegramWebhookSet: { type: Boolean, default: false },
  telegramWebhookSecret: { type: String, default: '' },
  telegramEnabled: { type: Boolean, default: false },
}, { timestamps: true, collection: 'crm_user_settings' });

// ─── Main Setup ───────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Telegram Bot Setup for Super Admin                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check token
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local');
    process.exit(1);
  }
  console.log(`📱 Bot Token: ${TELEGRAM_BOT_TOKEN.slice(0, 10)}...${TELEGRAM_BOT_TOKEN.slice(-5)}`);

  // Step 1: Verify bot token with Telegram
  console.log('\n📡 Step 1: Verifying bot token with Telegram API...');
  const botInfo = await verifyBotToken(TELEGRAM_BOT_TOKEN);
  
  if (!botInfo.ok) {
    console.error(`❌ Bot token verification failed: ${botInfo.description}`);
    process.exit(1);
  }
  
  const bot = botInfo.result;
  console.log('✅ Bot verified successfully!');
  console.log(`   • Bot ID: ${bot.id}`);
  console.log(`   • Username: @${bot.username}`);
  console.log(`   • Name: ${bot.first_name}`);

  // Step 2: Connect to MongoDB
  console.log('\n📦 Step 2: Connecting to MongoDB...');
  const crmUri = MONGODB_URI.replace(/\/[^/?]+(\?|$)/, `/${CRM_DB_NAME}$1`);
  
  await mongoose.connect(crmUri);
  console.log(`✅ Connected to ${CRM_DB_NAME}`);

  const Settings = mongoose.model('CRMUserSettings', CRMUserSettingsSchema);

  // Step 3: Generate webhook secret
  const webhookSecret = crypto.randomBytes(20).toString('hex');
  console.log('\n🔐 Step 3: Generated webhook secret');

  // Step 4: Set up webhook
  console.log('\n🌐 Step 4: Setting up Telegram webhook...');
  const webhookUrl = `${PRODUCTION_URL}/api/admin/crm/telegram/webhook?uid=${SUPER_ADMIN_USER_ID}`;
  console.log(`   Webhook URL: ${webhookUrl}`);

  const webhookResult = await setWebhook(TELEGRAM_BOT_TOKEN, webhookUrl, webhookSecret);
  
  if (!webhookResult.ok) {
    console.error(`❌ Webhook setup failed: ${webhookResult.description}`);
    console.log('   Will continue saving config anyway...');
  } else {
    console.log('✅ Webhook configured successfully!');
  }

  // Step 5: Save configuration to database
  console.log('\n💾 Step 5: Saving configuration to database...');
  
  const updateResult = await Settings.findOneAndUpdate(
    { userId: SUPER_ADMIN_USER_ID },
    {
      $set: {
        telegramBotToken: TELEGRAM_BOT_TOKEN,
        telegramBotUsername: bot.username,
        telegramBotName: bot.first_name,
        telegramBotId: bot.id,
        telegramWebhookSet: webhookResult.ok,
        telegramWebhookSecret: webhookSecret,
        telegramEnabled: true,
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Configuration saved!');
  console.log(`   • User: ${SUPER_ADMIN_USER_ID}`);
  console.log(`   • Telegram Enabled: true`);
  console.log(`   • Webhook Active: ${webhookResult.ok}`);

  // Step 6: Verify webhook info
  console.log('\n🔍 Step 6: Verifying webhook status...');
  const whInfo = await getWebhookInfo(TELEGRAM_BOT_TOKEN);
  
  if (whInfo.ok && whInfo.result) {
    const info = whInfo.result;
    console.log('📊 Webhook Info:');
    console.log(`   • URL: ${info.url || '(not set)'}`);
    console.log(`   • Has Custom Certificate: ${info.has_custom_certificate || false}`);
    console.log(`   • Pending Updates: ${info.pending_update_count || 0}`);
    console.log(`   • Last Error: ${info.last_error_message || '(none)'}`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     ✅ Telegram Bot Setup Complete!                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Bot: @${bot.username.padEnd(47)}║`);
  console.log(`║  Webhook: ${webhookResult.ok ? 'Active ✓' : 'Failed ✗'.padEnd(44)}          ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  To test: Send a message to the bot on Telegram            ║');
  console.log('║  Check: /api/admin/crm/telegram/messages                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
