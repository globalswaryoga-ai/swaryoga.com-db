'use client';

import { useEffect, useState, useCallback } from 'react';

export type EventParticipant = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  workshopName: string;
  amount: number;
  paymentMode: string;
  source?: string;
  email?: string;
  city?: string;
};

export type WorkshopEvent = {
  _id?: string;
  startDate: string;
  endDate?: string;
  workshopName: string;
  workshopTime: string;
  workshopFees: number;
  language?: string;
  mode?: string;
  teacher?: string;
  coTeachers?: string[];
  organizers?: string[];
  notes?: string;
  participants: EventParticipant[];
};

export interface CandidateStudent {
  id: string;
  name: string;
  phone: string;
  email: string;
  workshopName: string;
  amount: number;
  paymentMode: string;
  city: string;
  country: string;
  source: 'leads' | 'sales' | 'workshops' | 'offer';
  details?: string;
}

const PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'card', 'cashfree', 'payu', 'other'];

const WORKSHOP_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'residential', label: 'Residential' },
  { value: 'Retreat', label: 'Retreat' },
  { value: 'naturopathy', label: 'Naturopathy' },
];

const COMMON_LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Kannada', 'Tamil', 'Telugu', 'Sanskrit', 'Bengali'];

const EMPTY_PARTICIPANT: EventParticipant = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  workshopName: '',
  amount: 0,
  paymentMode: 'upi',
  source: 'manual',
};

function toDateInput(value?: string) {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  workshopOptions,
  saving,
  token,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: WorkshopEvent) => void | Promise<void>;
  editingEvent?: WorkshopEvent | null;
  workshopOptions: string[];
  saving?: boolean;
  token?: string | null;
}) {
  const [form, setForm] = useState<WorkshopEvent>({
    startDate: '',
    endDate: '',
    workshopName: '',
    workshopTime: '',
    workshopFees: 0,
    language: 'Hindi',
    mode: 'online',
    teacher: 'Mohan Kalburgi (Mohan Sir)',
    coTeachers: [],
    organizers: [],
    notes: '',
    participants: [],
  });

  // Co-teacher & Organizer draft states
  const [draftCoTeacher, setDraftCoTeacher] = useState('');
  const [draftOrganizer, setDraftOrganizer] = useState('');

  // Participant adding state
  const [studentSource, setStudentSource] = useState<'leads' | 'sales' | 'workshops' | 'offer' | 'manual'>('leads');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<CandidateStudent[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manual participant draft
  const [draftParticipant, setDraftParticipant] = useState<EventParticipant>({ ...EMPTY_PARTICIPANT });

  useEffect(() => {
    if (!isOpen) return;
    if (editingEvent) {
      setForm({
        ...editingEvent,
        startDate: toDateInput(editingEvent.startDate),
        endDate: toDateInput(editingEvent.endDate),
        language: editingEvent.language || 'Hindi',
        mode: editingEvent.mode || 'online',
        teacher: editingEvent.teacher || 'Mohan Kalburgi (Mohan Sir)',
        coTeachers: Array.isArray(editingEvent.coTeachers) ? editingEvent.coTeachers : [],
        organizers: Array.isArray(editingEvent.organizers) ? editingEvent.organizers : [],
        participants: editingEvent.participants || [],
      });
    } else {
      setForm({
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        workshopName: '',
        workshopTime: '',
        workshopFees: 0,
        language: 'Hindi',
        mode: 'online',
        teacher: 'Mohan Kalburgi (Mohan Sir)',
        coTeachers: [],
        organizers: [],
        notes: '',
        participants: [],
      });
    }
    setDraftCoTeacher('');
    setDraftOrganizer('');
    setDraftParticipant({ ...EMPTY_PARTICIPANT });
    setSelectedCandidateIds(new Set());
    setToastMsg(null);
  }, [isOpen, editingEvent]);

  // Fetch candidates whenever studentSource or candidateQuery changes (debounced)
  const fetchCandidates = useCallback(async () => {
    if (!isOpen || studentSource === 'manual' || !token) return;
    setLoadingCandidates(true);
    try {
      const params = new URLSearchParams({
        source: studentSource,
        limit: '150',
      });
      if (candidateQuery.trim()) {
        params.set('q', candidateQuery.trim());
      }
      const res = await fetch(`/api/admin/crm/sales/events/student-sources?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCandidates(json.data);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error('Failed to load candidate students:', err);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [isOpen, studentSource, candidateQuery, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  if (!isOpen) return null;

  const totalAmount = form.participants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Co-teacher handlers
  const handleAddCoTeacher = () => {
    const val = draftCoTeacher.trim();
    if (!val) return;
    if (!form.coTeachers?.includes(val)) {
      setForm((p) => ({ ...p, coTeachers: [...(p.coTeachers || []), val] }));
    }
    setDraftCoTeacher('');
  };

  const handleRemoveCoTeacher = (index: number) => {
    setForm((p) => ({
      ...p,
      coTeachers: (p.coTeachers || []).filter((_, i) => i !== index),
    }));
  };

  // Organizer handlers
  const handleAddOrganizer = () => {
    const val = draftOrganizer.trim();
    if (!val) return;
    if (!form.organizers?.includes(val)) {
      setForm((p) => ({ ...p, organizers: [...(p.organizers || []), val] }));
    }
    setDraftOrganizer('');
  };

  const handleRemoveOrganizer = (index: number) => {
    setForm((p) => ({
      ...p,
      organizers: (p.organizers || []).filter((_, i) => i !== index),
    }));
  };

  // Toggle single candidate selection
  const toggleCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all visible
  const isAllSelected = candidates.length > 0 && candidates.every((c) => selectedCandidateIds.has(c.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCandidateIds(new Set());
    } else {
      const allIds = new Set(candidates.map((c) => c.id));
      setSelectedCandidateIds(allIds);
    }
  };

  // Add selected candidates to event participants
  const handleAddSelectedCandidates = () => {
    if (selectedCandidateIds.size === 0) return;

    const existingIds = new Set(
      form.participants.map((p) => (p.customerId || p.customerPhone || p.customerName).toLowerCase().trim())
    );

    const toAdd: EventParticipant[] = [];
    let addedCount = 0;

    for (const c of candidates) {
      if (selectedCandidateIds.has(c.id)) {
        const key = (c.id || c.phone || c.name).toLowerCase().trim();
        if (!existingIds.has(key)) {
          existingIds.add(key);
          toAdd.push({
            customerId: c.id,
            customerName: c.name,
            customerPhone: c.phone,
            workshopName: form.workshopName || c.workshopName || 'Swar Yoga Workshop',
            amount: c.amount > 0 ? c.amount : form.workshopFees || 0,
            paymentMode: c.paymentMode || 'upi',
            source: c.source,
            email: c.email,
            city: c.city,
          });
          addedCount++;
        }
      }
    }

    if (toAdd.length > 0) {
      setForm((p) => ({
        ...p,
        participants: [...p.participants, ...toAdd],
      }));
      setToastMsg(`✅ Successfully added ${addedCount} student(s) to event!`);
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      setToastMsg(`⚠️ Selected student(s) already exist in event.`);
      setTimeout(() => setToastMsg(null), 3000);
    }

    setSelectedCandidateIds(new Set());
  };

  // Manual participant add
  const addManualParticipant = () => {
    if (!draftParticipant.customerName.trim() && !draftParticipant.customerId.trim()) return;
    setForm((p) => ({
      ...p,
      participants: [
        ...p.participants,
        {
          ...draftParticipant,
          workshopName: draftParticipant.workshopName.trim() || p.workshopName,
          amount: draftParticipant.amount > 0 ? draftParticipant.amount : p.workshopFees || 0,
          source: 'manual',
        },
      ],
    }));
    setDraftParticipant({ ...EMPTY_PARTICIPANT, workshopName: form.workshopName, amount: form.workshopFees });
    setToastMsg(`✅ Added ${draftParticipant.customerName || 'Participant'}!`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const removeParticipant = (idx: number) => {
    setForm((p) => ({ ...p, participants: p.participants.filter((_, i) => i !== idx) }));
  };

  const sourceLabels: Record<string, string> = {
    leads: 'Leads',
    sales: 'Sales',
    workshops: 'Workshops',
    offer: 'Offer Form',
    manual: 'Add New',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-700 p-5 text-white flex items-center justify-between z-20 shadow-md">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📅</span> {editingEvent ? 'Edit Workshop Event' : 'Create Workshop Event'}
            </h2>
            <p className="text-xs text-purple-200 mt-0.5 font-medium">
              Configure workshop batch details, teacher/organizers roster, and manage participants
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:scale-110 transition-transform bg-white/10 hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.startDate || !form.workshopName.trim()) return;
            onSave(form);
          }}
          className="p-6 space-y-6 flex-1"
        >
          {/* Toast message */}
          {toastMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl font-bold text-sm flex items-center justify-between shadow-sm animate-fade-in">
              <span>{toastMsg}</span>
              <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Workshop Details Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>🏷️</span> Event Information
            </h3>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-semibold bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-semibold bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Workshop name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Workshop Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                list="event-workshop-options"
                value={form.workshopName}
                onChange={(e) => setForm((p) => ({ ...p, workshopName: e.target.value }))}
                placeholder="e.g. Swar Yoga L-1 Workshop"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-bold bg-white shadow-sm"
              />
              <datalist id="event-workshop-options">
                {workshopOptions.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </div>

            {/* Language & Workshop Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Workshop Language */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                  Workshop Language
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="event-language-options"
                    value={form.language || 'Hindi'}
                    onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}
                    placeholder="e.g. Hindi, English, Marathi..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-bold bg-white shadow-sm"
                  />
                  <datalist id="event-language-options">
                    {COMMON_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_LANGUAGES.slice(0, 4).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, language: lang }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        form.language === lang
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-gray-200 text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workshop Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                  Workshop Mode
                </label>
                <select
                  value={form.mode || 'online'}
                  onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-bold bg-white shadow-sm capitalize"
                >
                  {WORKSHOP_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {WORKSHOP_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, mode: m.value }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        form.mode === m.value
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-gray-200 text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Workshop time + fees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Workshop Time</label>
                <input
                  type="text"
                  value={form.workshopTime}
                  onChange={(e) => setForm((p) => ({ ...p, workshopTime: e.target.value }))}
                  placeholder="e.g. 6:00 AM - 7:30 AM"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-semibold bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Workshop Fees (₹ per person)</label>
                <input
                  type="number"
                  min={0}
                  value={form.workshopFees || ''}
                  onChange={(e) => setForm((p) => ({ ...p, workshopFees: Number(e.target.value) || 0 }))}
                  placeholder="e.g. 2100"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-bold bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Teachers & Organizers Section */}
            <div className="border-t border-slate-200 pt-3 space-y-3.5">
              {/* Main Teacher */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase flex items-center justify-between">
                  <span>Workshop Teacher (Lead)</span>
                  <span className="text-[11px] text-purple-700 font-semibold">Primary instructor</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.teacher || ''}
                    onChange={(e) => setForm((p) => ({ ...p, teacher: e.target.value }))}
                    placeholder="e.g. Mohan Kalburgi (Mohan Sir)"
                    className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-bold bg-white shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, teacher: 'Mohan Kalburgi (Mohan Sir)' }))}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
                  >
                    Set Mohan Sir
                  </button>
                </div>
              </div>

              {/* Co-Teachers (1 or more) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase flex items-center justify-between">
                  <span>Workshop Co-Teacher(s)</span>
                  <span className="text-[11px] text-gray-500 font-normal">Optional (1 or more)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftCoTeacher}
                    onChange={(e) => setDraftCoTeacher(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCoTeacher();
                      }
                    }}
                    placeholder="Enter co-teacher name and click Add"
                    className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs font-medium bg-white shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddCoTeacher}
                    disabled={!draftCoTeacher.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shadow-sm"
                  >
                    + Add Co-Teacher
                  </button>
                </div>

                {/* Co-teachers chip list */}
                {form.coTeachers && form.coTeachers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.coTeachers.map((ct, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-full shadow-xs"
                      >
                        <span>🧘 {ct}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoTeacher(idx)}
                          className="w-4 h-4 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold"
                          title="Remove co-teacher"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Workshop Organizers (1 or more) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase flex items-center justify-between">
                  <span>Workshop Organizers</span>
                  <span className="text-[11px] text-gray-500 font-normal">Optional (1 or more)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draftOrganizer}
                    onChange={(e) => setDraftOrganizer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOrganizer();
                      }
                    }}
                    placeholder="Enter organizer / coordinator name and click Add"
                    className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs font-medium bg-white shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddOrganizer}
                    disabled={!draftOrganizer.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 shadow-sm"
                  >
                    + Add Organizer
                  </button>
                </div>

                {/* Organizers chip list */}
                {form.organizers && form.organizers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.organizers.map((org, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-full shadow-xs"
                      >
                        <span>🤝 {org}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrganizer(idx)}
                          className="w-4 h-4 rounded-full hover:bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold"
                          title="Remove organizer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Notes / Instructions</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm bg-white shadow-sm"
                placeholder="Optional notes or Zoom meeting details for this workshop batch..."
              />
            </div>
          </div>

          {/* Add Student Ingestion Section */}
          <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-b from-purple-50/70 to-indigo-50/50 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
                  <span>👥</span> Add Student / Participant
                </h3>
                <p className="text-xs text-purple-800">
                  Select a source dropdown, choose one or multiple students, and click submit.
                </p>
              </div>

              {/* Source Dropdown / Buttons */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase text-purple-900">Select Source:</label>
                <select
                  value={studentSource}
                  onChange={(e) => {
                    setStudentSource(e.target.value as any);
                    setSelectedCandidateIds(new Set());
                  }}
                  className="px-3.5 py-1.5 bg-white border-2 border-purple-400 rounded-xl font-bold text-purple-900 text-sm focus:ring-2 focus:ring-purple-600 shadow-sm"
                >
                  <option value="leads">📋 Leads (CRM)</option>
                  <option value="sales">💰 Sales Reports</option>
                  <option value="workshops">🧘 Workshops</option>
                  <option value="offer">📄 Offer Forms</option>
                  <option value="manual">✍️ Add New (Manual)</option>
                </select>
              </div>
            </div>

            {/* Quick Source Pill Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['leads', 'sales', 'workshops', 'offer', 'manual'] as const).map((src) => {
                const active = studentSource === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      setStudentSource(src);
                      setSelectedCandidateIds(new Set());
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      active
                        ? 'bg-purple-700 text-white shadow-purple-200'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-purple-100 hover:text-purple-800'
                    }`}
                  >
                    {src === 'leads' && '📋 Leads'}
                    {src === 'sales' && '💰 Sales'}
                    {src === 'workshops' && '🧘 Workshops'}
                    {src === 'offer' && '📄 Offer Form'}
                    {src === 'manual' && '✍️ Add New (Manual)'}
                  </button>
                );
              })}
            </div>

            {/* Candidate Browser for Leads / Sales / Workshops / Offers */}
            {studentSource !== 'manual' ? (
              <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm space-y-3">
                {/* Search Bar & Multi-Select Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                      🔍
                    </span>
                    <input
                      type="text"
                      value={candidateQuery}
                      onChange={(e) => setCandidateQuery(e.target.value)}
                      placeholder={`Search ${sourceLabels[studentSource]} by name, phone, email, or workshop...`}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {candidateQuery && (
                      <button
                        type="button"
                        onClick={() => setCandidateQuery('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Multi-Select Submit Button */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900 whitespace-nowrap">
                      {selectedCandidateIds.size} selected
                    </span>
                    <button
                      type="button"
                      disabled={selectedCandidateIds.size === 0}
                      onClick={handleAddSelectedCandidates}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors shadow disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                    >
                      <span>➕</span>
                      <span>Add Selected ({selectedCandidateIds.size})</span>
                    </button>
                  </div>
                </div>

                {/* Candidate List Table */}
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {loadingCandidates ? (
                    <div className="p-8 text-center text-gray-500 text-sm font-medium flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      Loading {sourceLabels[studentSource]}...
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                      No matching records found in {sourceLabels[studentSource]}. Try a different search term.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-purple-50 text-purple-900 sticky top-0 z-10 border-b border-purple-200 font-extrabold">
                        <tr>
                          <th className="p-2.5 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                              title="Select / Deselect All"
                            />
                          </th>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Phone / Contact</th>
                          <th className="p-2.5">Source / Batch</th>
                          <th className="p-2.5">City</th>
                          <th className="p-2.5 text-right">Fee / Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {candidates.map((c) => {
                          const isSelected = selectedCandidateIds.has(c.id);
                          return (
                            <tr
                              key={c.id}
                              onClick={() => toggleCandidate(c.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-purple-100/70 font-semibold' : 'hover:bg-purple-50/50'
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCandidate(c.id)}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                                />
                              </td>
                              <td className="p-2.5 text-gray-900 font-bold">
                                {c.name}
                                {c.email && <div className="text-[10px] text-gray-500 font-normal">{c.email}</div>}
                              </td>
                              <td className="p-2.5 font-mono text-gray-700">{c.phone || '—'}</td>
                              <td className="p-2.5 text-gray-600">{c.workshopName || c.details || '—'}</td>
                              <td className="p-2.5 text-gray-600">{c.city || '—'}</td>
                              <td className="p-2.5 text-right text-gray-900 font-bold">
                                {c.amount > 0 ? `₹${c.amount}` : form.workshopFees > 0 ? `₹${form.workshopFees}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>Showing up to {candidates.length} candidates from {sourceLabels[studentSource]}</span>
                  {selectedCandidateIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleAddSelectedCandidates}
                      className="text-purple-700 font-bold hover:underline"
                    >
                      Click here to submit {selectedCandidateIds.size} student(s) →
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Manual Add New Participant */
              <div className="rounded-xl border border-purple-200 bg-white p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                  <input
                    type="text"
                    value={draftParticipant.customerId}
                    onChange={(e) => setDraftParticipant((p) => ({ ...p, customerId: e.target.value }))}
                    placeholder="Student ID"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 sm:col-span-1"
                  />
                  <input
                    type="text"
                    value={draftParticipant.customerName}
                    onChange={(e) => setDraftParticipant((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="Full Name *"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 sm:col-span-2 font-bold"
                  />
                  <input
                    type="text"
                    value={draftParticipant.customerPhone}
                    onChange={(e) => setDraftParticipant((p) => ({ ...p, customerPhone: e.target.value }))}
                    placeholder="WhatsApp Number"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 sm:col-span-1"
                  />
                  <input
                    type="number"
                    min={0}
                    value={draftParticipant.amount || ''}
                    onChange={(e) => setDraftParticipant((p) => ({ ...p, amount: Number(e.target.value) || 0 }))}
                    placeholder="Amount ₹"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 sm:col-span-1"
                  />
                  <select
                    value={draftParticipant.paymentMode}
                    onChange={(e) => setDraftParticipant((p) => ({ ...p, paymentMode: e.target.value }))}
                    className="px-2 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 sm:col-span-1 capitalize"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addManualParticipant}
                  className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white text-xs font-bold hover:bg-purple-700 transition shadow-sm"
                >
                  + Add Participant Manually
                </button>
              </div>
            )}
          </div>

          {/* Current Event Participants Table */}
          <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>📋</span> Event Roster ({form.participants.length} Participants)
              </h3>
              <div className="text-xs font-extrabold text-purple-700">
                Total Fees: ₹{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {form.participants.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Phone / ID</th>
                      <th className="px-3 py-2.5">Workshop</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5">Payment</th>
                      <th className="px-3 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.participants.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 text-gray-900 transition-colors">
                        <td className="px-3 py-2 font-mono text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-gray-900">{p.customerName}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">
                          {p.customerPhone || p.customerId || '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{p.workshopName || form.workshopName}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.source === 'leads'
                                ? 'bg-blue-100 text-blue-800'
                                : p.source === 'sales'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.source === 'workshops'
                                ? 'bg-purple-100 text-purple-800'
                                : p.source === 'offer'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {p.source || 'Manual'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 uppercase text-gray-600 text-[11px] font-semibold">
                          {p.paymentMode || 'UPI'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeParticipant(idx)}
                            className="text-red-500 hover:text-red-700 font-bold p-1"
                            title="Remove from event"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-black text-gray-900 bg-slate-50">
                      <td className="px-3 py-2.5" colSpan={5}>
                        Total ({form.participants.length} students)
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-purple-700">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-gray-300">
                No participants added yet. Use the dropdown above to add students from Leads, Sales, Workshops, or Offers.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving Event...
                </>
              ) : editingEvent ? (
                'Save Changes'
              ) : (
                'Create Event & Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
