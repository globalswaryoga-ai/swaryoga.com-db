// Reports & Analytics Configuration for CRM SaaS

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  category: 'leads' | 'sales' | 'marketing' | 'team' | 'custom';
  metrics: MetricConfig[];
  dimensions: string[];
  defaultTimeRange: 'today' | '7d' | '30d' | '90d' | 'year' | 'all';
  chartType: 'line' | 'bar' | 'pie' | 'table' | 'funnel' | 'number';
}

export interface MetricConfig {
  id: string;
  name: string;
  field: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  format: 'number' | 'currency' | 'percentage' | 'duration';
}

export interface DashboardWidget {
  id: string;
  reportId: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  config?: Record<string, any>;
}

// Built-in report definitions
export const BUILT_IN_REPORTS: ReportConfig[] = [
  // Lead Reports
  {
    id: 'leads_overview',
    name: 'Leads Overview',
    description: 'Total leads and growth over time',
    category: 'leads',
    metrics: [
      { id: 'total', name: 'Total Leads', field: '_id', aggregation: 'count', format: 'number' },
      { id: 'new', name: 'New Leads', field: 'status', aggregation: 'count', format: 'number' },
    ],
    dimensions: ['createdAt', 'status', 'source'],
    defaultTimeRange: '30d',
    chartType: 'line',
  },
  {
    id: 'leads_by_source',
    name: 'Leads by Source',
    description: 'Lead distribution by acquisition source',
    category: 'leads',
    metrics: [
      { id: 'count', name: 'Lead Count', field: '_id', aggregation: 'count', format: 'number' },
    ],
    dimensions: ['sources'],
    defaultTimeRange: '30d',
    chartType: 'pie',
  },
  {
    id: 'leads_by_status',
    name: 'Lead Pipeline',
    description: 'Lead distribution by status',
    category: 'leads',
    metrics: [
      { id: 'count', name: 'Lead Count', field: '_id', aggregation: 'count', format: 'number' },
    ],
    dimensions: ['status'],
    defaultTimeRange: '30d',
    chartType: 'funnel',
  },
  {
    id: 'lead_conversion',
    name: 'Conversion Rate',
    description: 'Lead to customer conversion rate',
    category: 'leads',
    metrics: [
      { id: 'rate', name: 'Conversion Rate', field: 'convertedAt', aggregation: 'count', format: 'percentage' },
    ],
    dimensions: ['createdAt'],
    defaultTimeRange: '30d',
    chartType: 'line',
  },
  // Sales Reports
  {
    id: 'revenue_overview',
    name: 'Revenue Overview',
    description: 'Total revenue and growth',
    category: 'sales',
    metrics: [
      { id: 'total', name: 'Total Revenue', field: 'amount', aggregation: 'sum', format: 'currency' },
      { id: 'avg', name: 'Avg Deal Size', field: 'amount', aggregation: 'avg', format: 'currency' },
    ],
    dimensions: ['createdAt', 'status'],
    defaultTimeRange: '30d',
    chartType: 'bar',
  },
  {
    id: 'deals_pipeline',
    name: 'Deals Pipeline',
    description: 'Deals by stage',
    category: 'sales',
    metrics: [
      { id: 'count', name: 'Deal Count', field: '_id', aggregation: 'count', format: 'number' },
      { id: 'value', name: 'Pipeline Value', field: 'amount', aggregation: 'sum', format: 'currency' },
    ],
    dimensions: ['stage'],
    defaultTimeRange: 'all',
    chartType: 'funnel',
  },
  // Marketing Reports
  {
    id: 'email_performance',
    name: 'Email Performance',
    description: 'Email campaign metrics',
    category: 'marketing',
    metrics: [
      { id: 'sent', name: 'Emails Sent', field: 'stats.sent', aggregation: 'sum', format: 'number' },
      { id: 'opened', name: 'Open Rate', field: 'stats.opened', aggregation: 'avg', format: 'percentage' },
      { id: 'clicked', name: 'Click Rate', field: 'stats.clicked', aggregation: 'avg', format: 'percentage' },
    ],
    dimensions: ['sentAt', 'type'],
    defaultTimeRange: '30d',
    chartType: 'bar',
  },
  {
    id: 'landing_page_performance',
    name: 'Landing Pages',
    description: 'Form conversion rates',
    category: 'marketing',
    metrics: [
      { id: 'views', name: 'Page Views', field: 'stats.views', aggregation: 'sum', format: 'number' },
      { id: 'submissions', name: 'Submissions', field: 'stats.submissions', aggregation: 'sum', format: 'number' },
      { id: 'conversion', name: 'Conversion Rate', field: 'stats.conversionRate', aggregation: 'avg', format: 'percentage' },
    ],
    dimensions: ['createdAt', 'status'],
    defaultTimeRange: '30d',
    chartType: 'table',
  },
  // Team Reports
  {
    id: 'team_activity',
    name: 'Team Activity',
    description: 'Activity by team member',
    category: 'team',
    metrics: [
      { id: 'leads', name: 'Leads Assigned', field: 'assignedTo', aggregation: 'count', format: 'number' },
      { id: 'activities', name: 'Activities', field: 'activities', aggregation: 'count', format: 'number' },
    ],
    dimensions: ['assignedTo', 'createdAt'],
    defaultTimeRange: '30d',
    chartType: 'bar',
  },
  {
    id: 'response_time',
    name: 'Response Time',
    description: 'Average lead response time',
    category: 'team',
    metrics: [
      { id: 'avg', name: 'Avg Response Time', field: 'firstResponseTime', aggregation: 'avg', format: 'duration' },
    ],
    dimensions: ['assignedTo', 'createdAt'],
    defaultTimeRange: '30d',
    chartType: 'bar',
  },
];

// Time range options
export const TIME_RANGES = [
  { id: 'today', name: 'Today', days: 0 },
  { id: '7d', name: 'Last 7 Days', days: 7 },
  { id: '30d', name: 'Last 30 Days', days: 30 },
  { id: '90d', name: 'Last 90 Days', days: 90 },
  { id: 'year', name: 'This Year', days: 365 },
  { id: 'all', name: 'All Time', days: null },
];

// Plan-based report limits
export const REPORT_LIMITS: Record<string, { reports: string[]; customReports: number; dashboards: number; exports: boolean; scheduling: boolean }> = {
  free: {
    reports: ['leads_overview', 'leads_by_status'],
    customReports: 0,
    dashboards: 1,
    exports: false,
    scheduling: false,
  },
  basic: {
    reports: ['leads_overview', 'leads_by_status', 'leads_by_source', 'revenue_overview'],
    customReports: 1,
    dashboards: 2,
    exports: true,
    scheduling: false,
  },
  starter: {
    reports: ['leads_overview', 'leads_by_status', 'leads_by_source', 'lead_conversion', 'revenue_overview', 'deals_pipeline', 'email_performance'],
    customReports: 5,
    dashboards: 5,
    exports: true,
    scheduling: true,
  },
  growth: {
    reports: BUILT_IN_REPORTS.map(r => r.id),
    customReports: 20,
    dashboards: 10,
    exports: true,
    scheduling: true,
  },
  professional: {
    reports: BUILT_IN_REPORTS.map(r => r.id),
    customReports: 999,
    dashboards: 999,
    exports: true,
    scheduling: true,
  },
};

// Get date range from time range ID
export function getDateRange(timeRangeId: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const range = TIME_RANGES.find(r => r.id === timeRangeId);
  if (!range || range.days === null) {
    // All time - return very old date
    start.setFullYear(2020, 0, 1);
  } else if (range.days === 0) {
    // Today - already set
  } else {
    start.setDate(start.getDate() - range.days);
  }

  return { start, end };
}

// Format metric value
export function formatMetricValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'duration':
      if (value < 60) return `${Math.round(value)}s`;
      if (value < 3600) return `${Math.round(value / 60)}m`;
      return `${(value / 3600).toFixed(1)}h`;
    default:
      return value.toLocaleString();
  }
}

// Generate chart colors
export function getChartColors(count: number): string[] {
  const palette = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}
