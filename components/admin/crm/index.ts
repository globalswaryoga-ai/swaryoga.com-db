// ============================================================
// CRM Admin Components - Barrel Export
// ============================================================
// Organized by domain. When adding new components, place them
// under the appropriate section header.
// ============================================================

// ── Core UI Primitives ──────────────────────────────────────
export { DataTable, DataTableHeader, DataTableFooter } from './DataTable';
export { Modal, FormModal, ConfirmModal } from './Modal';
export { Form, FormField, FormGroup, FormActions } from './Form';
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

// ── Lead Management ─────────────────────────────────────────
export { BulkActionsModal } from './BulkActionsModal';
export { AddToBroadcastModal } from './AddToBroadcastModal';

// ── WhatsApp / Messaging ────────────────────────────────────
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
export {
  default as TemplateSelector,
  type WhatsAppTemplate,
  formatWhatsAppText,
} from './TemplateSelector';
export {
  default as ChatStatusBadge,
  ChatStatusDot,
  type ChatStatus,
  type ChatStatusInfo,
  type ChatStatusBadgeProps,
} from './ChatStatusBadge';

// ── Tenant / Setup ──────────────────────────────────────────
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
export { default as WelcomeModal } from './WelcomeModal';
export { default as CompartmentSetupModal } from './CompartmentSetupModal';
export { default as CompartmentGuard } from './CompartmentGuard';
export {
  default as PageSetupChecklist,
  SetupProgressMini,
  PAGE_SETUP_CONFIG,
} from './PageSetupChecklist';

// ── Plan & Subscription ────────────────────────────────────
// DO NOT re-export from barrel — causes webpack TDZ errors (circular init order).
// Import directly:
//   import { PlanProvider, usePlan } from '@/components/admin/crm/hooks/usePlan';
//   import { PlanGate, ... } from '@/components/admin/crm/PlanComponents';