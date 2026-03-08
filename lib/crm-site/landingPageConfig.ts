// Landing Pages & Forms Configuration for CRM SaaS

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'hidden';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, checkbox, radio
  defaultValue?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  mapToField?: string; // Maps to lead field: name, email, phone, etc.
}

export interface LandingPage {
  id: string;
  tenantId: string;
  name: string;
  slug: string; // URL path: /lp/{slug}
  status: 'draft' | 'published' | 'archived';
  
  // Page content
  title: string;
  subtitle?: string;
  heroImage?: string;
  backgroundColor?: string;
  primaryColor?: string;
  
  // Form settings
  form: {
    fields: FormField[];
    submitButtonText: string;
    successMessage: string;
    redirectUrl?: string;
  };
  
  // Lead settings
  leadSettings: {
    assignToUser?: string;
    addTags?: string[];
    setStatus?: string;
    triggerWorkflow?: string;
  };
  
  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
  
  // Analytics
  stats: {
    views: number;
    submissions: number;
    conversionRate: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  landingPageId: string;
  data: Record<string, any>;
  leadId?: string; // Created lead
  ip?: string;
  userAgent?: string;
  referrer?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt: Date;
}

// Default form fields
export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: 'name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your name',
    required: true,
    mapToField: 'name',
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    placeholder: 'Enter your email',
    required: true,
    mapToField: 'email',
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone Number',
    placeholder: 'Enter your phone',
    required: false,
    mapToField: 'phone',
  },
];

// Page templates
export const PAGE_TEMPLATES = {
  blank: {
    id: 'blank',
    name: 'Blank Page',
    description: 'Start from scratch',
    fields: DEFAULT_FORM_FIELDS,
  },
  lead_capture: {
    id: 'lead_capture',
    name: 'Lead Capture',
    description: 'Simple lead generation form',
    fields: [
      ...DEFAULT_FORM_FIELDS,
      {
        id: 'interest',
        type: 'select' as const,
        label: 'What are you interested in?',
        required: false,
        options: ['Product Demo', 'Pricing', 'Partnership', 'Other'],
      },
    ],
  },
  webinar: {
    id: 'webinar',
    name: 'Webinar Registration',
    description: 'Collect webinar registrations',
    fields: [
      ...DEFAULT_FORM_FIELDS,
      {
        id: 'company',
        type: 'text' as const,
        label: 'Company Name',
        required: false,
        mapToField: 'company',
      },
      {
        id: 'role',
        type: 'select' as const,
        label: 'Your Role',
        required: false,
        options: ['Business Owner', 'Manager', 'Developer', 'Marketer', 'Other'],
      },
    ],
  },
  contact: {
    id: 'contact',
    name: 'Contact Form',
    description: 'General contact/inquiry form',
    fields: [
      ...DEFAULT_FORM_FIELDS,
      {
        id: 'message',
        type: 'textarea' as const,
        label: 'Your Message',
        placeholder: 'How can we help you?',
        required: true,
      },
    ],
  },
  newsletter: {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Email subscription form',
    fields: [
      {
        id: 'email',
        type: 'email' as const,
        label: 'Email Address',
        placeholder: 'Enter your email',
        required: true,
        mapToField: 'email',
      },
      {
        id: 'consent',
        type: 'checkbox' as const,
        label: 'I agree to receive marketing emails',
        required: true,
      },
    ],
  },
};

// Plan limits
export const LANDING_PAGE_LIMITS: Record<string, { maxPages: number; maxSubmissions: number; customDomain: boolean; removeBranding: boolean; analytics: boolean }> = {
  free: {
    maxPages: 1,
    maxSubmissions: 50,
    customDomain: false,
    removeBranding: false,
    analytics: false,
  },
  basic: {
    maxPages: 3,
    maxSubmissions: 500,
    customDomain: false,
    removeBranding: false,
    analytics: true,
  },
  starter: {
    maxPages: 10,
    maxSubmissions: 2000,
    customDomain: true,
    removeBranding: false,
    analytics: true,
  },
  growth: {
    maxPages: 50,
    maxSubmissions: 10000,
    customDomain: true,
    removeBranding: true,
    analytics: true,
  },
  professional: {
    maxPages: 999,
    maxSubmissions: 999999,
    customDomain: true,
    removeBranding: true,
    analytics: true,
  },
};

// Generate unique slug
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

// Validate form submission
export function validateSubmission(fields: FormField[], data: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];

    // Required check
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }

    if (!value) continue;

    // Type-specific validation
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.id] = 'Invalid email address';
    }

    if (field.type === 'phone' && !/^[\d\s\-+()]{8,20}$/.test(value)) {
      errors[field.id] = 'Invalid phone number';
    }

    if (field.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors[field.id] = 'Must be a number';
      } else if (field.validation?.min !== undefined && num < field.validation.min) {
        errors[field.id] = `Minimum value is ${field.validation.min}`;
      } else if (field.validation?.max !== undefined && num > field.validation.max) {
        errors[field.id] = `Maximum value is ${field.validation.max}`;
      }
    }

    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors[field.id] = field.validation.message || 'Invalid format';
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Map submission data to lead fields
export function mapToLeadData(fields: FormField[], data: Record<string, any>): Record<string, any> {
  const leadData: Record<string, any> = {};

  for (const field of fields) {
    if (field.mapToField && data[field.id]) {
      leadData[field.mapToField] = data[field.id];
    }
  }

  return leadData;
}
