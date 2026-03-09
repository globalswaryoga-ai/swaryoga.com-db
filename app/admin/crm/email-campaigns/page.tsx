'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Send,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Eye,
  MousePointer,
  Users,
  FileText,
  Zap,
  Calendar,
  BarChart3,
  Copy,
  Play,
  Pause,
  ChevronDown,
  Settings,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  type: 'broadcast' | 'drip' | 'scheduled' | 'triggered';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  templateId?: string;
  htmlContent: string;
  textContent?: string;
  audience: {
    type: 'all' | 'filtered' | 'list';
    filters?: Record<string, any>;
    leadIds?: string[];
  };
  schedule?: {
    sendAt?: string;
    timezone?: string;
  };
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  category: string;
  isDefault?: boolean;
}

const CAMPAIGN_TYPES = [
  { id: 'broadcast', name: 'Broadcast', description: 'Send to all selected contacts now', icon: Send },
  { id: 'scheduled', name: 'Scheduled', description: 'Send at a specific time', icon: Calendar },
  { id: 'drip', name: 'Drip Campaign', description: 'Automated email sequence', icon: Zap },
  { id: 'triggered', name: 'Triggered', description: 'Send based on actions', icon: Play },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  sending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function EmailCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [usage, setUsage] = useState({ campaigns: 0, maxCampaigns: 2, emailsSent: 0, maxEmails: 100, canCreate: true });
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Campaign | null>(null);
  const [showStats, setShowStats] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Create campaign form
  const [newCampaign, setNewCampaign] = useState<{
    name: string;
    subject: string;
    type: 'broadcast' | 'drip' | 'scheduled' | 'triggered';
    templateId: string;
    htmlContent: string;
    textContent: string;
    audience: { type: 'all' | 'filtered' | 'list'; filters?: Record<string, any>; leadIds?: string[] };
    schedule: { sendAt: string; timezone: string };
  }>({
    name: '',
    subject: '',
    type: 'broadcast',
    templateId: '',
    htmlContent: '',
    textContent: '',
    audience: { type: 'all' },
    schedule: { sendAt: '', timezone: 'Asia/Kolkata' },
  });

  // Step tracking
  const [createStep, setCreateStep] = useState(1); // 1: basics, 2: content, 3: audience, 4: review

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/email/campaigns?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setUsage(data.usage || { campaigns: 0, maxCampaigns: 2, emailsSent: 0, maxEmails: 100, canCreate: true });
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/email/templates?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.subject.trim()) {
      alert('Please fill in campaign name and subject');
      return;
    }

    if (!newCampaign.htmlContent.trim() && !newCampaign.templateId) {
      alert('Please select a template or write email content');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      
      // Get content from template if selected
      let content = newCampaign.htmlContent;
      if (newCampaign.templateId && !content) {
        const template = templates.find(t => t.id === newCampaign.templateId);
        if (template) {
          content = template.htmlContent;
        }
      }

      const res = await fetch('/api/crm-site/email/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          ...newCampaign,
          htmlContent: content,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setCreateStep(1);
        setNewCampaign({
          name: '',
          subject: '',
          type: 'broadcast',
          templateId: '',
          htmlContent: '',
          textContent: '',
          audience: { type: 'all' },
          schedule: { sendAt: '', timezone: 'Asia/Kolkata' },
        });
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const updateCampaign = async () => {
    if (!showEdit) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/email/campaigns', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          campaignId: showEdit.id,
          name: showEdit.name,
          subject: showEdit.subject,
          htmlContent: showEdit.htmlContent,
          audience: showEdit.audience,
          schedule: showEdit.schedule,
        }),
      });

      if (res.ok) {
        setShowEdit(null);
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update campaign');
      }
    } catch (err) {
      console.error('Failed to update campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/email/campaigns', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, campaignId }),
      });
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    if (!confirm('Send this campaign now? Emails will be queued for delivery.')) return;

    setSending(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, campaignId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Campaign queued! ${data.queued || 0} emails will be sent.`);
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to send campaign');
      }
    } catch (err) {
      console.error('Failed to send campaign:', err);
      alert('Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const duplicateCampaign = async (campaign: Campaign) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/email/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          name: `${campaign.name} (Copy)`,
          subject: campaign.subject,
          type: campaign.type,
          htmlContent: campaign.htmlContent,
          textContent: campaign.textContent,
          audience: campaign.audience,
        }),
      });

      if (res.ok) {
        fetchCampaigns();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to duplicate campaign');
      }
    } catch (err) {
      console.error('Failed to duplicate campaign:', err);
    } finally {
      setSaving(false);
    }
  };

  const getOpenRate = (campaign: Campaign) => {
    if (campaign.stats.sent === 0) return 0;
    return ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1);
  };

  const getClickRate = (campaign: Campaign) => {
    if (campaign.stats.opened === 0) return 0;
    return ((campaign.stats.clicked / campaign.stats.opened) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
              <p className="text-gray-600">Create and manage email marketing campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCampaigns}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!usage.canCreate}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Campaigns</span>
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{usage.campaigns} / {usage.maxCampaigns}</p>
            <p className="text-sm text-gray-500">{plan} plan</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Emails Sent</span>
              <Send className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{usage.emailsSent.toLocaleString()} / {usage.maxEmails.toLocaleString()}</p>
            <p className="text-sm text-gray-500">this month</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Open Rate</span>
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + parseFloat(getOpenRate(c) as string), 0) / campaigns.length).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-gray-500">all campaigns</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Click Rate</span>
              <MousePointer className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {campaigns.length > 0
                ? (campaigns.reduce((sum, c) => sum + parseFloat(getClickRate(c) as string), 0) / campaigns.length).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-gray-500">all campaigns</p>
          </div>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-4">Create your first email campaign to engage with your leads</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Campaign</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Sent</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Open Rate</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Click Rate</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{campaign.name}</p>
                        <p className="text-sm text-gray-500">{campaign.subject}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-sm text-gray-700">{campaign.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {campaign.stats.sent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getOpenRate(campaign)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {getClickRate(campaign)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => sendCampaign(campaign.id)}
                            disabled={sending}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Send Now"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowStats(campaign)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Stats"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateCampaign(campaign)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => setShowEdit(campaign)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Create Campaign</h2>
                <p className="text-sm text-gray-500">Step {createStep} of 4</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreateStep(1); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Basics */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Campaign Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                    <input
                      type="text"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., March Newsletter"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={newCampaign.subject}
                      onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Your Weekly Yoga Tips"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Campaign Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {CAMPAIGN_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() => setNewCampaign({ ...newCampaign, type: type.id as any })}
                            className={`p-4 border rounded-xl text-left transition ${
                              newCampaign.type === type.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-2 ${newCampaign.type === type.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <p className="font-medium text-gray-900">{type.name}</p>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Content */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Email Content</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                    <select
                      value={newCampaign.templateId}
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        setNewCampaign({
                          ...newCampaign,
                          templateId: e.target.value,
                          htmlContent: template?.htmlContent || '',
                          subject: template?.subject || newCampaign.subject,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose a template --</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Content (HTML)
                    </label>
                    <textarea
                      value={newCampaign.htmlContent}
                      onChange={(e) => setNewCampaign({ ...newCampaign, htmlContent: e.target.value })}
                      rows={12}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="<html>...</html>"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Variables: {'{{lead.name}}'}, {'{{lead.email}}'}, {'{{company.name}}'}, {'{{unsubscribe_link}}'}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Audience */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Select Audience</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setNewCampaign({ ...newCampaign, audience: { type: 'all' } })}
                      className={`w-full p-4 border rounded-xl text-left flex items-center gap-4 ${
                        newCampaign.audience.type === 'all' ? 'border-indigo-500 bg-indigo-50' : 'hover:border-gray-300'
                      }`}
                    >
                      <Users className={`w-6 h-6 ${newCampaign.audience.type === 'all' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-900">All Leads</p>
                        <p className="text-sm text-gray-500">Send to all active leads</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setNewCampaign({ ...newCampaign, audience: { type: 'filtered', filters: { status: 'active' } } })}
                      className={`w-full p-4 border rounded-xl text-left flex items-center gap-4 ${
                        newCampaign.audience.type === 'filtered' ? 'border-indigo-500 bg-indigo-50' : 'hover:border-gray-300'
                      }`}
                    >
                      <Settings className={`w-6 h-6 ${newCampaign.audience.type === 'filtered' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium text-gray-900">Filtered</p>
                        <p className="text-sm text-gray-500">Send to leads matching criteria</p>
                      </div>
                    </button>
                  </div>

                  {newCampaign.type === 'scheduled' && (
                    <div className="mt-6 pt-4 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Send Time</label>
                      <input
                        type="datetime-local"
                        value={newCampaign.schedule.sendAt}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          schedule: { ...newCampaign.schedule, sendAt: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {createStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Review Campaign</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name</span>
                      <span className="font-medium">{newCampaign.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subject</span>
                      <span className="font-medium">{newCampaign.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className="font-medium capitalize">{newCampaign.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Audience</span>
                      <span className="font-medium capitalize">{newCampaign.audience.type} leads</span>
                    </div>
                    {newCampaign.schedule.sendAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scheduled</span>
                        <span className="font-medium">{new Date(newCampaign.schedule.sendAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">Ready to create</p>
                        <p className="text-sm text-yellow-700">
                          Campaign will be saved as draft. You can send it from the campaigns list.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-between">
              {createStep > 1 ? (
                <button
                  onClick={() => setCreateStep(createStep - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              {createStep < 4 ? (
                <button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={createStep === 1 && (!newCampaign.name || !newCampaign.subject)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={createCampaign}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Campaign</h2>
              <button onClick={() => setShowEdit(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={showEdit.name}
                  onChange={(e) => setShowEdit({ ...showEdit, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={showEdit.subject}
                  onChange={(e) => setShowEdit({ ...showEdit, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Content (HTML)</label>
                <textarea
                  value={showEdit.htmlContent}
                  onChange={(e) => setShowEdit({ ...showEdit, htmlContent: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowEdit(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={updateCampaign}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Campaign Stats</h2>
              <button onClick={() => setShowStats(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{showStats.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">{showStats.stats.sent.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Sent</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{showStats.stats.delivered.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Delivered</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-600">{showStats.stats.opened.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Opened ({getOpenRate(showStats)}%)</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{showStats.stats.clicked.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Clicked ({getClickRate(showStats)}%)</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{showStats.stats.bounced.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Bounced</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">{showStats.stats.unsubscribed.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Unsubscribed</p>
                </div>
              </div>

              {showStats.sentAt && (
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-gray-500">
                    Sent on {new Date(showStats.sentAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
