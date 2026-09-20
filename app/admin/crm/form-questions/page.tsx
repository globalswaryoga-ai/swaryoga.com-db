'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Trash2, Edit3, Save, X, GripVertical,
  Image as ImageIcon, QrCode, Link as LinkIcon, CreditCard,
  ArrowUp, ArrowDown, ToggleLeft, ToggleRight,
  Upload, ExternalLink, AlertCircle, CheckCircle, ChevronLeft, Settings,
  ClipboardCopy, Share2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType = 'text' | 'paragraph' | 'dropdown' | 'radio' | 'checkbox' | 'info' | 'payment';

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
  workshopName: string;
  workshopDate: string;
  workshopEndDate: string;
  duration: string;
  holidays: string;
  workshopTime: string;
  description: string;
  workshopImage?: string;
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

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'image' | 'qr' | 'formImage' | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const formImageRef = useRef<HTMLInputElement>(null);

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
      const url = isEdit ? `/api/admin/enquiry-forms?id=${formSettingsData.formId}` : '/api/admin/enquiry-forms';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(formSettingsData) });
      const data = await res.json();
      
      if (!data.success && !data.form) throw new Error(data.error || 'Failed to save form');
      
      showToast(isEdit ? 'Form updated!' : 'Form created!');
      
      // Update local state
      const savedForm = data.form;
      if (isEdit) {
        setForms(prev => prev.map(f => f.formId === savedForm.formId ? savedForm : f));
        if (activeForm?.formId === savedForm.formId) setActiveForm(savedForm);
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

  // ── Question Actions ──
  const handleSaveQuestion = async () => {
    if (!qData.label?.en?.trim()) return showToast('Please enter a question label', 'error');
    if (!qData.fieldKey?.trim()) return showToast('Please enter a field key', 'error');
    if (!activeForm) return showToast('No active form', 'error');

    setSavingQ(true);
    try {
      const url = editingQId ? `/api/admin/form-questions/${editingQId}` : '/api/admin/form-questions';
      const method = editingQId ? 'PUT' : 'POST';
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
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/admin/form-questions/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (data.success) {
      setQuestions(qs => qs.filter(q => q._id !== id));
      showToast('Deleted!');
    } else showToast('Delete failed', 'error');
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            {!activeForm && (
              <button
                onClick={() => { setFormSettingsData({}); setShowFormSettings(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg"
              >
                <Plus size={16} /> Create Form
              </button>
            )}
            {activeForm && (
              <div className="flex items-center gap-2">
                <a
                  href={`https://swaryoga.com/enquiry?w=${activeForm.formId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  <ExternalLink size={16} /> Preview Form
                </a>
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
                  <div key={f.formId} onClick={() => setActiveForm(f)} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <span className="text-xl">📝</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg truncate">{f.workshopName}</h3>
                    <p className="text-sm text-slate-500 mt-1">ID: {f.formId} · {f.isActive ? 'Active' : 'Inactive'}</p>
                    {f.workshopDate && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">📅 {f.workshopDate}</p>}
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
                <h1 className="text-3xl font-bold text-slate-900 mb-2 pr-12">{activeForm.workshopName}</h1>
                <p className="text-slate-500 whitespace-pre-wrap">{activeForm.description || 'No description provided.'}</p>
                
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
              ) : questions.sort((a,b)=>a.order-b.order).map((q) => (
                <div key={q._id} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow group">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mt-1 cursor-grab">
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-base mb-1">{q.label.en} {q.required && <span className="text-red-500">*</span>}</h3>
                    <p className="text-sm text-slate-500 capitalize">{q.questionType} Question · <code className="bg-slate-100 px-1 rounded">{q.fieldKey}</code></p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                <textarea rows={3} value={formSettingsData.description || ''} onChange={e => setFormSettingsData(f => ({ ...f, description: e.target.value }))} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                  <input type="text" placeholder="e.g. 15 Dec 2026" value={formSettingsData.workshopDate || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopDate: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                  <input type="text" placeholder="e.g. 20 Dec 2026" value={formSettingsData.workshopEndDate || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopEndDate: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Time</label>
                  <input type="text" placeholder="e.g. 6:00 AM - 7:30 AM" value={formSettingsData.workshopTime || ''} onChange={e => setFormSettingsData(f => ({ ...f, workshopTime: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Duration</label>
                  <input type="text" placeholder="e.g. 1 Hour 30 Mins" value={formSettingsData.duration || ''} onChange={e => setFormSettingsData(f => ({ ...f, duration: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Holidays</label>
                <input type="text" placeholder="e.g. Every Sunday" value={formSettingsData.holidays || ''} onChange={e => setFormSettingsData(f => ({ ...f, holidays: e.target.value }))} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Header Image</label>
                {formSettingsData.workshopImage ? (
                  <div className="relative">
                    <img src={formSettingsData.workshopImage} alt="Header" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                    <button onClick={() => setFormSettingsData(f => ({ ...f, workshopImage: '' }))} className="absolute top-2 right-2 w-8 h-8 bg-white text-red-500 rounded-full shadow flex items-center justify-center"><X size={14}/></button>
                  </div>
                ) : (
                  <div>
                    <input ref={formImageRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'formImage')} />
                    <button type="button" onClick={() => formImageRef.current?.click()} className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                      {uploadingImage === 'formImage' ? 'Uploading...' : 'Upload Header Image'}
                    </button>
                  </div>
                )}
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

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Field Key *</label>
                <input value={qData.fieldKey || ''} onChange={e => setQData(f => ({ ...f, fieldKey: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))} placeholder="e.g. user_goal" className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none font-mono text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">Unique identifier (letters, numbers, underscores).</p>
              </div>

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
    </div>
  );
}
