'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Phone, MapPin, Trash2, Eye, EyeOff, Plus, Copy, Check, Link2, X, ImagePlus, Loader as LoaderIcon, MessageCircle, Pencil, ChevronUp, ChevronDown, Send, QrCode, Archive, ArchiveRestore } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Enquiry {
  id: string;
  leadId?: string;
  workshopId: string;
  workshopName: string;
  name: string;
  mobile: string;
  gender: string;
  city: string;
  submittedAt: string;
  status: 'new' | 'contacted' | 'registered';
  notes?: string;
  labels?: string[];
}

interface EnquiryForm {
  formId: string;
  workshopName: string;
  workshopDate: string;
  workshopTime: string;
  workshopMode: string;
  description: string;
  workshopImage?: string;
  price?: number;
  currency?: string;
  groupLink?: string;
  isActive: boolean;
  submissionCount: number;
  createdAt: string;
}

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'contacted' | 'registered'>('all');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formsCollapsed, setFormsCollapsed] = useState(false);
  const [submissionsCollapsed, setSubmissionsCollapsed] = useState(false);

  // Forms management
  const [forms, setForms] = useState<EnquiryForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  // New form state
  const [newWsName, setNewWsName] = useState('');
  const [newWsDate, setNewWsDate] = useState('');
  const [newWsTime, setNewWsTime] = useState('');
  const [newWsMode, setNewWsMode] = useState('online');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsImage, setNewWsImage] = useState('');     // Bunny CDN URL after upload
  const [newWsPrice, setNewWsPrice] = useState('');     // workshop price (empty/0 = free, no payment)
  const [newWsCurrency, setNewWsCurrency] = useState('INR');
  const [newWsGroupLink, setNewWsGroupLink] = useState(''); // WhatsApp group invite link
  const [editingFormId, setEditingFormId] = useState<string | null>(null); // null = creating, else editing
  const [imageUploading, setImageUploading] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formSaveError, setFormSaveError] = useState('');

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    setFormSaveError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/enquiry-forms/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setNewWsImage(data.url);
    } catch (e) {
      setFormSaveError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    fetchForms();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/enquiries', { headers: getAuthHeaders() });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error || errBody?.message || `Failed to fetch enquiries (${response.status})`);
      }
      const data = await response.json();
      setEnquiries(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      setFormsLoading(true);
      const res = await fetch('/api/admin/enquiry-forms', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setForms(data.data || []);
    } catch {} finally {
      setFormsLoading(false);
    }
  };

  // Reset all form fields and close the modal (shared by create + edit).
  const closeFormModal = () => {
    setShowAddForm(false);
    setEditingFormId(null);
    setFormSaveError('');
    setNewWsName(''); setNewWsDate(''); setNewWsTime(''); setNewWsMode('online'); setNewWsDesc(''); setNewWsImage('');
    setNewWsPrice(''); setNewWsCurrency('INR'); setNewWsGroupLink('');
  };

  // Open the modal in create mode (clears any leftover edit state/fields).
  const openCreateForm = () => {
    setEditingFormId(null);
    setNewWsName(''); setNewWsDate(''); setNewWsTime(''); setNewWsMode('online'); setNewWsDesc(''); setNewWsImage('');
    setNewWsPrice(''); setNewWsCurrency('INR'); setNewWsGroupLink('');
    setFormSaveError('');
    setShowAddForm(true);
  };

  // Open the modal pre-filled with an existing form's values for editing.
  const openEditForm = (form: EnquiryForm) => {
    setEditingFormId(form.formId);
    setNewWsName(form.workshopName || '');
    setNewWsDate(form.workshopDate || '');
    setNewWsTime(form.workshopTime || '');
    setNewWsMode(form.workshopMode || 'online');
    setNewWsDesc(form.description || '');
    setNewWsImage(form.workshopImage || '');
    setNewWsPrice(form.price ? String(form.price) : '');
    setNewWsCurrency(form.currency || 'INR');
    setNewWsGroupLink(form.groupLink || '');
    setFormSaveError('');
    setShowAddForm(true);
  };

  const saveNewForm = async () => {
    if (!newWsName.trim()) { setFormSaveError('Workshop name is required'); return; }
    setSavingForm(true);
    setFormSaveError('');
    try {
      const payload = {
        workshopName: newWsName.trim(),
        workshopDate: newWsDate,
        workshopTime: newWsTime,
        workshopMode: newWsMode,
        description: newWsDesc.trim(),
        workshopImage: newWsImage,
        price: Math.max(0, Number(newWsPrice) || 0),
        currency: newWsCurrency || 'INR',
        groupLink: newWsGroupLink.trim(),
      };
      if (editingFormId) {
        // ── Edit existing form (PATCH) ──
        const res = await fetch(`/api/admin/enquiry-forms?id=${editingFormId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update form');
        setForms((prev) => prev.map((f) => f.formId === editingFormId ? { ...f, ...(data.form || payload) } : f));
      } else {
        // ── Create new form (POST) ──
        const res = await fetch('/api/admin/enquiry-forms', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create form');
        setForms((prev) => [data.form, ...prev]);
      }
      closeFormModal();
    } catch (e) {
      setFormSaveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingForm(false);
    }
  };

  const copyLink = (formId: string) => {
    const link = `${window.location.origin}/workshop-join/${formId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(formId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const copyCertLink = (enquiry: Enquiry) => {
    const ref = enquiry.leadId || enquiry.id;
    const link = `${window.location.origin}/certificate-details/lead-${ref}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCertId(enquiry.id);
      setTimeout(() => setCopiedCertId(null), 2000);
    });
  };

  const deactivateForm = async (formId: string) => {
    if (!confirm('Deactivate this form? People with the link won\'t be able to submit.')) return;
    await fetch(`/api/admin/enquiry-forms?id=${formId}`, { method: 'DELETE', headers: getAuthHeaders() });
    setForms((prev) => prev.filter((f) => f.formId !== formId));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      const response = await fetch(`/api/admin/enquiries?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to delete enquiry');
      setEnquiries(enquiries.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

  // Edit an enquiry's name / mobile number.
  const [editEnquiry, setEditEnquiry] = useState<Enquiry | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (enquiry: Enquiry) => {
    setEditEnquiry(enquiry);
    setEditName(enquiry.name || '');
    setEditMobile(enquiry.mobile || '');
  };

  const handleEditSave = async () => {
    if (!editEnquiry) return;
    const name = editName.trim();
    const mobile = editMobile.trim();
    if (!name) { alert('Name cannot be empty.'); return; }
    if (!mobile) { alert('Mobile number cannot be empty.'); return; }
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/admin/enquiries?id=${editEnquiry.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, mobile }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'Failed to update enquiry');
      setEnquiries(enquiries.map((e) => e.id === editEnquiry.id ? { ...e, name, mobile } : e));
      setEditEnquiry(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update enquiry');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/enquiries?id=${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setEnquiries(enquiries.map((e) => e.id === id ? { ...e, status: newStatus as Enquiry['status'] } : e));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Open conversation in Meta inbox + tag lead as meta-contacted.
  // Creates a CRM lead for this enquiry if one doesn't exist yet, so the
  // number is properly tied to a lead and visible in the inbox sidebar.
  const openInMeta = async (enquiry: Enquiry) => {
    const digits = enquiry.mobile.replace(/\D/g, '');
    // Ensure country code: if 10 digits, prepend 91
    const phone = digits.length === 10 ? `91${digits}` : digits;

    try {
      const leadId = await ensureLeadAndToggleLabel(enquiry, 'meta-contacted', false);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      if (token) {
        fetch(`/api/admin/crm/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ addLabels: ['meta-whatsapp'] }),
        }).catch(() => {});
      }
      setEnquiries((prev) => prev.map((e) => e.id !== enquiry.id ? e : {
        ...e,
        leadId,
        labels: [...new Set([...(e.labels || []), 'meta-whatsapp', 'meta-contacted'])],
      }));
    } catch (err) {
      console.error('Failed to ensure lead for Meta contact', err);
    }

    const params = new URLSearchParams({ phone });
    if (enquiry.name) params.set('name', enquiry.name);
    router.push(`/admin/crm/meta?${params.toString()}`);
  };

  // Open conversation in QR WhatsApp inbox + tag lead as qr-contacted.
  // Creates a CRM lead for this enquiry if one doesn't exist yet, so the
  // number is properly tied to a lead and visible in the inbox sidebar.
  const openInQR = async (enquiry: Enquiry) => {
    const digits = enquiry.mobile.replace(/\D/g, '');
    // Ensure country code: if 10 digits, prepend 91
    const phone = digits.length === 10 ? `91${digits}` : digits;

    try {
      const leadId = await ensureLeadAndToggleLabel(enquiry, 'qr-contacted', false);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
      if (token) {
        fetch(`/api/admin/crm/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ addLabels: ['qr-whatsapp'] }),
        }).catch(() => {});
      }
      setEnquiries((prev) => prev.map((e) => e.id !== enquiry.id ? e : {
        ...e,
        leadId,
        labels: [...new Set([...(e.labels || []), 'qr-whatsapp', 'qr-contacted'])],
      }));
    } catch (err) {
      console.error('Failed to ensure lead for QR contact', err);
    }

    const params = new URLSearchParams({ phone });
    if (enquiry.name) params.set('name', enquiry.name);
    router.push(`/admin/crm/qr?${params.toString()}`);
  };

  // The CRM label used to mark a lead as "included in this workshop's bulk broadcast"
  const broadcastGroupLabel = (workshopId: string) => `workshop:${workshopId}`;

  // The CRM label used to soft-hide an enquiry from the main list
  const HIDE_LABEL = 'enquiry-hidden';

  const [togglingMark, setTogglingMark] = useState<string | null>(null); // enquiry.id currently being toggled
  const [togglingHide, setTogglingHide] = useState<string | null>(null); // enquiry.id currently being hidden/unhidden
  const [showHidden, setShowHidden] = useState(false);

  // Ensure a CRM lead exists for this enquiry (creating one for legacy
  // entries that don't have one yet), then add/remove `label` on it.
  // Returns the lead's id.
  const ensureLeadAndToggleLabel = async (enquiry: Enquiry, label: string, marked: boolean): Promise<string> => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    if (!token) throw new Error('Not authenticated');
    let leadId = enquiry.leadId;

    if (!leadId) {
      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phoneNumber: enquiry.mobile,
          name: enquiry.name,
          labels: ['enquiry', label],
          source: 'website',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.data?._id) {
        leadId = data.data._id;
      } else if (res.status === 409 && data?.existingLead?._id) {
        leadId = data.existingLead._id;
      } else {
        throw new Error(data?.error || 'Failed to create lead');
      }
    }

    const patchRes = await fetch(`/api/admin/crm/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(marked ? { removeLabels: [label] } : { addLabels: [label] }),
    });
    if (!patchRes.ok) throw new Error('Failed to update lead labels');
    return leadId as string;
  };

  // Toggle (blue <-> red) whether this enquiry's lead is included in the
  // workshop's bulk broadcast list.
  const toggleBroadcastMark = async (enquiry: Enquiry) => {
    const label = broadcastGroupLabel(enquiry.workshopId);
    const marked = (enquiry.labels || []).includes(label);

    setTogglingMark(enquiry.id);
    try {
      const leadId = await ensureLeadAndToggleLabel(enquiry, label, marked);
      setEnquiries((prev) => prev.map((e) => {
        if (e.id !== enquiry.id) return e;
        const labels = e.labels || [];
        return {
          ...e,
          leadId,
          labels: marked ? labels.filter((l) => l !== label) : [...labels, label],
        };
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update broadcast selection');
    } finally {
      setTogglingMark(null);
    }
  };

  // Soft-hide/unhide an enquiry — hidden rows are excluded from the main
  // list but can be viewed and restored via "Show hidden".
  const toggleHide = async (enquiry: Enquiry) => {
    const hidden = (enquiry.labels || []).includes(HIDE_LABEL);

    setTogglingHide(enquiry.id);
    try {
      const leadId = await ensureLeadAndToggleLabel(enquiry, HIDE_LABEL, hidden);
      setEnquiries((prev) => prev.map((e) => {
        if (e.id !== enquiry.id) return e;
        const labels = e.labels || [];
        return {
          ...e,
          leadId,
          labels: hidden ? labels.filter((l) => l !== HIDE_LABEL) : [...labels, HIDE_LABEL],
        };
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update hidden state');
    } finally {
      setTogglingHide(null);
    }
  };

  // Lead IDs of submissions marked (via the +/red toggle) for this form's bulk broadcast
  const getFormLeadIds = (formId: string): string[] =>
    enquiries
      .filter((e) => e.workshopId === formId && e.leadId && (e.labels || []).includes(broadcastGroupLabel(formId)))
      .map((e) => e.leadId as string);

  // Send a form's submissions straight to a broadcast (QR or Meta) — pick template + schedule there
  const broadcastForm = (form: EnquiryForm, channel: 'qr' | 'meta') => {
    const leadIds = getFormLeadIds(form.formId);
    if (leadIds.length === 0) {
      alert('No leads marked for broadcast yet — click the + on the leads you want to include.');
      return;
    }
    const path = channel === 'qr' ? '/admin/crm/qr-broadcast' : '/admin/crm/broadcast';
    router.push(`${path}?leadIds=${leadIds.join(',')}`);
  };

  const workshops = Array.from(new Set(enquiries.map((e) => e.workshopName)));

  const hiddenCount = enquiries.filter((e) => (e.labels || []).includes(HIDE_LABEL)).length;

  const filteredEnquiries = enquiries.filter((enquiry) => {
    const isHidden = (enquiry.labels || []).includes(HIDE_LABEL);
    if (showHidden ? !isHidden : isHidden) return false;
    const statusMatch = selectedFilter === 'all' || enquiry.status === selectedFilter;
    const workshopMatch = selectedWorkshop === 'all' || enquiry.workshopName === selectedWorkshop;
    const searchMatch = searchTerm === '' ||
      enquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.mobile.includes(searchTerm) ||
      enquiry.city.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && workshopMatch && searchMatch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'registered': return 'bg-swar-primary-light text-swar-primary';
      default: return 'bg-swar-primary-light text-swar-text';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const MODE_LABELS: Record<string, string> = { online: 'Online', offline: 'Offline', residential: 'Residential', recorded: 'Recorded' };
  const MODE_ICONS: Record<string, string> = { online: '💻', offline: '📍', residential: '🏡', recorded: '🎥' };

  return (
    <div className="flex min-h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={true} onClose={() => {}} />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-swar-text mb-1">Workshop Enquiries</h1>
              <p className="text-swar-text-secondary">
                Total Enquiries: <span className="font-semibold">{enquiries.length}</span>
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2d6a4f] text-white rounded-xl font-semibold text-sm hover:bg-[#1b4332] transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Form
            </button>
          </div>

          {/* ── Shareable Forms Section ── */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <button
              onClick={() => setFormsCollapsed(!formsCollapsed)}
              className="w-full flex items-center justify-between mb-0 group"
            >
              <h2 className="text-lg font-bold text-swar-text flex items-center gap-2">
                <Link2 size={18} className="text-[#2d6a4f]" />
                Shareable Forms
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-swar-text-secondary">{forms.filter(f => f.isActive).length} active</span>
                {formsCollapsed ? <ChevronDown size={18} className="text-swar-text-secondary group-hover:text-swar-text" /> : <ChevronUp size={18} className="text-swar-text-secondary group-hover:text-swar-text" />}
              </div>
            </button>

            {!formsCollapsed && (
            <div className="mt-4">
            {formsLoading ? (
              <p className="text-sm text-swar-text-secondary py-2">Loading…</p>
            ) : forms.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-swar-text-secondary text-sm mb-2">No forms yet</p>
                <button onClick={openCreateForm} className="text-[#2d6a4f] font-semibold text-sm hover:underline">
                  + Create your first form
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div key={form.formId} className={`flex items-center gap-4 p-4 rounded-xl border ${form.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-swar-text text-sm truncate">{form.workshopName}</span>
                        <span className="text-xs bg-[#2d6a4f]/10 text-[#2d6a4f] px-2 py-0.5 rounded-full">
                          {MODE_ICONS[form.workshopMode]} {MODE_LABELS[form.workshopMode] || form.workshopMode}
                        </span>
                        {!form.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-xs text-swar-text-secondary mt-0.5 flex items-center gap-3">
                        {form.workshopDate && <span>📅 {form.workshopDate}</span>}
                        {form.workshopTime && <span>🕐 {form.workshopTime}</span>}
                        {form.price ? <span className="font-semibold text-[#2d6a4f]">💰 {form.currency || 'INR'} {form.price}</span> : <span className="text-gray-400">Free</span>}
                        {form.groupLink ? <span title="WhatsApp group link set">👥 Group</span> : null}
                        <span>{form.submissionCount || 0} submissions</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://swaryoga.com'}/workshop-join/{form.formId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => broadcastForm(form, 'qr')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"
                        title="Broadcast this form's submissions via QR WhatsApp"
                      >
                        <QrCode size={12} /> QR
                      </button>
                      <button
                        onClick={() => broadcastForm(form, 'meta')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25D366]/10 text-[#1ebe5d] hover:bg-[#25D366]/20 transition-all"
                        title="Broadcast this form's submissions via Meta WhatsApp"
                      >
                        <Send size={12} /> Meta
                      </button>
                      <button
                        onClick={() => copyLink(form.formId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          copiedId === form.formId
                            ? 'bg-green-100 text-green-700'
                            : 'bg-[#2d6a4f]/10 text-[#2d6a4f] hover:bg-[#2d6a4f]/20'
                        }`}
                      >
                        {copiedId === form.formId ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
                      </button>
                      <button
                        onClick={() => openEditForm(form)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                        title="Edit form"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      {form.isActive && (
                        <button
                          onClick={() => deactivateForm(form.formId)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Deactivate form"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            )}
          </div>

          {/* ── Received Forms Section ── */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <button
              onClick={() => setSubmissionsCollapsed(!submissionsCollapsed)}
              className="w-full flex items-center justify-between group"
            >
              <h2 className="text-lg font-bold text-swar-text flex items-center gap-2">
                <Eye size={18} className="text-[#2d6a4f]" />
                Received Forms
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-swar-text-secondary">{enquiries.length} total</span>
                {submissionsCollapsed ? <ChevronDown size={18} className="text-swar-text-secondary group-hover:text-swar-text" /> : <ChevronUp size={18} className="text-swar-text-secondary group-hover:text-swar-text" />}
              </div>
            </button>
          </div>

          {!submissionsCollapsed && (
          <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Search by name, mobile, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="registered">Registered</option>
              </select>
              <select
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Workshops</option>
                {workshops.map((ws) => <option key={ws} value={ws}>{ws}</option>)}
              </select>
              <button
                onClick={fetchEnquiries}
                className="px-4 py-2 bg-swar-primary text-white rounded-lg hover:bg-swar-primary-hover transition-colors"
              >
                Refresh
              </button>
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm text-swar-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-swar-primary" />
              Show hidden ({hiddenCount})
            </label>
          </div>

          {/* Enquiries Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-swar-text-secondary">Loading enquiries...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-8 text-center">
              <p className="text-swar-primary">{error}</p>
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-swar-text-secondary">No enquiries found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="block md:hidden space-y-4 p-4">
                {filteredEnquiries.map((enquiry) => (
                  <div key={enquiry.id} className="border border-swar-border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-swar-text">{enquiry.name}</h3>
                        <p className="text-sm text-swar-text-secondary">{enquiry.workshopName}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(enquiry.status)}`}>
                        {enquiry.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-swar-text-secondary"><Phone className="w-4 h-4" />{enquiry.mobile}</div>
                      <div className="flex items-center gap-2 text-swar-text-secondary"><MapPin className="w-4 h-4" />{enquiry.city} • {enquiry.gender}</div>
                      <div className="text-xs text-swar-text-secondary">{formatDate(enquiry.submittedAt)}</div>
                    </div>
                    <select
                      value={enquiry.status}
                      onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-swar-border rounded mb-2 focus:outline-none"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="registered">Registered</option>
                    </select>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => openInMeta(enquiry)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm text-white bg-[#25D366] hover:bg-[#1ebe5d] font-semibold py-2 rounded-lg transition-colors"
                      >
                        <MessageCircle size={14} /> Meta
                      </button>
                      <button
                        onClick={() => openInQR(enquiry)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm text-white bg-[#128C7E] hover:bg-[#0e6b60] font-semibold py-2 rounded-lg transition-colors"
                      >
                        <QrCode size={14} /> QR
                      </button>
                      <button
                        onClick={() => toggleBroadcastMark(enquiry)}
                        disabled={togglingMark === enquiry.id}
                        title={(enquiry.labels || []).includes(broadcastGroupLabel(enquiry.workshopId)) ? 'Marked for bulk broadcast — click to remove' : 'Mark for bulk broadcast'}
                        className={`flex items-center justify-center w-10 h-full rounded-lg transition-colors py-2 disabled:opacity-50 text-xl font-bold leading-none ${
                          (enquiry.labels || []).includes(broadcastGroupLabel(enquiry.workshopId))
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => copyCertLink(enquiry)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-purple-700 font-medium py-1 mb-1"
                    >
                      {copiedCertId === enquiry.id ? <><Check size={14} /> Copied!</> : <><Link2 size={14} /> Copy Certificate Link</>}
                    </button>
                    <button onClick={() => openEdit(enquiry)} className="w-full flex items-center justify-center gap-1.5 text-sm text-swar-primary font-medium py-1 mb-1"><Pencil size={14} /> Edit</button>
                    <button
                      onClick={() => toggleHide(enquiry)}
                      disabled={togglingHide === enquiry.id}
                      className="w-full flex items-center justify-center gap-1.5 text-sm text-swar-text-secondary font-medium py-1 mb-1 disabled:opacity-50"
                    >
                      {(enquiry.labels || []).includes(HIDE_LABEL)
                        ? <><ArchiveRestore size={14} /> Unhide</>
                        : <><Archive size={14} /> Hide</>}
                    </button>
                    <button onClick={() => handleDelete(enquiry.id)} className="w-full text-sm text-red-600 hover:text-swar-primary font-medium py-1">Delete</button>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-swar-bg border-b border-swar-border">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Workshop</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnquiries.map((enquiry) => (
                      <React.Fragment key={enquiry.id}>
                        <tr className="border-b border-swar-border hover:bg-swar-bg">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-swar-text">{enquiry.name}</div>
                            <div className="text-sm text-swar-text-secondary">{enquiry.gender}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-swar-text-secondary" />
                              <a href={`tel:${enquiry.mobile}`} className="text-primary-600 hover:underline">{enquiry.mobile}</a>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-swar-text">
                              <MapPin className="w-4 h-4 text-swar-text-secondary" />
                              {enquiry.city}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-swar-text">{enquiry.workshopName}</td>
                          <td className="px-6 py-4 text-sm text-swar-text-secondary">{formatDate(enquiry.submittedAt)}</td>
                          <td className="px-6 py-4">
                            <select
                              value={enquiry.status}
                              onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                              className={`px-3 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer ${getStatusBadgeColor(enquiry.status)}`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="registered">Registered</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openInMeta(enquiry)}
                                title="Open in Meta WhatsApp inbox"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                <MessageCircle size={13} /> Chat
                              </button>
                              <button
                                onClick={() => openInQR(enquiry)}
                                title="Open in QR WhatsApp inbox"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#128C7E] hover:bg-[#0e6b60] text-white rounded-lg text-xs font-semibold transition-colors"
                              >
                                <QrCode size={13} /> QR
                              </button>
                              <button
                                onClick={() => toggleBroadcastMark(enquiry)}
                                disabled={togglingMark === enquiry.id}
                                title={(enquiry.labels || []).includes(broadcastGroupLabel(enquiry.workshopId)) ? 'Marked for bulk broadcast — click to remove' : 'Mark for bulk broadcast'}
                                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-50 text-lg font-bold leading-none ${
                                  (enquiry.labels || []).includes(broadcastGroupLabel(enquiry.workshopId))
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                              >
                                +
                              </button>
                              <button
                                onClick={() => copyCertLink(enquiry)}
                                title="Copy Certificate Details link"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
                              >
                                {copiedCertId === enquiry.id ? <><Check size={13} /> Copied!</> : <><Link2 size={13} /> Cert</>}
                              </button>
                              <button
                                onClick={() => openEdit(enquiry)}
                                title="Edit name / mobile"
                                className="text-swar-text-secondary hover:text-swar-primary"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setExpandedRow(expandedRow === enquiry.id ? null : enquiry.id)}
                                className="text-swar-text-secondary hover:text-swar-text"
                              >
                                {expandedRow === enquiry.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => toggleHide(enquiry)}
                                disabled={togglingHide === enquiry.id}
                                title={(enquiry.labels || []).includes(HIDE_LABEL) ? 'Unhide — show in main list again' : 'Hide — remove from main list (unwanted)'}
                                className="text-swar-text-secondary hover:text-swar-primary disabled:opacity-50"
                              >
                                {(enquiry.labels || []).includes(HIDE_LABEL) ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDelete(enquiry.id)} className="text-red-600 hover:text-red-800">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRow === enquiry.id && (
                          <tr className="bg-swar-bg border-b border-swar-border">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="text-sm">
                                <p className="text-swar-text-secondary mb-2"><strong>ID:</strong> {enquiry.id}</p>
                                <p className="text-swar-text-secondary"><strong>Notes:</strong> {enquiry.notes || 'No notes'}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </>
          )}

          {/* ── Edit Enquiry Modal (name / mobile) ── */}
          {editEnquiry && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !savingEdit && setEditEnquiry(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-swar-border">
                  <h3 className="text-lg font-bold text-swar-text">Edit Enquiry</h3>
                  <button onClick={() => setEditEnquiry(null)} className="text-swar-text-secondary hover:text-swar-text text-xl leading-none">×</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-swar-text-secondary uppercase mb-1">Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swar-primary/40"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-swar-text-secondary uppercase mb-1">Mobile Number</label>
                    <input
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-swar-primary/40"
                      placeholder="919812345678"
                    />
                    <p className="text-[11px] text-swar-text-secondary mt-1">Include country code (e.g. 91 for India).</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-swar-border">
                  <button onClick={() => setEditEnquiry(null)} disabled={savingEdit} className="px-4 py-2 text-sm border border-swar-border rounded-lg hover:bg-swar-bg font-medium disabled:opacity-40">Cancel</button>
                  <button onClick={handleEditSave} disabled={savingEdit} className="px-4 py-2 text-sm bg-swar-primary text-white rounded-lg hover:bg-swar-primary-dark font-semibold disabled:opacity-40">
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {enquiries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{enquiries.filter((e) => e.status === 'new').length}</div>
                <p className="text-swar-text-secondary mt-2">New Enquiries</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">{enquiries.filter((e) => e.status === 'contacted').length}</div>
                <p className="text-swar-text-secondary mt-2">Contacted</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-swar-primary">{enquiries.filter((e) => e.status === 'registered').length}</div>
                <p className="text-swar-text-secondary mt-2">Registered</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-swar-text">{editingFormId ? 'Edit Shareable Form' : 'Create Shareable Form'}</h2>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {formSaveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{formSaveError}</div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Workshop Name *</label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Swar Yoga Basic Workshop"
                  className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={newWsDate}
                    onChange={(e) => setNewWsDate(e.target.value)}
                    placeholder="e.g. 20 Jan 2026"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={newWsTime}
                    onChange={(e) => setNewWsTime(e.target.value)}
                    placeholder="e.g. 7:00 PM IST"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price <span className="font-normal text-gray-400">(0 = free)</span></label>
                  <input
                    type="number"
                    min="0"
                    value={newWsPrice}
                    onChange={(e) => setNewWsPrice(e.target.value)}
                    placeholder="e.g. 999"
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                  <select
                    value={newWsCurrency}
                    onChange={(e) => setNewWsCurrency(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 bg-white"
                  >
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="NPR">रू NPR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp Group Link <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="url"
                  value={newWsGroupLink}
                  onChange={(e) => setNewWsGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/…"
                  className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                />
                <p className="text-xs text-gray-400 mt-1">Shown as a “Join WhatsApp Group” button after the user submits.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'online', label: '💻 Online' },
                    { value: 'offline', label: '📍 Offline' },
                    { value: 'residential', label: '🏡 Residential' },
                    { value: 'recorded', label: '🎥 Recorded' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setNewWsMode(m.value)}
                      className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                        newWsMode === m.value
                          ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d6a4f]/40'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Workshop Image <span className="font-normal text-gray-400">(optional)</span></label>
                {newWsImage ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={newWsImage} alt="preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewWsImage('')}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imageUploading ? 'border-[#2d6a4f]/40 bg-green-50' : 'border-gray-200 hover:border-[#2d6a4f]/50 hover:bg-green-50/50'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                    {imageUploading ? (
                      <><LoaderIcon className="animate-spin text-[#2d6a4f] mb-2" size={24} /><span className="text-sm text-[#2d6a4f]">Uploading…</span></>
                    ) : (
                      <><ImagePlus className="text-gray-400 mb-2" size={24} /><span className="text-sm text-gray-500">Click to upload image</span><span className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP</span></>
                    )}
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="Short description shown on the form..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeFormModal}
                className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveNewForm}
                disabled={savingForm || !newWsName.trim()}
                className="px-5 py-2 rounded-lg bg-[#2d6a4f] text-sm font-bold text-white hover:bg-[#1b4332] disabled:opacity-60 flex items-center gap-2"
              >
                {savingForm
                  ? (editingFormId ? 'Saving…' : 'Creating…')
                  : (editingFormId ? <><Check size={14} /> Save Changes</> : <><Plus size={14} /> Create Form</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
