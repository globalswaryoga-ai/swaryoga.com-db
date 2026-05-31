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
  GraduationCap,
  MessageSquareDot,
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

  // 3. Sales & Funnel — lead_management bundle
  {
    key: 'sales',
    title: 'Sales & Funnel',
    icon: DollarSign,
    items: [
      { label: 'Leads',        href: '/admin/crm/leads',            icon: Users },
      { label: 'Sales',        href: '/admin/crm/sales',            icon: DollarSign },
      { label: 'Funnel',       href: '/admin/crm/funnel',           icon: Filter },
      { label: 'Follow-up',    href: '/admin/crm/leads-followup',   icon: UserCheck },
      { label: 'Funnel Manage',href: '/admin/crm/funnel/manage',    icon: Sliders },
    ],
    moreItems: [
      { label: 'Labels',          href: '/admin/crm/labels',                   icon: Tag },
      { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Settings },
      { label: 'Deleted Leads',   href: '/admin/crm/leads/deleted',            icon: Trash2 },
      { label: 'Orders',          href: '/admin/crm/order-maintenance',        icon: ShoppingBag },
    ],
    prefixes: [
      '/admin/crm/sales', '/admin/crm/leads', '/admin/crm/leads-followup',
      '/admin/crm/funnel', '/admin/crm/order-maintenance', '/admin/crm/labels',
      '/admin/crm/lead-assignment-settings',
    ],
  },

  // 3b. Meta WhatsApp — whatsapp_meta bundle
  {
    key: 'meta',
    title: 'Meta WhatsApp',
    icon: MessageSquareDot,
    items: [
      { label: 'Meta Inbox',   href: '/admin/crm/meta',              icon: Inbox },
      { label: 'Templates',    href: '/admin/crm/meta/templates',    icon: FileText },
      { label: 'Meta Reports', href: '/admin/crm/reports/meta',      icon: BarChart3 },
    ],
    moreItems: [
      { label: 'WA Settings',    href: '/admin/crm/whatsapp/settings',      icon: Settings },
      { label: 'Webhook Events', href: '/admin/crm/whatsapp/webhook-events', icon: Zap },
    ],
    prefixes: [
      '/admin/crm/meta', '/admin/crm/whatsapp/meta',
      '/admin/crm/whatsapp-meta', '/admin/crm/reports/meta',
    ],
  },

  // 4. Broadcast WhatsApp — whatsapp_qr OR whatsapp_meta
  {
    key: 'broadcast',
    title: 'Broadcast WhatsApp',
    icon: Radio,
    items: [
      { label: 'Broadcast',     href: '/admin/crm/broadcast',           icon: Radio },
      { label: 'Dashboard',     href: '/admin/crm/broadcast-dashboard', icon: BarChart3 },
      { label: 'Reports',       href: '/admin/crm/broadcast/reports',   icon: PieChart },
      { label: 'Send Template', href: '/admin/crm/send-template',       icon: Send },
    ],
    moreItems: [
      { label: 'Templates',       href: '/admin/crm/templates',         icon: FileText },
      { label: 'Template Builder',href: '/admin/crm/templates/builder', icon: FileEdit },
    ],
    prefixes: [
      '/admin/crm/broadcast', '/admin/crm/broadcast-dashboard',
      '/admin/crm/broadcast-runs', '/admin/crm/send-template', '/admin/crm/templates',
    ],
  },

  // 5. Email — email bundle
  {
    key: 'email',
    title: 'Email',
    icon: Mail,
    items: [
      { label: 'Email Dashboard',  href: '/admin/crm/email',           icon: Mail },
      { label: 'Email Campaigns',  href: '/admin/crm/email-campaigns', icon: Send },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/email', '/admin/crm/email-campaigns'],
  },

  // 6. Community — community bundle
  {
    key: 'community',
    title: 'Community',
    icon: Globe,
    items: [
      { label: 'Community',  href: '/admin/crm/community',             icon: Globe },
      { label: 'Moderation', href: '/admin/crm/community-moderation',  icon: Shield },
      { label: 'Recordings', href: '/admin/crm/recording-management',  icon: Video },
    ],
    moreItems: [
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: BarChart2 },
    ],
    prefixes: [
      '/admin/crm/community', '/admin/crm/community-moderation',
      '/admin/crm/recording-management', '/admin/crm/zoom-analytics',
    ],
  },

  // 7. QR Leads Management — lead_management bundle
  {
    key: 'qr-leads',
    title: 'QR Leads Management',
    icon: Users,
    items: [
      { label: 'QR Leads',       href: '/admin/crm/qr/leads',       icon: Users },
      { label: 'QR Funnel',      href: '/admin/crm/qr/funnel',      icon: Filter },
      { label: 'Funnel Manage',  href: '/admin/crm/qr/manage',      icon: Sliders },
      { label: 'Funnel Report',  href: '/admin/crm/qr/funnel-report',icon: BarChart3 },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/qr/leads', '/admin/crm/qr/funnel', '/admin/crm/qr/manage', '/admin/crm/qr/funnel-report'],
  },

  // 8. QR WhatsApp — whatsapp_qr bundle
  {
    key: 'qr',
    title: 'QR WhatsApp',
    icon: QrCode,
    items: [
      { label: 'Inbox',         href: '/admin/crm/qr',                    icon: Inbox },
      { label: 'Templates',     href: '/admin/crm/qr/templates',          icon: FileEdit },
      { label: 'Broadcast',     href: '/admin/crm/qr/broadcast',          icon: Radio },
      { label: 'Sent Messages', href: '/admin/crm/qr/sent-messages',      icon: Send },
      { label: 'Settings',      href: '/admin/crm/whatsapp/settings',     icon: Settings },
    ],
    moreItems: [
      { label: 'Groups',           href: '/admin/crm/qr/group-contacts',    icon: Users },
      { label: 'Schedule',         href: '/admin/crm/qr/broadcast-schedule',icon: Calendar },
      { label: 'Broadcast Report', href: '/admin/crm/qr/broadcast-report',  icon: BarChart3 },
      { label: 'Health Report',    href: '/admin/crm/qr/health-report',     icon: Activity },
    ],
    prefixes: [
      '/admin/crm/qr', '/admin/crm/qr/templates', '/admin/crm/qr/broadcast',
      '/admin/crm/qr/sent-messages', '/admin/crm/whatsapp/settings',
    ],
  },

  // 9. Planner — planner bundle
  {
    key: 'planner',
    title: 'Planner',
    icon: Calendar,
    items: [
      { label: 'Planner Home',      href: '/admin/crm/planner',           icon: Calendar },
      { label: 'Ritucharya',        href: '/admin/crm/planner/ritucharya',icon: Leaf },
      { label: 'Planner Dashboard', href: '/admin/crm/planner-dashboard', icon: LayoutDashboard },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/planner', '/admin/crm/planner/ritucharya', '/admin/crm/planner-dashboard'],
  },

  // 10. Reports — report bundle (tab-level bundle tags for cross-bundle tabs)
  {
    key: 'reports',
    title: 'All Reports',
    icon: BarChart3,
    items: [
      { label: 'Reports Center', href: '/admin/crm/reports',            icon: BarChart3 },
      { label: 'Analytics',      href: '/admin/crm/analytics',          icon: PieChart },
      { label: 'WA Analytics',   href: '/admin/crm/whatsapp-analytics', icon: BarChart2, bundle: ['whatsapp_qr', 'whatsapp_meta'] },
    ],
    moreItems: [
      { label: 'Meta Reports',   href: '/admin/crm/reports/meta',  icon: FileText,  bundle: 'whatsapp_meta' },
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: Video,    bundle: 'community' },
    ],
    prefixes: ['/admin/crm/analytics', '/admin/crm/reports', '/admin/crm/whatsapp-analytics'],
  },

  // 11. Settings — always visible, tab-level bundle tags for optional tabs
  {
    key: 'settings',
    title: 'Settings',
    icon: Settings,
    items: [
      { label: 'CRM Settings', href: '/admin/crm/settings',      icon: Sliders },
      { label: 'User Profile', href: '/admin/crm/users/profile', icon: User },
      { label: 'Team',         href: '/admin/crm/team',          icon: Users },
    ],
    moreItems: [
      { label: 'WA Settings',     href: '/admin/crm/whatsapp/settings',     icon: MessageCircle, bundle: ['whatsapp_qr', 'whatsapp_meta'] },
      { label: 'Media Settings',  href: '/admin/crm/media/settings',        icon: Image },
      { label: 'Custom Fields',   href: '/admin/crm/custom-fields',         icon: FileText },
      { label: 'Branding',        href: '/admin/crm/branding',              icon: Image },
      { label: 'Permissions',     href: '/admin/crm/permissions',           icon: Shield },
    ],
    prefixes: [
      '/admin/crm/settings', '/admin/crm/users/profile', '/admin/crm/team',
      '/admin/crm/custom-fields', '/admin/crm/branding', '/admin/crm/permissions',
    ],
  },

  // Telegram — telegram bundle
  {
    key: 'telegram',
    title: 'Telegram',
    icon: Send,
    items: [
      { label: 'Telegram',   href: '/admin/crm/telegram',            icon: Send },
      { label: 'Templates',  href: '/admin/crm/telegram/templates',  icon: FileEdit },
      { label: 'Broadcast',  href: '/admin/crm/telegram/broadcast',  icon: Radio },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/telegram'],
  },

  // AI & Chatbot — chatbot bundle
  {
    key: 'chatbot',
    title: 'AI & Chatbot',
    icon: Bot,
    items: [
      { label: 'Chatbots',     href: '/admin/crm/chatbots',      icon: Bot },
      { label: 'Knowledge Base',href: '/admin/crm/knowledge-base',icon: BookOpen },
      { label: 'AI Agents',    href: '/admin/crm/ai-agents',     icon: Cpu },
    ],
    moreItems: [
      { label: 'Chatbot Settings', href: '/admin/crm/chatbot-settings', icon: Settings },
    ],
    prefixes: [
      '/admin/crm/chatbots', '/admin/crm/chatbot-settings',
      '/admin/crm/knowledge-base', '/admin/crm/ai-agents',
    ],
  },

  // Automation — chatbot bundle
  {
    key: 'automation',
    title: 'Automation',
    icon: Zap,
    items: [
      { label: 'Automation', href: '/admin/crm/automation', icon: Zap },
      { label: 'Workflows',  href: '/admin/crm/workflows',  icon: Zap },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/automation', '/admin/crm/workflows'],
  },

  // Landing Pages — landing_page bundle
  {
    key: 'landing-pages',
    title: 'Landing Pages',
    icon: FileText,
    items: [
      { label: 'Landing Pages', href: '/admin/crm/landing-pages', icon: FileText },
      { label: 'Form Links',    href: '/admin/crm/form-links',    icon: Link2 },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/landing-pages', '/admin/crm/form-links'],
  },

  // Sadhana — sadhana_program bundle
  {
    key: 'sadhana',
    title: 'Sadhana',
    icon: Leaf,
    items: [
      { label: 'Programs',      href: '/admin/crm/sadhana-programs',     icon: Video },
      { label: 'Scheduler',     href: '/admin/crm/sadhana-scheduler',    icon: Clock },
      { label: 'Announcements', href: '/admin/crm/sadhana-announcements',icon: Megaphone },
    ],
    moreItems: [
      { label: 'Sadhana Chat', href: '/admin/crm/sadhana-chat', icon: MessageCircle },
    ],
    prefixes: [
      '/admin/crm/sadhana-programs', '/admin/crm/sadhana-scheduler',
      '/admin/crm/sadhana-announcements', '/admin/crm/sadhana-chat',
    ],
  },

  // E-Learning — elearning bundle
  {
    key: 'elearning',
    title: 'E-Learning',
    icon: GraduationCap,
    items: [
      { label: 'Dashboard', href: '/admin/crm/e-learning/dashboard', icon: LayoutDashboard },
      { label: 'Courses',   href: '/admin/crm/e-learning',           icon: GraduationCap },
      { label: 'Students',  href: '/admin/crm/e-learning/users',     icon: Users },
    ],
    moreItems: [
      { label: 'Analytics',    href: '/admin/crm/e-learning/analytics',    icon: BarChart3 },
      { label: 'Bulk Actions', href: '/admin/crm/e-learning/bulk-actions', icon: Sliders },
    ],
    prefixes: ['/admin/crm/e-learning'],
  },

  // Calls — ai_calling bundle
  {
    key: 'calls',
    title: 'Call',
    icon: Phone,
    items: [
      { label: 'Workflows', href: '/admin/crm/calls',           icon: PhoneCall },
      { label: 'Agents',    href: '/admin/crm/calls/agents',    icon: HeadphonesIcon },
      { label: 'Scripts',   href: '/admin/crm/calls/templates', icon: ClipboardList },
      { label: 'Reports',   href: '/admin/crm/calls/reports',   icon: BarChart3 },
    ],
    moreItems: [
      { label: 'Broadcasts', href: '/admin/crm/calls/broadcasts', icon: Megaphone },
    ],
    prefixes: ['/admin/crm/calls'],
  },

  // SMS Management — sms bundle
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

  // Connections — tabs filtered per bundle the tenant has
  {
    key: 'connections',
    title: 'Connections',
    icon: Plug,
    items: [
      { label: 'All Connections', href: '/admin/crm/connections',         icon: Plug },
      { label: 'Meta WhatsApp',   href: '/admin/crm/meta',                icon: MessageSquareDot, bundle: 'whatsapp_meta' },
      { label: 'QR WhatsApp',     href: '/admin/crm/qr',                  icon: QrCode,           bundle: 'whatsapp_qr' },
      { label: 'Email',           href: '/admin/crm/email',               icon: Mail,             bundle: 'email' },
    ],
    moreItems: [
      { label: 'Telegram', href: '/admin/crm/telegram',  icon: Send,       bundle: 'telegram' },
      { label: 'Tally',    href: '/admin/crm/tally',     icon: Calculator, bundle: 'tally' },
      { label: 'Devices',  href: '/admin/crm/devices',   icon: Smartphone },
      { label: 'Payment',  href: '/admin/crm/payments',  icon: CreditCard },
    ],
    prefixes: ['/admin/crm/connections'],
  },

  // Integration Hub — tabs filtered per bundle
  {
    key: 'integration-hub',
    title: 'Integrations',
    icon: Zap,
    items: [
      { label: 'All Integrations', href: '/admin/crm/integration-hub',  icon: Zap },
      { label: 'Chatbot Builder',  href: '/admin/crm/chatbot-builder',   icon: Bot,      bundle: 'chatbot' },
      { label: 'E-Learning',       href: '/admin/crm/e-learning',        icon: GraduationCap, bundle: 'elearning' },
      { label: 'Community',        href: '/admin/crm/community',         icon: Globe,    bundle: 'community' },
    ],
    moreItems: [
      { label: 'AI Agents',    href: '/admin/crm/ai-agents',            icon: Cpu,      bundle: 'chatbot' },
      { label: 'Knowledge Base',href: '/admin/crm/knowledge-base',      icon: BookOpen, bundle: 'chatbot' },
      { label: 'Automation',   href: '/admin/crm/automation',           icon: Zap,      bundle: 'chatbot' },
      { label: 'Recordings',   href: '/admin/crm/recording-management', icon: Video,    bundle: 'community' },
    ],
    prefixes: ['/admin/crm/integration-hub'],
  },

  // Extensions — addons page
  {
    key: 'addons',
    title: 'Extensions',
    icon: Puzzle,
    items: [
      { label: 'Manage Addons', href: '/admin/crm/addons', icon: Puzzle },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/addons'],
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
