'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Trash2, Edit3, Save, X, GripVertical,
  Image as ImageIcon, QrCode, Link as LinkIcon, CreditCard,
  ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
  Upload, ExternalLink, AlertCircle, CheckCircle, ChevronLeft, Settings,
  ClipboardCopy, Share2, Eye, Download, Search, Table, FileSpreadsheet, Users, Loader, Calendar, Clock, Timer
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType = 'text' | 'paragraph' | 'dropdown' | 'radio' | 'checkbox' | 'info' | 'payment' | 'image' | 'document';

interface Option {
  value: string;
  label: { en: string; hi?: string; mr?: string };
}

interface PaymentConfig {
  gateway: 'razorpay' | 'custom';
  paymentUrl?: string;
  amount?: number;
  currency?: string;
  buttonLabel?: string;
  razorpayKeyId?: string;
  description?: string;
}

interface Question {
  _id: string;
  fieldKey: string;
  formId: string;
  questionType: QuestionType;
  label: { en: string; hi?: string; mr?: string };
  placeholder?: { en?: string };
  options: Option[];
  imageUrl?: string;
  qrCodeUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentConfig?: PaymentConfig;
  required: boolean;
  order: number;
  isActive: boolean;
}

interface EnquiryForm {
  formId: string;
  newFormId?: string;
  workshopName: string;
  workshopDate: string;
  workshopEndDate: string;
  duration: string;
  holidays: string;
  workshopTime: string;
  description: string;
  workshopImage?: string;
  urlImage?: string;
  isActive: boolean;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'text', label: 'Short Text', icon: '✏️' },
  { value: 'paragraph', label: 'Long Text', icon: '📝' },
  { value: 'dropdown', label: 'Dropdown', icon: '⬇️' },
  { value: 'radio', label: 'Single Choice', icon: '🔘' },
  { value: 'checkbox', label: 'Multiple Choice', icon: '☑️' },
  { value: 'info', label: 'Info / Display Block', icon: 'ℹ️' },
  { value: 'payment', label: 'Payment Button', icon: '💳' },
  { value: 'image', label: 'Image Upload (Max 5MB)', icon: '🖼️' },
  { value: 'document', label: 'Document Upload (Max 5MB)', icon: '📄' },
];

const HAS_OPTIONS: QuestionType[] = ['dropdown', 'radio', 'checkbox'];

function emptyQuestion(formId: string): Partial<Question> {
  return {
    fieldKey: '',
    formId,
    questionType: 'text',
    label: { en: '', hi: '', mr: '' },
    placeholder: { en: '' },
    options: [],
    imageUrl: '',
    qrCodeUrl: '',
    linkUrl: '',
    linkLabel: '',
    paymentConfig: { gateway: 'custom', paymentUrl: '', amount: 0, currency: 'INR', buttonLabel: 'Pay Now', description: '' },
    required: false,
    order: 0,
    isActive: true,
  };
}

export default function GoogleFormBuilderPage() {
  const router = useRouter();
  const token = useAuth();

  const [forms, setForms] = useState<EnquiryForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  
  // State for the currently selected form to build
  const [activeForm, setActiveForm] = useState<EnquiryForm | null>(null);
  
  // State for form creation/editing modal
  const [showFormSettings, setShowFormSettings] = useState(false);
  const [formSettingsData, setFormSettingsData] = useState<Partial<EnquiryForm>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQBuilder, setShowQBuilder] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qData, setQData] = useState<Partial<Question>>({});
  const [savingQ, setSavingQ] = useState(false);
  // Short URL handling
  const [shortUrl, setShortUrl] = useState<string>('');
  const [generatingShort, setGeneratingShort] = useState(false);

  // Submissions Modal State
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<EnquiryForm | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionQuestions, setSubmissionQuestions] = useState<Question[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Bulk Import State
  const [showImportUI, setShowImportUI] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [importSourceType, setImportSourceType] = useState<'file' | 'googlesheet'>('file');

  const openSubmissionsModal = async (form: EnquiryForm) => {
    setSelectedFormForSubmissions(form);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    setSubmissionSearch('');

    try {
      const qRes = await fetch(`/api/admin/form-questions?formId=${form.formId}`, { headers: authHeaders() });
      const qData = await qRes.json();
      setSubmissionQuestions(qData.questions || []);

      const sRes = await fetch(`/api/admin/enquiries?workshopId=${form.formId}`, { headers: authHeaders() });
      const sData = await sRes.json();
      setSubmissions(sData.data || sData.enquiries || []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load submissions', 'error');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleExportCSV = (formName: string, items: any[], qList: Question[]) => {
    if (!items.length) return showToast('No data to export', 'error');

    const headers = ['#', 'Date', 'Email', 'Country'];
    qList.forEach(q => headers.push(q.label?.en || q.fieldKey));

    const rows = items.map((sub, idx) => {
      const row = [
        idx + 1,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
        sub.name || '',
        sub.mobile || '',
        sub.email || '',
        sub.gender || '',
        sub.city || '',
      ];
      qList.forEach(q => {
        const val = sub.dynamicAnswers ? sub.dynamicAnswers[q.fieldKey] : sub[q.fieldKey];
        const formatted = Array.isArray(val) ? val.join(', ') : (val ?? '');
        row.push(formatted);
      });
      return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${formName.replace(/[^a-z0-9]/gi, '_')}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV downloaded!');
  };

  const handleExportExcel = (formName: string, items: any[], qList: Question[]) => {
    if (!items.length) return showToast('No data to export', 'error');

    const headers = ['#', 'Date', 'Full Name', 'Phone', 'Email', 'Gender', 'City'];
    qList.forEach(q => headers.push(q.label?.en || q.fieldKey));

    const rows = items.map((sub, idx) => {
      const row = [
        idx + 1,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
        sub.name || '',
        sub.mobile || '',
        sub.email || '',
        sub.gender || '',
        sub.city || '',
      ];
      qList.forEach(q => {
        const val = sub.dynamicAnswers ? sub.dynamicAnswers[q.fieldKey] : sub[q.fieldKey];
        const formatted = Array.isArray(val) ? val.join(', ') : (val ?? '');
        row.push(formatted);
      });
      return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const excelContent = '\uFEFF' + [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','), ...rows].join('\n');
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${formName.replace(/[^a-z0-9]/gi, '_')}_submissions.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Excel spreadsheet downloaded!');
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!submissionSearch.trim()) return true;
    const term = submissionSearch.toLowerCase();
    const nameMatch = (sub.name || '').toLowerCase().includes(term);
    const phoneMatch = (sub.mobile || '').toLowerCase().includes(term);
    const cityMatch = (sub.city || '').toLowerCase().includes(term);
    const answersMatch = JSON.stringify(sub.dynamicAnswers || {}).toLowerCase().includes(term);
    return nameMatch || phoneMatch || cityMatch || answersMatch;
  });

  const [editingCell, setEditingCell] = useState<{ id: string; fieldKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startEdit = (id: string, fieldKey: string, initialValue: string) => {
    setEditingCell({ id, fieldKey });
    setEditValue(initialValue);
  };

  const commitEdit = (id: string, fieldKey: string) => {
    if (editingCell) setEditingCell(null);
    handleCellEdit(id, fieldKey, editValue);
  };

  const handleCellEdit = async (enquiryId: string, fieldKey: string, newValue: string) => {
    try {
      const res = await fetch(`/api/admin/enquiries?id=${enquiryId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ [fieldKey]: newValue }),
      });
      if (!res.ok) throw new Error('Update failed');
      
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === enquiryId || sub._id === enquiryId || sub.leadNumber === enquiryId) {
          if (!['name', 'mobile', 'email', 'gender', 'city'].includes(fieldKey)) {
            return { ...sub, dynamicAnswers: { ...(sub.dynamicAnswers || {}), [fieldKey]: newValue } };
          } else {
            return { ...sub, [fieldKey]: newValue };
          }
        }
        return sub;
      }));
      showToast('Updated successfully');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ── Import Actions ──
  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedFormForSubmissions) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('workshopId', selectedFormForSubmissions.formId);
      formData.append('action', 'preview');
      formData.append('file', file);
      
      const res = await fetch('/api/admin/enquiries/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to read file');
      
      setImportFile(file);
      setImportColumns(data.columns || []);
      
      // Auto-detect columns
      const initialMap: Record<string, string> = {
        name: (data.columns || []).find((c: string) => /name/i.test(c)) || '',
        mobile: (data.columns || []).find((c: string) => /phone|mobile/i.test(c)) || '',
        email: (data.columns || []).find((c: string) => /email|gmail/i.test(c)) || '',
        gender: (data.columns || []).find((c: string) => /gender/i.test(c)) || '',
        city: (data.columns || []).find((c: string) => /city|location/i.test(c)) || '',
      };
      
      // Auto-map dynamic questions
      submissionQuestions.forEach(q => {
        const qLabel = (q.label?.en || q.fieldKey).toLowerCase();
        initialMap[q.fieldKey] = (data.columns || []).find((c: string) => c.toLowerCase().includes(qLabel)) || '';
      });
      
      setImportMapping(initialMap);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const executeImport = async () => {
    setIsImporting(true);
    try {
      if (!selectedFormForSubmissions) throw new Error("No form selected");
      
      let finalFile: File | null = null;

      if (importSourceType === 'file' && importFile) {
        finalFile = importFile;
      } else if (importSourceType === 'googlesheet') {
        const fetchRes = await fetch('/api/admin/enquiries/import/google-sheets?action=import', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ url: googleSheetUrl })
        });
        const sheetData = await fetchRes.json();
        if (!sheetData.success) throw new Error(sheetData.error || 'Failed to fetch Google Sheet data');
        
        // Convert JSON array back to a CSV Blob to upload
        const worksheet = XLSX.utils.json_to_sheet(sheetData.data);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        finalFile = new File([csvOutput], 'google-sheet-import.csv', { type: 'text/csv' });
      } else {
        throw new Error('Please select a file or enter a Google Sheet URL');
      }

      const formData = new FormData();
      formData.append('workshopId', selectedFormForSubmissions.formId);
      formData.append('workshopName', selectedFormForSubmissions.workshopName);
      formData.append('action', 'import');
      formData.append('file', finalFile);
      formData.append('mapping', JSON.stringify(importMapping));
      
      const selectedFields = ['name', 'mobile', 'email', 'gender', 'city'];
      formData.append('selectedFields', JSON.stringify(selectedFields));
      
      const dynamicFields = submissionQuestions.map(q => q.fieldKey);
      formData.append('dynamicFields', JSON.stringify(dynamicFields));
      
      const res = await fetch('/api/admin/enquiries/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to import');
      
      showToast(data.message);
      
      // Reset & Reload
      setShowImportUI(false);
      setImportFile(null);
      setGoogleSheetUrl('');
      setImportColumns([]);
      openSubmissionsModal(selectedFormForSubmissions);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'image' | 'qr' | 'formImage' | 'urlImage' | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const formImageRef = useRef<HTMLInputElement>(null);
  const urlImageRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  // ── Load forms ──
  useEffect(() => {
    if (!token) return;
    setLoadingForms(true);
    fetch('/api/admin/enquiry-forms', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setForms(d.data || []))
      .catch(() => showToast('Failed to load forms', 'error'))
      .finally(() => setLoadingForms(false));
  }, [token]);

  // ── Load questions when active form changes ──
  useEffect(() => {
    if (!token || !activeForm) return;
    setLoadingQuestions(true);
    fetch(`/api/admin/form-questions?formId=${activeForm.formId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setQuestions(d.questions || []))
      .catch(() => showToast('Failed to load questions', 'error'))
      .finally(() => setLoadingQuestions(false));
  }, [token, activeForm]);

  // ── Upload image helper ──
  const uploadImage = async (file: File, type: 'image' | 'qr' | 'formImage') => {
    setUploadingImage(type);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const res = await fetch('/api/admin/crm/upload/s3/base64', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ base64, fileName: file.name, category: 'form-builder' }),
        });
        const data = await res.json();
        if (data.success) {
          if (type === 'image') setQData(f => ({ ...f, imageUrl: data.data.publicUrl }));
          else if (type === 'qr') setQData(f => ({ ...f, qrCodeUrl: data.data.publicUrl }));
          else if (type === 'formImage') setFormSettingsData(f => ({ ...f, workshopImage: data.data.publicUrl }));
          else if (type === 'urlImage') setFormSettingsData(f => ({ ...f, urlImage: data.data.publicUrl }));
          showToast('Image uploaded!');
        } else {
          showToast('Upload failed', 'error');
        }
        setUploadingImage(null);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Upload failed', 'error');
      setUploadingImage(null);
    }
  };

  // ── Form Settings Actions ──
  const handleSaveFormSettings = async () => {
    if (!formSettingsData.workshopName?.trim()) return showToast('Form Name is required', 'error');
    setSavingSettings(true);
    try {
      const isEdit = !!formSettingsData.formId;
      const oldId = formSettingsData.formId;
      const url = isEdit ? `/api/admin/enquiry-forms?id=${oldId}` : '/api/admin/enquiry-forms';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(formSettingsData) });
      const data = await res.json();
      
      if (!data.success && !data.form) throw new Error(data.error || data.detail || 'Failed to save form');
      
      showToast(isEdit ? 'Form updated!' : 'Form created!');
      
      // Update local state
      const savedForm = data.form;
      if (isEdit) {
        setForms(prev => prev.map(f => f.formId === oldId ? savedForm : f));
        if (activeForm?.formId === oldId) setActiveForm(savedForm);
      } else {
        setForms(prev => [savedForm, ...prev]);
        setActiveForm(savedForm);
      }
      setShowFormSettings(false);
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form and all its questions?')) return;
    try {
      const res = await fetch(`/api/admin/enquiry-forms?id=${formId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setForms(prev => prev.filter(f => f.formId !== formId));
        if (activeForm?.formId === formId) setActiveForm(null);
        showToast('Form deleted!');
      } else {
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  // ── Question Actions ──
  const handleSaveQuestion = async () => {
    if (!qData.label?.en?.trim()) return showToast('Please enter a question label', 'error');
    
    // Auto-generate field key if missing
    let finalKey = qData.fieldKey || qData.label.en.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
    if (!finalKey) finalKey = 'q_' + Math.random().toString(36).substr(2, 5);
    qData.fieldKey = finalKey;
    if (!qData.fieldKey?.trim()) return showToast('Please enter a field key', 'error');
    if (!activeForm) return showToast('No active form', 'error');

    setSavingQ(true);
    try {
      const url = editingQId ? `/api/admin/form-questions?id=${editingQId}` : '/api/admin/form-questions';
      const method = editingQId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(qData) });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to save question');

      showToast(editingQId ? 'Question updated!' : 'Question added!');
      setShowQBuilder(false);
      
      // Refresh questions list
      const r2 = await fetch(`/api/admin/form-questions?formId=${activeForm.formId}`, { headers: authHeaders() });
      const d2 = await r2.json();
      setQuestions(d2.questions || []);
    } catch (e: any) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSavingQ(false);
    }
  };

  const handleDeleteQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/form-questions?id=${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete question');
      setQuestions(q => q.filter(x => x._id !== id));
      showToast('Question deleted');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMoveQuestion = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(q => q._id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const currentQ = sorted[index];
    const swapQ = sorted[swapIndex];

    const tempOrder = currentQ.order;
    currentQ.order = swapQ.order;
    swapQ.order = tempOrder;

    // Optimistic UI update
    setQuestions([...sorted]);

    try {
      // Update backend for both
      await fetch('/api/admin/form-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id: currentQ._id, formId: activeForm?.formId, order: currentQ.order })
      });
      await fetch('/api/admin/form-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id: swapQ._id, formId: activeForm?.formId, order: swapQ.order })
      });
      showToast('Order updated');
    } catch (e: any) {
      showToast('Failed to update order', 'error');
      loadQuestions(activeForm!.formId); // Revert on failure
    }
  };

  const addOption = () => {
    const opts = [...(qData.options || [])];
    opts.push({ value: `option_${opts.length + 1}`, label: { en: '' } });
    setQData(f => ({ ...f, options: opts }));
  };

  const updateOption = (i: number, en: string) => {
    const opts = [...(qData.options || [])];
    opts[i] = { ...opts[i], label: { ...opts[i].label, en }, value: en.toLowerCase().replace(/\s+/g, '_') || `option_${i + 1}` };
    setQData(f => ({ ...f, options: opts }));
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {activeForm ? (
              <button onClick={() => setActiveForm(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">
                <ChevronLeft size={20} />
              </button>
            ) : null}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-2xl">📝</span> {activeForm ? activeForm.workshopName : 'Form Builder'}
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {activeForm ? 'Customize your form layout and questions' : 'Create and manage custom forms (like Google Forms)'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {!activeForm && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/enquiry-forms', { 
                      method: 'POST', 
                      headers: authHeaders(), 
                      body: JSON.stringify({ workshopName: 'Untitled Form' }) 
                    });
                    const data = await res.json();
                    if (data.success && data.form) {
                      setForms([data.form, ...forms]);
                      setActiveForm(data.form);
                      showToast('Form created!');
                    }
                  } catch (e) {
                    showToast('Failed to create form', 'error');
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Plus size={16} /> Create Form
              </button>
            )}
            {activeForm && (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`https://swaryoga.com/enquiry?w=${activeForm.formId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  <ExternalLink size={16} /> Preview Form
                </a>
                
                <button
                  onClick={() => openSubmissionsModal(activeForm)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 border border-emerald-700 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Eye size={16} /> View Data ({activeForm.submissionCount || 0})
                </button>
                
                <button
                  onClick={() => {
                    const url = `https://swaryoga.com/enquiry?w=${activeForm.formId}`;
                    navigator.clipboard.writeText(url);
                    showToast('Link copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                >
                  <ClipboardCopy size={16} /> Copy Link
                </button>

                <button
                  onClick={async () => {
                    setGeneratingShort(true);
                    try {
                      const res = await fetch('/api/admin/shorten-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: `https://swaryoga.com/enquiry?w=${activeForm.formId}` })
                      });
                      const data = await res.json();
                      if (data.success) setShortUrl(data.shortUrl);
                      else throw new Error(data.error || 'Failed');
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setGeneratingShort(false);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 transition-colors"
                  disabled={generatingShort}
                >
                  <Share2 size={14} />
                  {generatingShort ? 'Generating...' : shortUrl ? 'Regenerate' : 'Short URL'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* VIEW 1: Dashboard (List of Forms) */}
        {!activeForm && (
          <div className="space-y-6">
            {loadingForms ? (
              <div className="text-center py-20 text-slate-500">Loading forms...</div>
            ) : forms.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="text-4xl mb-4">📭</div>
                <p className="font-bold text-slate-700">No forms created yet</p>
                <p className="text-sm text-slate-500 mt-1">Click "Create Form" to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forms.map(f => (
                  <div key={f.formId} onClick={() => setActiveForm(f)} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-xl">📝</span>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { setFormSettingsData(f); setShowFormSettings(true); }}
                            className="p-2 bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-xs font-semibold flex items-center gap-1"
                            title="Edit Settings & URL Slug"
                          >
                            <Settings size={14} />
                            <span>Settings</span>
                          </button>
                          <button
                            onClick={() => setActiveForm(f)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all text-xs font-semibold flex items-center gap-1"
                            title="Edit Form Questions"
                          >
                            <Edit3 size={14} />
                            <span>Edit Form</span>
                          </button>
                          <button
                            onClick={() => handleDeleteForm(f.formId)}
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all text-xs font-semibold flex items-center justify-center"
                            title="Delete Form"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg truncate">{f.workshopName}</h3>
                      <p className="text-sm text-slate-500 mt-1">ID: <span className="font-mono font-semibold text-indigo-600">{f.formId}</span> · {f.isActive ? 'Active' : 'Inactive'}</p>
                      {f.workshopDate && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">📅 {f.workshopDate}</p>}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openSubmissionsModal(f)}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60"
                      >
                        <Eye size={15} />
                        <span>View Data & Downloads ({(f as any).submissionCount || 0})</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Form Builder (Specific Form) */}
        {activeForm && (
          <div className="space-y-6">
            {/* Form Settings Card (Header) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
              {activeForm.workshopImage && (
                <div className="w-full h-40 bg-slate-100 relative">
                  <img src={activeForm.workshopImage} alt="Header" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-8 relative">
                <button 
                  onClick={() => { setFormSettingsData(activeForm); setShowFormSettings(true); }}
                  className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
                  title="Edit Form Settings"
                >
                  <Settings size={18} />
                </button>
                <div 
                  onClick={() => { setFormSettingsData(activeForm); setShowFormSettings(true); }}
                  className="cursor-pointer group/header hover:bg-slate-50 p-4 -ml-4 rounded-xl transition-colors border border-transparent hover:border-slate-200 border-dashed"
                >
                  <h1 className="text-4xl font-bold text-slate-900 mb-2 pr-12 group-hover/header:text-indigo-600 transition-colors">
                    {activeForm.workshopName}
                    <span className="text-sm font-normal text-indigo-400 ml-3 opacity-0 group-hover/header:opacity-100 transition-opacity">✏️ Edit</span>
                  </h1>
                  <p className="text-slate-500 text-lg whitespace-pre-wrap">{activeForm.description || 'No description provided. Click here to add one.'}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-slate-100">
                  {activeForm.workshopDate && (
                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-sm text-slate-600 font-medium">📅 {activeForm.workshopDate} {activeForm.workshopEndDate && `- ${activeForm.workshopEndDate}`}</div>
                  )}
                  {activeForm.workshopTime && (
                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-sm text-slate-600 font-medium">🕐 {activeForm.workshopTime}</div>
                  )}
                  {activeForm.duration && (
                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-sm text-slate-600 font-medium">⏳ {activeForm.duration}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {loadingQuestions ? (
                <div className="text-center py-10">Loading questions...</div>
              ) : questions.sort((a,b)=>a.order-b.order).map((q, idx, sortedArr) => (
                <div key={q._id} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow group relative">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mt-1 cursor-grab">
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-base mb-1">{q.label.en} {q.required && <span className="text-red-500">*</span>}</h3>
                    <p className="text-sm text-slate-500 capitalize">{q.questionType} Question · <code className="bg-slate-100 px-1 rounded">{q.fieldKey}</code></p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-6">
                    <div className="flex flex-col gap-1 mr-2">
                      <button 
                        onClick={() => handleMoveQuestion(q._id, 'up')} 
                        disabled={idx === 0}
                        className="w-8 h-4 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button 
                        onClick={() => handleMoveQuestion(q._id, 'down')} 
                        disabled={idx === sortedArr.length - 1}
                        className="w-8 h-4 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button onClick={() => { setQData(q); setEditingQId(q._id); setShowQBuilder(true); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteQ(q._id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Question Button */}
              <button
                onClick={() => { setQData(emptyQuestion(activeForm.formId)); setEditingQId(null); setShowQBuilder(true); }}
                className="w-full h-14 border-2 border-dashed border-indigo-200 rounded-2xl flex items-center justify-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 transition-colors"
              >
                <Plus size={20} /> Add Question
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Form Settings (Header) */}
      {showFormSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800">Form Settings</h2>
              <button onClick={() => setShowFormSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Form / Workshop Name *</label>
                <input value={formSettingsData.workshopName || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopName: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-700 mb-1 font-mono uppercase tracking-wider">🔗 Custom Form URL Slug / ID (e.g. SZ-HindiL1)</label>
                <input
                  value={formSettingsData.newFormId !== undefined ? formSettingsData.newFormId : (formSettingsData.formId || '')}
                  onChange={e => {
                    const slug = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                    setFormSettingsData(f => ({ ...f, newFormId: slug }));
                  }}
                  placeholder="e.g. SZ-HindiL1"
                  className="w-full h-11 px-3 border border-indigo-200 bg-indigo-50/50 font-mono text-sm text-indigo-900 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  🌐 Live Link: <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">https://swaryoga.com/enquiry?w={formSettingsData.newFormId !== undefined ? formSettingsData.newFormId : (formSettingsData.formId || 'SZ-HindiL1')}</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea rows={3} value={formSettingsData.description || ''} onChange={e => setFormSettingsData(f => ({ ...f, description: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="e.g. 15 Dec 2026" value={formSettingsData.workshopDate || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopDate: e.target.value }))} className="w-full h-11 px-3 pr-9 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="e.g. 20 Dec 2026" value={formSettingsData.workshopEndDate || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopEndDate: e.target.value }))} className="w-full h-11 px-3 pr-9 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="e.g. 6:00 AM - 7:30 AM" value={formSettingsData.workshopTime || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopTime: e.target.value }))} className="w-full h-11 px-3 pr-9 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Duration</label>
                  <div className="relative">
                    <Timer className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="e.g. 1 Hour 30 Mins" value={formSettingsData.duration || ''} onChange={e => setFormSettingsData(f => ({ ...f, duration: e.target.value }))} className="w-full h-11 px-3 pr-9 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Holidays</label>
                <input type="text" placeholder="e.g. Every Sunday" value={formSettingsData.holidays || ''} onChange={e => setFormSettingsData(f => ({ ...f, holidays: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Header Image (Form Banner)</label>
                  {formSettingsData.workshopImage ? (
                    <div className="relative">
                      <img src={formSettingsData.workshopImage} alt="Header" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                      <button onClick={() => setFormSettingsData(f => ({ ...f, workshopImage: '' }))} className="absolute top-2 right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow flex items-center justify-center"><X size={14}/></button>
                    </div>
                  ) : (
                    <div>
                      <input ref={formImageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'formImage')} />
                      <button type="button" onClick={() => formImageRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors flex flex-col items-center justify-center gap-2">
                        {uploadingImage === 'formImage' ? <Loader className="animate-spin" size={20} /> : <><ImageIcon size={24} /> Upload Banner Image</>}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">URL Preview Image (WhatsApp/FB)</label>
                  {formSettingsData.urlImage ? (
                    <div className="relative">
                      <img src={formSettingsData.urlImage} alt="URL Preview" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                      <button onClick={() => setFormSettingsData(f => ({ ...f, urlImage: '' }))} className="absolute top-2 right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow flex items-center justify-center"><X size={14}/></button>
                    </div>
                  ) : (
                    <div>
                      <input ref={urlImageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'urlImage')} />
                      <button type="button" onClick={() => urlImageRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors flex flex-col items-center justify-center gap-2">
                        {uploadingImage === 'urlImage' ? <Loader className="animate-spin" size={20} /> : <><Share2 size={24} /> Upload Link Image</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={handleSaveFormSettings} disabled={savingSettings} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">
                {savingSettings ? 'Saving...' : 'Save Form Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Question Builder */}
      {showQBuilder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{editingQId ? 'Edit Question' : 'Add Question'}</h2>
              <button onClick={() => setShowQBuilder(false)} className="text-white/80 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Question Type */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {QUESTION_TYPES.map(qt => (
                  <button
                    key={qt.value}
                    onClick={() => setQData(f => ({ ...f, questionType: qt.value }))}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${qData.questionType === qt.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                  >
                    <span className="text-xl">{qt.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{qt.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Question / Label *</label>
                <input value={qData.label?.en || ''} onChange={e => setQData(f => ({ ...f, label: { ...f.label!, en: e.target.value } }))} placeholder="e.g. What is your goal?" className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium" />
              </div>

              {/* Field Key auto-generated behind the scenes */}

              {/* Payment Config (Multiple Options) */}
              {qData.questionType === 'payment' && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-4">
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment Options</label>
                  
                  {(!Array.isArray(qData.paymentConfig) ? (qData.paymentConfig ? [qData.paymentConfig] : []) : qData.paymentConfig).map((payOpt, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm relative">
                      <button 
                        onClick={() => {
                          const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                          arr.splice(i, 1);
                          setQData(f => ({ ...f, paymentConfig: arr }));
                        }} 
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200"
                      >×</button>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Amount</label>
                          <input type="number" min="0" value={payOpt.amount || ''} onChange={e => {
                            const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                            arr[i] = { ...arr[i], amount: Number(e.target.value) };
                            setQData(f => ({ ...f, paymentConfig: arr }));
                          }} placeholder="e.g. 500" className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Currency</label>
                          <select value={payOpt.currency || 'INR'} onChange={e => {
                            const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                            arr[i] = { ...arr[i], currency: e.target.value };
                            setQData(f => ({ ...f, paymentConfig: arr }));
                          }} className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none bg-white">
                            <option value="INR">INR (₹)</option>
                            <option value="NPR">NPR (रु)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Button Text</label>
                        <input value={payOpt.buttonText || ''} onChange={e => {
                          const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                          arr[i] = { ...arr[i], buttonText: e.target.value };
                          setQData(f => ({ ...f, paymentConfig: arr }));
                        }} placeholder="e.g. Pay Now" className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm outline-none" />
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      const arr = Array.isArray(qData.paymentConfig) ? [...qData.paymentConfig] : (qData.paymentConfig ? [qData.paymentConfig] : []);
                      arr.push({ amount: 0, currency: 'INR', buttonText: 'Pay Now' });
                      setQData(f => ({ ...f, paymentConfig: arr }));
                    }}
                    className="w-full py-2 border border-dashed border-emerald-300 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                  >
                    + Add Payment Option
                  </button>
                </div>
              )}

              {/* Options */}
              {HAS_OPTIONS.includes(qData.questionType as QuestionType) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 mb-3">Options</label>
                  <div className="space-y-2">
                    {(qData.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt.label.en} onChange={e => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none" />
                        <button onClick={() => setQData(f => ({ ...f, options: (f.options || []).filter((_, idx) => idx !== i) }))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button onClick={addOption} className="w-full h-10 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2"><Plus size={14}/> Add Option</button>
                  </div>
                </div>
              )}

              {/* Required & Order */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={!!qData.required} onChange={e => setQData(f => ({ ...f, required: e.target.checked }))} className="w-4 h-4 rounded text-indigo-600" />
                  <span className="font-semibold text-slate-700 text-sm">Required field</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">Order:</span>
                  <input type="number" value={qData.order ?? 0} onChange={e => setQData(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="w-16 h-9 px-2 border border-slate-200 rounded-xl text-center outline-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowQBuilder(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
              <button onClick={handleSaveQuestion} disabled={savingQ} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">
                {savingQ ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Submissions Table */}
      {showSubmissionsModal && selectedFormForSubmissions && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-white">
              <div>
                <div className="flex items-center gap-2.5">
                  <Table className="text-emerald-400" size={24} />
                  <h2 className="font-bold text-xl">{selectedFormForSubmissions.workshopName}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Form Slug / ID: <span className="font-mono text-indigo-300 font-semibold">{selectedFormForSubmissions.formId}</span> · Total Responses: <span className="font-bold text-emerald-400">{submissions.length}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportUI(!showImportUI)}
                  className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow transition-all ${showImportUI ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                >
                  <Upload size={14} /> Import Data
                </button>
                <button
                  onClick={() => handleExportCSV(selectedFormForSubmissions.workshopName, filteredSubmissions, submissionQuestions)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  <Download size={14} /> Download CSV
                </button>
                <button
                  onClick={() => handleExportExcel(selectedFormForSubmissions.workshopName, filteredSubmissions, submissionQuestions)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  <FileSpreadsheet size={14} /> Download Excel (.xlsx)
                </button>
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Import Data UI */}
            {showImportUI && (
              <div className="bg-slate-50 border-b border-slate-200 p-6 animate-in fade-in slide-in-from-top-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {!importColumns.length ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Import Data</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">Select a file or enter a Google Sheet URL to map and import directly into this form's submissions and CRM Leads.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        {/* File Upload Option */}
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-center">
                          <h4 className="font-bold text-slate-700 text-sm">Option 1: Upload File</h4>
                          <input 
                            type="file" 
                            accept=".xlsx,.xls,.csv" 
                            onChange={handleImportFileChange} 
                            disabled={isImporting} 
                            className="text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-colors mx-auto block" 
                          />
                        </div>

                        {/* Google Sheets Option */}
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-center">
                          <h4 className="font-bold text-slate-700 text-sm">Option 2: Google Sheet URL</h4>
                          <input 
                            type="text"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            value={googleSheetUrl}
                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                          />
                          <button 
                            onClick={handleFetchGoogleSheetColumns}
                            disabled={isImporting || !googleSheetUrl}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors w-full disabled:opacity-50"
                          >
                            {isImporting && importSourceType === 'googlesheet' ? 'Fetching...' : 'Fetch Columns'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <CheckCircle size={20} className="text-emerald-500" />
                          Map Your Columns ({importSourceType === 'file' ? 'File Upload' : 'Google Sheet'})
                        </h3>
                        <button onClick={() => { setImportColumns([]); setImportFile(null); setGoogleSheetUrl(''); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-slate-100 rounded-lg">Cancel Upload</button>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-2">Base Fields</h4>
                          {['name', 'mobile', 'email', 'gender', 'city'].map((key) => (
                            <div key={key} className="flex flex-col">
                              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 capitalize">{key}</label>
                              <select 
                                value={importMapping[key] || ''} 
                                onChange={(e) => setImportMapping({ ...importMapping, [key]: e.target.value })} 
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">-- Ignore --</option>
                                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 border-b border-emerald-100 pb-2">Custom Questions</h4>
                          {submissionQuestions.length === 0 && (
                            <p className="text-sm text-slate-400 italic">No custom questions in this form.</p>
                          )}
                          {submissionQuestions.map((q) => (
                            <div key={q.fieldKey} className="flex flex-col">
                              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 truncate" title={q.label.en}>{q.label.en}</label>
                              <select 
                                value={importMapping[q.fieldKey] || ''} 
                                onChange={(e) => setImportMapping({ ...importMapping, [q.fieldKey]: e.target.value })} 
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">-- Ignore --</option>
                                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-8 flex justify-end pt-5 border-t border-slate-100">
                        <button 
                          onClick={executeImport} 
                          disabled={isImporting || !importMapping.name} 
                          className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isImporting ? <span className="animate-pulse">Importing...</span> : <><CheckCircle size={18} /> Run Import</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filter & Stats Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, city, or question answer..."
                  value={submissionSearch}
                  onChange={e => setSubmissionSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                />
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Showing <span className="text-indigo-600 font-bold">{filteredSubmissions.length}</span> of <span className="text-slate-800 font-bold">{submissions.length}</span> total responses
              </div>
            </div>

            {/* Google-Sheets Style Data Table */}
            <div className="flex-1 overflow-auto p-6">
              {loadingSubmissions ? (
                <div className="py-20 text-center text-slate-400 font-medium">Loading responses...</div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="font-bold text-slate-700 text-base">No responses found</p>
                  <p className="text-xs text-slate-400 mt-1">When users submit this form, their responses will appear right here in this table.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto max-h-[58vh]">
                    <table className="w-full text-left text-xs text-slate-700 border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                          <th className="p-3.5 border-r border-slate-200 text-center w-12 bg-slate-100">#</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[140px] bg-slate-100">Date & Time</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[150px] bg-slate-100">Full Name</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[130px] bg-slate-100">Mobile / Phone</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[150px] bg-slate-100">Email</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[90px] bg-slate-100">Gender</th>
                          <th className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[110px] bg-slate-100">City</th>
                          {submissionQuestions.map(q => (
                            <th key={q._id} className="p-3.5 border-r border-slate-200 whitespace-nowrap min-w-[160px] bg-indigo-50/50 text-indigo-900">
                              {q.label?.en || q.fieldKey}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSubmissions.map((sub, idx) => (
                          <tr key={sub.id || idx} className="hover:bg-indigo-50/40 transition-colors odd:bg-slate-50/30">
                            <td className="p-3.5 border-r border-slate-100 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="p-3.5 border-r border-slate-100 whitespace-nowrap text-slate-500 font-medium">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 font-bold text-slate-900 whitespace-nowrap cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, 'name', sub.name || '')}>
                              {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === 'name' ? (
                                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, 'name')} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, 'name')} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                              ) : (sub.name || '')}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 font-mono text-slate-700 whitespace-nowrap font-medium cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, 'mobile', sub.mobile || '')}>
                              {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === 'mobile' ? (
                                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, 'mobile')} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, 'mobile')} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                              ) : (sub.mobile || '')}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, 'email', sub.email || '')}>
                              {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === 'email' ? (
                                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, 'email')} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, 'email')} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                              ) : (sub.email || '')}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 capitalize whitespace-nowrap cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, 'gender', sub.gender || '')}>
                              {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === 'gender' ? (
                                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, 'gender')} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, 'gender')} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                              ) : (sub.gender || '')}
                            </td>
                            <td className="p-3.5 border-r border-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, 'city', sub.city || '')}>
                              {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === 'city' ? (
                                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, 'city')} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, 'city')} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                              ) : (sub.city || '')}
                            </td>
                            {submissionQuestions.map(q => {
                              const val = sub.dynamicAnswers ? sub.dynamicAnswers[q.fieldKey] : sub[q.fieldKey];
                              const displayVal = Array.isArray(val) ? val.join(', ') : (val ?? '');
                              return (
                                <td key={q._id} className="p-3.5 border-r border-slate-100 min-w-[160px] text-slate-700 cursor-pointer hover:bg-slate-50" onDoubleClick={() => startEdit(sub.leadNumber || sub._id || sub.id, q.fieldKey, displayVal)}>
                                  {editingCell?.id === (sub.leadNumber || sub._id || sub.id) && editingCell?.fieldKey === q.fieldKey ? (
                                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => commitEdit(sub.leadNumber || sub._id || sub.id, q.fieldKey)} onKeyDown={e => e.key === 'Enter' && commitEdit(sub.leadNumber || sub._id || sub.id, q.fieldKey)} className="w-full bg-transparent border-b border-indigo-500 outline-none" />
                                  ) : displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
