'use client';
import { getLoginPath } from '@/hooks/useAuth';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Mail, Send, Users, Filter, Search, X, Plus, 
  Clock, Calendar, Trash2, Edit, Eye, Settings,
  ChevronDown, ChevronUp, FileText, Image, Paperclip,
  CheckCircle, AlertCircle, RefreshCw, Download
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import { 
  CampaignsTab, 
  TemplatesTab, 
  FollowupsTab, 
  AnalyticsTab,
  ReportsTab,
  RepliesTab,
  InboxTab,
  TemplateModal,
  FollowupModal
} from '@/components/admin/email/EmailComponents';
import { Inbox } from 'lucide-react';

interface EmailAttachment {
  fileName: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  fileType?: 'image' | 'video' | 'document';
}

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  source?: string;
  assignedToUserId?: string;
  tags?: string[];
  createdAt?: string;
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  variables?: string[];
  attachments?: EmailAttachment[];
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

export default function EmailAutomationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Auth & Permissions
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [assignedLeadIds, setAssignedLeadIds] = useState<Set<string>>(new Set());
  
  // UI State
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'campaigns' | 'reports' | 'templates' | 'followups' | 'analytics' | 'replies' | 'settings'>('inbox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Compose Email State
  const [selectedRecipients, setSelectedRecipients] = useState<Lead[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  
  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Campaigns State
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  
  // Follow-up Sequences State
  const [followupSequences, setFollowupSequences] = useState<FollowUpSequence[]>([]);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [editingFollowup, setEditingFollowup] = useState<FollowUpSequence | null>(null);

  // Email Settings State
  interface EmailSetting {
    _id: string;
    senderEmail: string;
    senderName: string;
    connectionType: 'smtp' | 'resend';
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
    resendApiKey: string;
    isDefault: boolean;
    isVerified: boolean;
    lastVerifiedAt?: string;
    createdAt: string;
    updatedAt: string;
  }
  const [emailSettings, setEmailSettings] = useState<EmailSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  
  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
  }, []);

  // Authentication & Permission Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolvedToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
    if (!resolvedToken) {
      router.replace(getLoginPath());
      return;
    }

    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = '';
    let permissions: any = null;
    let legacyPerms: string[] = [];

    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || '';
        permissions = u?.permissionsV2 || null;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
      } catch {
        // ignore
      }
    }

    const superAdmin = resolvedUserId === 'admin' || 
                       resolvedUserId === 'admincrm' ||
                       legacyPerms.includes('all') ||
                       permissions?.isSuperAdmin === true;

    setCurrentUserId(resolvedUserId);
    setIsSuperAdmin(superAdmin);
    setUserPermissions(permissions);

    // Check email permissions
    const hasEmailAccess = superAdmin || 
                          legacyPerms.includes('email') ||
                          hasPermission(permissions, 'email', 'read');

    if (!hasEmailAccess) {
      router.replace('/admin/crm');
      return;
    }

    setIsAuthenticated(true);
  }, [router]);

  // Fetch leads when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    void fetchAllLeads();
    void fetchTemplates();
    void fetchCampaigns();
    void fetchFollowupSequences();
    void fetchEmailSettings();
  }, [isAuthenticated, token]);

  // Auto-select leads from URL params (e.g. from pipeline manage page)
  useEffect(() => {
    const leadIdsParam = searchParams.get('leadIds');
    if (!leadIdsParam || leads.length === 0) return;

    const ids = leadIdsParam.split(',').filter(Boolean);
    if (ids.length === 0) return;

    const matchedLeads = leads.filter(l => ids.includes(l._id) && l.email?.trim());
    if (matchedLeads.length > 0) {
      setSelectedRecipients(matchedLeads);
      setActiveTab('compose');
    }
  }, [leads, searchParams]);

  // Filter leads based on search and filters
  useEffect(() => {
    let filtered = [...leads];

    // Permission-based filtering
    if (!isSuperAdmin && assignedLeadIds.size > 0) {
      filtered = filtered.filter(lead => assignedLeadIds.has(lead._id));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, searchQuery, statusFilter, sourceFilter, isSuperAdmin, assignedLeadIds]);

  const fetchAllLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/crm/leads?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch leads');
      
      const data = await response.json();
      const raw = data.data || data;
      const fetchedLeads = Array.isArray(raw) ? raw : (raw.leads || []);
      setLeads(fetchedLeads);

      // Build assigned lead IDs set
      if (!isSuperAdmin) {
        const assigned = new Set<string>();
        fetchedLeads.forEach((lead: Lead) => {
          if (lead.assignedToUserId === currentUserId) {
            assigned.add(lead._id);
          }
        });
        setAssignedLeadIds(assigned);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/crm/email/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setTemplates(payload.templates || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/crm/email/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  const fetchFollowupSequences = async () => {
    try {
      const response = await fetch('/api/admin/crm/email/followups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFollowupSequences(data.sequences || []);
      }
    } catch (err) {
      console.error('Failed to fetch follow-up sequences:', err);
    }
  };

  // Email Settings CRUD
  const fetchEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/crm/email/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEmailSettings(data.data?.settings || []);
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push(getLoginPath());
  };

  const toggleRecipient = (lead: Lead) => {
    // Permission check
    if (!isSuperAdmin && !assignedLeadIds.has(lead._id)) {
      setError('You can only send emails to leads assigned to you');
      return;
    }

    setSelectedRecipients(prev => {
      const exists = prev.find(l => l._id === lead._id);
      if (exists) {
        return prev.filter(l => l._id !== lead._id);
      } else {
        return [...prev, lead];
      }
    });
  };

  const selectAllFiltered = () => {
    const accessibleLeads = filteredLeads.filter(lead => 
      isSuperAdmin || assignedLeadIds.has(lead._id)
    );
    setSelectedRecipients(accessibleLeads);
  };

  const clearRecipients = () => {
    setSelectedRecipients([]);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t._id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailBody(template.body);
      setSelectedTemplate(templateId);
      if (template.attachments && template.attachments.length > 0) {
        setEmailAttachments(template.attachments);
      }
    }
  };

  const handleSendEmail = async () => {
    // Permission check
    const canSend = isSuperAdmin || 
                    hasPermission(userPermissions, 'email', 'send');
    
    if (!canSend) {
      setError('❌ You do not have permission to send emails');
      return;
    }

    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient');
      return;
    }

    if (!emailSubject.trim()) {
      setError('Please enter an email subject');
      return;
    }

    if (!emailBody.trim()) {
      setError('Please enter email content');
      return;
    }

    // Verify all recipients are accessible
    const inaccessibleRecipients = selectedRecipients.filter(lead => 
      !isSuperAdmin && !assignedLeadIds.has(lead._id)
    );

    if (inaccessibleRecipients.length > 0) {
      setError(`Cannot send to ${inaccessibleRecipients.length} recipient(s) not assigned to you`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const payload = {
        recipients: selectedRecipients.map(l => ({
          email: l.email,
          name: l.name,
          leadId: l._id,
        })),
        subject: emailSubject,
        body: emailBody,
        templateId: selectedTemplate || undefined,
        attachments: emailAttachments,
        scheduleMode,
        scheduledAt: scheduleMode === 'later' && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : undefined,
      };

      const response = await fetch('/api/admin/crm/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setMessage(scheduleMode === 'now' 
        ? `✅ Email sent to ${selectedRecipients.length} recipient(s)!`
        : `✅ Email scheduled for ${scheduledDate} at ${scheduledTime}`
      );
      
      // Reset form
      setSelectedRecipients([]);
      setEmailSubject('');
      setEmailBody('');
      setSelectedTemplate('');
      setScheduleMode('now');
      setScheduledDate('');
      setScheduledTime('');
      setEmailAttachments([]);

      // Refresh campaigns
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate 
        ? `/api/admin/crm/email/templates/${editingTemplate._id}`
        : '/api/admin/crm/email/templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error('Failed to save template');

      await fetchTemplates();
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setMessage('✅ Template saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/crm/email/templates/${templateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete template');

      await fetchTemplates();
      setMessage('✅ Template deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleSaveFollowup = async (sequence: Partial<FollowUpSequence>) => {
    try {
      const method = editingFollowup ? 'PUT' : 'POST';
      const url = editingFollowup
        ? `/api/admin/crm/email/followups/${editingFollowup._id}`
        : '/api/admin/crm/email/followups';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sequence),
      });

      if (!response.ok) throw new Error('Failed to save follow-up sequence');

      await fetchFollowupSequences();
      setShowFollowupModal(false);
      setEditingFollowup(null);
      setMessage('✅ Follow-up sequence saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save follow-up sequence');
    }
  };

  const handleDeleteFollowup = async (sequenceId: string) => {
    if (!confirm('Delete this follow-up sequence? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/crm/email/followups/${sequenceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete follow-up sequence');

      await fetchFollowupSequences();
      setMessage('✅ Follow-up sequence deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up sequence');
    }
  };

  const canSendEmail = isSuperAdmin || hasPermission(userPermissions, 'email', 'send');
  const canBroadcast = isSuperAdmin || hasPermission(userPermissions, 'email', 'broadcast');
  const canManageTemplates = isSuperAdmin || hasPermission(userPermissions, 'email', 'manageTemplates');

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swar-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Email Automation</h1>
                <p className="text-sm text-gray-600">Manage email campaigns and follow-ups</p>
              </div>
              {/* Connection Status Badge */}
              {(() => {
                const hasVerified = emailSettings.some(s => s.isVerified);
                return (
                  <span
                    className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      hasVerified
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${hasVerified ? 'bg-green-500' : 'bg-red-500'}`} />
                    {hasVerified ? 'Email Connected' : 'Email Not Connected'}
                  </span>
                );
              })()}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'inbox'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                Inbox
              </div>
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'compose'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Compose
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'campaigns'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Campaigns
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'reports'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Reports
              </div>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </div>
            </button>
            <button
              onClick={() => setActiveTab('followups')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'followups'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Follow-ups
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('replies')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'replies'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Replies
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {message && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-800">{message}</p>
            </div>
            <button onClick={() => setMessage('')} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'compose' && (
            <ComposeTab
              leads={filteredLeads}
              selectedRecipients={selectedRecipients}
              toggleRecipient={toggleRecipient}
              selectAllFiltered={selectAllFiltered}
              clearRecipients={clearRecipients}
              emailSubject={emailSubject}
              setEmailSubject={setEmailSubject}
              emailBody={emailBody}
              setEmailBody={setEmailBody}
              templates={templates}
              applyTemplate={applyTemplate}
              selectedTemplate={selectedTemplate}
              scheduleMode={scheduleMode}
              setScheduleMode={setScheduleMode}
              scheduledDate={scheduledDate}
              setScheduledDate={setScheduledDate}
              scheduledTime={scheduledTime}
              setScheduledTime={setScheduledTime}
              handleSendEmail={handleSendEmail}
              loading={loading}
              canSendEmail={canSendEmail}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              isSuperAdmin={isSuperAdmin}
              assignedLeadIds={assignedLeadIds}
              attachments={emailAttachments}
              setAttachments={setEmailAttachments}
              token={token}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsTab
              campaigns={campaigns}
              selectedCampaign={selectedCampaign}
              setSelectedCampaign={setSelectedCampaign}
              fetchCampaigns={fetchCampaigns}
              token={token}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab token={token} />
          )}

          {activeTab === 'templates' && (
            <TemplatesTab
              templates={templates}
              setShowTemplateModal={setShowTemplateModal}
              setEditingTemplate={setEditingTemplate}
              handleDeleteTemplate={handleDeleteTemplate}
              canManageTemplates={canManageTemplates}
            />
          )}

          {activeTab === 'followups' && (
            <FollowupsTab
              followupSequences={followupSequences}
              setShowFollowupModal={setShowFollowupModal}
              setEditingFollowup={setEditingFollowup}
              handleDeleteFollowup={handleDeleteFollowup}
              canManageTemplates={canManageTemplates}
              token={token}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab campaigns={campaigns} />
          )}

          {activeTab === 'inbox' && (
            <InboxTab token={token} />
          )}

          {activeTab === 'replies' && (
            <RepliesTab token={token} />
          )}

          {activeTab === 'settings' && (
            <EmailSettingsTab
              settings={emailSettings}
              loading={settingsLoading}
              token={token}
              onRefresh={fetchEmailSettings}
              setError={setError}
              setMessage={setMessage}
              setSettingsLoading={setSettingsLoading}
            />
          )}
        </main>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          token={token}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Follow-up Modal */}
      {showFollowupModal && (
        <FollowupModal
          sequence={editingFollowup}
          templates={templates}
          onSave={handleSaveFollowup}
          token={token}
          onClose={() => {
            setShowFollowupModal(false);
            setEditingFollowup(null);
          }}
        />
      )}
    </>
  );
}

// Compose Tab Component
function ComposeTab({ 
  leads, selectedRecipients, toggleRecipient, selectAllFiltered, clearRecipients,
  emailSubject, setEmailSubject, emailBody, setEmailBody,
  templates, applyTemplate, selectedTemplate,
  scheduleMode, setScheduleMode, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime,
  handleSendEmail, loading, canSendEmail,
  searchQuery, setSearchQuery, statusFilter, setStatusFilter, sourceFilter, setSourceFilter,
  isSuperAdmin, assignedLeadIds,
  attachments, setAttachments, token
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/crm/email/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.data) {
          setAttachments((prev: any[]) => [...prev, data.data]);
        } else {
          alert(`Upload failed: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recipients Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              Recipients ({selectedRecipients.length} selected)
            </h3>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="all">All Sources</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">Referral</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                className="flex-1 text-sm px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                Select All
              </button>
              <button
                onClick={clearRecipients}
                className="flex-1 text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto p-2">
            {leads.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No leads found</p>
            ) : (
              <div className="space-y-1">
                {leads.map((lead: Lead) => {
                  const isSelected = selectedRecipients.some((l: Lead) => l._id === lead._id);
                  const canAccess = isSuperAdmin || assignedLeadIds.has(lead._id);
                  
                  return (
                    <button
                      key={lead._id}
                      onClick={() => canAccess && toggleRecipient(lead)}
                      disabled={!canAccess}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300'
                          : canAccess
                          ? 'bg-white border-gray-200 hover:border-gray-300'
                          : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                          <p className="text-xs text-gray-600 truncate">{lead.email}</p>
                          {lead.phone && (
                            <p className="text-xs text-gray-500">{lead.phone}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                        )}
                        {!canAccess && (
                          <span className="text-xs text-gray-500 ml-2">🔒</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Panel */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Compose Email</h3>

          {/* Template Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Use Template (Optional)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">-- Select a template --</option>
              {templates.map((t: EmailTemplate) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content *
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Enter your email message..."
              rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Available variables: {'{name}'}, {'{email}'}, {'{phone}'}
            </p>
          </div>

          {/* Attachments */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Add Files'}
              </button>
              <span className="text-xs text-gray-500">
                Images, Videos, PDFs, Documents (max 25MB video, 10MB others)
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            {attachments && attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((att: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <div className="flex items-center gap-2 min-w-0">
                      {att.fileType === 'image' && <Image className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      {att.fileType === 'video' && <Eye className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                      {att.fileType === 'document' && <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                      <span className="text-sm text-gray-800 truncate">{att.fileName}</span>
                      {att.sizeBytes && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(att.sizeBytes / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Options
            </label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scheduleMode === 'now'}
                  onChange={() => setScheduleMode('now')}
                  className="text-indigo-600"
                />
                <span className="text-sm">Send Now</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scheduleMode === 'later'}
                  onChange={() => setScheduleMode('later')}
                  className="text-indigo-600"
                />
                <span className="text-sm">Schedule for Later</span>
              </label>
            </div>

            {scheduleMode === 'later' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendEmail}
            disabled={!canSendEmail || loading || selectedRecipients.length === 0}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                {scheduleMode === 'now' ? 'Sending...' : 'Scheduling...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {scheduleMode === 'now' 
                  ? `Send to ${selectedRecipients.length} Recipient(s)`
                  : 'Schedule Email'
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Additional tab components will be added in the next message due to length...

// ── Email Settings Tab ──
function EmailSettingsTab({ settings, loading, token, onRefresh, setError, setMessage, setSettingsLoading }: {
  settings: Array<{
    _id: string; senderEmail: string; senderName: string; connectionType: 'smtp' | 'resend';
    smtpHost?: string; smtpPort?: number; smtpUser?: string; smtpPass?: string; smtpSecure?: boolean;
    resendApiKey: string;
    isDefault: boolean; isVerified: boolean; lastVerifiedAt?: string; createdAt: string; updatedAt: string;
  }>;
  loading: boolean;
  token: string;
  onRefresh: () => Promise<void>;
  setError: (msg: string) => void;
  setMessage: (msg: string) => void;
  setSettingsLoading: (v: boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState('mohan@swaryoga.com');
  const [formName, setFormName] = useState('Swar Yoga');
  // SMTP fields
  const [formSmtpHost, setFormSmtpHost] = useState('smtp.hostinger.com');
  const [formSmtpPort, setFormSmtpPort] = useState(465);
  const [formSmtpUser, setFormSmtpUser] = useState('mohan@swaryoga.com');
  const [formSmtpPass, setFormSmtpPass] = useState('MohanSuhas@1707');
  const [formSmtpSecure, setFormSmtpSecure] = useState(true);
  const [formDefault, setFormDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormEmail('mohan@swaryoga.com');
    setFormName('Swar Yoga');
    setFormSmtpHost('smtp.hostinger.com');
    setFormSmtpPort(465);
    setFormSmtpUser('mohan@swaryoga.com');
    setFormSmtpPass('MohanSuhas@1707');
    setFormSmtpSecure(true);
    setFormDefault(true);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (s: typeof settings[0]) => {
    setFormEmail(s.senderEmail);
    setFormName(s.senderName);
    setFormSmtpHost(s.smtpHost || 'smtp.hostinger.com');
    setFormSmtpPort(s.smtpPort || 465);
    setFormSmtpUser(s.smtpUser || s.senderEmail);
    // When editing, leave password blank — server uses stored/env password if blank
    setFormSmtpPass('');
    setFormSmtpSecure(s.smtpSecure !== false);
    setFormDefault(s.isDefault);
    setEditingId(s._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formEmail.trim()) {
      setError('Sender email is required');
      return;
    }
    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload: any = {
        senderEmail: formEmail,
        senderName: formName,
        connectionType: 'smtp',
        isDefault: formDefault,
        smtpHost: formSmtpHost,
        smtpPort: formSmtpPort,
        smtpUser: formSmtpUser,
        smtpPass: formSmtpPass || undefined, // send undefined if blank — server uses stored/env password
        smtpSecure: formSmtpSecure,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch('/api/admin/crm/email/settings', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      const verified = data.data?.verified ?? data.data?.setting?.isVerified;
      setMessage(verified
        ? '✅ Email connected successfully! A test email was sent to mohan@swaryoga.com'
        : '⚠️ Email saved but SMTP verification failed. Check your Hostinger credentials.');
      resetForm();
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save sender email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sender email? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/crm/email/settings?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setMessage('✅ Sender email deleted');
      await onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Email Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Manage sender email addresses via Hostinger SMTP</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Sender Email
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Sender Email' : 'Connect Sender Email'}
          </h3>
          <div className="space-y-4">
            {/* Sender info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="mohan@swaryoga.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Swar Yoga"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {/* SMTP Fields */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMTP Configuration (Hostinger)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={formSmtpHost}
                    onChange={e => setFormSmtpHost(e.target.value)}
                    placeholder="smtp.hostinger.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                  <input
                    type="number"
                    value={formSmtpPort}
                    onChange={e => setFormSmtpPort(parseInt(e.target.value) || 465)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formSmtpSecure}
                      onChange={e => setFormSmtpSecure(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">SSL/TLS</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={formSmtpUser}
                    onChange={e => setFormSmtpUser(e.target.value)}
                    placeholder="mohan@swaryoga.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={formSmtpPass}
                    onChange={e => setFormSmtpPass(e.target.value)}
                    placeholder={editingId ? 'Leave blank to keep existing' : 'Enter password'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  {editingId && (
                    <p className="text-[11px] text-gray-400 mt-1">Leave blank to keep the existing password</p>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formDefault}
                onChange={e => setFormDefault(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Set as default sender</span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Connecting...' : editingId ? 'Update & Verify' : 'Connect & Verify'}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings List */}
      {settings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No Sender Emails Configured</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Connect your email to start sending from the CRM.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Connect mohan@swaryoga.com
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map(s => (
            <div
              key={s._id}
              className={`bg-white rounded-xl border p-5 flex items-center justify-between hover:shadow-sm transition ${
                s.isVerified ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Status dot */}
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.isVerified ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{s.senderName}</span>
                    {s.isDefault && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">DEFAULT</span>
                    )}
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      s.isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {s.isVerified ? 'CONNECTED' : 'NOT CONNECTED'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full">SMTP</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{s.senderEmail}</p>
                  {s.lastVerifiedAt && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Last verified: {new Date(s.lastVerifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(s)}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s._id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
        <h4 className="text-sm font-semibold text-green-800 mb-1">How it works</h4>
        <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
          <li>Your emails are sent via <strong>Hostinger SMTP</strong> (smtp.hostinger.com:465 with SSL).</li>
          <li>Click <strong>Connect & Verify</strong> — a test email is sent to confirm the connection.</li>
          <li>A <span className="font-semibold text-green-700">green CONNECTED</span> badge means email is ready to send.</li>
          <li>Set one email as default to use it for all outgoing campaigns and follow-ups.</li>
        </ul>
      </div>
    </div>
  );
}
