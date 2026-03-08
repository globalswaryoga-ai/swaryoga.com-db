// Custom Fields Configuration for CRM SaaS

export interface CustomField {
  id: string;
  tenantId: string;
  name: string;
  key: string; // Unique identifier for the field
  type: 'text' | 'number' | 'email' | 'phone' | 'url' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'currency';
  entity: 'lead' | 'deal' | 'contact' | 'company' | 'ticket';
  description?: string;
  
  // Validation
  required: boolean;
  unique: boolean;
  defaultValue?: any;
  
  // Options for select/multiselect
  options?: { label: string; value: string; color?: string }[];
  
  // Number validation
  min?: number;
  max?: number;
  
  // Text validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  
  // Display settings
  showInList: boolean;
  showInForm: boolean;
  sortOrder: number;
  
  // Status
  isActive: boolean;
  isSystem: boolean; // Cannot be deleted
  
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldGroup {
  id: string;
  tenantId: string;
  name: string;
  entity: string;
  fields: string[]; // Field IDs
  sortOrder: number;
  isCollapsed: boolean;
  createdAt: Date;
}

// Built-in system fields (cannot be deleted)
export const SYSTEM_FIELDS: Record<string, Partial<CustomField>[]> = {
  lead: [
    { key: 'name', name: 'Name', type: 'text', required: true, isSystem: true },
    { key: 'email', name: 'Email', type: 'email', required: false, isSystem: true },
    { key: 'phone', name: 'Phone', type: 'phone', required: false, isSystem: true },
    { key: 'company', name: 'Company', type: 'text', required: false, isSystem: true },
    { key: 'status', name: 'Status', type: 'select', required: true, isSystem: true, options: [
      { label: 'New', value: 'new', color: '#3b82f6' },
      { label: 'Contacted', value: 'contacted', color: '#8b5cf6' },
      { label: 'Qualified', value: 'qualified', color: '#10b981' },
      { label: 'Converted', value: 'converted', color: '#22c55e' },
      { label: 'Lost', value: 'lost', color: '#ef4444' },
    ]},
    { key: 'source', name: 'Source', type: 'select', required: false, isSystem: true },
  ],
  deal: [
    { key: 'title', name: 'Deal Title', type: 'text', required: true, isSystem: true },
    { key: 'amount', name: 'Amount', type: 'currency', required: false, isSystem: true },
    { key: 'stage', name: 'Stage', type: 'select', required: true, isSystem: true },
    { key: 'closeDate', name: 'Expected Close Date', type: 'date', required: false, isSystem: true },
  ],
  contact: [
    { key: 'firstName', name: 'First Name', type: 'text', required: true, isSystem: true },
    { key: 'lastName', name: 'Last Name', type: 'text', required: false, isSystem: true },
    { key: 'email', name: 'Email', type: 'email', required: true, isSystem: true },
    { key: 'phone', name: 'Phone', type: 'phone', required: false, isSystem: true },
    { key: 'title', name: 'Job Title', type: 'text', required: false, isSystem: true },
  ],
  company: [
    { key: 'name', name: 'Company Name', type: 'text', required: true, isSystem: true },
    { key: 'website', name: 'Website', type: 'url', required: false, isSystem: true },
    { key: 'industry', name: 'Industry', type: 'select', required: false, isSystem: true },
    { key: 'size', name: 'Company Size', type: 'select', required: false, isSystem: true },
  ],
  ticket: [
    { key: 'subject', name: 'Subject', type: 'text', required: true, isSystem: true },
    { key: 'description', name: 'Description', type: 'textarea', required: false, isSystem: true },
    { key: 'status', name: 'Status', type: 'select', required: true, isSystem: true },
    { key: 'priority', name: 'Priority', type: 'select', required: true, isSystem: true },
  ],
};

// Plan limits for custom fields
export const CUSTOM_FIELD_LIMITS: Record<string, { maxFields: number; fieldTypes: string[]; validation: boolean; groups: boolean }> = {
  free: {
    maxFields: 3,
    fieldTypes: ['text', 'number', 'select'],
    validation: false,
    groups: false,
  },
  basic: {
    maxFields: 10,
    fieldTypes: ['text', 'number', 'email', 'phone', 'date', 'select', 'checkbox'],
    validation: false,
    groups: false,
  },
  starter: {
    maxFields: 25,
    fieldTypes: ['text', 'number', 'email', 'phone', 'url', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'textarea'],
    validation: true,
    groups: true,
  },
  growth: {
    maxFields: 100,
    fieldTypes: ['text', 'number', 'email', 'phone', 'url', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'textarea', 'currency'],
    validation: true,
    groups: true,
  },
  professional: {
    maxFields: 999,
    fieldTypes: ['text', 'number', 'email', 'phone', 'url', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'textarea', 'currency'],
    validation: true,
    groups: true,
  },
};

// Field type configurations
export const FIELD_TYPES = [
  { id: 'text', name: 'Text', icon: 'Type', description: 'Single line text' },
  { id: 'textarea', name: 'Long Text', icon: 'AlignLeft', description: 'Multi-line text area' },
  { id: 'number', name: 'Number', icon: 'Hash', description: 'Numeric value' },
  { id: 'currency', name: 'Currency', icon: 'DollarSign', description: 'Money amount' },
  { id: 'email', name: 'Email', icon: 'Mail', description: 'Email address' },
  { id: 'phone', name: 'Phone', icon: 'Phone', description: 'Phone number' },
  { id: 'url', name: 'URL', icon: 'Link', description: 'Web link' },
  { id: 'date', name: 'Date', icon: 'Calendar', description: 'Date picker' },
  { id: 'datetime', name: 'Date & Time', icon: 'Clock', description: 'Date and time picker' },
  { id: 'select', name: 'Dropdown', icon: 'ChevronDown', description: 'Single selection' },
  { id: 'multiselect', name: 'Multi-Select', icon: 'CheckSquare', description: 'Multiple selections' },
  { id: 'checkbox', name: 'Checkbox', icon: 'Check', description: 'Yes/No toggle' },
];

// Generate field key from name
export function generateFieldKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 32) + '_' + Date.now().toString(36).slice(-4);
}

// Validate field value
export function validateFieldValue(field: CustomField, value: any): { valid: boolean; error?: string } {
  // Required check
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.name} is required` };
  }

  if (value === undefined || value === null || value === '') {
    return { valid: true }; // Empty optional field
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { valid: false, error: 'Invalid email address' };
      }
      break;

    case 'phone':
      if (!/^[\d\s\-+()]{8,20}$/.test(value)) {
        return { valid: false, error: 'Invalid phone number' };
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return { valid: false, error: 'Invalid URL' };
      }
      break;

    case 'number':
    case 'currency':
      const num = parseFloat(value);
      if (isNaN(num)) {
        return { valid: false, error: 'Must be a number' };
      }
      if (field.min !== undefined && num < field.min) {
        return { valid: false, error: `Minimum value is ${field.min}` };
      }
      if (field.max !== undefined && num > field.max) {
        return { valid: false, error: `Maximum value is ${field.max}` };
      }
      break;

    case 'text':
    case 'textarea':
      if (field.minLength !== undefined && value.length < field.minLength) {
        return { valid: false, error: `Minimum length is ${field.minLength}` };
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return { valid: false, error: `Maximum length is ${field.maxLength}` };
      }
      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: 'Invalid format' };
        }
      }
      break;

    case 'select':
      if (field.options && !field.options.find(o => o.value === value)) {
        return { valid: false, error: 'Invalid option' };
      }
      break;

    case 'multiselect':
      if (field.options && Array.isArray(value)) {
        for (const v of value) {
          if (!field.options.find(o => o.value === v)) {
            return { valid: false, error: 'Invalid option' };
          }
        }
      }
      break;
  }

  return { valid: true };
}

// Format field value for display
export function formatFieldValue(field: CustomField, value: any): string {
  if (value === undefined || value === null) return '-';

  switch (field.type) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'datetime':
      return new Date(value).toLocaleString();
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'select':
      return field.options?.find(o => o.value === value)?.label || value;
    case 'multiselect':
      if (Array.isArray(value)) {
        return value.map(v => field.options?.find(o => o.value === v)?.label || v).join(', ');
      }
      return value;
    default:
      return String(value);
  }
}
