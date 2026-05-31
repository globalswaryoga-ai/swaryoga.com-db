import {
  LayoutDashboard,
  DollarSign,
  MessageCircle,
  Radio,
  Mail,
  Globe,
  QrCode,
  Bot,
  Phone,
  SmartphoneNfc,
  BarChart3,
  Settings,
  Users,
  UserCheck,
  Filter,
  TrendingUp,
  ShoppingBag,
  Tag,
  FileText,
  Link2,
  Trash2,
  Inbox,
  Activity,
  Send,
  FileEdit,
  Megaphone,
  Shield,
  Video,
  Smartphone,
  LogIn,
  MessageSquare,
  Calendar,
  Share2,
  Wrench,
  Cpu,
  Zap,
  BookOpen,
  PhoneCall,
  ClipboardList,
  HeadphonesIcon,
  Webhook,
  BarChart2,
  PieChart,
  Sliders,
  Tablet,
  Calculator,
  User,
  Image,
  Building2,
  Monitor,
  Clock,
  Puzzle,
  CreditCard,
  Plug,
  Leaf,
} from 'lucide-react';

import type { SubNavItem } from './CrmSubNav';

export interface SectionConfig {
  /** Section key used for matching */
  key: string;
  /** Page title shown in CrmSubNav header */
  title: string;
  /** Icon for the title */
  icon: React.ElementType;
  /** Primary sub-nav buttons (shown directly) */
  items: SubNavItem[];
  /** Overflow items in "More" dropdown */
  moreItems: SubNavItem[];
  /** URL prefixes that belong to this section */
  prefixes: string[];
}

export const sectionConfigs: SectionConfig[] = [
  // 1. Dashboard — no sub-nav (it's the overview)
  {
    key: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [],
    moreItems: [],
    prefixes: ['/admin/crm'],
  },

  // 2. Web Admin
  {
    key: 'web-admin',
    title: 'Web Admin',
    icon: Monitor,
    items: [
      {
        label: 'Users', href: '/admin/crm/web-admin', icon: Users,
        children: [
          { label: 'Signup Data', href: '/admin/signup-data', icon: Users },
          { label: 'Signin Data', href: '/admin/signin-data', icon: LogIn },
          { label: 'Contact Messages', href: '/admin/contact-messages', icon: MessageSquare },
          { label: 'Website Users', href: '/admin/users', icon: Users },
          { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquare },
          { label: 'Admin Users', href: '/admin/crm/users', icon: Shield },
          { label: 'Workshop Dates', href: '/admin/workshops/schedules', icon: Calendar },
        ],
      },
      {
        label: 'Sales', href: '/admin/crm/web-admin?tab=sales', icon: DollarSign,
        children: [
          { label: 'Leads', href: '/admin/crm/leads', icon: Users },
          { label: 'Follow-up', href: '/admin/crm/leads-followup', icon: Users },
          { label: 'Funnel', href: '/admin/crm/funnel', icon: Filter },
          { label: 'Funnel Manage', href: '/admin/crm/funnel/manage', icon: Sliders },
          { label: 'Labels', href: '/admin/crm/labels', icon: Tag },
          { label: 'Form Links', href: '/admin/crm/form-links', icon: Link2 },
          { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Settings },
          { label: 'Deleted Leads', href: '/admin/crm/leads/deleted', icon: Trash2 },
          { label: 'Orders', href: '/admin/crm/order-maintenance', icon: ShoppingBag },
          { label: 'Investment', href: '/admin/crm/investment', icon: TrendingUp },
          { label: 'Investment Dashboard', href: '/admin/crm/investment-dashboard', icon: BarChart3 },
        ],
      },
      {
        label: 'Social', href: '/admin/crm/web-admin?tab=social', icon: Share2,
        children: [
          { label: 'Social Media', href: '/admin/social-media', icon: Share2 },
          { label: 'Social Setup', href: '/admin/social-media-setup', icon: Settings },
          { label: 'Video Library', href: '/admin/videos', icon: Video },
          { label: 'Communities', href: '/admin/communities', icon: Globe },
          { label: 'Community CRM', href: '/admin/crm/community', icon: Globe },
          { label: 'Community Moderation', href: '/admin/crm/community-moderation', icon: Shield },
          { label: 'Recordings & Videos', href: '/admin/communities/recordings-videos', icon: Video },
          { label: 'Recording Mgmt', href: '/admin/crm/recording-management', icon: Video },
          { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: Video },
        ],
      },
      {
        label: 'Tools', href: '/admin/crm/web-admin?tab=tools', icon: Wrench,
        children: [
          { label: 'Ritucharya Admin', href: '/admin/crm/planner-dashboard/ritucharya/ritus-admin', icon: Leaf },
          { label: 'Ritucharya', href: '/admin/crm/planner/ritucharya', icon: Leaf },
          { label: 'Offers', href: '/admin/offers', icon: Tag },
          { label: 'Devices', href: '/admin/crm/devices', icon: Smartphone },
          { label: 'Knowledge Base', href: '/admin/crm/knowledge-base', icon: BookOpen },
          { label: 'AI Agents', href: '/admin/crm/ai-agents', icon: Zap },
          { label: 'Automation', href: '/admin/crm/automation', icon: Zap },
          { label: 'Media', href: '/admin/crm/media', icon: Image },
          { label: 'Inbound Media', href: '/admin/crm/inbound-media', icon: Image },
          { label: 'Youth Program', href: '/admin/youth-program', icon: Users },
          { label: 'Chatbot Builder', href: '/admin/crm/chatbot-builder', icon: Bot },
          { label: 'Chatbot Settings', href: '/admin/crm/chatbot-settings', icon: Settings },
          { label: 'Send Template', href: '/admin/crm/send-template', icon: FileText },
          { label: 'Templates', href: '/admin/crm/templates', icon: FileText },
          { label: 'Website Settings', href: '/admin/settings', icon: Settings },
          { label: 'CRM Settings', href: '/admin/crm/settings', icon: Wrench },
        ],
      },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/web-admin', '/admin/crm/planner/ritucharya', '/admin/crm/planner-dashboard/ritucharya/ritus-admin'],
  },

  // 3. Sales & Funnel
  {
    key: 'sales',
    title: 'Sales & Funnel',
    icon: DollarSign,
    items: [
      { label: 'Funnel Manage', href: '/admin/crm/funnel/manage', icon: Sliders },
      { label: 'Leads', href: '/admin/crm/leads', icon: Users },
      { label: 'Sales', href: '/admin/crm/sales', icon: DollarSign },
      { label: 'Funnel', href: '/admin/crm/funnel', icon: Filter },
      { label: 'Follow-up', href: '/admin/crm/leads-followup', icon: UserCheck },
    ],
    moreItems: [
      { label: 'Scheduled Messages', href: '/admin/crm/scheduled-messages', icon: Clock },
      { label: 'Investment', href: '/admin/crm/investment', icon: TrendingUp },
      { label: 'Investment Dashboard', href: '/admin/crm/investment-dashboard', icon: BarChart3 },
      { label: 'Orders', href: '/admin/crm/order-maintenance', icon: ShoppingBag },
      { label: 'Labels', href: '/admin/crm/labels', icon: Tag },
      { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Settings },
      { label: 'Form Links', href: '/admin/crm/form-links', icon: Link2 },
      { label: 'Deleted Leads', href: '/admin/crm/leads/deleted', icon: Trash2 },
    ],
    prefixes: [
      '/admin/crm/sales',
      '/admin/crm/leads',
      '/admin/crm/leads-followup',
      '/admin/crm/funnel',
      '/admin/crm/investment',
      '/admin/crm/investment-dashboard',
      '/admin/crm/order-maintenance',
      '/admin/crm/labels',
      '/admin/crm/lead-assignment-settings',
      '/admin/crm/form-links',
      '/admin/crm/scheduled-messages',
    ],
  },

  // NOTE: Meta WhatsApp section removed per request — QR & Broadcast sections cover WhatsApp flows

  // 4. Broadcast WhatsApp
  {
    key: 'broadcast',
    title: 'Broadcast WhatsApp',
    icon: Radio,
    items: [
      { label: 'Broadcast', href: '/admin/crm/broadcast', icon: Radio },
      { label: 'Dashboard', href: '/admin/crm/broadcast-dashboard', icon: BarChart3 },
      { label: 'Reports', href: '/admin/crm/broadcast/reports', icon: PieChart },
      { label: 'Send Template', href: '/admin/crm/send-template', icon: Send },
    ],
    moreItems: [
      { label: 'Templates', href: '/admin/crm/templates', icon: FileText },
      { label: 'Template Builder', href: '/admin/crm/templates/builder', icon: FileEdit },
    ],
    prefixes: [
      '/admin/crm/broadcast',
      '/admin/crm/broadcast-dashboard',
      '/admin/crm/broadcast-runs',
      '/admin/crm/send-template',
      '/admin/crm/templates',
    ],
  },

  // 5. Email
  {
    key: 'email',
    title: 'Email',
    icon: Mail,
    items: [
      { label: 'Email Dashboard', href: '/admin/crm/email', icon: Mail },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/email'],
  },

  // 6. Community
  {
    key: 'community',
    title: 'Community',
    icon: Globe,
    items: [
      { label: 'Community', href: '/admin/crm/community', icon: Globe },
      { label: 'Moderation', href: '/admin/crm/community-moderation', icon: Shield },
      { label: 'Recordings', href: '/admin/crm/recording-management', icon: Video },
    ],
    moreItems: [
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: BarChart2 },
      { label: 'Devices', href: '/admin/crm/devices', icon: Smartphone },
    ],
    prefixes: [
      '/admin/crm/community',
      '/admin/crm/community-moderation',
      '/admin/crm/recording-management',
      '/admin/crm/zoom-analytics',
      '/admin/crm/devices',
    ],
  },

  // 7. QR Leads Management (Basic plan primary entry)
  {
    key: 'qr-leads',
    title: 'QR Leads Management',
    icon: Users,
    items: [
      { label: 'QR Leads', href: '/admin/crm/qr/leads', icon: Users },
      { label: 'QR Funnel', href: '/admin/crm/qr/funnel', icon: Filter },
      { label: 'QR Funnel Action', href: '/admin/crm/qr/manage', icon: Sliders },
      { label: 'QR Seals', href: '/admin/crm/qr/seals', icon: Tag },
      { label: 'Funnel Dashboard', href: '/admin/crm/qr/funnel-report', icon: BarChart3 },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/qr/leads', '/admin/crm/qr/funnel', '/admin/crm/qr/manage', '/admin/crm/qr/funnel-report'],
  },

  // 8. QR (WhatsApp inbox & messaging)
  {
    key: 'qr',
    title: 'QR WhatsApp',
    icon: QrCode,
    items: [
      { label: 'Inbox', href: '/admin/crm/qr', icon: Inbox },
      { label: 'Templates', href: '/admin/crm/qr/templates', icon: FileEdit },
      { label: 'Broadcast', href: '/admin/crm/qr/broadcast', icon: Radio },
      { label: 'Sent Messages', href: '/admin/crm/qr/sent-messages', icon: Send },
      { label: 'Settings', href: '/admin/crm/whatsapp/settings', icon: Settings },
    ],
    moreItems: [
      { label: 'Groups', href: '/admin/crm/qr/group-contacts', icon: Users },
      { label: 'Schedule', href: '/admin/crm/qr/broadcast-schedule', icon: Calendar },
      { label: 'Broadcast Report', href: '/admin/crm/qr/broadcast-report', icon: BarChart3 },
      { label: 'Health Report', href: '/admin/crm/qr/health-report', icon: Activity },
    ],
    prefixes: ['/admin/crm/qr', '/admin/crm/qr/templates', '/admin/crm/qr/broadcast', '/admin/crm/qr/sent-messages', '/admin/crm/whatsapp/settings'],
  },

  // 9. Planner (top-level)
  {
    key: 'planner',
    title: 'Planner',
    icon: Calendar,
    items: [
      { label: 'Planner Home', href: '/admin/crm/planner', icon: Calendar },
      { label: 'Ritucharya', href: '/admin/crm/planner/ritucharya', icon: Leaf },
      { label: 'Planner Dashboard', href: '/admin/crm/planner/dashboard', icon: LayoutDashboard },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/planner', '/admin/crm/planner/ritucharya', '/admin/crm/planner/dashboard'],
  },

  // 10. Reports (repositioned)
  {
    key: 'reports',
    title: 'All Reports',
    icon: BarChart3,
    items: [
      { label: 'Reports Center', href: '/admin/crm/reports', icon: BarChart3 },
      { label: 'Analytics', href: '/admin/crm/analytics', icon: PieChart },
      { label: 'WA Analytics', href: '/admin/crm/whatsapp-analytics', icon: BarChart2 },
    ],
    moreItems: [
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: Video },
      { label: 'Meta Reports', href: '/admin/crm/reports/meta', icon: FileText },
    ],
    prefixes: ['/admin/crm/analytics', '/admin/crm/reports', '/admin/crm/whatsapp-analytics'],
  },

  // 11. Settings (repositioned)
  {
    key: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { label: 'Auto Config', href: '/admin/crm/settings', icon: Sliders },
      { label: 'Connections', href: '/admin/crm/connections', icon: Plug },
      { label: 'Integrations', href: '/admin/crm/integration-hub', icon: Zap },
      { label: 'Devices', href: '/admin/crm/devices', icon: Smartphone },
    ],
    moreItems: [
      { label: 'Tally', href: '/admin/crm/tally', icon: Calculator },
      { label: 'WA Settings', href: '/admin/crm/whatsapp/settings', icon: MessageCircle },
      { label: 'User Profile', href: '/admin/crm/users/profile', icon: User },
      { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Users },
      { label: 'Media Settings', href: '/admin/crm/media/settings', icon: Image },
      { label: 'Device Settings', href: '/admin/crm/devices/settings', icon: Settings },
    ],
    prefixes: ['/admin/crm/settings', '/admin/crm/tally', '/admin/crm/users/profile'],
  },

  // 7b. Telegram Bot
  {
    key: 'telegram',
    title: 'Telegram',
    icon: Send,
    items: [
      { label: 'Telegram', href: '/admin/crm/telegram', icon: Send },
      { label: 'Templates', href: '/admin/crm/telegram/templates', icon: FileEdit },
      { label: 'Broadcast', href: '/admin/crm/telegram/broadcast', icon: Radio },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/telegram'],
  },

  // 8. AI & Chatbot
  {
    key: 'chatbot',
    title: 'AI & Chatbot',
    icon: Bot,
    items: [
      { label: 'Chatbots', href: '/admin/crm/chatbots', icon: Bot },
      { label: 'Knowledge Base', href: '/admin/crm/knowledge-base', icon: BookOpen },
      { label: 'AI Agents', href: '/admin/crm/ai-agents', icon: Cpu },
    ],
    moreItems: [
      { label: 'Chatbot Settings', href: '/admin/crm/chatbot-settings', icon: Settings },
    ],
    prefixes: [
      '/admin/crm/chatbots',
      '/admin/crm/chatbot-settings',
      '/admin/crm/knowledge-base',
      '/admin/crm/ai-agents',
    ],
  },

  // 8.5 Automation
  {
    key: 'automation',
    title: 'Automation',
    icon: Zap,
    items: [
      { label: 'Automation', href: '/admin/crm/automation', icon: Zap },
      { label: 'Sadhana Programs', href: '/admin/crm/sadhana-programs', icon: Video },
      { label: 'Sadhana Scheduler', href: '/admin/crm/sadhana-scheduler', icon: Clock },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/automation',
      '/admin/crm/sadhana-programs',
      '/admin/crm/sadhana-scheduler',
    ],
  },

  // 9. Call
  {
    key: 'calls',
    title: 'Call',
    icon: Phone,
    items: [
      { label: 'Workflows', href: '/admin/crm/calls', icon: PhoneCall },
      { label: 'Agents', href: '/admin/crm/calls/agents', icon: HeadphonesIcon },
      { label: 'Scripts', href: '/admin/crm/calls/templates', icon: ClipboardList },
      { label: 'Reports', href: '/admin/crm/calls/reports', icon: BarChart3 },
    ],
    moreItems: [
      { label: 'Broadcasts', href: '/admin/crm/calls/broadcasts', icon: Megaphone },
    ],
    prefixes: ['/admin/crm/calls'],
  },

  // 10. SMS Management
  {
    key: 'messages',
    title: 'SMS Management',
    icon: SmartphoneNfc,
    items: [
      { label: 'Messages', href: '/admin/crm/messages', icon: SmartphoneNfc },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/messages'],
  },



  // 12. Super Admin (superadmin only — full platform management)
  {
    key: 'super-admin',
    title: 'Super Admin',
    icon: Shield,
    items: [
      { label: 'Dashboard', href: '/admin/crm/super-admin', icon: LayoutDashboard },
      { label: 'All Users', href: '/admin/crm/super-admin/users', icon: Users },
      { label: 'Payments', href: '/admin/crm/super-admin/payments', icon: CreditCard },
      { label: 'Signin Logs', href: '/admin/crm/super-admin/signins', icon: LogIn },
      { label: 'Reports', href: '/admin/crm/super-admin/reports', icon: BarChart3 },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/super-admin'],
  },

  // 13. Tenants (Multi-Tenant SaaS — superadmin only)
  {
    key: 'tenants',
    title: 'Tenants',
    icon: Building2,
    items: [
      { label: 'All Tenants', href: '/admin/crm/tenants', icon: Building2 },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/tenants',
    ],
  },

  // 13. Connections Hub (all service credentials in one place)
  {
    key: 'connections',
    title: 'Connections',
    icon: Plug,
    items: [
      { label: 'All Connections', href: '/admin/crm/connections', icon: Plug },
      { label: 'QR WhatsApp', href: '/admin/crm/qr', icon: QrCode },
      { label: 'WA Settings', href: '/admin/crm/whatsapp/settings', icon: MessageCircle },
      { label: 'Email', href: '/admin/crm/email', icon: Mail },
    ],
    moreItems: [
      { label: 'Tally', href: '/admin/crm/tally', icon: Calculator },
      { label: 'Devices', href: '/admin/crm/devices', icon: Smartphone },
      { label: 'Payment', href: '/admin/crm/payments', icon: CreditCard },
    ],
    prefixes: [
      '/admin/crm/connections',
    ],
  },

  // 14. Integration Hub (chatbot, templates, broadcast, email, SMS, community, e-learning, recordings)
  {
    key: 'integration-hub',
    title: 'Integrations',
    icon: Zap,
    items: [
      { label: 'All Integrations', href: '/admin/crm/integration-hub', icon: Zap },
      { label: 'Chatbot Builder', href: '/admin/crm/chatbot-builder', icon: Bot },
      { label: 'Templates', href: '/admin/crm/templates', icon: FileText },
      { label: 'Broadcast', href: '/admin/crm/broadcast', icon: Radio },
    ],
    moreItems: [
      { label: 'AI Agents', href: '/admin/crm/ai-agents', icon: Cpu },
      { label: 'Knowledge Base', href: '/admin/crm/knowledge-base', icon: BookOpen },
      { label: 'Automation', href: '/admin/crm/automation', icon: Zap },
      { label: 'Community', href: '/admin/crm/community', icon: Globe },
      { label: 'Recordings', href: '/admin/crm/recording-management', icon: Video },
    ],
    prefixes: [
      '/admin/crm/integration-hub',
    ],
  },



  // 16. Addons & Extensions
  {
    key: 'addons',
    title: 'Extensions',
    icon: Puzzle,
    items: [
      { label: 'Manage Addons', href: '/admin/crm/addons', icon: Puzzle },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/addons',
    ],
  },
];

/**
 * Find the section config that best matches the given pathname.
 * Sections are matched by longest-prefix-match, with the dashboard
 * section only matching its exact path.
 */
export function findSectionForPath(pathname: string): SectionConfig | null {
  // Exact match for dashboard
  if (pathname === '/admin/crm') {
    return sectionConfigs.find(s => s.key === 'dashboard') || null;
  }

  let bestMatch: SectionConfig | null = null;
  let bestLength = 0;

  for (const section of sectionConfigs) {
    if (section.key === 'dashboard') continue; // Skip dashboard for prefix matching
    for (const prefix of section.prefixes) {
      if (pathname.startsWith(prefix) && prefix.length > bestLength) {
        bestMatch = section;
        bestLength = prefix.length;
      }
    }
  }

  return bestMatch;
}
