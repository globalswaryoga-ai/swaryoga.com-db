import React, { useState } from 'react';
import { 
  Mail, Calendar, Users, TrendingUp, Eye, Trash2, 
  Clock, CheckCircle, XCircle, AlertCircle, BarChart3,
  Plus, Edit, Play, Pause, RefreshCw, Download
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
