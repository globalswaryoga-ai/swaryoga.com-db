/**
 * Tenant Onboarding Configuration
 * Defines the steps, validation, and progress tracking for new tenant setup
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  fields?: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'business',
    title: 'Business Profile',
    description: 'Tell us about your business',
    icon: 'Building2',
    required: true,
    fields: ['businessName', 'industry', 'teamSize', 'website'],
  },
  {
    id: 'branding',
    title: 'Brand Setup',
    description: 'Customize your CRM appearance',
    icon: 'Palette',
    required: false,
    fields: ['logo', 'primaryColor', 'accentColor'],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Integration',
    description: 'Connect your WhatsApp Business API',
    icon: 'MessageCircle',
    required: false,
    fields: ['whatsappPhoneId', 'whatsappToken', 'whatsappBusinessId'],
  },
  {
    id: 'team',
    title: 'Invite Team',
    description: 'Add team members to your CRM',
    icon: 'Users',
    required: false,
    fields: ['teamInvites'],
  },
  {
    id: 'import',
    title: 'Import Data',
    description: 'Import existing leads and contacts',
    icon: 'Upload',
    required: false,
    fields: ['importFile', 'importMapping'],
  },
];

export const INDUSTRIES = [
  { value: 'wellness', label: 'Wellness & Yoga' },
  { value: 'education', label: 'Education & Coaching' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'finance', label: 'Finance & Insurance' },
  { value: 'saas', label: 'SaaS & Technology' },
  { value: 'agency', label: 'Marketing Agency' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

export const TEAM_SIZES = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '11-25', label: '11-25 people' },
  { value: '26-50', label: '26-50 people' },
  { value: '50+', label: '50+ people' },
];

export interface OnboardingProgress {
  tenantSlug: string;
  currentStep: string;
  completedSteps: string[];
  stepData: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  skippedSteps: string[];
}

export function calculateOnboardingProgress(progress: OnboardingProgress): number {
  const totalRequired = ONBOARDING_STEPS.filter(s => s.required).length;
  const completedRequired = progress.completedSteps.filter(stepId => 
    ONBOARDING_STEPS.find(s => s.id === stepId)?.required
  ).length;
  
  const requiredProgress = (completedRequired / totalRequired) * 70; // 70% weight for required
  
  const totalOptional = ONBOARDING_STEPS.filter(s => !s.required).length;
  const completedOptional = progress.completedSteps.filter(stepId => 
    !ONBOARDING_STEPS.find(s => s.id === stepId)?.required
  ).length;
  
  const optionalProgress = totalOptional > 0 
    ? (completedOptional / totalOptional) * 30 // 30% weight for optional
    : 30;
  
  return Math.round(requiredProgress + optionalProgress);
}

export function getNextStep(progress: OnboardingProgress): OnboardingStep | null {
  for (const step of ONBOARDING_STEPS) {
    if (!progress.completedSteps.includes(step.id) && !progress.skippedSteps.includes(step.id)) {
      return step;
    }
  }
  return null;
}

export function isOnboardingComplete(progress: OnboardingProgress): boolean {
  const requiredSteps = ONBOARDING_STEPS.filter(s => s.required);
  return requiredSteps.every(step => progress.completedSteps.includes(step.id));
}
