// CRM Admin Components - Main Export File
// Import all components from this file for convenience

export { DataTable, DataTableHeader, DataTableFooter } from './DataTable';
export { Modal, FormModal, ConfirmModal } from './Modal';
export { Form, FormField, FormGroup, FormActions } from './Form';
export { BulkActionsModal } from './BulkActionsModal';
export { AddToBroadcastModal } from './AddToBroadcastModal';
export {
  StatusBadge,
  StatCard,
  AlertBox,
  LoadingSpinner,
  EmptyState,
} from './Utilities';
export {
  Filter,
  FilterGroup,
  PageHeader,
  SearchBar,
  Toolbar,
} from './Filter';
export {
  ResponsiveGrid,
  MobileCard,
  ResponsiveTable,
  ResponsiveToolbar,
  MobileMenu,
  ResponsiveModal,
  ResponsiveStat,
} from './Responsive';
// Media components
export {
  MediaPreview,
  InlineMediaPreview,
  detectMediaType,
  getFilenameFromUrl,
  formatFileSize,
  type MediaFile,
  type MediaType,
  type MediaPreviewProps,
} from './MediaPreview';

export {
  MediaUpload,
  type UploadedFile,
  type MediaUploadProps,
  type UploadFileType,
  type AccessLevel,
} from './MediaUpload';

// Template Selector component for WhatsApp templates
export {
  default as TemplateSelector,
  type WhatsAppTemplate,
  formatWhatsAppText,
} from './TemplateSelector';

// Chat Status Badge component for conversation status display
export {
  default as ChatStatusBadge,
  ChatStatusDot,
  type ChatStatus,
  type ChatStatusInfo,
  type ChatStatusBadgeProps,
} from './ChatStatusBadge';

// Tenant Setup Dashboard and Forms
export { default as TenantSetupDashboard } from './TenantSetupDashboard';
export {
  BusinessSetupForm,
  DomainSetupForm,
  WhatsAppSetupForm,
} from './TenantSetupForms';
export {
  PaymentSetupForm,
  LeadAdsSetupForm,
  AICallingSetupForm,
  TeamSetupForm,
} from './TenantSetupFormsExtended';
export {
  default as TenantSetupModal,
  SetupChecklistInline,
} from './TenantSetupModal';

// New User Onboarding Components
export { default as WelcomeModal } from './WelcomeModal';
export { default as CompartmentSetupModal } from './CompartmentSetupModal';
export { default as CompartmentGuard } from './CompartmentGuard';
export {
  default as PageSetupChecklist,
  SetupProgressMini,
  PAGE_SETUP_CONFIG,
} from './PageSetupChecklist';

// Plan & Subscription Components
export {
  PlanGate,
  PlanBadge,
  TrialBanner,
  UsageMeter,
  SidebarLock,
} from './PlanComponents';
export { PlanProvider, usePlan } from './hooks/usePlan';