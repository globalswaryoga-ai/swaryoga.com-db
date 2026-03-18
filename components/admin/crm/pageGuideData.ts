/**
 * Page Guide Data - Centralized configuration for all CRM page guides.
 * Each key maps to a CRM page path (without /admin/crm/ prefix).
 * Import this + the PageGuide component to show contextual help on any page.
 */

import {
  Users, MessageSquare, Radio, Bot, Phone, Mail, Globe, Layout,
  BarChart3, Settings, Shield, Megaphone, FileText, QrCode,
  GraduationCap, Calculator, Zap, Plug, HardDrive, Headphones,
  Target, Ticket, Instagram,
} from 'lucide-react';
import type { PageGuideData } from './PageGuide';

const PAGE_GUIDES: Record<string, PageGuideData> = {

  // ── Dashboard ──
  dashboard: {
    title: 'CRM Dashboard',
    description: 'Your command center — see all key metrics, quick actions, and setup progress at a glance.',
    icon: BarChart3,
    color: 'from-indigo-600 to-purple-600',
    steps: [
      'Review your KPI cards (leads, messages, broadcasts, conversion rate) at the top.',
      'Use Quick Actions to jump to common tasks like adding leads or sending messages.',
      'Complete the Setup Checklist to fully configure your CRM.',
      'Check Lead Growth chart and status distribution for trends.',
      'Explore the bottom cards to connect services and configure integrations.',
    ],
    benefits: [
      'Real-time overview of your entire business',
      'Quick access to all major CRM features',
      'Track team performance and lead sources',
      'Monitor plan usage and limits',
    ],
    tips: [
      'Change the time period (7d/30d/90d) to see different trends.',
      'Click the refresh button to get the latest data.',
    ],
    freePlanNote: 'All dashboard features available. Upgrade to increase limits on leads, broadcasts, and storage.',
  },

  // ── Sales & Funnel ──
  funnel: {
    title: 'Sales & Lead Management',
    description: 'Add, manage, and track all your leads through the sales funnel. Import contacts, assign statuses, and convert prospects into customers.',
    icon: Target,
    color: 'from-blue-600 to-cyan-600',
    steps: [
      'Click "Add Lead" to create a new contact with name, phone, email, and source.',
      'Use filters and search to find specific leads quickly.',
      'Change lead status (New → Contacted → Qualified → Converted) to track progress.',
      'Assign leads to team members for follow-up.',
      'Use bulk actions to update multiple leads at once.',
      'Export leads as CSV for external analysis.',
    ],
    benefits: [
      'Centralized contact management',
      'Visual sales pipeline tracking',
      'Automatic lead source tracking',
      'Bulk import/export capabilities',
    ],
    tips: [
      'Add lead source (website, referral, ad) to track which channels work best.',
      'Use tags to categorize leads (e.g., "hot", "cold", "VIP").',
      'Set follow-up reminders so no lead is forgotten.',
    ],
    freePlanNote: 'Free plan: up to 100 leads. Upgrade to Basic for 2,000 leads or Starter for 5,000.',
  },

  // ── WhatsApp / Meta ──
  'whatsapp-meta': {
    title: 'Meta WhatsApp Setup & Health',
    description: 'Configure and monitor your Meta WhatsApp Cloud API integration. Send test messages, check webhook status, and troubleshoot connection issues.',
    icon: MessageSquare,
    color: 'from-green-600 to-emerald-600',
    steps: [
      'Enter your Meta WhatsApp Business phone number ID and access token in Connections page.',
      'Verify webhook is connected — green checkmark means active.',
      'Use the "Quick Test" section to send a test message to any number.',
      'Monitor delivery status and error rates in the diagnostics panel.',
      'Check the "Recent Events" section for incoming webhook payloads.',
    ],
    benefits: [
      'Official Meta WhatsApp Business API integration',
      'Real-time message delivery tracking',
      'Webhook health monitoring',
      'Send text, images, documents, and templates',
    ],
    tips: [
      'Always use approved templates for first-time outreach (Meta policy).',
      'Check webhook event logs if messages aren\'t being received.',
      'Use the diagnostics refresh to get real-time API status.',
    ],
    freePlanNote: 'Free plan: WhatsApp API included. Upgrade for higher message volumes and priority delivery.',
  },

  // ── WhatsApp Chat ──
  whatsapp: {
    title: 'WhatsApp Inbox',
    description: 'Your WhatsApp messaging hub — send and receive messages, view chat history, and manage conversations with your leads and customers.',
    icon: MessageSquare,
    color: 'from-green-600 to-teal-600',
    steps: [
      'Select a contact from the left panel to open their chat.',
      'Type your message and press Enter or click Send.',
      'Attach images, documents, or media using the attachment button.',
      'Use templates for pre-approved messages (required for first outreach).',
      'Star important messages for quick reference.',
    ],
    benefits: [
      'All WhatsApp conversations in one place',
      'Send text, images, documents, and templates',
      'Full chat history with timestamps',
      'Quick reply with saved templates',
    ],
    tips: [
      'Use templates for the first message to a new contact (Meta requirement).',
      'Check message delivery status (sent, delivered, read) indicators.',
    ],
  },

  // ── Broadcast ──
  broadcast: {
    title: 'Broadcast Messages',
    description: 'Send bulk WhatsApp messages to multiple leads at once. Create campaigns, select audiences, and track delivery rates.',
    icon: Megaphone,
    color: 'from-purple-600 to-violet-600',
    steps: [
      'Click "New Broadcast" to create a campaign.',
      'Select your target audience using filters (status, tags, source).',
      'Choose a pre-approved WhatsApp template for the message.',
      'Preview the message and click Send.',
      'Monitor delivery, read, and response rates in the broadcast dashboard.',
    ],
    benefits: [
      'Reach thousands of contacts instantly',
      'Audience segmentation and targeting',
      'Delivery tracking and analytics',
      'Schedule broadcasts for optimal timing',
    ],
    tips: [
      'Always test with a small group before sending to your full list.',
      'Use personalization (name, etc.) in templates for better engagement.',
      'Respect Meta\'s rate limits — spread large broadcasts over time.',
    ],
    freePlanNote: 'Free plan: 1 broadcast/day. Upgrade to Basic for 5/day or Starter for 20/day.',
  },

  // ── Templates ──
  templates: {
    title: 'Message Templates',
    description: 'Create and manage WhatsApp message templates. Templates must be approved by Meta before use in broadcasts and first-contact messages.',
    icon: FileText,
    color: 'from-teal-600 to-cyan-600',
    steps: [
      'Click "Create Template" to design a new message template.',
      'Choose template category: Marketing, Utility, or Authentication.',
      'Write your template text with optional variables like {{1}} for personalization.',
      'Submit for Meta approval — usually takes 1-24 hours.',
      'Once approved, use the template in broadcasts and direct messages.',
    ],
    benefits: [
      'Pre-approved messages for reliable delivery',
      'Personalization with dynamic variables',
      'Reusable across broadcasts and direct chats',
      'Track template performance metrics',
    ],
    tips: [
      'Keep templates professional and clear — Meta rejects spammy content.',
      'Use Utility category for order updates, appointments — they have higher approval rates.',
      'Include a clear call-to-action in marketing templates.',
    ],
    freePlanNote: 'Free plan: templates included. Upgrade for more templates and priority Meta approval.',
  },

  // ── QR WhatsApp ──
  qr: {
    title: 'QR WhatsApp Bridge',
    description: 'Connect your personal WhatsApp number via QR code. Send and receive messages without Meta Business API — perfect for getting started quickly.',
    icon: QrCode,
    color: 'from-emerald-600 to-green-600',
    steps: [
      'Click "Generate QR Code" to get a new QR code.',
      'Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.',
      'Scan the QR code displayed on screen with your phone camera.',
      'Wait for connection — status will show "Connected" when ready.',
      'Start sending and receiving messages through the CRM.',
    ],
    benefits: [
      'No Meta Business API setup required',
      'Use your existing WhatsApp number',
      'Quick setup in under 2 minutes',
      'Send text, images, and documents',
    ],
    tips: [
      'Keep your phone connected to the internet for the bridge to work.',
      'If disconnected, simply re-scan the QR code.',
      'QR bridge is great for testing before upgrading to Meta API.',
    ],
    freePlanNote: 'QR WhatsApp is available on all plans. Free plan has limited message volume.',
  },

  // ── Chatbot ──
  chatbots: {
    title: 'AI Chatbot Builder',
    description: 'Build automated conversation flows, set up welcome messages, and configure AI-powered responses. Let the chatbot handle common queries while you focus on high-value tasks.',
    icon: Bot,
    color: 'from-violet-600 to-purple-600',
    steps: [
      'Enable the chatbot from the toggle at the top.',
      'Set up a Welcome Message that greets new contacts automatically.',
      'Add Trigger Messages — keyword-based auto-responses (e.g., "pricing" → send price list).',
      'Build conversation flows with multiple steps for complex interactions.',
      'Configure AI settings (model, temperature) for smart responses.',
    ],
    benefits: [
      '24/7 automated customer support',
      'Instant responses to common questions',
      'Reduce manual workload significantly',
      'AI-powered intelligent conversations',
    ],
    tips: [
      'Start simple — set up 5-10 common keyword triggers first.',
      'Use the AI agent for questions that don\'t match any trigger.',
      'Test your chatbot flows before going live.',
    ],
    freePlanNote: 'Free plan: 1 chatbot flow. Upgrade to Basic for 5 flows or Growth for unlimited.',
  },

  // ── Email ──
  email: {
    title: 'Email Marketing',
    description: 'Send email campaigns, create drip sequences, and manage your email marketing. Track opens, clicks, and conversions.',
    icon: Mail,
    color: 'from-orange-600 to-red-600',
    steps: [
      'First configure your email service in Connections page (SMTP, SendGrid, or Mailgun).',
      'Create a new campaign with subject line and content.',
      'Select your target audience from your leads.',
      'Preview and send the campaign.',
      'Track open rates, click rates, and unsubscribes in the analytics.',
    ],
    benefits: [
      'Professional email campaigns',
      'Audience segmentation',
      'Open and click tracking',
      'Automated drip sequences',
    ],
    tips: [
      'Use a catchy subject line — it\'s the most important part of your email.',
      'Always include an unsubscribe link (required by law).',
      'Send a test email to yourself before sending to your list.',
    ],
    freePlanNote: 'Free plan: 100 emails/month. Upgrade to Basic for 1,000 or Starter for 5,000.',
  },

  // ── Community ──
  community: {
    title: 'Community Management',
    description: 'Build and manage your online community. Create groups, share content, moderate discussions, and engage with your audience.',
    icon: Users,
    color: 'from-pink-600 to-rose-600',
    steps: [
      'Create your community space with a name and description.',
      'Invite members via link or add them from your leads.',
      'Post content — text, images, videos, polls, and events.',
      'Moderate discussions and manage member roles.',
      'Track engagement metrics and member growth.',
    ],
    benefits: [
      'Build a loyal audience around your brand',
      'Share exclusive content with members',
      'Foster discussions and networking',
      'Drive engagement and retention',
    ],
    tips: [
      'Post consistently — at least 3-4 times per week.',
      'Encourage member participation with polls and Q&A sessions.',
      'Use moderation tools to keep discussions constructive.',
    ],
    freePlanNote: 'Free plan: 1 community. Upgrade to Basic for 2, Starter for 5, or Growth for 20.',
  },

  // ── Landing Pages ──
  'landing-pages': {
    title: 'Landing Pages',
    description: 'Build beautiful lead capture pages with drag-and-drop. No coding needed — create pages that convert visitors into leads.',
    icon: Layout,
    color: 'from-pink-600 to-fuchsia-600',
    steps: [
      'Click "Create New Page" and choose a template or start blank.',
      'Add sections — hero, features, testimonials, pricing, CTA.',
      'Customize colors, text, images, and layout.',
      'Set up the lead capture form with required fields.',
      'Preview, publish, and share the page URL.',
    ],
    benefits: [
      'No coding or design skills required',
      'Beautiful, mobile-responsive templates',
      'Leads captured directly into your CRM',
      'Custom domain support',
    ],
    tips: [
      'Keep your landing page focused — one clear call-to-action.',
      'Add social proof (testimonials, logos) to build trust.',
      'Test different headlines to see what converts best.',
    ],
    freePlanNote: 'Free plan: 1 landing page. Upgrade to Basic for 3 or Starter for 10 pages.',
  },

  // ── Calls ──
  calls: {
    title: 'AI Voice Calling',
    description: 'Make AI-powered outbound calls, record conversations, and track call outcomes. Automate follow-up calls and appointment reminders.',
    icon: Phone,
    color: 'from-emerald-600 to-teal-600',
    steps: [
      'Configure your call service API keys in the Connections page.',
      'Select a lead and click "Call" to initiate an AI call.',
      'The AI agent will follow your configured script and collect information.',
      'Review call recordings and transcripts after the call.',
      'Set up automated follow-up sequences based on call outcomes.',
    ],
    benefits: [
      'AI-powered conversations at scale',
      'Automatic call recording and transcription',
      'Follow-up automation',
      'Call analytics and reporting',
    ],
    tips: [
      'Write clear, natural-sounding scripts for the AI agent.',
      'Always comply with local calling regulations and consent requirements.',
    ],
    freePlanNote: 'Free plan: AI calls included. Upgrade for higher call volume and recording storage.',
  },

  // ── SMS ──
  messages: {
    title: 'SMS Management',
    description: 'Send and manage SMS messages. Create SMS templates, automate notifications, and track delivery.',
    icon: MessageSquare,
    color: 'from-indigo-600 to-blue-600',
    steps: [
      'Configure your SMS provider API key in the Connections page.',
      'Create SMS templates for common messages.',
      'Send individual or bulk SMS to your leads.',
      'Track delivery status and response rates.',
    ],
    benefits: [
      'Direct reach — SMS has 98% open rate',
      'Automated notifications and reminders',
      'Template-based messaging',
      'Delivery tracking',
    ],
    freePlanNote: 'SMS requires API key configuration. Message volume depends on your SMS provider plan.',
  },

  // ── Reports Center ──
  reports: {
    title: 'Reports Center',
    description: 'All your CRM reports in one place — view, filter, download CSV/JSON, and compare plans.',
    icon: BarChart3,
    color: 'from-blue-600 to-purple-600',
    steps: [
      'Browse available reports by category — Leads, Sales, Marketing, Team.',
      'Click a report to view interactive charts and data.',
      'Switch time range (Today, 7d, 30d, 90d, Year) for different views.',
      'Use the Export button to download CSV, JSON, or Full CRM backup.',
      'Print any report directly from the browser.',
    ],
    benefits: [
      'Centralized report hub — everything in one page',
      'Export data as CSV or JSON for spreadsheets',
      'Full CRM backup export with one click',
      'Plan-based report access — upgrade to unlock more',
    ],
    tips: [
      'Free plan: 2 basic reports included. Upgrade to Starter for 7+ reports with CSV/JSON export.',
      'Use "Full CRM Export" to download all your leads, messages, and settings as a backup file.',
    ],
    freePlanNote: 'Free plan: basic reports included. Upgrade to Starter for CSV/JSON export and advanced analytics.',
  },

  // ── Analytics / Reports ──
  analytics: {
    title: 'Reports & Analytics',
    description: 'Deep-dive into your CRM performance with detailed charts, funnels, and export-ready reports.',
    icon: BarChart3,
    color: 'from-purple-600 to-indigo-600',
    steps: [
      'Select the report type — Leads, Sales, Messages, or Conversion Funnel.',
      'Choose a date range and filters.',
      'View interactive charts and data tables.',
      'Export reports as CSV for further analysis.',
    ],
    benefits: [
      'Data-driven decision making',
      'Visual charts and trend analysis',
      'Export-ready reports',
      'Conversion funnel tracking',
    ],
    freePlanNote: 'Free plan: basic analytics included. Upgrade to Starter for full reports and export.',
  },

  // ── E-Learning ──
  'e-learning': {
    title: 'E-Learning & Courses',
    description: 'Create and sell online courses, manage students, issue certificates, and track learning progress.',
    icon: GraduationCap,
    color: 'from-lime-600 to-emerald-600',
    steps: [
      'Create a new course with title, description, and pricing.',
      'Add modules and lessons — video, text, PDF, or quiz.',
      'Set enrollment rules (free, paid, invite-only).',
      'Track student progress and completion rates.',
      'Issue certificates automatically on course completion.',
    ],
    benefits: [
      'Monetize your knowledge',
      'Automated student enrollment',
      'Progress tracking and certificates',
      'Integrate with community for discussions',
    ],
    freePlanNote: 'Free plan: e-learning included. Upgrade for more courses, students, and storage.',
  },

  // ── Tally ──
  tally: {
    title: 'Tally Accounting',
    description: 'Sync your Tally accounting data with CRM. Track invoices, payments, and financial data alongside your customer information.',
    icon: Calculator,
    color: 'from-yellow-600 to-amber-600',
    steps: [
      'Connect your Tally account in the Connections page.',
      'Choose sync frequency (real-time or scheduled).',
      'Map Tally fields to CRM lead/customer fields.',
      'View invoice and payment data alongside customer profiles.',
    ],
    benefits: [
      'Unified customer + financial data',
      'Automatic sync with Tally',
      'Invoice tracking in CRM',
      'GST compliance support',
    ],
    freePlanNote: 'Tally integration is available on all plans. GST features require Tally billing plan.',
  },

  // ── Connections ──
  connections: {
    title: 'Service Connections Hub',
    description: 'Connect and configure all your external services — WhatsApp, email, SMS, payment gateway, domain, and more. All API keys and credentials in one place.',
    icon: Plug,
    color: 'from-amber-600 to-orange-600',
    steps: [
      'Click on any service section to expand its configuration form.',
      'Enter the required API keys, tokens, or credentials.',
      'Click "Test & Connect" to verify the connection works.',
      'A green checkmark means the service is successfully connected.',
      'Save all settings using the button at the bottom.',
    ],
    benefits: [
      'All service credentials in one secure place',
      'One-click connection testing',
      'Visual status showing connected/disconnected services',
      'Easy troubleshooting with error messages and help notes',
    ],
    tips: [
      'Get your Meta WhatsApp credentials from the Meta Business Suite.',
      'For email, SMTP is simplest — use your Gmail or business email SMTP settings.',
    ],
    freePlanNote: 'All services can be configured on any plan. Feature access depends on your plan.',
  },

  // ── Integration Hub ──
  'integration-hub': {
    title: 'Integration Hub',
    description: 'Configure chatbot automation, broadcast rules, email campaigns, SMS templates, community settings, e-learning, and recording workflows — all integration settings in one place.',
    icon: Zap,
    color: 'from-violet-600 to-purple-600',
    steps: [
      'Navigate through sections using the tab/accordion layout.',
      'Configure chatbot: welcome messages, triggers, flow steps, AI settings.',
      'Set broadcast rules: rate limits, scheduling, daily limits.',
      'Configure email campaign defaults: from name, footer, tracking.',
      'Set community moderation rules and e-learning enrollment settings.',
    ],
    benefits: [
      'Centralized automation configuration',
      'Fine-tune all integration behaviors',
      'Quick links to related pages',
      'Save time with defaults and templates',
    ],
    freePlanNote: 'Integration settings are available on all plans. Feature access depends on your plan.',
  },

  // ── Settings ──
  settings: {
    title: 'CRM Settings',
    description: 'Configure your CRM preferences — business hours, auto-replies, AI settings, lead assignment rules, notification preferences, and storage management.',
    icon: Settings,
    color: 'from-gray-600 to-gray-800',
    steps: [
      'Navigate through tabs: General, Hours, Replies, AI, Leads, Notifications, Storage.',
      'Set your business hours for auto-reply behavior.',
      'Configure auto-reply messages for off-hours.',
      'Set up AI model preferences and system prompts.',
      'Configure lead assignment and notification rules.',
    ],
    benefits: [
      'Fully customizable CRM behavior',
      'Auto-replies during off-hours',
      'AI configuration for smart responses',
      'Lead routing and assignment rules',
    ],
  },

  // ── Helpdesk ──
  helpdesk: {
    title: 'Help Desk & Tickets',
    description: 'Manage customer support tickets, track resolution times, and provide excellent customer service.',
    icon: Ticket,
    color: 'from-cyan-600 to-blue-600',
    steps: [
      'View incoming support tickets in the inbox.',
      'Assign tickets to team members.',
      'Reply to customers and update ticket status.',
      'Track response times and resolution rates.',
    ],
    benefits: [
      'Organized ticket management',
      'Team collaboration on support',
      'Performance tracking',
      'Customer satisfaction monitoring',
    ],
    freePlanNote: 'Free plan: helpdesk included. Upgrade for more tickets, SLA, and team assignment.',
  },

  // ── Instagram ──
  instagram: {
    title: 'Instagram Integration',
    description: 'Connect your Instagram account to manage DMs, track followers, and run engagement campaigns from your CRM.',
    icon: Instagram,
    color: 'from-pink-600 to-purple-600',
    steps: [
      'Connect your Instagram Business account via Facebook integration.',
      'View and reply to Instagram DMs from the CRM.',
      'Track follower growth and engagement metrics.',
      'Create Instagram-specific campaigns.',
    ],
    benefits: [
      'Unified inbox for Instagram + WhatsApp',
      'Follower growth tracking',
      'Campaign management',
      'Engagement analytics',
    ],
  },

  // ── Recording Management ──
  'recording-management': {
    title: 'Recording Management',
    description: 'Manage call recordings, Zoom meeting recordings, and media files. Auto-sync, organize, and share recordings.',
    icon: Headphones,
    color: 'from-red-600 to-pink-600',
    steps: [
      'View all recordings in the media library.',
      'Enable Zoom auto-sync in Integration Hub settings.',
      'Organize recordings by date, type, or participant.',
      'Share recordings with team members or leads.',
    ],
    benefits: [
      'Centralized recording storage',
      'Auto-sync with Zoom',
      'Easy sharing and access control',
      'Searchable recording library',
    ],
    freePlanNote: 'Free plan: recording management included. Upgrade for more storage and auto-sync.',
  },

  // ── Devices ──
  devices: {
    title: 'Connected Devices',
    description: 'Manage all connected devices and sessions. View active WhatsApp connections, API keys, and browser sessions.',
    icon: HardDrive,
    color: 'from-slate-600 to-gray-700',
    steps: [
      'View all active device connections.',
      'Disconnect unused or suspicious sessions.',
      'Manage API key access.',
    ],
    benefits: [
      'Security overview of active sessions',
      'Remote device management',
      'API key monitoring',
    ],
  },

  // ── Web Admin ──
  'web-admin': {
    title: 'Web Admin Panel',
    description: 'Manage your website content, pages, and settings from the admin panel.',
    icon: Globe,
    color: 'from-blue-600 to-indigo-600',
    steps: [
      'Navigate to the page or section you want to edit.',
      'Make changes using the editor.',
      'Preview changes before publishing.',
      'Click Publish to make changes live.',
    ],
    benefits: [
      'Easy website management',
      'Content editing without code',
      'Real-time preview',
    ],
  },
};

export default PAGE_GUIDES;
