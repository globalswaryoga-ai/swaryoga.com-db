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
  HardDrive,
  Heart,
  Target,
  CheckSquare,
  ListTodo,
  StickyNote,
  Eye,
  Gem,
  Receipt,
  Landmark,
  Bug,
  Database,
  History,
  Network,
  Archive,
  Layers,
  ClipboardCheck,
  CalendarDays,
  Bell,
  Moon,
  Sparkles,
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

  // 2. Web Super Admin (superadmin only — the public website's admin area)
  {
    key: 'web-admin',
    title: 'Web Super Admin',
    icon: Monitor,
    items: [
      {
        label: 'Users', href: '/admin/crm/web-admin', icon: Users,
        children: [
          { label: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Signup Data', href: '/admin/signup-data', icon: Users },
          { label: 'Signin Data', href: '/admin/signin-data', icon: LogIn },
          { label: 'Website Users', href: '/admin/users', icon: Users },
          { label: 'Contact Messages', href: '/admin/contact-messages', icon: MessageSquare },
          { label: 'Enquiries', href: '/admin/enquiries', icon: MessageSquare },
          { label: 'Admin Users', href: '/admin/crm/users', icon: Shield },
        ],
      },
      {
        label: 'Sales', href: '/admin/crm/web-admin?tab=sales', icon: DollarSign,
        children: [
          { label: 'Leads', href: '/admin/crm/leads', icon: Users },
          { label: 'Follow-up', href: '/admin/crm/leads-followup', icon: UserCheck },
          { label: 'Funnel', href: '/admin/crm/funnel', icon: Filter },
          { label: 'Funnel Manage', href: '/admin/crm/funnel/manage', icon: Sliders },
          { label: 'Labels', href: '/admin/crm/labels', icon: Tag },
          { label: 'Form Links', href: '/admin/crm/form-links', icon: Link2 },
          { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Settings },
          { label: 'Deleted Leads', href: '/admin/crm/leads/deleted', icon: Trash2 },
          { label: 'Orders', href: '/admin/crm/order-maintenance', icon: ShoppingBag },
          { label: 'Offers', href: '/admin/offers', icon: Tag },
          { label: 'Investment', href: '/admin/crm/investment', icon: TrendingUp },
          { label: 'Investment Dashboard', href: '/admin/crm/investment-dashboard', icon: BarChart3 },
        ],
      },
      {
        label: 'Workshops', href: '/admin/crm/web-admin?tab=workshops', icon: Calendar,
        children: [
          { label: 'Workshops', href: '/admin/workshops', icon: Calendar },
          { label: 'Workshop Dates', href: '/admin/workshops/schedules', icon: Calendar },
          { label: 'Youth Program', href: '/admin/youth-program', icon: Users },
          { label: 'Landing Pages', href: '/admin/landing-pages', icon: FileText },
          { label: 'Accounting', href: '/admin/accounting', icon: Calculator },
        ],
      },
      {
        label: 'Social & Media', href: '/admin/crm/web-admin?tab=social', icon: Share2,
        children: [
          { label: 'Social Media', href: '/admin/social-media', icon: Share2 },
          { label: 'Social Setup', href: '/admin/social-media-setup', icon: Settings },
          { label: 'Video Library', href: '/admin/videos', icon: Video },
          { label: 'Media Upload', href: '/admin/media-upload', icon: Image },
          { label: 'Communities', href: '/admin/communities', icon: Globe },
          { label: 'Community Content', href: '/admin/communities/content', icon: FileText },
          { label: 'Recordings & Videos', href: '/admin/communities/recordings-videos', icon: Video },
          { label: 'Community Admin', href: '/admin/community', icon: Globe },
          { label: 'Community Members', href: '/admin/community/members', icon: Users },
          { label: 'Private Videos', href: '/admin/community/private-videos', icon: Video },
          { label: 'Zoom', href: '/admin/zoom', icon: Video },
        ],
      },
      {
        label: 'Settings', href: '/admin/crm/web-admin?tab=settings', icon: Settings,
        children: [
          { label: 'Website Settings', href: '/admin/settings', icon: Settings },
          { label: 'CRM Settings', href: '/admin/crm/settings', icon: Wrench },
          { label: 'Ritucharya Admin', href: '/admin/crm/planner-dashboard/ritucharya/ritus-admin', icon: Leaf },
          { label: 'Knowledge Base', href: '/admin/crm/knowledge-base', icon: BookOpen },
          { label: 'AI Agents', href: '/admin/crm/ai-agents', icon: Zap },
          { label: 'Automation', href: '/admin/crm/automation', icon: Zap },
          { label: 'CRM Media', href: '/admin/crm/media', icon: Image },
          { label: 'Inbound Media', href: '/admin/crm/inbound-media', icon: Image },
          { label: 'Devices', href: '/admin/crm/devices', icon: Smartphone },
          { label: 'Chatbot Builder', href: '/admin/crm/chatbot-builder', icon: Bot },
          { label: 'Send Template', href: '/admin/crm/send-template', icon: FileText },
          { label: 'Templates', href: '/admin/crm/templates', icon: FileText },
        ],
      },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/web-admin',
      '/admin/dashboard', '/admin/signup-data', '/admin/signin-data', '/admin/users',
      '/admin/contact-messages', '/admin/enquiries', '/admin/offers', '/admin/workshops',
      '/admin/youth-program', '/admin/landing-pages', '/admin/accounting',
      '/admin/social-media', '/admin/social-media-setup', '/admin/videos', '/admin/media-upload',
      '/admin/communities', '/admin/community', '/admin/zoom', '/admin/settings',
    ],
  },

  // 3. Lead Management - Meta — clean lead tabs (Follow-up/extras only for Copper+)
  {
    key: 'sales',
    title: 'Lead Management - Meta',
    icon: DollarSign,
    items: [
      { label: 'Funnel',        href: '/admin/crm/funnel',         icon: Filter },
      { label: 'Funnel Manage', href: '/admin/crm/funnel/manage',  icon: Sliders },
      { label: 'Leads',         href: '/admin/crm/leads',          icon: Users },
      { label: 'Sales',         href: '/admin/crm/sales',          icon: DollarSign },
      { label: 'Follow-up',     href: '/admin/crm/leads-followup', icon: UserCheck, bundle: 'whatsapp_meta' },
    ],
    moreItems: [
      { label: 'Labels',          href: '/admin/crm/labels',                   icon: Tag,          bundle: 'whatsapp_meta' },
      { label: 'Lead Assignment', href: '/admin/crm/lead-assignment-settings', icon: Settings,     bundle: 'whatsapp_meta' },
      { label: 'Deleted Leads',   href: '/admin/crm/leads/deleted',            icon: Trash2,       bundle: 'whatsapp_meta' },
      { label: 'Orders',          href: '/admin/crm/order-maintenance',        icon: ShoppingBag,  bundle: 'whatsapp_meta' },
      { label: 'Investment',      href: '/admin/crm/investment',               icon: TrendingUp },
      { label: 'Investment Dashboard', href: '/admin/crm/investment-dashboard', icon: BarChart3 },
    ],
    prefixes: [
      '/admin/crm/sales', '/admin/crm/leads', '/admin/crm/leads-followup',
      '/admin/crm/funnel', '/admin/crm/order-maintenance', '/admin/crm/labels',
      '/admin/crm/lead-assignment-settings', '/admin/crm/investment',
      '/admin/crm/investment-dashboard',
    ],
  },

  // 3b. Meta WhatsApp — whatsapp_meta bundle (Broadcast folded in here)
  {
    key: 'meta',
    title: 'Meta WhatsApp',
    icon: MessageSquareDot,
    items: [
      { label: 'Meta Inbox',   href: '/admin/crm/meta',              icon: Inbox },
      { label: 'Dashboard',    href: '/admin/crm/meta-dashboard',    icon: BarChart3 },
      { label: 'Templates',    href: '/admin/crm/meta/templates',    icon: FileText },
      { label: 'Broadcast',    href: '/admin/crm/broadcast',         icon: Radio },
      { label: 'Meta Reports', href: '/admin/crm/reports/meta',      icon: BarChart3 },
    ],
    moreItems: [
      { label: 'Broadcast Dashboard', href: '/admin/crm/broadcast-dashboard', icon: BarChart3 },
      { label: 'Send Template',  href: '/admin/crm/send-template',          icon: Send },
      { label: 'WA Settings',    href: '/admin/crm/whatsapp/settings',      icon: Settings },
      { label: 'Webhook Events', href: '/admin/crm/whatsapp/webhook-events', icon: Zap },
    ],
    prefixes: [
      '/admin/crm/meta', '/admin/crm/meta-dashboard', '/admin/crm/whatsapp/meta',
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
      { label: 'Templates',        href: '/admin/crm/templates',         icon: FileText },
      { label: 'Template Builder', href: '/admin/crm/templates/builder', icon: FileEdit },
      { label: 'Scheduled Messages', href: '/admin/crm/scheduled-messages', icon: Clock },
    ],
    prefixes: [
      '/admin/crm/broadcast', '/admin/crm/broadcast-dashboard',
      '/admin/crm/broadcast-runs', '/admin/crm/send-template', '/admin/crm/templates',
      '/admin/crm/scheduled-messages',
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
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/community', '/admin/crm/community-moderation',
    ],
  },

  // 6b. Zoom Management — community bundle (recordings + zoom analytics)
  {
    key: 'zoom',
    title: 'Zoom Management',
    icon: Video,
    items: [
      { label: 'Recordings',     href: '/admin/crm/recording-management', icon: Video },
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics',       icon: BarChart2 },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/recording-management', '/admin/crm/zoom-analytics',
    ],
  },

  // 7. Lead Management - QR — lead_management bundle
  {
    key: 'qr-leads',
    title: 'Lead Management - QR',
    icon: Users,
    // All QR-scoped: these pages read source='qr_whatsapp' only (kept separate
    // from the Meta lead pages, which exclude qr_whatsapp).
    items: [
      { label: 'QR Leads',       href: '/admin/crm/qr/leads',         icon: Users },
      { label: 'QR Funnel',      href: '/admin/crm/qr/funnel',        icon: Filter },
      { label: 'QR Manage',      href: '/admin/crm/qr/manage',        icon: Sliders },
      { label: 'QR Report',      href: '/admin/crm/qr/funnel-report', icon: BarChart3 },
    ],
    // Cross-link back to the QR WhatsApp inbox so the two QR menus connect.
    moreItems: [
      { label: 'QR WhatsApp', href: '/admin/crm/qr', icon: QrCode },
    ],
    prefixes: [
      '/admin/crm/qr/leads', '/admin/crm/qr/funnel', '/admin/crm/qr/manage', '/admin/crm/qr/funnel-report',
    ],
  },

  // 8. QR WhatsApp — whatsapp_qr bundle
  {
    key: 'qr',
    title: 'QR WhatsApp',
    icon: QrCode,
    // QR-only nav. Every link stays inside /admin/crm/qr/* so QR WhatsApp never
    // crosses into Meta data. (The old "Send Message" pointed at the generic
    // /admin/crm/send-template page, which defaults to the Meta provider —
    // removed to keep QR strictly separated. Sending happens from the inbox.)
    items: [
      { label: 'Inbox',          href: '/admin/crm/qr',                   icon: Inbox },
      { label: 'Templates',      href: '/admin/crm/qr/templates',         icon: FileEdit },
      { label: 'Broadcast',      href: '/admin/crm/qr/broadcast',         icon: Radio },
      { label: 'Group Contacts', href: '/admin/crm/qr/group-contacts',    icon: Users },
      { label: 'Group Schedule', href: '/admin/crm/qr/group-scheduler',   icon: CalendarDays },
      { label: 'Reports',        href: '/admin/crm/qr/broadcast-report',  icon: BarChart3 },
    ],
    // No "More" dropdown — AI & Chatbot, Automation, Schedule etc. are reached
    // from the sidebar. Keeps the QR top bar clean (Inbox/Templates/Broadcast/
    // Group Contacts/Group Schedule/Reports only).
    moreItems: [],
    prefixes: [
      '/admin/crm/qr', '/admin/crm/qr/templates', '/admin/crm/qr/broadcast',
      '/admin/crm/qr/group-contacts', '/admin/crm/qr/group-scheduler', '/admin/crm/qr/broadcast-report',
      '/admin/crm/qr/broadcast-schedule', '/admin/crm/qr/automation',
      '/admin/crm/qr/chatbot', '/admin/crm/qr/health-report',
    ],
  },

  // 9. Planner — planner bundle
  {
    key: 'planner',
    title: 'Planner',
    icon: Calendar,
    items: [
      { label: 'Planner Home',      href: '/admin/crm/planner',                              icon: Calendar },
      { label: 'Dashboard',         href: '/admin/crm/planner-dashboard/comprehensive-dashboard', icon: LayoutDashboard },
      {
        label: 'Daily', href: '/admin/crm/planner-dashboard/daily', icon: CalendarDays,
        children: [
          { label: 'Daily Plan',  href: '/admin/crm/planner-dashboard/daily',     icon: CalendarDays },
          { label: 'Calendar',    href: '/admin/crm/planner-dashboard/calendar',  icon: Calendar },
          { label: 'Events',      href: '/admin/crm/planner-dashboard/events',    icon: Calendar },
          { label: 'Reminders',   href: '/admin/crm/planner-dashboard/reminders', icon: Bell },
          { label: 'Tasks',       href: '/admin/crm/planner-dashboard/tasks',     icon: CheckSquare },
          { label: 'To-Dos',      href: '/admin/crm/planner-dashboard/todos',     icon: ListTodo },
        ],
      },
      {
        label: 'Goals', href: '/admin/crm/planner-dashboard/goals', icon: Target,
        children: [
          { label: 'Goals',        href: '/admin/crm/planner-dashboard/goals',       icon: Target },
          { label: 'Action Plan',  href: '/admin/crm/planner-dashboard/action-plan', icon: ClipboardCheck },
          { label: 'Progress',     href: '/admin/crm/planner-dashboard/progress',    icon: TrendingUp },
          { label: 'Vision',       href: '/admin/crm/planner-dashboard/vision',      icon: Eye },
          { label: 'Vision Download', href: '/admin/crm/planner-dashboard/vision-download', icon: Eye },
          { label: 'Diamond People', href: '/admin/crm/planner-dashboard/diamond-people', icon: Gem },
        ],
      },
      {
        label: 'Life', href: '/admin/crm/planner-dashboard/health', icon: Heart,
        children: [
          { label: 'Health',     href: '/admin/crm/planner-dashboard/health',     icon: Heart },
          { label: 'Notes',      href: '/admin/crm/planner-dashboard/notes',      icon: StickyNote },
          { label: 'Words',      href: '/admin/crm/planner-dashboard/words',      icon: BookOpen },
          { label: 'Accounting', href: '/admin/crm/planner-dashboard/accounting', icon: Calculator },
          { label: 'Ritucharya', href: '/admin/crm/planner-dashboard/ritucharya',  icon: Leaf },
        ],
      },
    ],
    // Ritucharya now lives inside the Planner section (after Accounting), so it is
    // no longer a standalone sidebar entry. Legacy /admin/crm/planner/ritucharya dropped.
    moreItems: [],
    prefixes: [
      '/admin/crm/planner', '/admin/crm/planner-dashboard',
    ],
  },

  // 10. Reports — report bundle (tab-level bundle tags for cross-bundle tabs)
  {
    key: 'reports',
    title: 'All Reports',
    icon: BarChart3,
    items: [
      { label: 'Reports Center', href: '/admin/crm/reports',            icon: BarChart3 },
      { label: 'All Reports',    href: '/admin/crm/all-reports',        icon: FileText },
      { label: 'Analytics',      href: '/admin/crm/analytics',          icon: PieChart },
      { label: 'WA Analytics',   href: '/admin/crm/whatsapp-analytics', icon: BarChart2, bundle: ['whatsapp_qr', 'whatsapp_meta'] },
    ],
    moreItems: [
      { label: 'Meta Reports',   href: '/admin/crm/reports/meta',  icon: FileText,  bundle: 'whatsapp_meta' },
      { label: 'QR Reports',     href: '/admin/crm/reports/qr',    icon: FileText,  bundle: 'whatsapp_qr' },
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics', icon: Video,    bundle: 'community' },
    ],
    prefixes: ['/admin/crm/analytics', '/admin/crm/reports', '/admin/crm/all-reports', '/admin/crm/whatsapp-analytics'],
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
      { label: 'Data Management', href: '/admin/crm/settings/data-management', icon: Database },
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
      { label: 'Chatbots',      href: '/admin/crm/chatbots',       icon: Bot },
      { label: 'Knowledge Base',href: '/admin/crm/knowledge-base', icon: BookOpen },
      { label: 'AI Agents',     href: '/admin/crm/ai-agents',      icon: Cpu },
    ],
    moreItems: [
      { label: 'Chatbot Builder',  href: '/admin/crm/chatbot-builder',  icon: Bot },
      { label: 'Chatbot Settings', href: '/admin/crm/chatbot-settings', icon: Settings },
    ],
    prefixes: [
      '/admin/crm/chatbots', '/admin/crm/chatbot-settings', '/admin/crm/chatbot-builder',
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

  // Landing Page — landing_page bundle
  {
    key: 'landing-pages',
    title: 'Landing Page',
    icon: FileText,
    items: [
      { label: 'Landing Pages', href: '/admin/crm/landing-pages', icon: FileText },
      { label: 'Form Links',    href: '/admin/crm/form-links',    icon: Link2 },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/landing-pages', '/admin/crm/form-links'],
  },

  // Sadhana Program — sadhana_program bundle
  {
    key: 'sadhana',
    title: 'Sadhana Program',
    icon: Leaf,
    items: [
      { label: 'Programs',      href: '/admin/crm/sadhana-programs',     icon: Video },
      { label: 'Announcements', href: '/admin/crm/sadhana-announcements',icon: Megaphone },
    ],
    moreItems: [
      { label: 'Sadhana Chat', href: '/admin/crm/sadhana-chat', icon: MessageCircle },
    ],
    prefixes: [
      '/admin/crm/sadhana-programs',
      '/admin/crm/sadhana-announcements', '/admin/crm/sadhana-chat',
    ],
  },

  // Sadhana Schedule — sadhana_schedule bundle
  {
    key: 'sadhana-schedule',
    title: 'Sadhana Schedule',
    icon: Clock,
    items: [
      { label: 'Scheduler', href: '/admin/crm/sadhana-scheduler', icon: Clock },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/sadhana-scheduler'],
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

  // Bank Income Tracker — super-admin only
  {
    key: 'bank-income',
    title: 'Bank Income',
    icon: Landmark,
    items: [
      { label: 'Bank Income', href: '/admin/crm/bank-income', icon: Landmark },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/bank-income'],
  },

  // SMS Management — sms bundle
  {
    key: 'messages',
    title: 'SMS Management',
    icon: SmartphoneNfc,
    items: [
      { label: 'Messages',           href: '/admin/crm/messages',           icon: SmartphoneNfc },
      { label: 'Scheduled Messages', href: '/admin/crm/scheduled-messages', icon: Clock },
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

  // 13. CRM Tenants (Multi-Tenant SaaS — superadmin only)
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

  // 13b. Tenants Plan (full bundle line-up — superadmin only).
  // Basic / Copper / Silver / Golden / Diamond reference page.
  {
    key: 'tenants-plan',
    title: 'Tenants Plan',
    icon: Layers,
    items: [
      { label: 'Plan Bundles', href: '/admin/crm/tenants-plan', icon: Layers },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/tenants-plan',
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
      { label: 'Integrations', href: '/admin/crm/integrations', icon: Plug },
    ],
    prefixes: ['/admin/crm/connections'],
  },

  // KP Astro — professional astrologer workbench (birth + horary + matchmaking)
  {
    key: 'kp-astro',
    title: 'KP Astro',
    icon: Moon,
    items: [
      { label: 'Data Entry',         href: '/admin/crm/kp-astro/data-entry',              icon: ClipboardList },
      { label: 'Astrologer Workspace', href: '/admin/crm/kp-astro/workspace',              icon: BookOpen },
      { label: 'Horary Workspace',   href: '/admin/crm/kp-astro/horary-workspace',         icon: Eye },
      { label: 'Final Prediction',   href: '/admin/crm/kp-astro/final-prediction',         icon: Sparkles },
    ],
    moreItems: [
      { label: 'Matchmaking Data',       href: '/admin/crm/kp-astro/matchmaking/data-entry',       icon: Heart },
      { label: 'Matchmaking Workspace',  href: '/admin/crm/kp-astro/matchmaking/workspace',        icon: Heart },
      { label: 'Matchmaking Prediction', href: '/admin/crm/kp-astro/matchmaking/final-prediction', icon: Heart },
      { label: 'Export (A4 PDF)',    href: '/admin/crm/kp-astro/export',                  icon: FileText },
      { label: 'Toolkit',            href: '/admin/crm/kp-astro',                          icon: Sparkles },
      { label: 'All Birth Charts',   href: '/admin/crm/kp-astro/charts',                   icon: Users },
    ],
    prefixes: ['/admin/crm/kp-astro'],
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

  // Storage — always visible for all plans
  {
    key: 'storage',
    title: 'Storage',
    icon: HardDrive,
    items: [
      { label: 'Storage Usage', href: '/admin/crm/subscription', icon: HardDrive },
      { label: 'Buy Storage',   href: '/crm-site/checkout?storage=true', icon: CreditCard },
    ],
    moreItems: [],
    prefixes: ['/admin/crm/storage', '/admin/crm/subscription'],
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

  // Archive — superadmin-only catch-all so every legacy/duplicate page stays reachable.
  // These are older or duplicate routes kept available but out of the main navigation.
  {
    key: 'archive',
    title: 'Archive',
    icon: Archive,
    items: [
      {
        label: 'Account & Billing', href: '/admin/crm/account', icon: Receipt,
        children: [
          { label: 'Account',         href: '/admin/crm/account',         icon: User },
          { label: 'Profile',         href: '/admin/crm/profile',         icon: User },
          { label: 'Account Book',    href: '/admin/crm/account-book',    icon: BookOpen },
          { label: 'Billing',         href: '/admin/crm/billing',         icon: Receipt },
          { label: 'Billing History', href: '/admin/crm/billing-history', icon: History },
          { label: 'Payment Details', href: '/admin/crm/payment-details', icon: Landmark },
          { label: 'Affiliate',       href: '/admin/crm/affiliate',       icon: Share2 },
          { label: 'Subscription',    href: '/admin/crm/subscription',    icon: CreditCard },
        ],
      },
      {
        label: 'Legacy WhatsApp', href: '/admin/crm/whatsapp', icon: MessageCircle,
        children: [
          { label: 'WhatsApp (old)',      href: '/admin/crm/whatsapp',                  icon: MessageCircle },
          { label: 'WhatsApp Meta (old)', href: '/admin/crm/whatsapp-meta',             icon: MessageSquareDot },
          { label: 'WhatsApp Groups',     href: '/admin/crm/whatsapp-groups',           icon: Users },
          { label: 'Connection Monitor',  href: '/admin/crm/whatsapp/connection-monitor', icon: Activity },
          { label: 'WA Templates (old)',  href: '/admin/crm/whatsapp/templates',        icon: FileText },
          { label: 'QR Broadcast (old)',  href: '/admin/crm/qr-broadcast',              icon: Radio },
          { label: 'QR Templates (old)',  href: '/admin/crm/qr-templates',              icon: FileEdit },
          { label: 'QR Broadcast V2',     href: '/admin/crm/qr/broadcast-v2',           icon: Radio },
          { label: 'QR Merge Group V2',   href: '/admin/crm/qr/merge-group-v2',         icon: Users },
        ],
      },
      {
        label: 'Legacy Ritucharya', href: '/admin/crm/ritucharya', icon: Leaf,
        children: [
          { label: 'Ritucharya (old)',    href: '/admin/crm/ritucharya',                        icon: Leaf },
          { label: 'Recipes (old)',       href: '/admin/crm/ritucharya-recipes',                icon: BookOpen },
          { label: 'Diet Plan',           href: '/admin/crm/ritucharya/diet-plan',              icon: Leaf },
          { label: 'Dietary Recommend.',  href: '/admin/crm/ritucharya/dietary-recommendations', icon: Leaf },
          { label: 'Logic',               href: '/admin/crm/ritucharya/logic',                  icon: Cpu },
          { label: 'Planner Ritucharya',  href: '/admin/crm/planner/ritucharya',                icon: Leaf },
        ],
      },
      {
        label: 'System & Misc', href: '/admin/crm/admin-activity', icon: Wrench,
        children: [
          { label: 'Admin Activity',  href: '/admin/crm/admin-activity', icon: Activity },
          { label: 'Error Logs',      href: '/admin/crm/error-logs',     icon: Bug },
          { label: 'Anti-Bug',        href: '/admin/crm/anti-bug',       icon: Bug },
          { label: 'Helpdesk',        href: '/admin/crm/helpdesk',       icon: HeadphonesIcon },
          { label: 'Capacity',        href: '/admin/crm/capacity',       icon: Activity },
          { label: 'CRM Users (old)', href: '/admin/crm/crm-users',      icon: Users },
          { label: 'Translate',       href: '/admin/crm/translate',      icon: Globe },
          { label: 'Instagram',       href: '/admin/crm/instagram',      icon: Share2 },
          { label: 'Messenger',       href: '/admin/crm/messenger',      icon: MessageSquare },
          { label: 'Tally',           href: '/admin/crm/tally',          icon: Calculator },
          { label: 'KP Astro',        href: '/admin/crm/kp-astro',       icon: Moon },
          { label: 'Onboarding',      href: '/admin/crm/onboarding',     icon: ClipboardCheck },
          { label: 'Chatbot (old)',   href: '/admin/crm/chatbot',        icon: Bot },
          { label: 'Chatbot Editor',  href: '/admin/crm/chatbots/editor', icon: FileEdit },
          { label: 'Integrations (old)', href: '/admin/crm/integrations', icon: Plug },
          { label: 'Device Settings', href: '/admin/crm/devices/settings', icon: Settings },
        ],
      },
    ],
    moreItems: [],
    prefixes: [
      '/admin/crm/account', '/admin/crm/account-book', '/admin/crm/profile',
      '/admin/crm/billing', '/admin/crm/billing-history', '/admin/crm/payment-details',
      '/admin/crm/affiliate', '/admin/crm/admin-activity', '/admin/crm/error-logs',
      '/admin/crm/anti-bug', '/admin/crm/helpdesk', '/admin/crm/capacity',
      '/admin/crm/crm-users', '/admin/crm/translate', '/admin/crm/instagram',
      '/admin/crm/messenger', '/admin/crm/tally', '/admin/crm/kp-astro', '/admin/crm/onboarding',
      '/admin/crm/chatbot', '/admin/crm/integrations', '/admin/crm/whatsapp',
      '/admin/crm/whatsapp-meta', '/admin/crm/whatsapp-groups', '/admin/crm/qr-broadcast',
      '/admin/crm/qr-templates', '/admin/crm/ritucharya', '/admin/crm/ritucharya-recipes',
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
