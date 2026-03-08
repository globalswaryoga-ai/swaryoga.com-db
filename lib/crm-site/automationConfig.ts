/**
 * CRM Automation & Workflows Configuration
 * Phase 4: Trigger-based automation system
 */

// ============ TRIGGER TYPES ============
export const TRIGGER_TYPES = {
  lead_created: {
    id: 'lead_created',
    name: 'New Lead Created',
    description: 'When a new lead is added to the CRM',
    icon: 'UserPlus',
    category: 'leads',
  },
  lead_status_changed: {
    id: 'lead_status_changed',
    name: 'Lead Status Changed',
    description: 'When a lead moves to a different status',
    icon: 'RefreshCw',
    category: 'leads',
    fields: [
      { name: 'fromStatus', label: 'From Status', type: 'select', options: 'leadStatuses' },
      { name: 'toStatus', label: 'To Status', type: 'select', options: 'leadStatuses' },
    ],
  },
  lead_assigned: {
    id: 'lead_assigned',
    name: 'Lead Assigned',
    description: 'When a lead is assigned to a team member',
    icon: 'UserCheck',
    category: 'leads',
  },
  message_received: {
    id: 'message_received',
    name: 'Message Received',
    description: 'When a WhatsApp message is received',
    icon: 'MessageSquare',
    category: 'messages',
    fields: [
      { name: 'contains', label: 'Message Contains', type: 'text', placeholder: 'keyword' },
    ],
  },
  tag_added: {
    id: 'tag_added',
    name: 'Tag Added',
    description: 'When a specific tag is added to a lead',
    icon: 'Tag',
    category: 'leads',
    fields: [
      { name: 'tagName', label: 'Tag Name', type: 'text', placeholder: 'Enter tag' },
    ],
  },
  lead_inactive: {
    id: 'lead_inactive',
    name: 'Lead Inactive',
    description: 'When a lead has been inactive for X days',
    icon: 'Clock',
    category: 'leads',
    fields: [
      { name: 'days', label: 'Inactive Days', type: 'number', default: 7 },
    ],
  },
  scheduled: {
    id: 'scheduled',
    name: 'Scheduled Time',
    description: 'Run at a specific time (daily/weekly)',
    icon: 'Calendar',
    category: 'time',
    fields: [
      { name: 'frequency', label: 'Frequency', type: 'select', options: ['daily', 'weekly', 'monthly'] },
      { name: 'time', label: 'Time', type: 'time', default: '09:00' },
      { name: 'dayOfWeek', label: 'Day of Week', type: 'select', options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], showIf: { frequency: 'weekly' } },
    ],
  },
} as const;

// ============ ACTION TYPES ============
export const ACTION_TYPES = {
  send_whatsapp: {
    id: 'send_whatsapp',
    name: 'Send WhatsApp Message',
    description: 'Send a WhatsApp template or text message',
    icon: 'MessageCircle',
    category: 'communication',
    fields: [
      { name: 'messageType', label: 'Message Type', type: 'select', options: ['template', 'text'] },
      { name: 'templateName', label: 'Template Name', type: 'text', showIf: { messageType: 'template' } },
      { name: 'textMessage', label: 'Text Message', type: 'textarea', showIf: { messageType: 'text' } },
    ],
  },
  send_email: {
    id: 'send_email',
    name: 'Send Email',
    description: 'Send an email to the lead',
    icon: 'Mail',
    category: 'communication',
    fields: [
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'body', label: 'Email Body', type: 'textarea' },
    ],
  },
  update_lead_status: {
    id: 'update_lead_status',
    name: 'Update Lead Status',
    description: 'Change the lead status',
    icon: 'Edit',
    category: 'leads',
    fields: [
      { name: 'newStatus', label: 'New Status', type: 'select', options: 'leadStatuses' },
    ],
  },
  assign_lead: {
    id: 'assign_lead',
    name: 'Assign Lead',
    description: 'Assign lead to a team member',
    icon: 'UserPlus',
    category: 'leads',
    fields: [
      { name: 'assignmentType', label: 'Assignment', type: 'select', options: ['specific', 'round_robin', 'least_busy'] },
      { name: 'assigneeId', label: 'Team Member', type: 'select', options: 'teamMembers', showIf: { assignmentType: 'specific' } },
    ],
  },
  add_tag: {
    id: 'add_tag',
    name: 'Add Tag',
    description: 'Add a tag to the lead',
    icon: 'Tag',
    category: 'leads',
    fields: [
      { name: 'tagName', label: 'Tag Name', type: 'text' },
    ],
  },
  remove_tag: {
    id: 'remove_tag',
    name: 'Remove Tag',
    description: 'Remove a tag from the lead',
    icon: 'X',
    category: 'leads',
    fields: [
      { name: 'tagName', label: 'Tag Name', type: 'text' },
    ],
  },
  add_note: {
    id: 'add_note',
    name: 'Add Note',
    description: 'Add an internal note to the lead',
    icon: 'FileText',
    category: 'leads',
    fields: [
      { name: 'noteText', label: 'Note', type: 'textarea' },
    ],
  },
  create_task: {
    id: 'create_task',
    name: 'Create Task',
    description: 'Create a follow-up task',
    icon: 'CheckSquare',
    category: 'tasks',
    fields: [
      { name: 'taskTitle', label: 'Task Title', type: 'text' },
      { name: 'dueInDays', label: 'Due In (Days)', type: 'number', default: 1 },
      { name: 'assignTo', label: 'Assign To', type: 'select', options: ['lead_owner', 'specific'] },
    ],
  },
  webhook: {
    id: 'webhook',
    name: 'Call Webhook',
    description: 'Send data to an external URL',
    icon: 'Globe',
    category: 'integrations',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text' },
      { name: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT'] },
    ],
  },
  delay: {
    id: 'delay',
    name: 'Wait/Delay',
    description: 'Wait before next action',
    icon: 'Clock',
    category: 'flow',
    fields: [
      { name: 'delayMinutes', label: 'Delay (Minutes)', type: 'number', default: 60 },
    ],
  },
} as const;

// ============ CONDITION TYPES ============
export const CONDITION_TYPES = {
  lead_source: {
    id: 'lead_source',
    name: 'Lead Source',
    description: 'Filter by lead source',
    field: 'source',
    operators: ['equals', 'not_equals', 'contains'],
  },
  lead_status: {
    id: 'lead_status',
    name: 'Lead Status',
    description: 'Filter by current status',
    field: 'status',
    operators: ['equals', 'not_equals', 'in'],
  },
  lead_tag: {
    id: 'lead_tag',
    name: 'Has Tag',
    description: 'Filter by tag presence',
    field: 'tags',
    operators: ['contains', 'not_contains'],
  },
  lead_assigned: {
    id: 'lead_assigned',
    name: 'Is Assigned',
    description: 'Check if lead is assigned',
    field: 'assignedTo',
    operators: ['is_set', 'is_not_set', 'equals'],
  },
  custom_field: {
    id: 'custom_field',
    name: 'Custom Field',
    description: 'Filter by custom field value',
    field: 'custom',
    operators: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'],
  },
} as const;

// ============ LEAD STATUSES ============
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'inactive',
];

// ============ PLAN LIMITS ============
export const AUTOMATION_LIMITS: Record<string, { workflows: number; actionsPerWorkflow: number }> = {
  free: { workflows: 1, actionsPerWorkflow: 2 },
  basic: { workflows: 5, actionsPerWorkflow: 5 },
  starter: { workflows: 15, actionsPerWorkflow: 10 },
  growth: { workflows: 50, actionsPerWorkflow: 20 },
  professional: { workflows: 999, actionsPerWorkflow: 50 },
};

// ============ INTERFACES ============
export interface WorkflowTrigger {
  type: keyof typeof TRIGGER_TYPES;
  config: Record<string, any>;
}

export interface WorkflowCondition {
  type: keyof typeof CONDITION_TYPES;
  operator: string;
  value: any;
  logicOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: keyof typeof ACTION_TYPES;
  config: Record<string, any>;
  order: number;
}

export interface Workflow {
  _id?: string;
  id: string;
  tenantSlug: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WorkflowExecution {
  _id?: string;
  workflowId: string;
  tenantSlug: string;
  triggeredBy: string; // lead ID or 'scheduled'
  triggerData: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actionsExecuted: {
    actionId: string;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    executedAt: Date;
  }[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============ HELPER FUNCTIONS ============
export function getTriggerCategories() {
  const categories: Record<string, { name: string; triggers: string[] }> = {
    leads: { name: 'Lead Events', triggers: [] },
    messages: { name: 'Messages', triggers: [] },
    time: { name: 'Scheduled', triggers: [] },
  };

  Object.entries(TRIGGER_TYPES).forEach(([id, trigger]) => {
    if (categories[trigger.category]) {
      categories[trigger.category].triggers.push(id);
    }
  });

  return categories;
}

export function getActionCategories() {
  const categories: Record<string, { name: string; actions: string[] }> = {
    communication: { name: 'Communication', actions: [] },
    leads: { name: 'Lead Management', actions: [] },
    tasks: { name: 'Tasks', actions: [] },
    integrations: { name: 'Integrations', actions: [] },
    flow: { name: 'Flow Control', actions: [] },
  };

  Object.entries(ACTION_TYPES).forEach(([id, action]) => {
    if (categories[action.category]) {
      categories[action.category].actions.push(id);
    }
  });

  return categories;
}

export function validateWorkflow(workflow: Partial<Workflow>, plan: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const limits = AUTOMATION_LIMITS[plan] || AUTOMATION_LIMITS.free;

  if (!workflow.name?.trim()) {
    errors.push('Workflow name is required');
  }

  if (!workflow.trigger?.type) {
    errors.push('Trigger is required');
  }

  if (!workflow.actions?.length) {
    errors.push('At least one action is required');
  }

  if (workflow.actions && workflow.actions.length > limits.actionsPerWorkflow) {
    errors.push(`Maximum ${limits.actionsPerWorkflow} actions allowed on ${plan} plan`);
  }

  return { valid: errors.length === 0, errors };
}
