'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Video, Settings, UserPlus, Upload, RefreshCw, 
  PlayCircle, Eye, Calendar, Plus, X, Trash2, Edit2, 
  Save, BarChart2, CheckCircle2, AlertCircle, Link, Mail, Phone, GraduationCap, Download, Printer, Send, Search, FileSpreadsheet, Copy, MessageCircle, QrCode, ExternalLink
} from 'lucide-react';

interface Cohort { _id: string; name: string; startDate: string; endDate?: string; holidayDates?: string[]; classStartTime?: string; classEndTime?: string; zoomMeetingId?: string; zoomJoinUrl?: string; whatsappGroupLink?: string; googleFormLink?: string; aiWorkerEnabled?: boolean; autoSendRecordings?: boolean; autoRecoverZoomTrash?: boolean; daySubjects?: Array<{ day: number; subject: string }>; }
interface Student { _id: string; name: string; email?: string; phone?: string; whatsappNumber?: string; leadId?: string; leadNumber?: string; active: boolean; metadata?: { city?: string; country?: string; [key: string]: any }; }
interface Attendance { studentId: string; classDate: string; joined: boolean; durationSeconds: number; attendancePercent: number; }
interface AttendanceChartRow { classDate: string; dayNumber: number; holiday: boolean; durationMinutes: string; status: 'joined' | 'absent' | 'holiday'; }
interface Recording { 
  _id: string; 
  cohortId: string; 
  classDate: string; 
  dayNumber?: number; 
  youtubeSpeakerId?: string; 
  youtubeGalleryId?: string; 
  youtubeSpeakerUrl?: string; 
  youtubeGalleryUrl?: string; 
  bunnySpeakerUrl?: string; 
  bunnyGalleryUrl?: string; 
  deliveredStudentIds?: string[];
  metadata?: {
    subject?: string;
    zoomSpeakerUrl?: string;
    zoomGalleryUrl?: string;
    zoomShareUrl?: string;
    zoomPassword?: string;
    lastZoomSyncAt?: string;
    [key: string]: any;
  };
}

function toDateKey(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export default function WorkshopManagementPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<Cohort | null>(null);

  const cohortHolidaySet = useMemo(() => {
    return new Set(
      (selected?.holidayDates || [])
        .map(d => toDateKey(d) || (typeof d === 'string' ? d.slice(0, 10) : ''))
        .filter((d): d is string => Boolean(d))
    );
  }, [selected?.holidayDates]);

  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentEditForm, setStudentEditForm] = useState({ name: '', email: '', phone: '', whatsappNumber: '', active: true });
  
  // Message Sending State
  const [messageModal, setMessageModal] = useState<{ student: Student, channel: 'qr' | 'meta' | 'email' } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [syncingRecordings, setSyncingRecordings] = useState(false);
  const DEFAULT_DAY_SUBJECTS = Array.from({ length: 15 }, (_, i) => ({ day: i + 1, subject: '' }));
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', googleFormLink: '', youtubePlaylistName: '', thumbnailUrl: '', aiWorkerEnabled: true, autoSendRecordings: false, autoRecoverZoomTrash: false, daySubjects: DEFAULT_DAY_SUBJECTS });
  const [student, setStudent] = useState({ name: '', email: '', phone: '', whatsappNumber: '' });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: '', classDate: '', durationMinutes: '0', classDurationMinutes: '60' });
  const [recordingForm, setRecordingForm] = useState({ classDate: '', youtubeSpeakerId: '', youtubeGalleryId: '', bunnySpeakerUrl: '', bunnyGalleryUrl: '', deliveredStudentIds: '' });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'students' | 'recordings' | 'settings' | 'analytics'>('students');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentTab, setAddStudentTab] = useState<'manual' | 'whatsapp' | 'leads' | 'import' | 'systemform'>('manual');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState<any[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const [quickBroadcastMode, setQuickBroadcastMode] = useState<'qr' | 'meta' | 'email' | null>(null);
  const [quickBroadcastMsg, setQuickBroadcastMsg] = useState('');
  const [quickBroadcastSubject, setQuickBroadcastSubject] = useState('');
  const [quickBroadcastSending, setQuickBroadcastSending] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  
  // Import State
  const [importingStudents, setImportingStudents] = useState(false);
  const [studentImportFile, setStudentImportFile] = useState<File | null>(null);
  const [studentImportColumns, setStudentImportColumns] = useState<string[]>([]);
  const [studentImportMapping, setStudentImportMapping] = useState({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
  const [selectedImportFields, setSelectedImportFields] = useState<string[]>(['name', 'email', 'phone', 'whatsappNumber', 'whatsappJid']);
  const [googleFormLink, setGoogleFormLink] = useState('');
  
  // Actions State
  const [syncingWhatsapp, setSyncingWhatsapp] = useState(false);
  const [syncingZoomAttendance, setSyncingZoomAttendance] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [attendanceChart, setAttendanceChart] = useState<AttendanceChartRow[]>([]);
  const [chartClassDuration, setChartClassDuration] = useState('60');
  const [savingChart, setSavingChart] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [runningWorker, setRunningWorker] = useState(false);

  // New Features State
  const [communities, setCommunities] = useState<any[]>([]);
  const [recordingSetup, setRecordingSetup] = useState({ zoomMeetingId: '', communityId: '', thumbnailUrl: '', youtubePlaylistName: '' });
  const [savingRecordingSetup, setSavingRecordingSetup] = useState(false);
  const [systemFormLink, setSystemFormLink] = useState('');
  const [syncingSystemForm, setSyncingSystemForm] = useState(false);

  // Edit/Delete workshop state
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editCohortForm, setEditCohortForm] = useState({ name: '', startDate: '', endDate: '', holidayDates: [] as string[], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', googleFormLink: '', youtubePlaylistName: '', thumbnailUrl: '', autoSendRecordings: false, autoSyncZoomAttendance: true, autoRecoverZoomTrash: false, daySubjects: Array.from({ length: 15 }, (_, i) => ({ day: i + 1, subject: '' })) });
  const [zoomMeetingIdInput, setZoomMeetingIdInput] = useState('');
  const [zoomJoinUrlInput, setZoomJoinUrlInput] = useState('');
  const [savingZoomConfig, setSavingZoomConfig] = useState(false);
  const [editingRecordingUrls, setEditingRecordingUrls] = useState<{ id: string; classDate: string; dayNumber?: number; youtubeSpeakerUrl: string; youtubeGalleryUrl: string; bunnySpeakerUrl: string; } | null>(null);
  const [savingRecordingUrls, setSavingRecordingUrls] = useState(false);

  // Auto-calculate end date for Create form
  useEffect(() => {
    if (form.startDate) {
      const start = new Date(form.startDate);
      if (!isNaN(start.getTime())) {
        const validHolidays = form.holidayDates.filter(d => d).length;
        // 14 day class: start date + 13 days + number of holidays
        const daysToAdd = 13 + validHolidays;
        const end = new Date(start);
        end.setDate(end.getDate() + daysToAdd);
        setForm(prev => ({ ...prev, endDate: end.toISOString().split('T')[0] }));
      }
    }
  }, [form.startDate, form.holidayDates]);

  // Auto-calculate end date for Edit form
  useEffect(() => {
    if (editCohortForm.startDate) {
      const start = new Date(editCohortForm.startDate);
      if (!isNaN(start.getTime())) {
        const validHolidays = (editCohortForm.holidayDates || []).filter(d => d).length;
        const daysToAdd = 13 + validHolidays;
        const end = new Date(start);
        end.setDate(end.getDate() + daysToAdd);
        setEditCohortForm(prev => ({ ...prev, endDate: end.toISOString().split('T')[0] }));
      }
    }
  }, [editCohortForm.startDate, editCohortForm.holidayDates]);
  const [savingEditCohort, setSavingEditCohort] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async (cohortId?: string) => {
    try {
      const res = await fetch(`/api/admin/crm/workshop-management${cohortId ? `?cohortId=${cohortId}` : ''}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Workshop API returned ${res.status}`);
      setLoadError('');
      if (cohortId) {
        setStudents(data.students || []);
        setSelectedStudentIds([]);
        setAttendance(data.attendance || []);
        setRecordings(data.recordings || []);
        setGoogleFormLink(data.cohort?.googleFormLink || '');
        setRecordingSetup({
          zoomMeetingId: data.cohort?.zoomMeetingId || '',
          communityId: data.zoomMapping?.communityId || data.cohort?.communityId || '',
          thumbnailUrl: data.zoomMapping?.thumbnailUrl || '',
          youtubePlaylistName: data.zoomMapping?.youtubePlaylistName || ''
        });
        if (data.students?.length && !attendanceForm.studentId) setAttendanceForm((prev) => ({ ...prev, studentId: data.students[0]._id }));
      } else {
        setCohorts(data.cohorts || []);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load workshops');
    }
  };

  useEffect(() => { 
    load(); 
    fetch('/api/admin/community/list', { headers }).then(r => r.json()).then(d => setCommunities(d.communities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected?._id) return;
    const refreshRecordings = () => { void load(selected._id); };
    const timer = window.setInterval(refreshRecordings, 60_000);
    return () => window.clearInterval(timer);
  }, [selected?._id]);

  useEffect(() => {
    if (selected) {
      setZoomMeetingIdInput(selected.zoomMeetingId || '');
      setZoomJoinUrlInput(selected.zoomJoinUrl || '');
    }
  }, [selected?._id, selected?.zoomMeetingId, selected?.zoomJoinUrl]);

  const addHolidayDateField = () => {
    setForm((prev) => {
      if (prev.holidayDates.length >= 6) return prev;
      return { ...prev, holidayDates: [...prev.holidayDates, ''] };
    });
  };

  const removeHolidayDateField = (index: number) => {
    setForm((prev) => {
      if (prev.holidayDates.length <= 3) return prev;
      return { ...prev, holidayDates: prev.holidayDates.filter((_, i) => i !== index) };
    });
  };

  const createCohort = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const holidayDates = form.holidayDates.map((value) => value.trim()).filter(Boolean);
    if (holidayDates.length < 3 || holidayDates.length > 6) {
      setLoading(false);
      alert('Please add between 3 and 6 holiday dates.');
      return;
    }

    const res = await fetch('/api/admin/crm/workshop-management', { method: 'POST', headers, body: JSON.stringify({ ...form, holidayDates }) });
    const data = await res.json(); setLoading(false);
    if (res.ok) {
      setCohorts((prev) => [data.cohort, ...prev]);
      setSelected(data.cohort);
      setShowCreateForm(false);
      setForm({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', googleFormLink: '', youtubePlaylistName: '', thumbnailUrl: '', aiWorkerEnabled: true, autoSendRecordings: false, autoRecoverZoomTrash: false, daySubjects: DEFAULT_DAY_SUBJECTS });
      await load(data.cohort._id);
    } else alert(data.error || 'Could not create workshop');
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    const res = await fetch('/api/admin/crm/workshop-management/students', { method: 'POST', headers, body: JSON.stringify({ ...student, cohortId: selected._id, source: 'manual' }) });
    const data = await res.json();
    if (res.ok) {
      setStudents((prev) => [...prev.filter((x) => x._id !== data.student._id), data.student].sort((a, b) => a.name.localeCompare(b.name)));
      setStudent({ name: '', email: '', phone: '', whatsappNumber: '' });
      setShowAddStudent(false);
      setAttendanceForm((prev) => ({ ...prev, studentId: data.student._id || prev.studentId }));
    } else {
      alert(data.error || 'Could not save student');
    }
  };

    const handleBroadcast = (type: 'meta' | 'qr' | 'email') => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student.');
      return;
    }
    const selectedStudentsList = students.filter(s => selectedStudentIds.includes(s._id));
    const contacts = selectedStudentsList.map(s => ({
      phoneNumber: s.whatsappNumber || s.phone || '',
      name: s.name,
      email: s.email || ''
    })).filter(c => type === 'email' ? c.email : c.phoneNumber);
    
    if (contacts.length === 0) {
      alert('None of the selected students have valid contact information for this broadcast type.');
      return;
    }

    sessionStorage.setItem('broadcast_preload_contacts', JSON.stringify(contacts));
    if (type === 'meta') {
      router.push('/admin/crm/broadcast');
    } else if (type === 'qr') {
      router.push('/admin/crm/qr-broadcast');
    } else {
      router.push('/admin/crm/email');
    }
  };

  const sendQuickBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBroadcastMode || selectedStudentIds.length === 0) return;
    setQuickBroadcastSending(true);
    try {
      const selectedStudentsList = students.filter(s => selectedStudentIds.includes(s._id));
      let successCount = 0;
      let errorCount = 0;
      
      for (const s of selectedStudentsList) {
        try {
          if (quickBroadcastMode === 'qr') {
            const phone = (s.whatsappNumber || s.phone || '').replace(/\D/g, '');
            if (!phone) throw new Error('No phone number');
            await fetch('/api/admin/crm/whatsapp/qr/send', {
              method: 'POST',
              headers,
              body: JSON.stringify({ number: phone.length === 10 ? '91' + phone : phone, message: quickBroadcastMsg })
            });
            successCount++;
          } else if (quickBroadcastMode === 'meta') {
            const phone = (s.whatsappNumber || s.phone || '').replace(/\D/g, '');
            if (!phone) throw new Error('No phone number');
            await fetch('/api/admin/crm/whatsapp/send', {
              method: 'POST',
              headers,
              body: JSON.stringify({ to: phone.length === 10 ? '91' + phone : phone, text: quickBroadcastMsg })
            });
            successCount++;
          } else if (quickBroadcastMode === 'email') {
            if (!s.email) throw new Error('No email');
            await fetch('/api/admin/crm/email/send', {
              method: 'POST',
              headers,
              body: JSON.stringify({ to: s.email, subject: quickBroadcastSubject, html: quickBroadcastMsg.replace(/\n/g, '<br/>') })
            });
            successCount++;
          }
        } catch (e) {
          errorCount++;
        }
      }
      alert(`Broadcast complete!\nSent: ${successCount}\nFailed/Skipped: ${errorCount}`);
      setQuickBroadcastMode(null);
      setQuickBroadcastMsg('');
      setQuickBroadcastSubject('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setQuickBroadcastSending(false);
    }
  };

  const saveStudentEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingStudent || !selected) return;
    const res = await fetch('/api/admin/crm/workshop-management/students', {
      method: 'PATCH', headers, body: JSON.stringify({ id: editingStudent._id, ...studentEditForm }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Could not update student'); return; }
    setEditingStudent(null);
    await load(selected._id);
  };

  const removeSelectedStudents = async () => {
    if (!selectedStudentIds.length || !window.confirm(`Remove ${selectedStudentIds.length} student(s) from this workshop? Their CRM Lead records and attendance history will remain.`)) return;
    await Promise.all(selectedStudentIds.map((id) => fetch(`/api/admin/crm/workshop-management/students?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers })));
    setSelectedStudentIds([]);
    if (selected) await load(selected._id);
  };

  const importStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected) return;
    setImportingStudents(true);
    const previewBody = new FormData();
    previewBody.append('cohortId', selected._id);
    previewBody.append('action', 'preview');
    previewBody.append('file', file);
    const previewRes = await fetch('/api/admin/crm/workshop-management/students/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: previewBody });
    const preview = await previewRes.json();
    setImportingStudents(false);
    if (!previewRes.ok) { alert(preview.error || 'Could not read the file'); return; }
    setStudentImportFile(file);
    setStudentImportColumns(preview.columns || []);
    setStudentImportMapping((prev) => ({
      name: prev.name || (preview.columns || []).find((c: string) => /name/i.test(c)) || '',
      email: prev.email || (preview.columns || []).find((c: string) => /email|gmail/i.test(c)) || '',
      phone: prev.phone || (preview.columns || []).find((c: string) => /phone|mobile/i.test(c)) || '',
      whatsappNumber: prev.whatsappNumber || (preview.columns || []).find((c: string) => /whatsapp/i.test(c)) || '',
      whatsappJid: prev.whatsappJid || (preview.columns || []).find((c: string) => /jid/i.test(c)) || '',
    }));
  };

  const importMappedStudents = async (fields = selectedImportFields) => {
    if (!studentImportFile || !selected) return;
    setImportingStudents(true);
    const body = new FormData();
    body.append('cohortId', selected._id);
    body.append('file', studentImportFile);
    body.append('mapping', JSON.stringify(studentImportMapping));
    body.append('selectedFields', JSON.stringify(fields));
    body.append('googleFormLink', googleFormLink);
    const res = await fetch('/api/admin/crm/workshop-management/students/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const data = await res.json();
    setImportingStudents(false);
    if (res.ok) {
      await load(selected._id);
      setStudentImportFile(null);
      setStudentImportColumns([]);
      setStudentImportMapping({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
      setSelectedImportFields(['name', 'email', 'phone', 'whatsappNumber', 'whatsappJid']);
      const rowErrors = Array.isArray(data.errors) && data.errors.length
        ? `\n\n${data.errors.slice(0, 5).join('\n')}${data.errors.length > 5 ? '\n…' : ''}`
        : '';
      alert(`Imported ${data.imported || 0} students. Skipped ${data.skipped || 0} rows.${rowErrors}`);
    } else {
      alert(data.error || 'Could not import students');
    }
  };

  const autoImportStudents = async () => {
    const allFields = importFieldOptions.map(([key]) => key);
    setSelectedImportFields(allFields);
    await importMappedStudents(allFields);
  };
  const saveRecordingSetup = async () => {
    if (!selected?._id) return;
    setSavingRecordingSetup(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ cohortId: selected._id, ...recordingSetup }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save recording setup');
      alert('Recording setup saved successfully!');
      void load(selected._id);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSavingRecordingSetup(false);
    }
  };

  const syncSystemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?._id || !systemFormLink) return;
    setSyncingSystemForm(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management/students/sync-system-form', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cohortId: selected._id, formUrl: systemFormLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not sync system form students');
      alert(`Successfully synced ${data.enrolled || 0} students from form!`);
      setSystemFormLink('');
      void load(selected._id);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSyncingSystemForm(false);
    }
  };

  const downloadAnalyticsCSV = () => {
    if (!selected) return;
    const uniqueDates = Array.from(new Set(attendance.map(a => a.classDate)))
      .filter(d => Boolean(d) && !cohortHolidaySet.has(toDateKey(d) || String(d).slice(0, 10)))
      .sort();
    const headers = ['Name', 'Mobile', 'Email', 'Fees', 'Remark', ...uniqueDates.map(d => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))];
    const rows = students.map(s => {
      const row = [
        `"${s.name}"`, 
        `"${s.whatsappNumber || s.phone || ''}"`, 
        `"${s.email || ''}"`,
        `""`,
        `""`
      ];
      uniqueDates.forEach(date => {
        const record = attendance.find(a => String(a.studentId) === String(s._id) && a.classDate === date);
        if (record && record.joined) {
          row.push(`${Math.round(record.durationSeconds / 60)} min`);
        } else {
          row.push('Absent');
        }
      });
      return row.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workshop_Report_${selected?.name || 'Cohort'}.csv`;
    a.click();
  };

  const handleEditCohort = (c: Cohort, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCohort(c);
    setEditCohortForm({
      name: c.name,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      holidayDates: c.holidayDates || [],
      classStartTime: c.classStartTime || '',
      classEndTime: c.classEndTime || '',
      zoomMeetingId: c.zoomMeetingId || '',
      zoomJoinUrl: c.zoomJoinUrl || '',
      whatsappGroupLink: c.whatsappGroupLink || '',
      googleFormLink: c.googleFormLink || '',
      youtubePlaylistName: (c as any).youtubePlaylistName || '',
      thumbnailUrl: (c as any).thumbnailUrl || '',
      autoSendRecordings: (c as any).autoSendRecordings || false,
      autoSyncZoomAttendance: (c as any).autoSyncZoomAttendance !== false,
      autoRecoverZoomTrash: (c as any).autoRecoverZoomTrash || false,
      daySubjects: (() => {
        const saved: {day: number; subject: string}[] = Array.isArray((c as any).daySubjects) ? (c as any).daySubjects : [];
        return Array.from({ length: 15 }, (_, i) => {
          const found = saved.find(s => s.day === i + 1);
          return { day: i + 1, subject: found?.subject || '' };
        });
      })(),
    });
  };

  const handleSaveEditCohort = async () => {
    if (!editingCohort) return;
    setSavingEditCohort(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ ...editCohortForm, cohortId: editingCohort._id, _fullEdit: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setCohorts(prev => prev.map(c => c._id === editingCohort._id ? data.cohort : c));
      if (selected?._id === editingCohort._id) setSelected(data.cohort);
      setEditingCohort(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEditCohort(false);
    }
  };

  const handleDeleteCohort = async (c: Cohort, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${c.name}" and ALL its students, attendance and recordings? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/crm/workshop-management?cohortId=${c._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setCohorts(prev => prev.filter(co => co._id !== c._id));
      if (selected?._id === c._id) { setSelected(null); setStudents([]); setAttendance([]); setRecordings([]); }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };
  const exportReportCsv = () => {
    if (!selected) return;
    const uniqueDates = Array.from(new Set(attendance.map(a => a.classDate)))
      .filter(d => Boolean(d) && !cohortHolidaySet.has(toDateKey(d) || String(d).slice(0, 10)))
      .sort();
    const headers = ['Name', 'Mobile', 'Email', 'Fees', 'Remark', ...uniqueDates.map(d => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))];
    const rows = students.map(s => {
      const row = [
        `"${s.name}"`, 
        `"${s.whatsappNumber || s.phone || ''}"`, 
        `"${s.email || ''}"`,
        `""`,
        `""`
      ];
      uniqueDates.forEach(date => {
        const record = attendance.find(a => String(a.studentId) === String(s._id) && a.classDate === date);
        if (record && record.joined) {
          row.push(`${Math.round(record.durationSeconds / 60)} min`);
        } else {
          row.push('Absent');
        }
      });
      return row.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workshop_Report_${selected?.name || 'Cohort'}.csv`;
    a.click();
  };

  const saveGoogleFormLink = async () => {
    if (!selected) return;
    const link = googleFormLink.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      alert('Please enter a valid Google Forms link beginning with https://');
      return;
    }
    const res = await fetch('/api/admin/crm/workshop-management', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ cohortId: selected._id, googleFormLink: link }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Could not save Google Forms link');
    else {
      setSelected(data.cohort);
      alert("Settings saved successfully.");
    }
  };

  const syncWhatsappGroup = async () => {
    if (!selected) return;
    setSyncingWhatsapp(true);
    try {
      const groupsRes = await fetch('/api/admin/crm/whatsapp/qr-bridge?path=%2Fgroups', { headers: { Authorization: `Bearer ${token}` } });
      const groupsData = await groupsRes.json();
      if (!groupsRes.ok) throw new Error(groupsData.error || 'QR WhatsApp is not connected. Scan the QR code first.');
      const groups = groupsData.data?.groups || groupsData.groups || [];
      const groupLink = selected.whatsappGroupLink || '';
      const group = groups.find((item: any) => item.id === groupLink || item.inviteCode === groupLink || (groupLink && String(groupLink).includes(item.inviteCode)) || item.name === groupLink);
      if (!group?.id) throw new Error('WhatsApp group was not found in the connected QR session. Make sure the account is a member of the group.');
      const infoRes = await fetch(`/api/admin/crm/whatsapp/qr-bridge?path=${encodeURIComponent(`/group-info/${group.id}`)}`, { headers: { Authorization: `Bearer ${token}` } });
      const infoData = await infoRes.json();
      if (!infoRes.ok) throw new Error(infoData.error || 'Could not read WhatsApp group members.');
      const participants = infoData.data?.participants || infoData.participants || group.participants || [];
      const syncRes = await fetch('/api/admin/crm/workshop-management/students/sync-whatsapp', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id, participants }) });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || 'Could not sync group students');
      await load(selected._id);
      alert(`Imported ${syncData.imported || 0} WhatsApp group participants. CRM matches: ${syncData.matchedLeads || 0}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not sync WhatsApp group');
    } finally {
      setSyncingWhatsapp(false);
    }
  };

  const searchLeads = async (query: string) => {
    setLeadSearchQuery(query);
    if (!query || query.length < 3) {
      setLeadSearchResults([]);
      return;
    }
    setIsSearchingLeads(true);
    try {
      const res = await fetch(`/api/admin/crm/sales/lookup?q=${encodeURIComponent(query)}`, { headers });
      const data = await res.json();
      if (res.ok) setLeadSearchResults(data.leads || []);
      else setLeadSearchResults([]);
    } catch {
      setLeadSearchResults([]);
    } finally {
      setIsSearchingLeads(false);
    }
  };

  const addLeadAsStudent = async (lead: any) => {
    if (!selected) return;
    const res = await fetch('/api/admin/crm/workshop-management/students', { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ 
        name: lead.name, 
        email: lead.email, 
        phone: lead.phoneNumber, 
        cohortId: selected._id, 
        source: 'crm_lead',
        leadId: lead._id,
        leadNumber: lead.leadNumber
      }) 
    });
    const data = await res.json();
    if (res.ok) {
      setStudents((prev) => [...prev.filter((x) => x._id !== data.student._id), data.student].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddStudent(false);
      alert(`${lead.name} enrolled successfully!`);
    } else {
      alert(data.error || 'Could not enroll lead');
    }
  };

  const syncZoomAttendance = async () => {
    if (!selected) return;
    setSyncingZoomAttendance(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management/attendance/zoom', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cohortId: selected._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not sync Zoom attendance');
      await load(selected._id);
      const result = data.result || {};
      alert(result.skipped
        ? (result.message || 'Zoom has not published attendance yet. It can take up to two hours after the class ends.')
        : `Zoom attendance updated: ${result.updated || 0} student records. ${result.unmatched || 0} Zoom participant(s) were not matched to enrolled students.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not sync Zoom attendance');
    } finally {
      setSyncingZoomAttendance(false);
    }
  };

  const runWorkshopWorker = async (dryRun = false) => {
    if (!selected) return;
    setRunningWorker(true);
    const res = await fetch('/api/admin/crm/workshop-management/worker', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id, dryRun }) });
    const data = await res.json();
    setRunningWorker(false);
    if (!res.ok) alert(data.error || 'Workshop worker failed');
    else {
      const zoom = data.result?.zoomAttendance;
      const attendanceNote = zoom
        ? ` Zoom attendance: ${zoom.updated || 0} updated${zoom.unmatched ? `, ${zoom.unmatched} unmatched` : ''}.`
        : '';
      alert(`Workshop worker complete. Sent: ${data.result?.sent || 0}, skipped: ${data.result?.skipped || 0}, failed: ${data.result?.failed || 0}.${attendanceNote}`);
    }
  };

  const openStudentChart = (currentStudent: Student) => {
    if (!selected) return;
    const startDateKey = toDateKey(selected.startDate);
    if (!startDateKey) {
      alert('This workshop has an invalid start date. Please correct the workshop schedule first.');
      return;
    }
    const existing = new Map(
      attendance
        .filter((row) => row.studentId === currentStudent._id)
        .map((row) => [toDateKey(row.classDate), row] as const)
        .filter(([date]) => Boolean(date)) as Array<[string, Attendance]>,
    );
    const rows: AttendanceChartRow[] = [];
    let cursor = new Date(`${startDateKey}T00:00:00Z`);
    let dayNumber = 0;
    while (rows.length < 14) {
      const date = cursor.toISOString().slice(0, 10);
      const holiday = cohortHolidaySet.has(date) || cursor.getDay() === 0;
      if (!holiday) dayNumber++;
      const saved = existing.get(date);
      rows.push({ classDate: date, dayNumber: holiday ? dayNumber : dayNumber, holiday, durationMinutes: saved ? String(Math.round((saved.durationSeconds || 0) / 60)) : '0', status: holiday ? 'holiday' : saved?.joined ? 'joined' : 'absent' });
      cursor.setDate(cursor.getDate() + 1);
    }
    setDetailStudent(currentStudent);
    setAttendanceChart(rows);
  };

  const saveStudentChart = async () => {
    if (!selected || !detailStudent) return;
    setSavingChart(true);
    const res = await fetch('/api/admin/crm/workshop-management/attendance/bulk', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id, studentId: detailStudent._id, classDurationMinutes: chartClassDuration, rows: attendanceChart }) });
    const data = await res.json();
    setSavingChart(false);
    if (!res.ok) { alert(data.error || 'Could not save attendance chart'); return; }
    await load(selected._id);
    alert(`Saved ${data.saved || 0} class attendance records.`);
  };

  const getYoutubeUrl = (idOrUrl?: string) => {
    if (!idOrUrl) return '';
    const trimmed = String(idOrUrl).trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://youtu.be/${trimmed}`;
  };

  const openStudentInbox = (s: Student, channel: 'qr' | 'meta' | 'email') => {
    const rawPhone = (s.whatsappNumber || s.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    if (channel === 'qr') {
      if (!cleanPhone) {
        alert(`No phone number saved for ${s.name}. Please edit student details first to add a phone number.`);
        return;
      }
      window.open(`/admin/crm/qr?tab=inbox&phone=${encodeURIComponent(cleanPhone)}&name=${encodeURIComponent(s.name)}`, '_blank');
    } else if (channel === 'meta') {
      if (!cleanPhone) {
        alert(`No phone number saved for ${s.name}. Please edit student details first to add a phone number.`);
        return;
      }
      window.open(`/admin/crm/meta?phone=${encodeURIComponent(cleanPhone)}&name=${encodeURIComponent(s.name)}`, '_blank');
    } else if (channel === 'email') {
      if (!s.email) {
        alert(`No email address saved for ${s.name}. Please edit student details first to add an email.`);
        return;
      }
      window.open(`/admin/crm/email?to=${encodeURIComponent(s.email)}&name=${encodeURIComponent(s.name)}`, '_blank');
    }
  };

  const syncRecordingsNow = async () => {
    if (!selected) return;
    try {
      setSyncingRecordings(true);
      const res = await fetch('/api/admin/crm/workshop-management/recordings/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cohortId: selected._id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || `Successfully synced ${data.count || 0} recording dates!`);
        await load(selected._id);
      } else {
        alert(data.error || data.message || 'Failed to sync recordings from Zoom');
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingRecordings(false);
    }
  };

  const normalizeYt = (val?: string) => {
    if (!val) return undefined;
    const t = val.trim();
    if (!t) return undefined;
    const match = t.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
    return match && match[1].length === 11 ? match[1] : t;
  };

  const saveZoomConfig = async () => {
    if (!selected) return;
    setSavingZoomConfig(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          cohortId: selected._id,
          zoomMeetingId: zoomMeetingIdInput.trim() || null,
          zoomJoinUrl: zoomJoinUrlInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Zoom settings');
      setSelected(data.cohort);
      setCohorts(prev => prev.map(c => c._id === data.cohort._id ? { ...c, zoomMeetingId: data.cohort.zoomMeetingId, zoomJoinUrl: data.cohort.zoomJoinUrl } : c));
      alert('Zoom Meeting ID & Link saved successfully! Recordings will auto-sync.');
    } catch (err: any) {
      alert(err.message || 'Failed to save Zoom settings');
    } finally {
      setSavingZoomConfig(false);
    }
  };

  const openEditUrlsModal = (recording: Recording) => {
    setEditingRecordingUrls({
      id: recording._id,
      classDate: recording.classDate,
      dayNumber: recording.dayNumber,
      youtubeSpeakerUrl: recording.youtubeSpeakerUrl || (recording.youtubeSpeakerId ? getYoutubeUrl(recording.youtubeSpeakerId) : ''),
      youtubeGalleryUrl: recording.youtubeGalleryUrl || (recording.youtubeGalleryId ? getYoutubeUrl(recording.youtubeGalleryId) : ''),
      bunnySpeakerUrl: recording.bunnySpeakerUrl || '',
    });
  };

  const saveRecordingUrlsModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecordingUrls || !selected) return;
    setSavingRecordingUrls(true);
    try {
      const ytSpeaker = editingRecordingUrls.youtubeSpeakerUrl.trim();
      const ytGallery = editingRecordingUrls.youtubeGalleryUrl.trim();
      const bunnySpeaker = editingRecordingUrls.bunnySpeakerUrl.trim();

      const res = await fetch('/api/admin/crm/workshop-management/recordings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: editingRecordingUrls.id,
          youtubeSpeakerUrl: ytSpeaker ? getYoutubeUrl(ytSpeaker) : null,
          youtubeSpeakerId: ytSpeaker ? (normalizeYt(ytSpeaker) || null) : null,
          youtubeGalleryUrl: ytGallery ? getYoutubeUrl(ytGallery) : null,
          youtubeGalleryId: ytGallery ? (normalizeYt(ytGallery) || null) : null,
          bunnySpeakerUrl: bunnySpeaker || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save URLs');
      await load(selected._id);
      setEditingRecordingUrls(null);
      alert('Recording URLs updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save URLs');
    } finally {
      setSavingRecordingUrls(false);
    }
  };

  const saveRecording = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    const studentIds = recordingForm.deliveredStudentIds.split(',').map((x) => x.trim()).filter(Boolean);
    const ytSpeaker = recordingForm.youtubeSpeakerId.trim();
    const ytGallery = recordingForm.youtubeGalleryId.trim();
    const res = await fetch('/api/admin/crm/workshop-management/recordings', { 
      method: 'POST', 
      headers, 
      body: JSON.stringify({ 
        cohortId: selected._id, 
        classDate: recordingForm.classDate || new Date().toISOString().slice(0, 10), 
        youtubeSpeakerId: normalizeYt(ytSpeaker), 
        youtubeSpeakerUrl: ytSpeaker ? getYoutubeUrl(ytSpeaker) : undefined,
        youtubeGalleryId: normalizeYt(ytGallery), 
        youtubeGalleryUrl: ytGallery ? getYoutubeUrl(ytGallery) : undefined,
        bunnySpeakerUrl: recordingForm.bunnySpeakerUrl?.trim() || undefined, 
        bunnyGalleryUrl: recordingForm.bunnyGalleryUrl?.trim() || undefined, 
        deliveredStudentIds: studentIds 
      }) 
    });
    const data = await res.json();
    if (res.ok) {
      await load(selected._id);
      setRecordingForm({ classDate: '', youtubeSpeakerId: '', youtubeGalleryId: '', bunnySpeakerUrl: '', bunnyGalleryUrl: '', deliveredStudentIds: '' });
      alert("Recording saved successfully");
    } else {
      alert(data.error || 'Could not save recording delivery');
    }
  };

  const importFieldOptions = [
    ['name', 'Student name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['whatsappNumber', 'WhatsApp number'],
    ['whatsappJid', 'WhatsApp JID'],
  ] as const;
  const allImportFieldsSelected = importFieldOptions.every(([key]) => selectedImportFields.includes(key));

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Global Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <GraduationCap className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Workshop Management</h1>
            <p className="text-sm text-slate-500 font-medium">Manage cohorts, students, attendance, and recordings</p>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Add Workshop
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Workshops List */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-10 flex-shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Workshops</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{cohorts.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cohorts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-slate-500">No workshops created yet.</p>
              </div>
            ) : (
              cohorts.map((c) => (
                <div key={c._id} className={`group relative w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selected?._id === c._id
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/10'
                    : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                }`}
                  onClick={() => { setSelected(c); setActiveTab('students'); void load(c._id); }}
                >
                  <p className={`font-bold truncate pr-14 ${selected?._id === c._id ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1">
                      <Calendar size={10}/> {new Date(c.startDate).toLocaleDateString()}
                    </span>
                    {c.zoomMeetingId && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                        <Video size={10}/> Zoom Ready
                      </span>
                    )}
                  </div>
                  {/* Edit / Delete buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Edit workshop"
                      onClick={(e) => handleEditCohort(c, e)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      title="Delete workshop"
                      onClick={(e) => handleDeleteCohort(c, e)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 shadow-sm transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Selected Workshop Workspace */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          {loadError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{loadError}</span>
              <button onClick={() => void load()} className="ml-4 font-bold text-red-900 hover:underline text-sm">Retry</button>
            </div>
          )}

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <GraduationCap className="h-10 w-10 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Select a Workshop</h2>
              <p className="max-w-md">Choose a workshop from the sidebar to manage students, record attendance, and send out class recordings.</p>
            </div>
          ) : (
            <>
              {/* Workspace Header & Tabs */}
              <div className="bg-white px-8 pt-8 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selected.name}</h2>
                    <div className="flex items-center gap-4 mt-3 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Calendar size={16} className="text-slate-400"/> {selected.classStartTime || '—'} – {selected.classEndTime || '—'}</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1.5"><Users size={16} className="text-slate-400"/> {students.length} Students Enrolled</span>
                      {selected.zoomMeetingId && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <Video size={16} /> ID: <span className="font-mono text-slate-800 font-bold">{selected.zoomMeetingId}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selected.zoomMeetingId || '');
                              alert('Meeting ID copied!');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Copy Meeting ID"
                          >
                            <Copy size={13} />
                          </button>
                        </>
                      )}
                      {selected.zoomJoinUrl && (
                        <>
                          <span className="text-slate-300">|</span>
                          <a
                            href={selected.zoomJoinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                            title="Join Zoom Meeting"
                          >
                            Join Meeting <ExternalLink size={13} />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selected.zoomJoinUrl || '');
                              alert('Zoom link copied!');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Copy Zoom Link"
                          >
                            <Copy size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-8">
                  {[
                    { id: 'students', label: 'Students & Attendance', icon: Users },
                    { id: 'recordings', label: 'Recordings', icon: Video },
                    { id: 'settings', label: 'Workshop Settings', icon: Settings },
                    { id: 'analytics', label: 'Attendance Analytics', icon: BarChart2 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === tab.id 
                          ? 'border-indigo-600 text-indigo-700' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Workspace Content */}
              <div className="flex-1 overflow-y-auto p-8">
                
                {/* === STUDENTS TAB === */}
                {activeTab === 'students' && (
                  <div className="space-y-6 max-w-6xl mx-auto">
                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                      <button onClick={() => { setAddStudentTab('manual'); setShowAddStudent(true); }} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
                        <UserPlus size={16} /> Add Students
                      </button>

                      <button onClick={() => setSelectedStudentIds(students.length > 0 && selectedStudentIds.length === students.length ? [] : students.map(s => s._id))} className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-slate-200">
                        <CheckCircle2 size={16} /> {students.length > 0 && selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                      </button>
                      
                      <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
                      
                      {selected.zoomMeetingId && (
                        <button onClick={syncZoomAttendance} disabled={syncingZoomAttendance} className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-sky-100 disabled:opacity-50">
                          <RefreshCw size={16} className={syncingZoomAttendance ? 'animate-spin' : ''} />
                          {syncingZoomAttendance ? 'Syncing Zoom...' : 'Sync Zoom Data'}
                        </button>
                      )}

                      <button 
                        onClick={async () => {
                          if (!token) return;
                          if (!confirm('This will merge duplicate students (by phone, email, or exact name match) and sum their attendance durations. Proceed?')) return;
                          setLoading(true);
                          try {
                            const res = await fetch('/api/admin/crm/workshops/dedup-students', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ cohortId: selected._id })
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert(`Successfully merged ${data.data.mergedGroups} duplicate groups and deleted ${data.data.deletedStudents} duplicate students.`);
                            } else {
                              alert('Error: ' + data.error);
                            }
                          } catch (e: any) {
                            alert('Failed to dedup: ' + e.message);
                          }
                          await load(selected._id);
                          setLoading(false);
                        }}
                        className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-amber-100"
                      >
                        <Users size={16} />
                        Dedup Students
                      </button>

                      {selectedStudentIds.length > 0 && (
                        <>
                          <button onClick={() => handleBroadcast('qr')} className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-emerald-100">
                            <Phone size={16} /> QR Broadcast
                          </button>
                          <button onClick={() => handleBroadcast('meta')} className="inline-flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-teal-100">
                            <Phone size={16} /> Meta Broadcast
                          </button>
                          <button onClick={() => handleBroadcast('email')} className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-blue-100">
                            <Mail size={16} /> Email
                          </button>
                          <button onClick={removeSelectedStudents} className="ml-auto inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors border border-red-100">
                            <Trash2 size={16} /> Remove ({selectedStudentIds.length})
                          </button>
                        </>
                      )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {students.length === 0 ? (
                        <div className="text-center py-20">
                          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-700">No students yet</h3>
                          <p className="text-sm text-slate-500 mt-1">Import from Google Forms or add manually to get started.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-4 w-12">
                                  <input type="checkbox" checked={students.length > 0 && selectedStudentIds.length === students.length} onChange={(e) => setSelectedStudentIds(e.target.checked ? students.map((s) => s._id) : [])} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                </th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">#</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Code</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Name</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">WhatsApp</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Email</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">City</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Country</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Attendance</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Status</th>
                                <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {students.map((s, idx) => { 
                                const rows = attendance.filter((a) => String(a.studentId) === s._id && !cohortHolidaySet.has(toDateKey(a.classDate) || a.classDate)); 
                                const joinedCount = rows.filter((a) => a.joined).length;
                                const mins = Math.round(rows.reduce((n, a) => n + (a.durationSeconds || 0), 0) / 60);
                                return (
                                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4">
                                      <input type="checkbox" checked={selectedStudentIds.includes(s._id)} onChange={(e) => setSelectedStudentIds((prev) => e.target.checked ? [...prev, s._id] : prev.filter((id) => id !== s._id))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    </td>
                                    <td className="p-4 text-slate-400 font-semibold">{idx + 1}</td>
                                    <td className="p-4 font-mono text-slate-500 text-xs">{s.leadNumber || s.leadId?.slice(-6) || '—'}</td>
                                    <td className="p-4">
                                      <button type="button" onClick={() => openStudentChart(s)} className="text-left font-bold text-indigo-700 hover:text-indigo-900 group flex items-center gap-2">
                                        {s.name} <BarChart2 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">{s.whatsappNumber || s.phone || '—'}</td>
                                    <td className="p-4 text-slate-500 text-xs truncate max-w-[150px]" title={s.email}>{s.email || '—'}</td>
                                    <td className="p-4 text-slate-600">{s.metadata?.city || '—'}</td>
                                    <td className="p-4 text-slate-600">{s.metadata?.country || '—'}</td>
                                    <td className="p-4 text-center">
                                      <div className="font-bold text-slate-800">{joinedCount} <span className="font-normal text-slate-500 text-xs">days</span></div>
                                      <div className="text-xs text-slate-400 mt-0.5">{mins} min total</div>
                                    </td>
                                    <td className="p-4">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {s.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            setStudentEditForm({ name: s.name, email: s.email || '', phone: s.phone || '', whatsappNumber: s.whatsappNumber || '', active: s.active });
                                            setEditingStudent(s);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                                          title="Edit student details"
                                        >
                                          <Edit2 size={12} /> Edit
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'qr')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-100 transition-colors cursor-pointer" 
                                          title="Auto connect to WhatsApp QR Inbox"
                                        >
                                          <QrCode size={12} /> QR
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'meta')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-100 transition-colors cursor-pointer" 
                                          title="Auto connect to WhatsApp Meta Inbox"
                                        >
                                          <MessageCircle size={12} /> Meta
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'email')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-100 transition-colors cursor-pointer" 
                                          title="Auto connect to Email Inbox"
                                        >
                                          <Mail size={12} /> Email
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ); 
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* === RECORDINGS TAB === */}
                {activeTab === 'recordings' && (
                  <div className="max-w-5xl mx-auto space-y-6">
                    {/* Zoom Automation & Settings */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-xs flex-shrink-0">
                            <Video size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-base">Zoom Automation & Settings</h3>
                              <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                                Auto-syncs every 2 hours
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              Recordings will automatically go to <strong className="text-slate-800">YouTube</strong> (1 Speaker View + 1 Gallery View) and <strong className="text-slate-800">Bunny</strong> (Speaker View only). Both URLs are added to the deliveries below.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={syncRecordingsNow}
                            disabled={syncingRecordings || !selected.zoomMeetingId}
                            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Trigger immediate sync from Zoom Cloud"
                          >
                            <RefreshCw size={14} className={syncingRecordings ? 'animate-spin' : ''} />
                            {syncingRecordings ? 'Syncing...' : 'Sync Zoom Recordings'}
                          </button>
                          {selected.zoomJoinUrl && (
                            <a
                              href={selected.zoomJoinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                              title="Launch Zoom Meeting"
                            >
                              Join Meeting <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Quick Input Fields for Meeting ID and Link */}
                      <div className="bg-white/90 rounded-xl p-4 border border-blue-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Zoom Meeting ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 85155446286"
                            value={zoomMeetingIdInput}
                            onChange={(e) => setZoomMeetingIdInput(e.target.value)}
                            className="w-full font-mono text-sm rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-6">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Zoom Join Link</span>
                            {zoomJoinUrlInput && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(zoomJoinUrlInput);
                                  alert('Zoom Join Link copied!');
                                }}
                                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={11} /> Copy Link
                              </button>
                            )}
                          </label>
                          <input
                            type="url"
                            placeholder="https://us06web.zoom.us/j/85155446286?pwd=..."
                            value={zoomJoinUrlInput}
                            onChange={(e) => setZoomJoinUrlInput(e.target.value)}
                            className="w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={saveZoomConfig}
                            disabled={savingZoomConfig}
                            className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Save size={13} />
                            {savingZoomConfig ? 'Saving...' : 'Save Settings'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1">
                        <form onSubmit={saveRecording} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-0">
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><PlayCircle size={20}/></div>
                            <h3 className="font-bold text-slate-800">New Delivery</h3>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Class Date</label>
                              <input required type="date" value={recordingForm.classDate} onChange={(e) => setRecordingForm({ ...recordingForm, classDate: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white" />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">YouTube Links (Optional)</label>
                              <input placeholder="Speaker Video ID or URL" value={recordingForm.youtubeSpeakerId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeSpeakerId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white mb-2 text-sm" />
                              <input placeholder="Gallery Video ID or URL" value={recordingForm.youtubeGalleryId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeGalleryId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Bunny URLs (Optional)</label>
                              <input placeholder="Speaker URL" value={recordingForm.bunnySpeakerUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnySpeakerUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white mb-2 text-sm" />
                              <input placeholder="Gallery URL" value={recordingForm.bunnyGalleryUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnyGalleryUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                            </div>
                            
                            <button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 font-bold text-white shadow-sm transition-colors mt-4 cursor-pointer">
                              Save Delivery
                            </button>
                          </div>
                        </form>
                      </div>
                      
                      <div className="lg:col-span-2 space-y-4">
                        {recordings.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                            <Video size={32} className="mx-auto mb-4 text-slate-300" />
                            <h4 className="font-bold text-slate-700 mb-1">No recordings yet</h4>
                            <p className="text-sm">Click &quot;Sync Zoom Recordings&quot; above to import cloud recordings or use the form to manually log deliveries.</p>
                          </div>
                        ) : (
                          recordings.map((recording) => (
                            <div key={recording._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4 hover:border-indigo-200 transition-colors">
                              <div className="bg-indigo-50 px-4 py-3 rounded-xl text-center min-w-[80px] flex flex-col justify-center">
                                <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Day</p>
                                <input 
                                  type="text" 
                                  className="w-12 text-center text-2xl font-black text-indigo-700 bg-transparent border-b-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 focus:outline-none transition-colors mx-auto"
                                  defaultValue={recording.dayNumber || ''}
                                  placeholder="-"
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    if (val && val === String(recording.dayNumber)) return;
                                    try {
                                      await fetch('/api/admin/crm/workshop-management/recordings', {
                                        method: 'PATCH',
                                        headers,
                                        body: JSON.stringify({ id: recording._id, dayNumber: val || null })
                                      });
                                      if (selected) await load(selected._id);
                                    } catch (err) {}
                                  }}
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h4 className="font-bold text-slate-800 text-lg">{new Date(recording.classDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
                                  <button
                                    type="button"
                                    onClick={() => openEditUrlsModal(recording)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                                    title="Edit YouTube & Bunny URLs for this day"
                                  >
                                    <Edit2 size={12} /> Edit URLs
                                  </button>
                                </div>
                                <input 
                                  type="text"
                                  className="w-full text-sm font-medium text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors pb-1"
                                  placeholder="Enter subject name..."
                                  defaultValue={recording.metadata?.subject || (selected.daySubjects?.find((d: any) => d.day === recording.dayNumber)?.subject) || ''}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    if (val === (recording.metadata?.subject || '')) return;
                                    try {
                                      await fetch('/api/admin/crm/workshop-management/recordings', {
                                        method: 'PATCH',
                                        headers,
                                        body: JSON.stringify({ id: recording._id, subject: val })
                                      });
                                      if (selected) await load(selected._id);
                                    } catch (err) {}
                                  }}
                                />
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Speaker View</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {(recording.youtubeSpeakerUrl || recording.youtubeSpeakerId) ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition-colors shadow-xs" 
                                            href={getYoutubeUrl(recording.youtubeSpeakerUrl || recording.youtubeSpeakerId)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            title="Watch Speaker View on YouTube"
                                          >
                                            <PlayCircle size={13}/> YouTube
                                          </a>
                                          <button 
                                            type="button"
                                            onClick={() => { 
                                              navigator.clipboard.writeText(getYoutubeUrl(recording.youtubeSpeakerUrl || recording.youtubeSpeakerId)); 
                                              alert('YouTube link copied!'); 
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer" 
                                            title="Copy YouTube URL"
                                          >
                                            <Copy size={13}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50/60 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-dashed border-red-200 hover:border-red-300 transition-colors cursor-pointer"
                                          title="Add YouTube Speaker URL"
                                        >
                                          <Plus size={12}/> YouTube
                                        </button>
                                      )}

                                      {recording.bunnySpeakerUrl ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors shadow-xs" 
                                            href={recording.bunnySpeakerUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            title="Watch Speaker View on Bunny CDN"
                                          >
                                            <PlayCircle size={13}/> Bunny
                                          </a>
                                          <button 
                                            type="button"
                                            onClick={() => { 
                                              navigator.clipboard.writeText(recording.bunnySpeakerUrl!); 
                                              alert('Bunny link copied!'); 
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer" 
                                            title="Copy Bunny URL"
                                          >
                                            <Copy size={13}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50/60 hover:bg-orange-50 px-2.5 py-1.5 rounded-lg border border-dashed border-orange-200 hover:border-orange-300 transition-colors cursor-pointer"
                                          title="Add Bunny Speaker URL"
                                        >
                                          <Plus size={12}/> Bunny
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gallery View</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {(recording.youtubeGalleryUrl || recording.youtubeGalleryId) ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition-colors shadow-xs" 
                                            href={getYoutubeUrl(recording.youtubeGalleryUrl || recording.youtubeGalleryId)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            title="Watch Gallery View on YouTube"
                                          >
                                            <PlayCircle size={13}/> YouTube
                                          </a>
                                          <button 
                                            type="button"
                                            onClick={() => { 
                                              navigator.clipboard.writeText(getYoutubeUrl(recording.youtubeGalleryUrl || recording.youtubeGalleryId)); 
                                              alert('YouTube link copied!'); 
                                            }} 
                                            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer" 
                                            title="Copy YouTube URL"
                                          >
                                            <Copy size={13}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50/60 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-dashed border-red-200 hover:border-red-300 transition-colors cursor-pointer"
                                          title="Add YouTube Gallery URL"
                                        >
                                          <Plus size={12}/> YouTube
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(recording.metadata?.zoomSpeakerUrl || recording.metadata?.zoomShareUrl) && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <div className="flex items-center gap-2">
                                      <span>Zoom Cloud Backup:</span>
                                      <a 
                                        href={recording.metadata?.zoomSpeakerUrl || recording.metadata?.zoomShareUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        Open in Zoom <ExternalLink size={10}/>
                                      </a>
                                    </div>
                                    {recording.metadata?.zoomPassword && (
                                      <div className="flex items-center gap-1 text-slate-500">
                                        <span>Passcode:</span>
                                        <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold select-all">{recording.metadata.zoomPassword}</code>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                                  <Users size={14}/> {(recording.deliveredStudentIds || []).length || 0}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* === SETTINGS TAB === */}
                {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Google Form Settings */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><Link size={20}/></div>
                        <h3 className="font-bold text-slate-800">Google Form Integration</h3>
                      </div>
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-700">CRM Form URL</label>
                        <input type="url" placeholder="https://swaryoga.com/enquiry?w=..." value={googleFormLink} onChange={(e) => setGoogleFormLink(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                        <div className="flex gap-3">
                          <button type="button" onClick={saveGoogleFormLink} className="flex-1 rounded-xl bg-slate-800 text-white font-bold py-2.5 hover:bg-slate-900 transition-colors text-sm">Save Link</button>
                          <button type="button" onClick={() => { if (googleFormLink) window.open(googleFormLink, '_blank'); }} className="flex-1 rounded-xl border border-slate-200 text-slate-700 font-bold py-2.5 hover:bg-slate-50 transition-colors text-sm">Open Form</button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Automations */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><Settings size={20}/></div>
                        <h3 className="font-bold text-slate-800">Automations</h3>
                      </div>
                      <div className="space-y-4">
                        <button type="button" onClick={() => void runWorkshopWorker(true)} disabled={runningWorker} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${runningWorker ? "border-yellow-200 bg-yellow-50" : "border-violet-200 bg-violet-50 hover:bg-violet-100 disabled:opacity-50"}`}>
                          <div>
                            {runningWorker ? (
                            <>
                              <p className="font-bold text-yellow-900">Processing...</p>
                              <p className="text-xs text-yellow-700 mt-1">Please wait, this may take a few minutes</p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-violet-900">Preview AI Worker</p>
                              <p className="text-xs text-violet-700 mt-1">Simulate tasks without sending messages</p>
                            </>
                          )}
                          </div>
                          {runningWorker ? <RefreshCw className="text-yellow-600 animate-spin" /> : <Eye className="text-violet-500" />}
                        </button>
                        <button type="button" onClick={() => void runWorkshopWorker(false)} disabled={runningWorker} className={`w-full flex items-center justify-between p-4 rounded-xl shadow-sm transition-colors text-left text-white ${runningWorker ? "bg-yellow-500" : "bg-violet-600 hover:bg-violet-700 disabled:opacity-50"}`}>
                          <div>
                            <p className="font-bold">{runningWorker ? "Uploading & Syncing..." : "Run AI Worker Now"}</p>
                            <p className="text-xs mt-1 text-white/80">{runningWorker ? "Processing Zoom recordings (this takes a few mins)" : "Execute pending tasks and messages immediately"}</p>
                          </div>
                          {runningWorker ? <RefreshCw className="text-white animate-spin" /> : <PlayCircle className="text-violet-200" />}
                        </button>
                      </div>
                    </div>
                    {/* Zoom Recording Setup */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm md:col-span-2">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Video size={20}/></div>
                        <h3 className="font-bold text-slate-800">Zoom Recording Setup</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-700">Zoom Meeting ID</label>
                          <input type="text" placeholder="123456789" value={recordingSetup.zoomMeetingId} onChange={(e) => setRecordingSetup({...recordingSetup, zoomMeetingId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                          
                          <label className="block text-sm font-bold text-slate-700 mt-4">Community</label>
                          <select value={recordingSetup.communityId} onChange={(e) => setRecordingSetup({...recordingSetup, communityId: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm">
                            <option value="">-- Select Community --</option>
                            {communities.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-700">YouTube Playlist Name (Optional)</label>
                          <input type="text" placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}" value={recordingSetup.youtubePlaylistName} onChange={(e) => setRecordingSetup({...recordingSetup, youtubePlaylistName: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />

                          <label className="block text-sm font-bold text-slate-700 mt-4">Thumbnail URL (Optional)</label>
                          <input type="url" placeholder="https://..." value={recordingSetup.thumbnailUrl} onChange={(e) => setRecordingSetup({...recordingSetup, thumbnailUrl: e.target.value})} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button type="button" onClick={saveRecordingSetup} disabled={savingRecordingSetup} className="rounded-xl bg-blue-600 text-white font-bold px-6 py-2.5 hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                          {savingRecordingSetup ? 'Saving...' : 'Save Recording Setup'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* === ANALYTICS TAB === */}
                {activeTab === 'analytics' && (() => {
                  const uniqueDates = Array.from(new Set(attendance.map(a => a.classDate)))
                    .filter(d => Boolean(d) && !cohortHolidaySet.has(toDateKey(d) || String(d).slice(0, 10)))
                    .sort();
                  const visibleStudents = analyticsSearch.trim()
                    ? students.filter(s => s.name.toLowerCase().includes(analyticsSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(analyticsSearch.toLowerCase()) || (s.phone || '').includes(analyticsSearch) || (s.whatsappNumber || '').includes(analyticsSearch))
                    : students;

                  return (
                    <div className="max-w-6xl mx-auto space-y-6">
                      <style>{`
                        @media print {
                          @page { size: landscape; margin: 1cm; }
                          body * { visibility: hidden; }
                          #analytics-print-area, #analytics-print-area * { visibility: visible; }
                          #analytics-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                          .no-print { display: none !important; }
                        }
                      `}</style>
                      <div id="analytics-print-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 gap-4 no-print">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><BarChart2 size={20}/></div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">Daily Attendance Analytics</h3>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span>Overview of student attendance durations across all classes.</span>
                                {cohortHolidaySet.size > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    {cohortHolidaySet.size} Holiday{cohortHolidaySet.size > 1 ? 's' : ''} Hidden from Report
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {selected.zoomMeetingId && (
                              <button onClick={syncZoomAttendance} disabled={syncingZoomAttendance} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                                <RefreshCw size={16} className={syncingZoomAttendance ? 'animate-spin' : ''} />
                                {syncingZoomAttendance ? 'Syncing...' : 'Sync Zoom Data'}
                              </button>
                            )}
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                              <Printer size={16} />
                              Print Report
                            </button>
                            <button onClick={downloadAnalyticsCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors">
                              <Download size={16} />
                              Download CSV
                            </button>
                          </div>
                        </div>
                        <div className="overflow-x-auto print:overflow-visible">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-4 w-12 text-center">#</th>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Phone / WA</th>
                                <th className="px-6 py-4">Email</th>
                                {uniqueDates.map(date => (
                                  <th key={date} className="px-4 py-4 whitespace-nowrap">{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</th>
                                ))}
                                <th className="px-4 py-4 whitespace-nowrap text-right no-print">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {visibleStudents.map((s, idx) => (
                                <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-4 text-slate-400 font-semibold text-xs">{idx + 1}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="font-bold text-slate-800">{s.name}</p>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <p className="text-xs text-slate-600 font-medium">{s.whatsappNumber || s.phone || <span className="text-slate-300">—</span>}</p>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <p className="text-xs text-slate-400">{s.email || <span className="text-slate-300">—</span>}</p>
                                  </td>
                                  {uniqueDates.map(date => {
                                    const record = attendance.find(a => String(a.studentId) === String(s._id) && a.classDate === date);
                                    const recording = recordings.find(r => r.classDate === date);
                                    const hasRecording = !!(recording?.youtubeSpeakerUrl || recording?.youtubeGalleryUrl || recording?.bunnySpeakerUrl || recording?.bunnyGalleryUrl || recording?.metadata?.zoomSpeakerUrl || recording?.metadata?.zoomShareUrl);

                                    if (record && record.joined) {
                                      const mins = Math.round(record.durationSeconds / 60);
                                      return (
                                        <td key={date} className="px-4 py-4">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
                                            {mins} min
                                          </span>
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={date} className="px-4 py-4">
                                        <div className="flex flex-col gap-1">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 font-semibold text-xs border border-rose-100">
                                            Absent
                                          </span>
                                          {hasRecording && (
                                            <button
                                              title="Send recording to this student"
                                              onClick={() => {
                                                const url = recording?.youtubeSpeakerUrl || recording?.youtubeGalleryUrl || recording?.bunnySpeakerUrl || recording?.bunnyGalleryUrl || recording?.metadata?.zoomSpeakerUrl || recording?.metadata?.zoomShareUrl || '';
                                                const msg = encodeURIComponent(`Hi ${s.name}, you missed class on ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Here is the recording: ${url}`);
                                                const phone = (s.whatsappNumber || s.phone || '').replace(/\D/g, '');
                                                if (phone) {
                                                  window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${msg}`, '_blank');
                                                } else {
                                                  alert('No mobile number found for this student. Please edit and add their number first.');
                                                }
                                              }}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 font-semibold text-xs border border-sky-100 hover:bg-sky-100 transition-colors"
                                            >
                                              <Send size={10} /> Send
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-4 whitespace-nowrap no-print">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setStudentEditForm({ name: s.name, email: s.email || '', phone: s.phone || '', whatsappNumber: s.whatsappNumber || '', active: s.active });
                                          setEditingStudent(s);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                                        title="Edit student details"
                                      >
                                        <Edit2 size={12} /> Edit
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'qr')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-100 transition-colors cursor-pointer" 
                                        title="Auto connect to WhatsApp QR Inbox"
                                      >
                                        <QrCode size={12} /> QR
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'meta')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-100 transition-colors cursor-pointer" 
                                        title="Auto connect to WhatsApp Meta Inbox"
                                      >
                                        <MessageCircle size={12} /> Meta
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'email')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold border border-violet-100 transition-colors cursor-pointer" 
                                        title="Auto connect to Email Inbox"
                                      >
                                        <Mail size={12} /> Email
                                      </button>

                                      <button 
                                        onClick={() => { setMessageModal({ student: s, channel: 'qr' }); setMessageText(''); }} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" 
                                        title="Quick message modal"
                                      >
                                        <Send size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {visibleStudents.length === 0 && students.length > 0 && (
                                <tr><td colSpan={5 + uniqueDates.length} className="px-6 py-8 text-center text-slate-400 text-sm">No students match your search.</td></tr>
                              )}
                              {students.length === 0 && (
                                <tr>
                                  <td colSpan={5 + uniqueDates.length} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                      <BarChart2 size={40} className="text-slate-200" />
                                      <p className="text-slate-500 font-semibold">No attendance data yet</p>
                                      {selected.zoomMeetingId ? (
                                        <>
                                          <p className="text-xs text-slate-400 max-w-sm">Click <strong>Sync Zoom</strong> above to auto-import attendance from Zoom. Data is available ~2 hours after each class ends.</p>
                                          <button onClick={syncZoomAttendance} disabled={syncingZoomAttendance} className="mt-1 flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                                            <RefreshCw size={15} className={syncingZoomAttendance ? 'animate-spin' : ''} />
                                            {syncingZoomAttendance ? 'Syncing...' : 'Sync Zoom Data Now'}
                                          </button>
                                        </>
                                      ) : (
                                        <p className="text-xs text-slate-400 max-w-sm">Add a Zoom Meeting ID in <strong>Workshop Settings</strong> to enable auto-sync of attendance.</p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
              </div>
            </>
          )}
        </main>
      </div>

      {/* ================= MODALS ================= */}

      {/* Create Workshop Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Create New Workshop</h2>
              <button onClick={() => setShowCreateForm(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="create-form" onSubmit={createCohort} className="grid gap-5 sm:grid-cols-2">
                {([['name','Workshop Name', 'text'],['startDate','Start Date', 'date'],['endDate','End Date', 'date'],['classStartTime','Start Time', 'time'],['classEndTime','End Time', 'time'],['zoomMeetingId','Zoom Meeting ID', 'text'],['zoomJoinUrl','Zoom Join Link', 'url'],['whatsappGroupLink','WA Group Link', 'url'],['googleFormLink','CRM Form URL', 'url']] as const).map(([key, label, type]) => (
                  <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label} {key === 'name' || key === 'startDate' ? <span className="text-red-500">*</span> : ''}</label>
                    <input required={key === 'name' || key === 'startDate'} type={type} value={form[key as keyof typeof form] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                ))}

                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Holiday Dates (3 to 6)</label>
                    <button type="button" onClick={addHolidayDateField} disabled={form.holidayDates.length >= 6} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">+ Add Holiday</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {form.holidayDates.map((value, index) => (
                      <div key={`holiday-${index}`} className="flex items-center gap-2">
                        <input type="date" value={value} onChange={(e) => setForm((prev) => ({ ...prev, holidayDates: prev.holidayDates.map((date, dateIndex) => dateIndex === index ? e.target.value : date) }))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white" />
                        {form.holidayDates.length > 3 && (
                          <button type="button" onClick={() => removeHolidayDateField(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* YouTube Playlist & Thumbnail */}
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Recording Details</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">YouTube Playlist Name</label>
                      <input type="text" placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}" value={form.youtubePlaylistName} onChange={(e) => setForm({ ...form, youtubePlaylistName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Thumbnail URL</label>
                      <input type="url" placeholder="https://..." value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                    </div>
                  </div>
                </div>

                {/* Day 1-15 Subject Schedule */}
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Day-by-Day Subject Schedule (Day 1 – 15)</label>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {form.daySubjects.map((ds, idx) => (
                      <div key={ds.day} className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                        <span className="text-xs font-bold text-indigo-600 whitespace-nowrap w-10">Day {ds.day}</span>
                        <input
                          type="text"
                          placeholder="Subject name"
                          value={ds.subject}
                          onChange={(e) => setForm(prev => ({ ...prev, daySubjects: prev.daySubjects.map((d, i) => i === idx ? { ...d, subject: e.target.value } : d) }))}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={form.aiWorkerEnabled} onChange={(e) => setForm({ ...form, aiWorkerEnabled: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" /> 
                    <span className="font-bold text-violet-900 text-sm">Enable Workshop AI Worker</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={form.autoSendRecordings} onChange={(e) => setForm({ ...form, autoSendRecordings: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" /> 
                    <span className="font-bold text-violet-900 text-sm">Automatically send recordings by WhatsApp</span>
                  </label>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button form="create-form" type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">
                {loading ? 'Creating...' : 'Create Workshop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workshop Modal */}
            {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form onSubmit={saveStudentEdit} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Edit Student</h3>
              <button type="button" onClick={() => setEditingStudent(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                <input type="text" required value={studentEditForm.name} onChange={(e) => setStudentEditForm({ ...studentEditForm, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={studentEditForm.email} onChange={(e) => setStudentEditForm({ ...studentEditForm, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                <input type="tel" value={studentEditForm.phone} onChange={(e) => setStudentEditForm({ ...studentEditForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">WhatsApp Number</label>
                <input type="tel" value={studentEditForm.whatsappNumber} onChange={(e) => setStudentEditForm({ ...studentEditForm, whatsappNumber: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-white transition-colors">
                <input type="checkbox" checked={studentEditForm.active} onChange={(e) => setStudentEditForm({ ...studentEditForm, active: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="font-bold text-slate-700 text-sm">Active Student</span>
              </label>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">Save Changes</button>
            </div>
          </form>
        </div>
      )}

            {/* Quick Broadcast Modal */}
      {quickBroadcastMode && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form onSubmit={sendQuickBroadcast} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Send {quickBroadcastMode.toUpperCase()} Broadcast</h3>
              <button type="button" onClick={() => setQuickBroadcastMode(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Sending to <strong>{selectedStudentIds.length}</strong> selected student(s).
              </p>
              {quickBroadcastMode === 'email' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                  <input type="text" required value={quickBroadcastSubject} onChange={(e) => setQuickBroadcastSubject(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" placeholder="Email Subject" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message</label>
                <textarea required rows={5} value={quickBroadcastMsg} onChange={(e) => setQuickBroadcastMsg(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm resize-none" placeholder="Type your message here..."></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button type="button" onClick={() => setQuickBroadcastMode(null)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" disabled={quickBroadcastSending} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {quickBroadcastSending ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCohort && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Edit Workshop</h2>
              <button onClick={() => setEditingCohort(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {([['name','Workshop Name','text'],['startDate','Start Date','date'],['endDate','End Date','date'],['classStartTime','Start Time','time'],['classEndTime','End Time','time'],['zoomMeetingId','Zoom Meeting ID','text'],['zoomJoinUrl','Zoom Join Link','url'],['whatsappGroupLink','WA Group Link','url'],['googleFormLink','CRM Form URL','url']] as const).map(([key, label, type]) => (
                  <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
                    <input type={type} value={editCohortForm[key as keyof typeof editCohortForm] as string} onChange={(e) => setEditCohortForm({ ...editCohortForm, [key]: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                  </div>
                ))}

                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Holiday Dates (3 to 6)</label>
                    <button type="button" onClick={() => setEditCohortForm(prev => ({ ...prev, holidayDates: [...prev.holidayDates, ''] }))} disabled={editCohortForm.holidayDates.length >= 6} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">+ Add Holiday</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {editCohortForm.holidayDates.map((value, index) => (
                      <div key={`edit-holiday-${index}`} className="flex items-center gap-2">
                        <input type="date" value={value} onChange={(e) => setEditCohortForm((prev) => ({ ...prev, holidayDates: prev.holidayDates.map((date, dateIndex) => dateIndex === index ? e.target.value : date) }))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white" />
                        <button type="button" onClick={() => setEditCohortForm(prev => ({ ...prev, holidayDates: prev.holidayDates.filter((_, i) => i !== index) }))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* YouTube Playlist & Thumbnail */}
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Recording Details</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">YouTube Playlist Name</label>
                      <input type="text" placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}" value={editCohortForm.youtubePlaylistName} onChange={(e) => setEditCohortForm({ ...editCohortForm, youtubePlaylistName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Thumbnail URL</label>
                      <input type="url" placeholder="https://..." value={editCohortForm.thumbnailUrl} onChange={(e) => setEditCohortForm({ ...editCohortForm, thumbnailUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                    </div>
                  </div>
                </div>

                {/* Day 1-15 Subject Schedule */}
                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Day-by-Day Subject Schedule (Day 1 – 15)</label>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {editCohortForm.daySubjects.map((ds, idx) => (
                      <div key={ds.day} className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2">
                        <span className="text-xs font-bold text-indigo-600 whitespace-nowrap w-10">Day {ds.day}</span>
                        <input
                          type="text"
                          placeholder="Subject name"
                          value={ds.subject}
                          onChange={(e) => setEditCohortForm(prev => ({ ...prev, daySubjects: prev.daySubjects.map((d, i) => i === idx ? { ...d, subject: e.target.value } : d) }))}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="sm:col-span-2 flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoSendRecordings} onChange={(e) => setEditCohortForm({ ...editCohortForm, autoSendRecordings: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Automatically send recordings by WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoSyncZoomAttendance} onChange={(e) => setEditCohortForm({ ...editCohortForm, autoSyncZoomAttendance: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Auto Sync Zoom Attendance</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoRecoverZoomTrash} onChange={(e) => setEditCohortForm({ ...editCohortForm, autoRecoverZoomTrash: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Auto-Recover Zoom Trash (Sync Deleted)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setEditingCohort(null)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={handleSaveEditCohort} disabled={savingEditCohort} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {savingEditCohort ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Add Students Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-600"/> Add Students to Workshop
              </h2>
              <button onClick={() => setShowAddStudent(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-4">
              <button onClick={() => setAddStudentTab('manual')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${addStudentTab === 'manual' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Manual Form</button>
              <button onClick={() => setAddStudentTab('whatsapp')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${addStudentTab === 'whatsapp' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>WhatsApp Group</button>
              <button onClick={() => setAddStudentTab('leads')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${addStudentTab === 'leads' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>From CRM Leads</button>
              <button onClick={() => setAddStudentTab('import')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${addStudentTab === 'import' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Bulk Upload</button>
            </div>

            <div className="p-6 overflow-y-auto">
              
              {/* Tab: Manual Form */}
              {addStudentTab === 'manual' && (
                <form onSubmit={addStudent} className="space-y-4 max-w-md mx-auto">
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Name *</label><input required placeholder="Student name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label><input type="email" placeholder="Email" value={student.email} onChange={(e) => setStudent({ ...student, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">Phone</label><input type="tel" placeholder="Phone" value={student.phone} onChange={(e) => setStudent({ ...student, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp</label><input type="tel" placeholder="WhatsApp number" value={student.whatsappNumber} onChange={(e) => setStudent({ ...student, whatsappNumber: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" /></div>
                  <button type="submit" className="w-full mt-4 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">Add Student</button>
                </form>
              )}

              {/* Tab: WhatsApp Group */}
              {addStudentTab === 'whatsapp' && (
                <div className="text-center py-6 space-y-4 max-w-md mx-auto">
                  <div className="bg-emerald-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-emerald-500" />
                  </div>
                  {selected?.whatsappGroupLink ? (
                    <>
                      <h3 className="text-lg font-bold text-slate-800">Sync from WhatsApp Group</h3>
                      <p className="text-sm text-slate-500">Automatically pull in all members from the connected WhatsApp group. Any new members will be added as students and synced to CRM Leads.</p>
                      <button onClick={syncWhatsappGroup} disabled={syncingWhatsapp} className="w-full mt-4 inline-flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50">
                        <RefreshCw size={18} className={syncingWhatsapp ? 'animate-spin' : ''} />
                        {syncingWhatsapp ? 'Syncing WA...' : 'Sync WhatsApp Group'}
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-slate-800">No WhatsApp Group Linked</h3>
                      <p className="text-sm text-slate-500">Please go to Workshop Settings and add a WhatsApp Group Link to enable auto-sync.</p>
                    </>
                  )}
                </div>
              )}

              {/* Tab: CRM Leads */}
              {addStudentTab === 'leads' && (
                <div className="space-y-6">
                  {/* System Form Import */}
                  <div className="bg-violet-50 rounded-xl p-5 border border-violet-100">
                    <label className="block text-sm font-bold text-violet-900 mb-2">Import from System Form</label>
                    <p className="text-xs text-violet-700 mb-4">Paste the link of the form from our system to auto-sync all leads who submitted it into this workshop cohort.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="url" 
                        placeholder="e.g., https://swaryoga.com/workshop-join/my-form" 
                        value={systemFormLink} 
                        onChange={(e) => setSystemFormLink(e.target.value)} 
                        className="flex-1 rounded-xl border border-violet-200 px-4 py-2.5 bg-white text-sm focus:ring-2 focus:ring-violet-500" 
                      />
                      <button onClick={syncSystemForm} disabled={!systemFormLink || syncingSystemForm} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 text-sm shadow-sm whitespace-nowrap">
                        {syncingSystemForm ? 'Syncing...' : 'Sync Form'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase">OR</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>

                  {/* Manual Lead Search */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Search CRM Leads</label>
                    <input 
                      type="text" 
                      placeholder="Search by name, phone, or email..." 
                      value={leadSearchQuery} 
                      onChange={(e) => searchLeads(e.target.value)} 
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 bg-slate-50 focus:bg-white text-sm focus:ring-2 focus:ring-violet-500" 
                    />
                  </div>
                  
                  {isSearchingLeads ? (
                    <div className="text-center py-8 text-sm text-slate-500">Searching leads...</div>
                  ) : leadSearchResults.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      {leadSearchResults.map((lead) => (
                        <div key={lead._id} className="flex items-center justify-between p-4 border-b border-slate-100 bg-white hover:bg-slate-50 last:border-0">
                          <div>
                            <p className="font-bold text-slate-800">{lead.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{lead.phoneNumber || lead.email || 'No contact info'}</p>
                          </div>
                          <button 
                            onClick={() => addLeadAsStudent(lead)}
                            className="bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                          >
                            Enroll
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : leadSearchQuery.length >= 3 ? (
                    <div className="text-center py-8 text-sm text-slate-500">No leads found matching "{leadSearchQuery}"</div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-500">Type at least 3 characters to search CRM leads.</div>
                  )}
                </div>
              )}

              {/* Tab: Bulk Upload */}
              {addStudentTab === 'import' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                    <label className="block text-sm font-bold text-indigo-900 mb-2">1. Upload Excel or CSV File</label>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={importStudents} disabled={importingStudents} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-colors" />
                    <p className="text-xs text-indigo-700 mt-3 font-medium flex items-center gap-1.5"><CheckCircle2 size={14}/> Fields like Age, City, Country, and Workshop will be automatically mapped to the CRM if present in the file.</p>
                  </div>

                  {studentImportColumns.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-4">
                      <h3 className="text-sm font-bold text-slate-800 mb-4">2. Map Essential Columns</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {([['name','Name'],['email','Email'],['phone','Phone'],['whatsappNumber','WhatsApp Number'],['whatsappJid','WhatsApp JID']] as const).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>
                            <select value={studentImportMapping[key as keyof typeof studentImportMapping]} onChange={(e) => setStudentImportMapping({ ...studentImportMapping, [key]: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500">
                              <option value="">Auto-detect</option>
                              {studentImportColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-5 border-t border-slate-200">
                        <button type="button" onClick={() => void autoImportStudents()} disabled={importingStudents} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 font-bold text-white shadow-sm transition-colors disabled:opacity-50">
                          {importingStudents ? 'Importing...' : 'Auto-Import All Data'}
                        </button>
                        <button type="button" onClick={() => void importMappedStudents()} disabled={importingStudents || !studentImportMapping.name} className="flex-1 rounded-xl border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-50 py-3 font-bold transition-colors disabled:opacity-50">
                          {importingStudents ? 'Importing...' : 'Import Selected'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Attendance Chart Modal */}
      {detailStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 lg:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{detailStudent.name}</h2>
                <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-3">
                  {detailStudent.email && <span className="flex items-center gap-1"><Mail size={14}/> {detailStudent.email}</span>}
                  {(detailStudent.phone || detailStudent.whatsappNumber) && <span className="flex items-center gap-1"><Phone size={14}/> {detailStudent.phone || detailStudent.whatsappNumber}</span>}
                </p>
              </div>
              <button onClick={() => setDetailStudent(null)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600"><Calendar size={24}/></div>
                  <div>
                    <h3 className="font-bold text-slate-800">14-Day Attendance Record</h3>
                    <p className="text-xs font-medium text-slate-500">Edit or review daily attendance manually</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                    Class Duration (Mins)
                    <input type="number" min={1} value={chartClassDuration} onChange={(e) => setChartClassDuration(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800" />
                  </label>
                  <button type="button" onClick={() => void saveStudentChart()} disabled={savingChart} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 font-bold text-white shadow-sm transition-colors disabled:opacity-50">
                    {savingChart ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Day</th>
                      <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Date</th>
                      <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Status</th>
                      <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Duration (Mins)</th>
                      <th className="p-4 font-bold text-slate-600 uppercase tracking-wider text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceChart.map((row, index) => (
                      <tr key={row.classDate} className={`${row.holiday ? 'bg-amber-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                        <td className="p-4">
                          {row.holiday ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1"><AlertCircle size={14}/> Holiday</span>
                          ) : (
                            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">Day {row.dayNumber}</span>
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-700">{new Date(`${row.classDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className="p-4 text-center">
                          {row.holiday ? '—' : (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${row.status === 'joined' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {row.status === 'joined' ? 'Present' : 'Absent'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.holiday ? '—' : (
                            <input type="number" min={0} value={row.durationMinutes} onChange={(e) => setAttendanceChart((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, durationMinutes: e.target.value } : item))} className="w-20 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white px-2 py-1.5 text-center font-bold" />
                          )}
                        </td>
                        <td className="p-4">
                          {row.holiday ? '—' : (
                            <select value={row.status} onChange={(e) => setAttendanceChart((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, status: e.target.value as AttendanceChartRow['status'] } : item))} className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white px-3 py-1.5 font-semibold text-slate-700">
                              <option value="joined">Mark Present</option>
                              <option value="absent">Mark Absent</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                {messageModal.channel === 'qr' ? <><QrCode size={18} className="text-emerald-600"/> WhatsApp (QR)</> : 
                 messageModal.channel === 'meta' ? <><MessageCircle size={18} className="text-blue-600"/> WhatsApp (Meta)</> : 
                 <><Mail size={18} className="text-violet-600"/> Email</>}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openStudentInbox(messageModal.student, messageModal.channel);
                    setMessageModal(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors shadow-xs cursor-pointer"
                  title="Open full conversation in Inbox"
                >
                  Open in {messageModal.channel === 'qr' ? 'QR Inbox' : messageModal.channel === 'meta' ? 'Meta Inbox' : 'Email Inbox'} ↗
                </button>
                <button type="button" onClick={() => setMessageModal(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"><X size={20}/></button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                Sending to <strong>{messageModal.student.name}</strong> <br/>
                <span className="text-xs text-slate-500">Contact: {messageModal.channel === 'email' ? (messageModal.student.email || 'No email saved') : (messageModal.student.whatsappNumber || messageModal.student.phone || 'No phone saved')}</span>
              </p>
              
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => {
                    const rec = recordings[0];
                    if (rec) {
                      const url = rec.youtubeSpeakerUrl || rec.youtubeGalleryUrl || rec.bunnySpeakerUrl || rec.bunnyGalleryUrl || '';
                      if (url) {
                        setMessageText(`Hi ${messageModal.student.name}, here is the latest class recording:\n${url}`);
                      } else {
                        alert('Latest recording does not have a URL yet.');
                      }
                    } else {
                      alert('No recordings found for this workshop.');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 transition-colors"
                >
                  <PlayCircle size={12} className="inline mr-1" /> Insert Latest Recording
                </button>
                <button 
                  onClick={() => setMessageText(`Hi ${messageModal.student.name}, `)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
              </div>

              <textarea 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200 p-4 bg-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
                placeholder="Type your message here..."
              />
              
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setMessageModal(null)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button 
                  onClick={async () => {
                    setSendingMessage(true);
                    try {
                      const res = await fetch('/api/admin/crm/workshop-management/students/message', {
                        method: 'POST', headers,
                        body: JSON.stringify({ 
                          studentId: messageModal.student._id, 
                          channel: messageModal.channel, 
                          message: messageText 
                        })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to send message');
                      alert('Message sent successfully!');
                      setMessageModal(null);
                      setMessageText('');
                    } catch(err: any) {
                      alert(err.message);
                    } finally {
                      setSendingMessage(false);
                    }
                  }} 
                  disabled={!messageText || sendingMessage} 
                  className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recording URLs Modal */}
      {editingRecordingUrls && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Day {editingRecordingUrls.dayNumber || '–'} Recording URLs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(editingRecordingUrls.classDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingRecordingUrls(null)} 
                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18}/>
              </button>
            </div>
            <form onSubmit={saveRecordingUrlsModal} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                Provide YouTube URL/ID for Speaker & Gallery views, and Bunny URL for Speaker view.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <PlayCircle size={14} className="text-red-600"/> YouTube Speaker View URL / Video ID
                </label>
                <input 
                  type="text" 
                  placeholder="https://youtu.be/... or video ID (with or without screen share)" 
                  value={editingRecordingUrls.youtubeSpeakerUrl} 
                  onChange={(e) => setEditingRecordingUrls({ ...editingRecordingUrls, youtubeSpeakerUrl: e.target.value })} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <PlayCircle size={14} className="text-red-600"/> YouTube Gallery View URL / Video ID
                </label>
                <input 
                  type="text" 
                  placeholder="https://youtu.be/... or video ID" 
                  value={editingRecordingUrls.youtubeGalleryUrl} 
                  onChange={(e) => setEditingRecordingUrls({ ...editingRecordingUrls, youtubeGalleryUrl: e.target.value })} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <PlayCircle size={14} className="text-orange-600"/> Bunny Speaker View URL
                </label>
                <input 
                  type="text" 
                  placeholder="https://swaryogacrm.b-cdn.net/... or embed link" 
                  value={editingRecordingUrls.bunnySpeakerUrl} 
                  onChange={(e) => setEditingRecordingUrls({ ...editingRecordingUrls, bunnySpeakerUrl: e.target.value })} 
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                />
                <p className="text-[11px] text-slate-500 mt-1">Note: Bunny CDN is configured only for Speaker View.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingRecordingUrls(null)} 
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingRecordingUrls}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingRecordingUrls ? 'Saving...' : 'Save URLs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
