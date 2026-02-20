import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, Calendar, Users, TrendingUp, Eye, Trash2, 
  Clock, CheckCircle, XCircle, AlertCircle, BarChart3,
  Plus, Edit, Play, Pause, RefreshCw, Download,
  Search, Filter, ChevronLeft, ChevronRight, Send
} from 'lucide-react';

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  variables?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface EmailCampaign {
  _id: string;
  name: string;
  subject: string;
  body: string;
  templateId?: string;
  recipients: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  };
  createdBy: string;
  createdAt: string;
}

interface FollowUpSequence {
  _id: string;
  name: string;
  description?: string;
  trigger: 'manual' | 'lead_created' | 'workshop_registered' | 'payment_received' | 'custom';
  steps: FollowUpStep[];
  active: boolean;
  stats: {
    triggered: number;
    completed: number;
    inProgress: number;
  };
  createdAt: string;
}

interface FollowUpStep {
  id: string;
  delayDays: number;
  delayHours?: number;
  templateId?: string;
  subject: string;
  body: string;
  condition?: string;
}

// Campaigns Tab
export function CampaignsTab({ campaigns, selectedCampaign, setSelectedCampaign, fetchCampaigns, token }: any) {
  const handleRetry = async (campaignId: string) => {
    try {
      await fetch(`/api/admin/crm/email/campaigns/${campaignId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCampaigns();
    } catch (err) {
      console.error('Failed to retry campaign:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Email Campaigns</h2>
        <button
          onClick={fetchCampaigns}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {campaigns.map((campaign: EmailCampaign) => (
          <div key={campaign._id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{campaign.name || campaign.subject}</h3>
                <p className="text-sm text-gray-600 mt-1">{campaign.subject}</p>
              </div>
              <StatusBadge status={campaign.status} />
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Recipients</p>
                  <p className="font-semibold">{campaign.stats.total}</p>
                </div>
                <div>
                  <p className="text-gray-600">Sent</p>
                  <p className="font-semibold">{campaign.stats.sent}</p>
                </div>
                <div>
                  <p className="text-gray-600">Delivered</p>
                  <p className="font-semibold text-green-600">{campaign.stats.delivered}</p>
                </div>
                <div>
                  <p className="text-gray-600">Opened</p>
                  <p className="font-semibold text-blue-600">
                    {campaign.stats.opened} ({campaign.stats.delivered > 0 ? Math.round((campaign.stats.opened / campaign.stats.delivered) * 100) : 0}%)
                  </p>
                </div>
              </div>

              {campaign.status === 'failed' && (
                <button
                  onClick={() => handleRetry(campaign._id)}
                  className="w-full px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Failed
                </button>
              )}

              <button
                onClick={() => setSelectedCampaign(campaign)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
              Created {new Date(campaign.createdAt).toLocaleDateString()} by {campaign.createdBy}
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No email campaigns yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first campaign in the Compose tab</p>
        </div>
      )}
    </div>
  );
}

// Templates Tab
export function TemplatesTab({ templates, setShowTemplateModal, setEditingTemplate, handleDeleteTemplate, canManageTemplates }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Email Templates</h2>
        {canManageTemplates && (
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template: EmailTemplate) => (
          <div key={template._id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                {template.category && (
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded mt-1">
                    {template.category}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2 font-medium">{template.subject}</p>
            <p className="text-sm text-gray-500 line-clamp-3 mb-4">{template.body}</p>

            {canManageTemplates && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTemplate(template);
                    setShowTemplateModal(true);
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 text-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template._id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No templates yet</p>
          {canManageTemplates && (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateModal(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Template
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Follow-ups Tab
export function FollowupsTab({ followupSequences, setShowFollowupModal, setEditingFollowup, handleDeleteFollowup, canManageTemplates, token }: any) {
  const toggleActive = async (sequenceId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/admin/crm/email/followups/${sequenceId}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !currentActive }),
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to toggle sequence:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Follow-up Sequences</h2>
        {canManageTemplates && (
          <button
            onClick={() => {
              setEditingFollowup(null);
              setShowFollowupModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        )}
      </div>

      <div className="space-y-4">
        {followupSequences.map((sequence: FollowUpSequence) => (
          <div key={sequence._id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{sequence.name}</h3>
                  {sequence.active ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      Inactive
                    </span>
                  )}
                </div>
                {sequence.description && (
                  <p className="text-sm text-gray-600">{sequence.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-gray-600">
                    Trigger: <span className="font-medium">{sequence.trigger.replace('_', ' ')}</span>
                  </span>
                  <span className="text-gray-600">
                    Steps: <span className="font-medium">{sequence.steps.length}</span>
                  </span>
                </div>
              </div>

              {canManageTemplates && (
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(sequence._id, sequence.active)}
                    className={`px-3 py-1.5 rounded flex items-center gap-1 text-sm ${
                      sequence.active
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {sequence.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {sequence.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingFollowup(sequence);
                      setShowFollowupModal(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1 text-sm"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteFollowup(sequence._id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sequence Steps */}
            <div className="space-y-3 mt-4">
              {sequence.steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Wait {step.delayDays} day(s) {step.delayHours ? `${step.delayHours} hour(s)` : ''}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{step.subject}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Triggered</p>
                <p className="text-lg font-semibold text-gray-900">{sequence.stats.triggered}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">In Progress</p>
                <p className="text-lg font-semibold text-blue-600">{sequence.stats.inProgress}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg font-semibold text-green-600">{sequence.stats.completed}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {followupSequences.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No follow-up sequences yet</p>
          {canManageTemplates && (
            <button
              onClick={() => {
                setEditingFollowup(null);
                setShowFollowupModal(true);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Sequence
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Analytics Tab
export function AnalyticsTab({ campaigns }: { campaigns: EmailCampaign[] }) {
  const totalSent = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.stats.delivered, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.stats.clicked, 0);

  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
  const openRate = totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0';
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Email Analytics</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sent"
          value={totalSent}
          icon={<Mail className="w-6 h-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          subtitle={`${totalDelivered} delivered`}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title="Open Rate"
          value={`${openRate}%`}
          subtitle={`${totalOpened} opened`}
          icon={<Eye className="w-6 h-6 text-purple-600" />}
          color="purple"
        />
        <StatCard
          title="Click Rate"
          value={`${clickRate}%`}
          subtitle={`${totalClicked} clicked`}
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          color="orange"
        />
      </div>

      {/* Campaign Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Campaign Performance</h3>
        <div className="space-y-4">
          {campaigns.slice(0, 10).map((campaign) => {
            const campOpenRate = campaign.stats.delivered > 0 
              ? ((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1) 
              : '0';
            
            return (
              <div key={campaign._id} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{campaign.subject}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-gray-600">Sent</p>
                    <p className="font-semibold">{campaign.stats.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Opened</p>
                    <p className="font-semibold text-blue-600">{campOpenRate}%</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
              </div>
            );
          })}
        </div>

        {campaigns.length === 0 && (
          <p className="text-center text-gray-500 py-8">No campaign data available</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// REPORTS TAB - Full email delivery reports with sent/delivered/failed/resend/view
// ============================================================================
interface EmailLogEntry {
  _id: string;
  campaignId?: string;
  leadId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  resendId?: string;
  error?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  sentBy?: string;
  source?: string;
  createdAt: string;
}

interface LogSummary {
  total: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
}

export function ReportsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [summary, setSummary] = useState<LogSummary>({
    total: 0, queued: 0, sent: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, clicked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [viewingLog, setViewingLog] = useState<EmailLogEntry | null>(null);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(page * limit),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const response = await fetch(`/api/admin/crm/email/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const d = data.data || data;
        setLogs(d.logs || []);
        setTotal(d.pagination?.total || 0);
        if (d.summary) setSummary(d.summary);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResendSelected = async () => {
    const failedIds = Array.from(selectedLogs).filter(id => {
      const log = logs.find(l => l._id === id);
      return log && (log.status === 'failed' || log.status === 'bounced');
    });

    if (failedIds.length === 0) {
      setMessage('No failed emails selected to resend');
      return;
    }

    setResending(true);
    try {
      const response = await fetch('/api/admin/crm/email/logs/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logIds: failedIds }),
      });

      const data = await response.json();
      const d = data.data || data;
      setMessage(d.message || 'Resend complete');
      setSelectedLogs(new Set());
      await fetchLogs();
    } catch (err) {
      setMessage('Resend failed. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    const ids = new Set(logs.map(l => l._id));
    setSelectedLogs(ids);
  };

  const clearSelection = () => setSelectedLogs(new Set());

  const totalPages = Math.ceil(total / limit);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      bounced: 'bg-orange-100 text-orange-700',
      opened: 'bg-purple-100 text-purple-700',
      clicked: 'bg-indigo-100 text-indigo-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-3 h-3" />;
      case 'delivered': return <CheckCircle className="w-3 h-3" />;
      case 'failed': return <XCircle className="w-3 h-3" />;
      case 'bounced': return <AlertCircle className="w-3 h-3" />;
      case 'opened': return <Eye className="w-3 h-3" />;
      case 'clicked': return <TrendingUp className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Sent', value: summary.sent, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Delivered', value: summary.delivered, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Opened', value: summary.opened, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Clicked', value: summary.clicked, color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { label: 'Failed', value: summary.failed, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Bounced', value: summary.bounced, color: 'text-orange-700', bg: 'bg-orange-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-lg p-4 border`}>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search by email, name, or subject..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="queued">Queued</option>
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Sources</option>
            <option value="bulk">Bulk Email</option>
            <option value="followup">Followup</option>
            <option value="single">Single</option>
            <option value="automation">Automation</option>
          </select>

          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Selection Actions */}
        {selectedLogs.size > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm text-gray-600">{selectedLogs.size} selected</span>
            <button
              onClick={handleResendSelected}
              disabled={resending}
              className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              Resend Failed
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-600 hover:text-green-800">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Email Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => e.target.checked ? selectAllOnPage() : clearSelection()}
                    checked={selectedLogs.size === logs.length && logs.length > 0}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recipient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sent At</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sent By</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No email logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLogs.has(log._id)}
                        onChange={() => toggleSelect(log._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">
                          {log.recipientName || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {log.recipientEmail}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 truncate max-w-[200px]">{log.subject}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                      {log.error && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={log.error}>
                          {log.error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 capitalize">{log.source || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.sentBy || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingLog(log)}
                          className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(log.status === 'failed' || log.status === 'bounced') && (
                          <button
                            onClick={() => {
                              setSelectedLogs(new Set([log._id]));
                              handleResendSelected();
                            }}
                            className="p-1.5 bg-orange-100 text-orange-600 rounded hover:bg-orange-200"
                            title="Resend"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Email Modal */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Email Details</h2>
              <button onClick={() => setViewingLog(null)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500">Recipient</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingLog.recipientName || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">{viewingLog.recipientEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(viewingLog.status)}`}>
                    {getStatusIcon(viewingLog.status)}
                    {viewingLog.status.charAt(0).toUpperCase() + viewingLog.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Sent At</p>
                  <p className="text-sm text-gray-900">
                    {viewingLog.sentAt ? new Date(viewingLog.sentAt).toLocaleString() : 'Not sent'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Source</p>
                  <p className="text-sm text-gray-900 capitalize">{viewingLog.source || '-'}</p>
                </div>
                {viewingLog.resendId && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Resend ID</p>
                    <p className="text-xs text-gray-600 font-mono">{viewingLog.resendId}</p>
                  </div>
                )}
                {viewingLog.error && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-red-500">Error</p>
                    <p className="text-sm text-red-700 bg-red-50 p-2 rounded">{viewingLog.error}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Subject</p>
                <p className="text-sm font-semibold text-gray-900 bg-gray-50 p-3 rounded">{viewingLog.subject}</p>
              </div>

              {viewingLog.body && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Body</p>
                  <div
                    className="text-sm text-gray-900 bg-gray-50 p-3 rounded max-h-60 overflow-y-auto whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: viewingLog.body }}
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: any }> = {
    draft: { color: 'gray', icon: Edit },
    scheduled: { color: 'blue', icon: Clock },
    sending: { color: 'yellow', icon: RefreshCw },
    sent: { color: 'green', icon: CheckCircle },
    failed: { color: 'red', icon: XCircle },
  };

  const { color, icon: Icon } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 bg-${color}-100 text-${color}-700 text-xs font-medium rounded`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon, color }: any) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Template Modal
export function TemplateModal({ template, onSave, onClose }: any) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');

  const handleSubmit = () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    onSave({ name, category, subject, body });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Welcome Email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Onboarding, Follow-up"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Email subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="Email content..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{name}'}, {'{email}'}, {'{phone}'}
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// Follow-up Modal
export function FollowupModal({ sequence, templates, onSave, onClose }: any) {
  const [name, setName] = useState(sequence?.name || '');
  const [description, setDescription] = useState(sequence?.description || '');
  const [trigger, setTrigger] = useState(sequence?.trigger || 'manual');
  const [steps, setSteps] = useState<FollowUpStep[]>(sequence?.steps || []);
  const [active, setActive] = useState(sequence?.active ?? true);

  const addStep = () => {
    setSteps([...steps, {
      id: `step_${Date.now()}`,
      delayDays: 1,
      delayHours: 0,
      subject: '',
      body: '',
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a sequence name');
      return;
    }

    if (steps.length === 0) {
      alert('Please add at least one step');
      return;
    }

    onSave({ name, description, trigger, steps, active });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {sequence ? 'Edit Follow-up Sequence' : 'New Follow-up Sequence'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g., New Lead Follow-up"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Event
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="manual">Manual</option>
                <option value="lead_created">Lead Created</option>
                <option value="workshop_registered">Workshop Registered</option>
                <option value="payment_received">Payment Received</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Brief description of this sequence..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Follow-up Steps</h3>
              <button
                onClick={addStep}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-900">Step {index + 1}</span>
                    <button
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Delay (Days)
                      </label>
                      <input
                        type="number"
                        value={step.delayDays}
                        onChange={(e) => updateStep(index, 'delayDays', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Delay (Hours)
                      </label>
                      <input
                        type="number"
                        value={step.delayHours || 0}
                        onChange={(e) => updateStep(index, 'delayHours', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        min="0"
                        max="23"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={step.subject}
                      onChange={(e) => updateStep(index, 'subject', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Body
                    </label>
                    <textarea
                      value={step.body}
                      onChange={(e) => updateStep(index, 'body', e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                      placeholder="Email content..."
                    />
                  </div>
                </div>
              ))}

              {steps.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No steps added yet</p>
                  <button
                    onClick={addStep}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add First Step
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Sequence
          </button>
        </div>
      </div>
    </div>
  );
}
