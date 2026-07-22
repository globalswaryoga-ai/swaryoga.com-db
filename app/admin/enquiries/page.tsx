'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Phone, MapPin, Trash2, Eye, EyeOff, Plus, Copy, Check, X, ImagePlus, Loader as LoaderIcon, MessageCircle, Pencil, Send, QrCode, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react';
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
  timeSlot?: { label: string; groupLink: string } | null;
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
  feeOptions?: { label: string; price: number }[];
  groupLink?: string;
  timeSlots?: { label: string; groupLink: string }[];
  isActive: boolean;
  submissionCount: number;
  createdAt: string;
}

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [forms, setForms] = useState<EnquiryForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  // Which form card's submissions are expanded (form cards section)
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  // Which enquiry row is expanded (show notes/id)
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Received Forms section — grouped accordion state
  const [receivedOpen, setReceivedOpen] = useState(true);           // whole section open/close
  const [openWorkshopGroups, setOpenWorkshopGroups] = useState<Record<string, boolean>>({});
  const [wsSearchTerm, setWsSearchTerm] = useState('');
  const [wsStatusFilter, setWsStatusFilter] = useState<'all' | 'new' | 'contacted' | 'registered'>('all');

  // New/edit form fields
  const [newWsName, setNewWsName] = useState('');
  const [newWsDate, setNewWsDate] = useState('');
  const [newWsTime, setNewWsTime] = useState('');
  const [newWsMode, setNewWsMode] = useState('online');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [newWsImage, setNewWsImage] = useState('');
  const [newWsCurrency, setNewWsCurrency] = useState('INR');
  const [newWsFeeOptions, setNewWsFeeOptions] = useState<{ label: string; price: string }[]>([{ label: '', price: '' }]);
  const [newWsGroupLink, setNewWsGroupLink] = useState('');
  const [newWsTimeSlots, setNewWsTimeSlots] = useState<{ label: string; groupLink: string }[]>([{ label: '', groupLink: '' }]);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formSaveError, setFormSaveError] = useState('');

  // Edit enquiry
  const [editEnquiry, setEditEnquiry] = useState<Enquiry | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingHide, setTogglingHide] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [broadcasting, setBroadcasting] = useState<string | null>(null);

  const HIDE_LABEL = 'enquiry-hidden';

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getToken = () =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '')
      : '';

  useEffect(() => {
    fetchEnquiries();
    fetchForms();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/enquiries', { headers: getAuthHeaders() });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error || b?.message || `Failed to fetch enquiries (${res.status})`);
      }
      const data = await res.json();
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

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    setFormSaveError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = getToken();
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

  const closeFormModal = () => {
    setShowAddForm(false);
    setEditingFormId(null);
    setFormSaveError('');
    setNewWsName(''); setNewWsDate(''); setNewWsTime(''); setNewWsMode('online');
    setNewWsDesc(''); setNewWsImage(''); setNewWsFeeOptions([{ label: '', price: '' }]); setNewWsCurrency('INR'); setNewWsGroupLink('');
    setNewWsTimeSlots([{ label: '', groupLink: '' }]);
  };

  const openCreateForm = () => {
    setEditingFormId(null);
    setNewWsName(''); setNewWsDate(''); setNewWsTime(''); setNewWsMode('online');
    setNewWsDesc(''); setNewWsImage(''); setNewWsFeeOptions([{ label: '', price: '' }]); setNewWsCurrency('INR'); setNewWsGroupLink('');
    setNewWsTimeSlots([{ label: '', groupLink: '' }]);
    setFormSaveError('');
    setShowAddForm(true);
  };

  const openEditForm = (form: EnquiryForm) => {
    setEditingFormId(form.formId);
    setNewWsName(form.workshopName || '');
    setNewWsDate(form.workshopDate || '');
    setNewWsTime(form.workshopTime || '');
    setNewWsMode(form.workshopMode || 'online');
    setNewWsDesc(form.description || '');
    setNewWsImage(form.workshopImage || '');
    // Migrate an old single-price form into one repeater row so editing it
    // doesn't silently drop the existing price.
    const existingFees = form.feeOptions && form.feeOptions.length
      ? form.feeOptions.map((f) => ({ label: f.label || '', price: String(f.price ?? '') }))
      : form.price
        ? [{ label: 'Fee', price: String(form.price) }]
        : [{ label: '', price: '' }];
    setNewWsFeeOptions(existingFees);
    setNewWsCurrency(form.currency || 'INR');
    setNewWsGroupLink(form.groupLink || '');
    // Migrate an old single groupLink form into one repeater row so editing it
    // doesn't silently drop the existing group link.
    const existingTimeSlots = form.timeSlots && form.timeSlots.length
      ? form.timeSlots.map((t) => ({ label: t.label || '', groupLink: t.groupLink || '' }))
      : form.groupLink
        ? [{ label: '', groupLink: form.groupLink }]
        : [{ label: '', groupLink: '' }];
    setNewWsTimeSlots(existingTimeSlots);
    setFormSaveError('');
    setShowAddForm(true);
  };

  const addFeeOptionRow = () => setNewWsFeeOptions((prev) => [...prev, { label: '', price: '' }]);
  const removeFeeOptionRow = (idx: number) => setNewWsFeeOptions((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  const updateFeeOptionRow = (idx: number, field: 'label' | 'price', value: string) =>
    setNewWsFeeOptions((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const addTimeSlotRow = () => setNewWsTimeSlots((prev) => [...prev, { label: '', groupLink: '' }]);
  const removeTimeSlotRow = (idx: number) => setNewWsTimeSlots((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  const updateTimeSlotRow = (idx: number, field: 'label' | 'groupLink', value: string) =>
    setNewWsTimeSlots((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const saveNewForm = async () => {
    if (!newWsName.trim()) { setFormSaveError('Workshop name is required'); return; }
    setSavingForm(true);
    setFormSaveError('');
    try {
      const feeOptions = newWsFeeOptions
        .map((f) => ({ label: f.label.trim(), price: Math.max(0, Number(f.price) || 0) }))
        .filter((f) => f.label || f.price > 0);
      const timeSlots = newWsTimeSlots
        .map((t) => ({ label: t.label.trim(), groupLink: t.groupLink.trim() }))
        .filter((t) => t.label || t.groupLink);
      const payload = {
        workshopName: newWsName.trim(),
        workshopDate: newWsDate,
        workshopTime: newWsTime,
        workshopMode: newWsMode,
        description: newWsDesc.trim(),
        workshopImage: newWsImage,
        feeOptions,
        currency: newWsCurrency || 'INR',
        groupLink: newWsGroupLink.trim(),
        timeSlots,
      };
      if (editingFormId) {
        const res = await fetch(`/api/admin/enquiry-forms?id=${editingFormId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update form');
        setForms((prev) => prev.map((f) => f.formId === editingFormId ? { ...f, ...(data.form || payload) } : f));
      } else {
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
    if (!confirm('Delete this enquiry?')) return;
    try {
      const res = await fetch(`/api/admin/enquiries?id=${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to delete enquiry');
      setEnquiries(enquiries.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

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
      const res = await fetch(`/api/admin/enquiries?id=${editEnquiry.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, mobile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to update enquiry');
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
      const res = await fetch(`/api/admin/enquiries?id=${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setEnquiries(enquiries.map((e) => e.id === id ? { ...e, status: newStatus as Enquiry['status'] } : e));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const ensureLeadAndToggleLabel = async (enquiry: Enquiry, label: string, _updateDB: boolean): Promise<string> => {
    if (enquiry.leadId) {
      const res = await fetch(`/api/admin/crm/leads/${enquiry.leadId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ addLabels: [label] }),
      });
      if (!res.ok) throw new Error('Failed to update lead labels');
      return enquiry.leadId;
    }
    const digits = enquiry.mobile.replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const res = await fetch('/api/admin/crm/leads', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: enquiry.name,
        phoneNumber: phone,
        status: 'lead',
        source: 'enquiry',
        workshopName: enquiry.workshopName,
        labels: ['enquiry', label],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 409 && err.duplicate && err.existingLead?._id) {
        const id = err.existingLead._id;
        await fetch(`/api/admin/crm/leads/${id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ addLabels: [label] }),
        });
        return id;
      }
      throw new Error(err.error || 'Failed to create lead');
    }
    const data = await res.json();
    return data.data?._id || data.data?.id;
  };

  const openInMeta = async (enquiry: Enquiry) => {
    const digits = enquiry.mobile.replace(/\D/g, '');
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

  const openInQR = async (enquiry: Enquiry) => {
    const digits = enquiry.mobile.replace(/\D/g, '');
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
    router.push(`/admin/crm/qr?${params.toString()}`)
  };

  const toggleHide = async (enquiry: Enquiry) => {
    const hidden = (enquiry.labels || []).includes(HIDE_LABEL);
    setTogglingHide(enquiry.id);
    try {
      const token = getToken();
      let leadId = enquiry.leadId;
      if (!leadId) {
        const res = await fetch('/api/admin/crm/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ phoneNumber: enquiry.mobile, name: enquiry.name, labels: ['enquiry'], source: 'website' }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.data?._id) leadId = data.data._id;
        else if (res.status === 409 && data?.existingLead?._id) leadId = data.existingLead._id;
        else throw new Error(data?.error || 'Failed to create lead');
      }
      const patchRes = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(hidden ? { removeLabels: [HIDE_LABEL] } : { addLabels: [HIDE_LABEL] }),
      });
      if (!patchRes.ok) throw new Error('Failed to update lead');
      setEnquiries((prev) => prev.map((e) => {
        if (e.id !== enquiry.id) return e;
        const labels = e.labels || [];
        return { ...e, leadId, labels: hidden ? labels.filter((l) => l !== HIDE_LABEL) : [...labels, HIDE_LABEL] };
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update hidden state');
    } finally {
      setTogglingHide(null);
    }
  };

  // Broadcast all enquiries of a form — auto-creates CRM leads for any that don't have one yet
  const broadcastForm = async (form: EnquiryForm, channel: 'qr' | 'meta') => {
    const formEnquiries = enquiries.filter((e) => e.workshopId === form.formId);
    if (formEnquiries.length === 0) {
      alert('No submissions for this form yet.');
      return;
    }
    setBroadcasting(`${form.formId}-${channel}`);
    try {
      const token = getToken();
      const leadIds: string[] = [];

      for (const enq of formEnquiries) {
        let leadId = enq.leadId;
        if (!leadId) {
          const res = await fetch('/api/admin/crm/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              phoneNumber: enq.mobile,
              name: enq.name,
              labels: ['enquiry', `workshop:${form.formId}`],
              source: 'website',
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.data?._id) leadId = data.data._id;
          else if (res.status === 409 && data?.existingLead?._id) leadId = data.existingLead._id;
        }
        if (leadId) leadIds.push(leadId);
      }

      if (leadIds.length === 0) {
        alert('Could not resolve any CRM leads. Try again.');
        return;
      }

      const path = channel === 'qr' ? '/admin/crm/qr-broadcast' : '/admin/crm/broadcast';
      router.push(`${path}?leadIds=${leadIds.join(',')}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setBroadcasting(null);
    }
  };

  const hiddenCount = enquiries.filter((e) => (e.labels || []).includes(HIDE_LABEL)).length;

  const getFormEnquiries = (formId: string) =>
    enquiries.filter((e) => {
      if (e.workshopId !== formId) return false;
      const isHidden = (e.labels || []).includes(HIDE_LABEL);
      return showHidden ? !isHidden : !isHidden;
    });

  // Group ALL enquiries by workshopName for the Received Forms accordion
  const workshopGroups = useMemo(() => {
    const visible = enquiries.filter((e) => {
      const isHidden = (e.labels || []).includes(HIDE_LABEL);
      if (showHidden ? isHidden : !isHidden) return false;
      if (wsStatusFilter !== 'all' && e.status !== wsStatusFilter) return false;
      if (wsSearchTerm.trim()) {
        const q = wsSearchTerm.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.mobile.includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.workshopName.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const map: Record<string, Enquiry[]> = {};
    for (const e of visible) {
      const key = e.workshopName || 'Unknown Workshop';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    // Sort groups by count descending
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [enquiries, showHidden, wsStatusFilter, wsSearchTerm]);

  const totalVisible = useMemo(
    () => enquiries.filter((e) => !(e.labels || []).includes(HIDE_LABEL)).length,
    [enquiries]
  );

  const toggleWorkshopGroup = (name: string) =>
    setOpenWorkshopGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'registered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const MODE_LABELS: Record<string, string> = { online: 'Online', offline: 'Offline', residential: 'Residential', recorded: 'Recorded' };
  const MODE_ICONS: Record<string, string> = { online: '💻', offline: '📍', residential: '🏡', recorded: '🎥' };

  return (
    <div className="flex min-h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={true} onClose={() => {}} />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-swar-text mb-1">Workshop Enquiries</h1>
              <p className="text-swar-text-secondary text-sm">
                {forms.filter(f => f.isActive).length} active forms · {enquiries.length} total submissions
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

          {/* Unified Forms List */}
          {formsLoading ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center text-swar-text-secondary text-sm">Loading…</div>
          ) : forms.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-10 text-center border-2 border-dashed border-gray-200">
              <p className="text-swar-text-secondary text-sm mb-3">No forms yet</p>
              <button onClick={openCreateForm} className="text-[#2d6a4f] font-semibold text-sm hover:underline">
                + Create your first form
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => {
                const formEnquiries = getFormEnquiries(form.formId);
                const isExpanded = expandedFormId === form.formId;
                const isBroadcasting = (ch: 'qr' | 'meta') => broadcasting === `${form.formId}-${ch}`;

                return (
                  <div key={form.formId} className={`bg-white rounded-xl shadow-md overflow-hidden border ${form.isActive ? 'border-gray-100' : 'border-gray-100 opacity-70'}`}>

                    {/* Form Card Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5">

                      {/* Workshop name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-swar-text text-base">{form.workshopName}</span>
                          <span className="text-xs bg-[#2d6a4f]/10 text-[#2d6a4f] px-2 py-0.5 rounded-full font-medium">
                            {MODE_ICONS[form.workshopMode]} {MODE_LABELS[form.workshopMode] || form.workshopMode}
                          </span>
                          {!form.isActive && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                        </div>
                        {(form.workshopDate || form.workshopTime) && (
                          <div className="text-xs text-swar-text-secondary mt-0.5 flex items-center gap-2">
                            {form.workshopDate && <span>📅 {form.workshopDate}</span>}
                            {form.workshopTime && <span>🕐 {form.workshopTime}</span>}
                          </div>
                        )}
                      </div>

                      {/* Total count badge */}
                      <div className="flex items-center shrink-0">
                        <div className="text-center px-3 py-1.5 bg-swar-primary-light rounded-lg">
                          <div className="text-lg font-bold text-swar-text leading-none">{formEnquiries.length}</div>
                          <div className="text-[10px] text-swar-text-secondary uppercase tracking-wide">forms</div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* Bulk send buttons */}
                        <button
                          onClick={() => broadcastForm(form, 'meta')}
                          disabled={isBroadcasting('meta') || formEnquiries.length === 0}
                          title="Bulk send to all submissions via Meta WhatsApp"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#25D366]/10 text-[#1ebe5d] hover:bg-[#25D366]/20 transition-all disabled:opacity-50"
                        >
                          {isBroadcasting('meta') ? <LoaderIcon size={12} className="animate-spin" /> : <Send size={12} />}
                          Meta
                        </button>
                        <button
                          onClick={() => broadcastForm(form, 'qr')}
                          disabled={isBroadcasting('qr') || formEnquiries.length === 0}
                          title="Bulk send to all submissions via QR WhatsApp"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all disabled:opacity-50"
                        >
                          {isBroadcasting('qr') ? <LoaderIcon size={12} className="animate-spin" /> : <QrCode size={12} />}
                          QR
                        </button>

                        {/* View toggle */}
                        <button
                          onClick={() => setExpandedFormId(isExpanded ? null : form.formId)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isExpanded
                              ? 'bg-swar-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          View
                        </button>

                        {/* Copy link */}
                        <button
                          onClick={() => copyLink(form.formId)}
                          title="Copy shareable link"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            copiedId === form.formId
                              ? 'bg-green-100 text-green-700'
                              : 'bg-[#2d6a4f]/10 text-[#2d6a4f] hover:bg-[#2d6a4f]/20'
                          }`}
                        >
                          {copiedId === form.formId ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Link</>}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => openEditForm(form)}
                          title="Edit form"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                        >
                          <Pencil size={12} /> Edit
                        </button>

                        {/* Delete */}
                        {form.isActive && (
                          <button
                            onClick={() => deactivateForm(form.formId)}
                            title="Deactivate form"
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Submissions */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {/* Hidden toggle */}
                        <div className="flex items-center justify-between px-5 py-2 bg-gray-50 border-b border-gray-100">
                          <span className="text-xs text-swar-text-secondary font-semibold uppercase tracking-wide">
                            Submissions ({formEnquiries.length})
                          </span>
                          <label className="flex items-center gap-1.5 text-xs text-swar-text-secondary cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showHidden}
                              onChange={(e) => setShowHidden(e.target.checked)}
                              className="accent-swar-primary"
                            />
                            Show hidden ({hiddenCount})
                          </label>
                        </div>

                        {loading ? (
                          <div className="p-6 text-center text-sm text-swar-text-secondary">Loading submissions…</div>
                        ) : formEnquiries.length === 0 ? (
                          <div className="p-8 text-center text-sm text-swar-text-secondary">No submissions yet for this form.</div>
                        ) : (
                          <>
                            {/* Mobile cards */}
                            <div className="block md:hidden space-y-3 p-4">
                              {formEnquiries.map((enquiry) => (
                                <div key={enquiry.id} className="border border-swar-border rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h3 className="font-semibold text-swar-text text-sm">{enquiry.name}</h3>
                                      <p className="text-xs text-swar-text-secondary">{enquiry.city} · {enquiry.gender}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(enquiry.status)}`}>
                                      {enquiry.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-swar-text-secondary mb-2">
                                    <Phone className="w-3 h-3" />{enquiry.mobile}
                                  </div>
                                  <div className="text-[11px] text-swar-text-secondary mb-3">{formatDate(enquiry.submittedAt)}</div>
                                  <select
                                    value={enquiry.status}
                                    onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-swar-border rounded mb-2 focus:outline-none"
                                  >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="registered">Registered</option>
                                  </select>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => openInMeta(enquiry)} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-[#25D366] hover:bg-[#1ebe5d] font-semibold py-1.5 rounded-lg">
                                      <MessageCircle size={11} /> Meta
                                    </button>
                                    <button onClick={() => openInQR(enquiry)} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-[#128C7E] hover:bg-[#0e6b60] font-semibold py-1.5 rounded-lg">
                                      <QrCode size={11} /> QR
                                    </button>
                                    <button onClick={() => openEdit(enquiry)} className="p-1.5 text-swar-text-secondary hover:text-swar-primary"><Pencil size={13} /></button>
                                    <button onClick={() => toggleHide(enquiry)} disabled={togglingHide === enquiry.id} className="p-1.5 text-swar-text-secondary hover:text-swar-primary disabled:opacity-50">
                                      {(enquiry.labels || []).includes(HIDE_LABEL) ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                                    </button>
                                    <button onClick={() => handleDelete(enquiry.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Name</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Contact</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Location</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Submitted</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Status</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-swar-text-secondary uppercase">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {formEnquiries.map((enquiry) => (
                                    <React.Fragment key={enquiry.id}>
                                      <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-5 py-3">
                                          <div className="font-semibold text-swar-text">{enquiry.name}</div>
                                          <div className="text-xs text-swar-text-secondary">{enquiry.gender}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-swar-text-secondary" />
                                            <a href={`tel:${enquiry.mobile}`} className="text-primary-600 hover:underline">{enquiry.mobile}</a>
                                          </div>
                                        </td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-1.5 text-swar-text">
                                            <MapPin className="w-3.5 h-3.5 text-swar-text-secondary" />
                                            {enquiry.city}
                                          </div>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-swar-text-secondary whitespace-nowrap">{formatDate(enquiry.submittedAt)}</td>
                                        <td className="px-5 py-3">
                                          <select
                                            value={enquiry.status}
                                            onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                                            className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${getStatusBadgeColor(enquiry.status)}`}
                                          >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="registered">Registered</option>
                                          </select>
                                        </td>
                                        <td className="px-5 py-3">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => openInMeta(enquiry)}
                                              title="Open in Meta WhatsApp"
                                              className="flex items-center gap-1 px-2 py-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-xs font-semibold"
                                            >
                                              <MessageCircle size={11} /> Chat
                                            </button>
                                            <button
                                              onClick={() => openInQR(enquiry)}
                                              title="Open in QR WhatsApp"
                                              className="flex items-center gap-1 px-2 py-1 bg-[#128C7E] hover:bg-[#0e6b60] text-white rounded-lg text-xs font-semibold"
                                            >
                                              <QrCode size={11} /> QR
                                            </button>
                                            <button
                                              onClick={() => openEdit(enquiry)}
                                              title="Edit name / mobile"
                                              className="text-swar-text-secondary hover:text-swar-primary"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => setExpandedRow(expandedRow === enquiry.id ? null : enquiry.id)}
                                              className="text-swar-text-secondary hover:text-swar-text"
                                            >
                                              {expandedRow === enquiry.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                              onClick={() => toggleHide(enquiry)}
                                              disabled={togglingHide === enquiry.id}
                                              title={(enquiry.labels || []).includes(HIDE_LABEL) ? 'Unhide' : 'Hide'}
                                              className="text-swar-text-secondary hover:text-swar-primary disabled:opacity-50"
                                            >
                                              {(enquiry.labels || []).includes(HIDE_LABEL) ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => handleDelete(enquiry.id)} className="text-red-400 hover:text-red-600">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {expandedRow === enquiry.id && (
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                          <td colSpan={6} className="px-5 py-3">
                                            <div className="text-xs text-swar-text-secondary space-y-1">
                                              <p><strong>ID:</strong> {enquiry.id}</p>
                                              <p><strong>Notes:</strong> {enquiry.notes || 'No notes'}</p>
                                              <p>
                                                <strong>Time Slot:</strong> {enquiry.timeSlot?.label || '—'}
                                                {enquiry.timeSlot?.groupLink && (
                                                  <a href={enquiry.timeSlot.groupLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#2d6a4f] underline">
                                                    Group Link
                                                  </a>
                                                )}
                                              </p>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
          )}

          {/* ── RECEIVED FORMS (grouped accordion by workshop) ── */}
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">

            {/* Section header */}
            <button
              onClick={() => setReceivedOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[#2d6a4f]" />
                <span className="text-lg font-bold text-swar-text">Received Forms</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-swar-text-secondary font-semibold">{totalVisible} total</span>
                {receivedOpen ? <ChevronUp size={18} className="text-swar-text-secondary" /> : <ChevronDown size={18} className="text-swar-text-secondary" />}
              </div>
            </button>

            {receivedOpen && (
              <>
                {/* Filters */}
                <div className="px-5 pb-4 border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search by name, mobile, city or workshop…"
                    value={wsSearchTerm}
                    onChange={(e) => setWsSearchTerm(e.target.value)}
                    className="flex-1 rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold text-swar-text placeholder-swar-text-secondary focus:outline-none"
                  />
                  <select
                    value={wsStatusFilter}
                    onChange={(e) => setWsStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-swar-border bg-white px-4 py-2 text-sm font-semibold text-swar-text min-w-fit focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="registered">Registered</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-swar-text-secondary cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-swar-primary" />
                    Hidden ({hiddenCount})
                  </label>
                </div>

                {/* Grouped workshop accordion rows */}
                {loading ? (
                  <div className="px-5 py-8 text-center text-sm text-swar-text-secondary">Loading…</div>
                ) : workshopGroups.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-swar-text-secondary">No submissions found.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {workshopGroups.map(([workshopName, group]) => {
                      const isOpen = !!openWorkshopGroups[workshopName];
                      return (
                        <div key={workshopName}>
                          {/* Group header row */}
                          <button
                            onClick={() => toggleWorkshopGroup(workshopName)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#2d6a4f]/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-[#2d6a4f]">{group.length}</span>
                              </div>
                              <span className="font-bold text-swar-text text-sm text-left">{workshopName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-swar-text-secondary hidden sm:inline">
                                {group.filter(e => e.status === 'new').length} new ·{' '}
                                {group.filter(e => e.status === 'contacted').length} contacted ·{' '}
                                {group.filter(e => e.status === 'registered').length} registered
                              </span>
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${isOpen ? 'bg-swar-primary text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'}`}>
                                {isOpen ? <><ChevronUp size={12} /> Close</> : <><ChevronDown size={12} /> Open</>}
                              </span>
                            </div>
                          </button>

                          {/* Expanded submissions */}
                          {isOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/50">
                              {/* Desktop table */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Name</th>
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Contact</th>
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Location</th>
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Submitted</th>
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Status</th>
                                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-swar-text-secondary uppercase">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.map((enquiry) => (
                                      <React.Fragment key={enquiry.id}>
                                        <tr className="border-b border-gray-100 hover:bg-white transition">
                                          <td className="px-5 py-3">
                                            <div className="font-semibold text-swar-text">{enquiry.name}</div>
                                            <div className="text-xs text-swar-text-secondary">{enquiry.gender}</div>
                                          </td>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5">
                                              <Phone className="w-3.5 h-3.5 text-swar-text-secondary" />
                                              <a href={`tel:${enquiry.mobile}`} className="text-[#2d6a4f] hover:underline text-sm">{enquiry.mobile}</a>
                                            </div>
                                          </td>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-swar-text">
                                              <MapPin className="w-3.5 h-3.5 text-swar-text-secondary" />
                                              {enquiry.city}
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 text-xs text-swar-text-secondary whitespace-nowrap">{formatDate(enquiry.submittedAt)}</td>
                                          <td className="px-5 py-3">
                                            <select
                                              value={enquiry.status}
                                              onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                                              className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${getStatusBadgeColor(enquiry.status)}`}
                                            >
                                              <option value="new">New</option>
                                              <option value="contacted">Contacted</option>
                                              <option value="registered">Registered</option>
                                            </select>
                                          </td>
                                          <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                              <button onClick={() => openInMeta(enquiry)} title="Open in Meta WhatsApp" className="flex items-center gap-1 px-2 py-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg text-xs font-semibold">
                                                <MessageCircle size={11} /> Chat
                                              </button>
                                              <button onClick={() => openInQR(enquiry)} title="Open in QR WhatsApp" className="flex items-center gap-1 px-2 py-1 bg-[#128C7E] hover:bg-[#0e6b60] text-white rounded-lg text-xs font-semibold">
                                                <QrCode size={11} /> QR
                                              </button>
                                              <button onClick={() => openEdit(enquiry)} title="Edit" className="text-swar-text-secondary hover:text-swar-primary"><Pencil className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => setExpandedRow(expandedRow === enquiry.id ? null : enquiry.id)} className="text-swar-text-secondary hover:text-swar-text">
                                                {expandedRow === enquiry.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                              </button>
                                              <button onClick={() => toggleHide(enquiry)} disabled={togglingHide === enquiry.id} title={(enquiry.labels || []).includes(HIDE_LABEL) ? 'Unhide' : 'Hide'} className="text-swar-text-secondary hover:text-swar-primary disabled:opacity-50">
                                                {(enquiry.labels || []).includes(HIDE_LABEL) ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                              </button>
                                              <button onClick={() => handleDelete(enquiry.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                          </td>
                                        </tr>
                                        {expandedRow === enquiry.id && (
                                          <tr className="bg-white border-b border-gray-100">
                                            <td colSpan={6} className="px-5 py-3 text-xs text-swar-text-secondary space-y-1">
                                              <p><strong>ID:</strong> {enquiry.id}</p>
                                              <p><strong>Notes:</strong> {enquiry.notes || 'No notes'}</p>
                                              <p>
                                                <strong>Time Slot:</strong> {enquiry.timeSlot?.label || '—'}
                                                {enquiry.timeSlot?.groupLink && (
                                                  <a href={enquiry.timeSlot.groupLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#2d6a4f] underline">
                                                    Group Link
                                                  </a>
                                                )}
                                              </p>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile cards */}
                              <div className="block md:hidden space-y-3 p-4">
                                {group.map((enquiry) => (
                                  <div key={enquiry.id} className="border border-swar-border rounded-lg p-4 bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h3 className="font-semibold text-swar-text text-sm">{enquiry.name}</h3>
                                        <p className="text-xs text-swar-text-secondary">{enquiry.city} · {enquiry.gender}</p>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(enquiry.status)}`}>{enquiry.status}</span>
                                    </div>
                                    <div className="text-xs text-swar-text-secondary mb-2 flex items-center gap-1.5"><Phone className="w-3 h-3" />{enquiry.mobile}</div>
                                    <div className="text-[11px] text-swar-text-secondary mb-3">{formatDate(enquiry.submittedAt)}</div>
                                    <select value={enquiry.status} onChange={(e) => handleStatusChange(enquiry.id, e.target.value)} className="w-full px-2 py-1 text-xs border border-swar-border rounded mb-2">
                                      <option value="new">New</option>
                                      <option value="contacted">Contacted</option>
                                      <option value="registered">Registered</option>
                                    </select>
                                    <div className="flex gap-2">
                                      <button onClick={() => openInMeta(enquiry)} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-[#25D366] font-semibold py-1.5 rounded-lg"><MessageCircle size={11} /> Meta</button>
                                      <button onClick={() => openInQR(enquiry)} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-[#128C7E] font-semibold py-1.5 rounded-lg"><QrCode size={11} /> QR</button>
                                      <button onClick={() => openEdit(enquiry)} className="p-1.5 text-swar-text-secondary hover:text-swar-primary"><Pencil size={13} /></button>
                                      <button onClick={() => toggleHide(enquiry)} disabled={togglingHide === enquiry.id} className="p-1.5 text-swar-text-secondary hover:text-swar-primary disabled:opacity-50">
                                        {(enquiry.labels || []).includes(HIDE_LABEL) ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                                      </button>
                                      <button onClick={() => handleDelete(enquiry.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          {/* ── END RECEIVED FORMS ── */}

        </div>
      </main>

      {/* Edit Enquiry Modal */}
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
              <button onClick={handleEditSave} disabled={savingEdit} className="px-4 py-2 text-sm bg-swar-primary text-white rounded-lg font-semibold disabled:opacity-40">
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-swar-text">{editingFormId ? 'Edit Form' : 'Create Form'}</h2>
              <button onClick={closeFormModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
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
                  <input type="text" value={newWsDate} onChange={(e) => setNewWsDate(e.target.value)} placeholder="e.g. 20 Jan 2026" className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                  <input type="text" value={newWsTime} onChange={(e) => setNewWsTime(e.target.value)} placeholder="e.g. 7:00 PM IST" className="w-full h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Fees <span className="font-normal text-gray-400">(leave blank/0 for free)</span></label>
                  <select value={newWsCurrency} onChange={(e) => setNewWsCurrency(e.target.value)} className="h-8 px-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 bg-white">
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="NPR">रू NPR</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {newWsFeeOptions.map((fee, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={fee.label}
                        onChange={(e) => updateFeeOptionRow(idx, 'label', e.target.value)}
                        placeholder="e.g. Early Bird"
                        className="flex-1 h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                      <input
                        type="number"
                        min="0"
                        value={fee.price}
                        onChange={(e) => updateFeeOptionRow(idx, 'price', e.target.value)}
                        placeholder="Amount"
                        className="w-28 h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeeOptionRow(idx)}
                        disabled={newWsFeeOptions.length === 1}
                        className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:border-gray-200 shrink-0"
                        title="Remove this fee option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addFeeOptionRow}
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#2d6a4f] hover:text-[#1b4332]"
                >
                  <Plus className="w-4 h-4" /> Add Fee Option
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Time Slots <span className="font-normal text-gray-400">(each with its own WhatsApp group — leave blank for a single default group)</span></label>
                <div className="space-y-2">
                  {newWsTimeSlots.map((slot, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={slot.label}
                        onChange={(e) => updateTimeSlotRow(idx, 'label', e.target.value)}
                        placeholder="e.g. Morning"
                        className="w-32 h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                      <input
                        type="url"
                        value={slot.groupLink}
                        onChange={(e) => updateTimeSlotRow(idx, 'groupLink', e.target.value)}
                        placeholder="https://chat.whatsapp.com/…"
                        className="flex-1 h-11 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeSlotRow(idx)}
                        disabled={newWsTimeSlots.length === 1}
                        className="w-11 h-11 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:border-gray-200 shrink-0"
                        title="Remove this time slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addTimeSlotRow}
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#2d6a4f] hover:text-[#1b4332]"
                >
                  <Plus className="w-4 h-4" /> Add Time Slot
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: 'online', label: '💻 Online' }, { value: 'offline', label: '📍 Offline' }, { value: 'residential', label: '🏡 Residential' }, { value: 'recorded', label: '🎥 Recorded' }].map((m) => (
                    <button key={m.value} type="button" onClick={() => setNewWsMode(m.value)} className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${newWsMode === m.value ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d6a4f]/40'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Workshop Image <span className="font-normal text-gray-400">(optional)</span></label>
                {newWsImage ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={newWsImage} alt="preview" className="w-full h-40 object-cover" />
                    <button type="button" onClick={() => setNewWsImage('')} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"><X size={14} /></button>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imageUploading ? 'border-[#2d6a4f]/40 bg-green-50' : 'border-gray-200 hover:border-[#2d6a4f]/50 hover:bg-green-50/50'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                    {imageUploading ? (<><LoaderIcon className="animate-spin text-[#2d6a4f] mb-2" size={24} /><span className="text-sm text-[#2d6a4f]">Uploading…</span></>) : (<><ImagePlus className="text-gray-400 mb-2" size={24} /><span className="text-sm text-gray-500">Click to upload image</span><span className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP</span></>)}
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={newWsDesc} onChange={(e) => setNewWsDesc(e.target.value)} placeholder="Short description shown on the form..." rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeFormModal} className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={saveNewForm} disabled={savingForm || !newWsName.trim()} className="px-5 py-2 rounded-lg bg-[#2d6a4f] text-sm font-bold text-white hover:bg-[#1b4332] disabled:opacity-60 flex items-center gap-2">
                {savingForm ? (editingFormId ? 'Saving…' : 'Creating…') : (editingFormId ? <><Check size={14} /> Save Changes</> : <><Plus size={14} /> Create Form</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
