#!/usr/bin/env node

/**
 * Email Automation Setup Script
 * 
 * This script creates initial email templates and example follow-up sequences
 * Run: node scripts/setup-email-automation.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models (using require since this is a script)
const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// Define schemas inline for script
const EmailTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['general', 'welcome', 'followup', 'workshop', 'custom'],
    default: 'general'
  },
  variables: [String],
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FollowUpSequenceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  trigger: {
    type: String,
    enum: ['manual', 'lead_created', 'workshop_registered', 'payment_received', 'form_submitted', 'custom'],
    required: true,
  },
  steps: [{
    stepNumber: { type: Number, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    delayDays: { type: Number, default: 0 },
    delayHours: { type: Number, default: 0 },
  }],
  active: { type: Boolean, default: true },
  stats: {
    totalExecutions: { type: Number, default: 0 },
    completedExecutions: { type: Number, default: 0 },
    activeExecutions: { type: Number, default: 0 },
  },
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

async function setupEmailAutomation() {
  console.log('🚀 Starting Email Automation Setup...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get CRM database
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);

    // Get or create models
    let EmailTemplate;
    let FollowUpSequence;
    
    try {
      EmailTemplate = crmDb.model('EmailTemplate');
      FollowUpSequence = crmDb.model('FollowUpSequence');
    } catch (e) {
      EmailTemplate = crmDb.model('EmailTemplate', EmailTemplateSchema);
      FollowUpSequence = crmDb.model('FollowUpSequence', FollowUpSequenceSchema);
    }

    // Create example templates
    console.log('📧 Creating example email templates...');
    
    const templates = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to Swar Yoga!',
        body: `
          <h1>Welcome to Swar Yoga, {name}!</h1>
          <p>Thank you for joining our community.</p>
          <p>We're excited to have you on this journey of self-discovery and wellness.</p>
          <p>Your registered email: {email}</p>
          <p>Best regards,<br/>Swar Yoga Team</p>
        `,
        category: 'welcome',
        variables: ['name', 'email'],
        createdBy: 'system',
      },
      {
        name: 'Workshop Registration Confirmation',
        subject: 'Your Workshop Registration is Confirmed',
        body: `
          <h2>Hello {name}!</h2>
          <p>Your registration for the workshop has been confirmed.</p>
          <p>We'll send you more details closer to the date.</p>
          <p>If you have any questions, feel free to contact us at {email}.</p>
          <p>Looking forward to seeing you!</p>
        `,
        category: 'workshop',
        variables: ['name', 'email'],
        createdBy: 'system',
      },
      {
        name: 'Follow-up Email',
        subject: 'Hope you\'re enjoying Swar Yoga',
        body: `
          <h2>Hi {name},</h2>
          <p>We wanted to check in and see how you're enjoying your Swar Yoga experience.</p>
          <p>If you have any questions or feedback, please don't hesitate to reach out.</p>
          <p>Your contact email: {email}</p>
          <p>Phone: {phone}</p>
          <p>Warm regards,<br/>Swar Yoga Team</p>
        `,
        category: 'followup',
        variables: ['name', 'email', 'phone'],
        createdBy: 'system',
      },
      {
        name: 'Payment Received',
        subject: 'Payment Confirmation - Swar Yoga',
        body: `
          <h2>Dear {name},</h2>
          <p>Thank you! We've received your payment.</p>
          <p>A receipt has been sent to {email}.</p>
          <p>If you have any questions about your payment, please contact us.</p>
          <p>Thank you for choosing Swar Yoga!</p>
        `,
        category: 'general',
        variables: ['name', 'email'],
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      try {
        const existing = await EmailTemplate.findOne({ name: template.name });
        if (existing) {
          console.log(`  ⏭️  Template "${template.name}" already exists, skipping...`);
        } else {
          await EmailTemplate.create(template);
          console.log(`  ✅ Created template: "${template.name}"`);
        }
      } catch (err) {
        console.log(`  ❌ Error creating template "${template.name}":`, err.message);
      }
    }

    console.log('\n📬 Creating example follow-up sequences...');

    const sequences = [
      {
        name: 'New Lead Welcome Series',
        trigger: 'lead_created',
        steps: [
          {
            stepNumber: 1,
            subject: 'Welcome to Swar Yoga!',
            body: `
              <h1>Welcome {name}!</h1>
              <p>Thank you for your interest in Swar Yoga.</p>
              <p>We'll be sending you helpful information over the next few days.</p>
            `,
            delayDays: 0,
            delayHours: 1,
          },
          {
            stepNumber: 2,
            subject: 'Getting Started with Swar Yoga',
            body: `
              <h2>Hi {name},</h2>
              <p>Here are some resources to help you get started with Swar Yoga.</p>
              <p>Check out our beginner's guide and video tutorials.</p>
            `,
            delayDays: 2,
            delayHours: 0,
          },
          {
            stepNumber: 3,
            subject: 'Join Our Community',
            body: `
              <h2>Hello {name}!</h2>
              <p>Connect with other Swar Yoga practitioners in our community.</p>
              <p>Share your experiences and learn from others.</p>
            `,
            delayDays: 5,
            delayHours: 0,
          },
        ],
        active: true,
        createdBy: 'system',
      },
      {
        name: 'Workshop Registration Follow-up',
        trigger: 'workshop_registered',
        steps: [
          {
            stepNumber: 1,
            subject: 'Workshop Reminder - 7 Days',
            body: `
              <h2>Hi {name},</h2>
              <p>Your workshop is coming up in 7 days!</p>
              <p>We're looking forward to seeing you there.</p>
            `,
            delayDays: 7,
            delayHours: 0,
          },
          {
            stepNumber: 2,
            subject: 'Workshop Reminder - Tomorrow',
            body: `
              <h2>Hello {name}!</h2>
              <p>Your workshop is tomorrow! See you soon.</p>
              <p>Make sure you have everything you need.</p>
            `,
            delayDays: 13,
            delayHours: 0,
          },
          {
            stepNumber: 3,
            subject: 'Thank You for Attending!',
            body: `
              <h2>Thank you, {name}!</h2>
              <p>We hope you enjoyed the workshop.</p>
              <p>We'd love to hear your feedback.</p>
            `,
            delayDays: 15,
            delayHours: 0,
          },
        ],
        active: false, // Disabled by default, can be activated when needed
        createdBy: 'system',
      },
    ];

    for (const sequence of sequences) {
      try {
        const existing = await FollowUpSequence.findOne({ name: sequence.name });
        if (existing) {
          console.log(`  ⏭️  Sequence "${sequence.name}" already exists, skipping...`);
        } else {
          await FollowUpSequence.create(sequence);
          console.log(`  ✅ Created sequence: "${sequence.name}" (${sequence.active ? 'Active' : 'Inactive'})`);
        }
      } catch (err) {
        console.log(`  ❌ Error creating sequence "${sequence.name}":`, err.message);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    const templateCount = await EmailTemplate.countDocuments();
    const sequenceCount = await FollowUpSequence.countDocuments();
    const activeSequenceCount = await FollowUpSequence.countDocuments({ active: true });
    
    console.log(`  📧 Total Templates: ${templateCount}`);
    console.log(`  📬 Total Sequences: ${sequenceCount} (${activeSequenceCount} active)`);

    console.log('\n✨ Email Automation Setup Complete!\n');
    console.log('🎯 Next Steps:');
    console.log('  1. Navigate to http://localhost:3000/admin/crm/email');
    console.log('  2. View the created templates in the "Templates" tab');
    console.log('  3. View sequences in the "Follow-ups" tab');
    console.log('  4. Send a test email from the "Compose" tab');
    console.log('  5. Integrate real email service (see EMAIL_AUTOMATION_GUIDE.md)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during setup:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the setup
setupEmailAutomation();
