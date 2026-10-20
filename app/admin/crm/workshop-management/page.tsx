'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Video, Settings, UserPlus, Upload, RefreshCw, 
  PlayCircle, Eye, Calendar, Plus, X, Trash2, Edit2, 
  Save, BarChart2, CheckCircle2, AlertCircle, Link, Mail, Phone, GraduationCap, Download, Printer, Send, Search, FileSpreadsheet, Copy, MessageCircle, QrCode, ExternalLink,
  Info, LayoutDashboard, Folder, Link as LinkIcon, KeyRound, Clock, Sparkles, ChevronRight, ChevronDown, Check, Layers, Filter
} from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import RegistrationNewBatch from '@/components/admin/crm/RegistrationNewBatch';
import { workshopSessionCalendar } from '@/lib/workshopSessionUtils';
import { createWorkshopAutosave, WorkshopAutosaveStatus } from '@/lib/workshopAutosave';
import { DEFAULT_RECORDING_ACCESS } from '@/lib/workshopRecordingPolicy';
import { buildWorkshopAttendanceReport, attendanceReportTable, reportCsv } from '@/lib/workshopAttendanceReport';

interface Cohort { _id: string; name: string; startDate: string; timezone?: string; endDate?: string; holidayDates?: string[]; classStartTime?: string; classEndTime?: string; zoomMeetingId?: string; zoomJoinUrl?: string; whatsappGroupLink?: string; googleFormLink?: string; youtubePlaylistName?: string; thumbnailUrl?: string; communityId?: string; aiWorkerEnabled?: boolean; autoSendRecordings?: boolean; autoSyncZoomAttendance?: boolean; autoRecoverZoomTrash?: boolean; daySubjects?: Array<{ day: number; subject: string }>; metadata?: { dateDayMap?: Record<string, number>; [key: string]: any }; }
interface Student { _id: string; name: string; email?: string; phone?: string; whatsappNumber?: string; leadId?: string; leadNumber?: string; active?: boolean; metadata?: { city?: string; country?: string; [key: string]: any }; }
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
    bunnyAudioUrl?: string;
    subject?: string;
    zoomSpeakerUrl?: string;
    zoomGalleryUrl?: string;
    zoomShareUrl?: string;
    zoomPassword?: string;
    lastZoomSyncAt?: string;
    [key: string]: any;
  };
}
type CohortEditSnapshot = { cohortId: string; values: Record<string, any> };
type StudentEditSnapshot = { cohortId: string; studentId: string; values: Record<string, any> };
type AttendanceSnapshot = { cohortId: string; studentId: string; classDurationMinutes: string; rows: AttendanceChartRow[] };
type RecordingUrlsSnapshot = { id: string; classDate: string; dayNumber?: number; youtubeSpeakerUrl: string; youtubeGalleryUrl: string; bunnySpeakerUrl: string };

function AutosaveIndicator({ status, error, onRetry }: { status: WorkshopAutosaveStatus; error?: string; onRetry?: () => void }) {
  if (status === 'idle') return null;
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-2 text-xs font-semibold ${status === 'error' ? 'text-red-700' : status === 'saved' ? 'text-emerald-700' : 'text-slate-500'}`}>
      {status === 'saving' && <RefreshCw size={13} className="animate-spin" />}
      {status === 'saved' && <CheckCircle2 size={13} />}
      {status === 'error' && <AlertCircle size={13} />}
      <span>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'All changes saved' : error || 'Save failed'}</span>
      {status === 'error' && onRetry && <button type="button" onClick={onRetry} className="underline underline-offset-2">Retry</button>}
    </div>
  );
}

const workshopValuesEqual = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function toDateKey(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function getAvatarGradient(name: string) {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-fuchsia-600',
  ];
  const charCode = (name || 'S').charCodeAt(0) || 0;
  return gradients[charCode % gradients.length];
}

function getInitials(name: string) {
  if (!name) return 'S';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const studentEditDraftRef = useRef(studentEditForm);
  const studentEditBaselineRef = useRef<{ cohortId: string; studentId: string; expectedUpdatedAt?: string; values: Record<string, any> } | null>(null);
  const [studentAutosaveStatus, setStudentAutosaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [studentAutosaveError, setStudentAutosaveError] = useState('');
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);
  
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
  const [newBatchLoading, setNewBatchLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  // UI State
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'students' | 'recordings' | 'settings' | 'analytics'>('students');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMetaFormModal, setShowMetaFormModal] = useState(false);
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
  const [studentsSearch, setStudentsSearch] = useState('');
  const [cohortSearchQuery, setCohortSearchQuery] = useState('');
  const [showMobileCohortList, setShowMobileCohortList] = useState(false);

  const filteredCohorts = useMemo(() => {
    if (!cohortSearchQuery.trim()) return cohorts;
    const q = cohortSearchQuery.toLowerCase();
    return cohorts.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.startDate || '').toLowerCase().includes(q) ||
      (c.zoomMeetingId || '').toLowerCase().includes(q)
    );
  }, [cohorts, cohortSearchQuery]);
  
  // Import State
  const [importingStudents, setImportingStudents] = useState(false);
  const [studentImportFile, setStudentImportFile] = useState<File | null>(null);
  const [studentImportColumns, setStudentImportColumns] = useState<string[]>([]);
  const [studentImportMapping, setStudentImportMapping] = useState({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
  const [selectedImportFields, setSelectedImportFields] = useState<string[]>(['name', 'email', 'phone', 'whatsappNumber', 'whatsappJid']);
  const [googleFormLink, setGoogleFormLink] = useState('');
  const googleFormDraftRef = useRef(googleFormLink);
  const googleFormBaselineRef = useRef<{ cohortId: string; values: Record<string, any>; metadata?: Record<string, any>; serverValues?: Record<string, any> } | null>(null);
  const [googleFormAutosaveStatus, setGoogleFormAutosaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [googleFormAutosaveError, setGoogleFormAutosaveError] = useState('');
  
  // Actions State
  const [syncingWhatsapp, setSyncingWhatsapp] = useState(false);
  const [syncingZoomAttendance, setSyncingZoomAttendance] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [attendanceChart, setAttendanceChart] = useState<AttendanceChartRow[]>([]);
  const attendanceChartDraftRef = useRef<AttendanceChartRow[]>([]);
  const [chartClassDuration, setChartClassDuration] = useState('60');
  const [savingChart, setSavingChart] = useState(false);
  const [attendanceAutosaveStatus, setAttendanceAutosaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [attendanceAutosaveError, setAttendanceAutosaveError] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [runningWorker, setRunningWorker] = useState(false);

  // New Features State
  const [communities, setCommunities] = useState<any[]>([]);
  const [recordingSetup, setRecordingSetup] = useState({ zoomMeetingId: '', zoomJoinUrl: '', communityId: '', thumbnailUrl: '', youtubePlaylistName: '' });
  const recordingSetupDraftRef = useRef(recordingSetup);
  const recordingSetupBaselineRef = useRef<{ cohortId: string; values: Record<string, any>; metadata?: Record<string, any>; serverValues?: Record<string, any> } | null>(null);
  const [recordingSetupAutosaveStatus, setRecordingSetupAutosaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [recordingSetupAutosaveError, setRecordingSetupAutosaveError] = useState('');
  const [savingRecordingSetup, setSavingRecordingSetup] = useState(false);
  const [systemFormLink, setSystemFormLink] = useState('');
  const [syncingSystemForm, setSyncingSystemForm] = useState(false);

  // Edit/Delete workshop state
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [recordingAccess, setRecordingAccess] = useState({ ...DEFAULT_RECORDING_ACCESS });
  const [editCohortForm, setEditCohortForm] = useState({ name: '', startDate: '', endDate: '', holidayDates: [] as string[], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', googleFormLink: '', youtubePlaylistName: '', thumbnailUrl: '', autoSendRecordings: false, autoSyncZoomAttendance: true, autoRecoverZoomTrash: false, daySubjects: Array.from({ length: 15 }, (_, i) => ({ day: i + 1, subject: '' })) });
  const recordingAccessDraftRef = useRef(recordingAccess);
  const editCohortDraftRef = useRef(editCohortForm);
  const cohortEditBaselineRef = useRef<{ cohortId: string; values: Record<string, any>; metadata: Record<string, any>; serverValues?: Record<string, any> } | null>(null);
  const cohortEditHydrationRef = useRef<string | null>(null);
  const [cohortAutosaveStatus, setCohortAutosaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [cohortAutosaveError, setCohortAutosaveError] = useState('');
  const [savingZoomConfig, setSavingZoomConfig] = useState(false);
  const [editingRecordingUrls, setEditingRecordingUrls] = useState<RecordingUrlsSnapshot | null>(null);
  const [savingRecordingUrls, setSavingRecordingUrls] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<WorkshopAutosaveStatus>('idle');
  const [autoSaveError, setAutoSaveError] = useState('');
  const recordingUrlsBaselineRef = useRef<{ id: string; values: Record<string, any> } | null>(null);
  const [editingDateModal, setEditingDateModal] = useState<{ classDate: string; dayNumber: number | null; isHoliday: boolean; } | null>(null);
  const [savingDateModal, setSavingDateModal] = useState(false);
  const [showHolidayPicker, setShowHolidayPicker] = useState(false);

  // Auto-calculate end date for Create form
  useEffect(() => {
    if (form.startDate) {
      const start = new Date(form.startDate);
      if (!isNaN(start.getTime())) {
        const calendar = workshopSessionCalendar(form.startDate, form.holidayDates);
        setForm(prev => ({ ...prev, endDate: calendar[calendar.length - 1].classDate }));
      }
    }
  }, [form.startDate, form.holidayDates]);

  const [savingEditCohort, setSavingEditCohort] = useState(false);
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        localStorage.getItem('token') ||
        ''
      : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadSequenceRef = useRef(0);
  const draftChangeSequenceRef = useRef(0);
  const cohortEditAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<CohortEditSnapshot>> | null>(null);
  const studentAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<StudentEditSnapshot>> | null>(null);
  const attendanceAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<AttendanceSnapshot>> | null>(null);
  const googleFormAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<{ cohortId: string; value: string }>> | null>(null);
  const recordingSetupAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<{ cohortId: string; values: Record<string, any> }>> | null>(null);
  const recordingUrlsAutosaveRef = useRef<ReturnType<typeof createWorkshopAutosave<RecordingUrlsSnapshot>> | null>(null);

  const persistCohortValues = async (
    cohortId: string,
    values: Record<string, any>,
    baselineRef: React.MutableRefObject<{ cohortId: string; values: Record<string, any>; metadata?: Record<string, any>; serverValues?: Record<string, any> } | null>,
  ) => {
    const baseline = baselineRef.current;
    if (!baseline || baseline.cohortId !== cohortId) throw new Error('Workshop settings have not finished loading.');
    const changes = Object.fromEntries(Object.entries(values).filter(([key, value]) => !workshopValuesEqual(value, baseline.values[key])));
    if (!Object.keys(changes).length) return;
    const previous: Record<string, any> = {};
    const payloadChanges = { ...changes };
    for (const key of Object.keys(changes)) {
      if (key === 'recordingAccess') {
        previous.metadata = baseline.metadata || {};
        payloadChanges.metadata = { ...(baseline.metadata || {}), recordingAccess: changes.recordingAccess };
        delete payloadChanges.recordingAccess;
      } else previous[key] = baseline.serverValues && Object.prototype.hasOwnProperty.call(baseline.serverValues, key)
        ? baseline.serverValues[key]
        : baseline.values[key];
    }
    const res = await fetch('/api/admin/crm/workshop-management', {
      method: 'PATCH',
      headers,
      keepalive: true,
      body: JSON.stringify({ cohortId, ...payloadChanges, previous }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Workshop settings could not be saved.');
    baselineRef.current = {
      ...baseline,
      values: { ...baseline.values, ...changes },
      metadata: data.cohort?.metadata || baseline.metadata || {},
      serverValues: { ...(baseline.serverValues || baseline.values), ...Object.fromEntries(Object.keys(changes).filter(key => key !== 'recordingAccess').map(key => [key, changes[key]])) },
    };
    if (data.cohort) {
      setSelected((current) => current?._id === cohortId ? data.cohort : current);
      setCohorts((current) => current.map((item) => item._id === cohortId ? data.cohort : item));
    }
  };

  if (!cohortEditAutosaveRef.current) {
    cohortEditAutosaveRef.current = createWorkshopAutosave(async ({ cohortId, values }) => {
      await persistCohortValues(cohortId, values, cohortEditBaselineRef);
    }, (status, error) => {
      setCohortAutosaveStatus(status);
      setCohortAutosaveError(error || '');
    });
  }
  if (!studentAutosaveRef.current) {
    studentAutosaveRef.current = createWorkshopAutosave(async ({ cohortId, studentId, values }) => {
      const baseline = studentEditBaselineRef.current;
      if (!baseline || baseline.cohortId !== cohortId || baseline.studentId !== studentId) throw new Error('Student edit is no longer active.');
      const patch = Object.fromEntries(Object.entries(values).filter(([key, value]) => !workshopValuesEqual(value, baseline.values[key])));
      if (!Object.keys(patch).length) return;
      const res = await fetch('/api/admin/crm/workshop-management/students', {
        method: 'PATCH',
        headers,
        keepalive: true,
        body: JSON.stringify({ id: studentId, cohortId, ...patch, expectedUpdatedAt: baseline.expectedUpdatedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Student changes could not be saved.');
      studentEditBaselineRef.current = {
        ...baseline,
        values: { ...baseline.values, ...patch },
        expectedUpdatedAt: data.student?.updated_at || baseline.expectedUpdatedAt,
      };
    }, (status, error) => {
      setStudentAutosaveStatus(status);
      setStudentAutosaveError(error || '');
    });
  }
  if (!attendanceAutosaveRef.current) {
    attendanceAutosaveRef.current = createWorkshopAutosave(async ({ cohortId, studentId, classDurationMinutes, rows }) => {
      const res = await fetch('/api/admin/crm/workshop-management/attendance/bulk', {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify({ cohortId, studentId, classDurationMinutes, rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Attendance changes could not be saved.');
    }, (status, error) => {
      setAttendanceAutosaveStatus(status);
      setAttendanceAutosaveError(error || '');
    });
  }
  if (!googleFormAutosaveRef.current) {
    googleFormAutosaveRef.current = createWorkshopAutosave(async ({ cohortId, value }) => {
      const baseline = googleFormBaselineRef.current;
      if (!baseline || baseline.cohortId !== cohortId) throw new Error('Workshop settings have not finished loading.');
      const nextValue = value.trim();
      if (nextValue && !/^https?:\/\//i.test(nextValue)) throw new Error('Form link must begin with http:// or https://');
      await persistCohortValues(cohortId, { googleFormLink: nextValue }, googleFormBaselineRef);
    }, (status, error) => {
      setGoogleFormAutosaveStatus(status);
      setGoogleFormAutosaveError(error || '');
    });
  }
  if (!recordingSetupAutosaveRef.current) {
    recordingSetupAutosaveRef.current = createWorkshopAutosave(async ({ cohortId, values }) => {
      await persistCohortValues(cohortId, values, recordingSetupBaselineRef);
    }, (status, error) => {
      setRecordingSetupAutosaveStatus(status);
      setRecordingSetupAutosaveError(error || '');
    });
  }
  if (!recordingUrlsAutosaveRef.current) {
    recordingUrlsAutosaveRef.current = createWorkshopAutosave(async (urls) => {
      const baseline = recordingUrlsBaselineRef.current;
      if (!baseline || baseline.id !== urls.id) throw new Error('Recording edit is no longer active.');
      const ytSpeaker = urls.youtubeSpeakerUrl.trim();
      const ytGallery = urls.youtubeGalleryUrl.trim();
      const bunnySpeaker = urls.bunnySpeakerUrl.trim();
      const updates = {
        youtubeSpeakerUrl: ytSpeaker ? getYoutubeUrl(ytSpeaker) : null,
        youtubeSpeakerId: ytSpeaker ? normalizeYt(ytSpeaker) || null : null,
        youtubeGalleryUrl: ytGallery ? getYoutubeUrl(ytGallery) : null,
        youtubeGalleryId: ytGallery ? normalizeYt(ytGallery) || null : null,
        bunnySpeakerUrl: bunnySpeaker || null,
      };
      const res = await fetch('/api/admin/crm/workshop-management/recordings', {
        method: 'PATCH',
        headers,
        keepalive: true,
        body: JSON.stringify({ id: urls.id, ...updates, previous: baseline.values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Recording URLs could not be saved.');
      if (recordingUrlsBaselineRef.current === baseline) {
        recordingUrlsBaselineRef.current = { id: urls.id, values: updates };
      }
      setRecordings((current) => current.map((recording) => recording._id === urls.id ? {
        ...recording,
        youtubeSpeakerUrl: updates.youtubeSpeakerUrl || undefined,
        youtubeSpeakerId: updates.youtubeSpeakerId || undefined,
        youtubeGalleryUrl: updates.youtubeGalleryUrl || undefined,
        youtubeGalleryId: updates.youtubeGalleryId || undefined,
        bunnySpeakerUrl: updates.bunnySpeakerUrl || undefined,
      } : recording));
    }, (status, error) => {
      setAutoSaveStatus(status);
      setAutoSaveError(error || '');
    });
  }

  const updateEditCohortForm = (update: Partial<typeof editCohortForm> | ((current: typeof editCohortForm) => typeof editCohortForm)) => {
    if (savingEditCohort) return;
    draftChangeSequenceRef.current += 1;
    const current = editCohortDraftRef.current;
    let next = typeof update === 'function' ? update(current) : { ...current, ...update };
    if (next.startDate !== current.startDate || !workshopValuesEqual(next.holidayDates, current.holidayDates)) {
      try {
        const calendar = workshopSessionCalendar(next.startDate, next.holidayDates);
        next = { ...next, endDate: calendar[calendar.length - 1].classDate };
      } catch {}
    }
    editCohortDraftRef.current = next;
    setEditCohortForm(next);
  };

  const updateStudentEditForm = (update: Partial<typeof studentEditForm>) => {
    if (savingStudentEdit) return;
    draftChangeSequenceRef.current += 1;
    const next = { ...studentEditDraftRef.current, ...update };
    studentEditDraftRef.current = next;
    setStudentEditForm(next);
    if (selected && editingStudent) {
      studentAutosaveRef.current?.schedule({ cohortId: selected._id, studentId: editingStudent._id, values: next });
    }
  };

  const applyStudentEditToList = (studentId: string) => {
    const expectedUpdatedAt = studentEditBaselineRef.current?.expectedUpdatedAt;
    setStudents((current) => current.map((item) => item._id === studentId
      ? { ...item, ...studentEditDraftRef.current, ...(expectedUpdatedAt ? { updated_at: expectedUpdatedAt } : {}) }
      : item));
  };

  const updateRecordingAccess = (update: Partial<typeof recordingAccess>) => {
    if (savingEditCohort) return;
    draftChangeSequenceRef.current += 1;
    const next = { ...recordingAccessDraftRef.current, ...update };
    recordingAccessDraftRef.current = next;
    setRecordingAccess(next);
  };

  const updateRecordingSetup = (update: Partial<typeof recordingSetup>) => {
    if (savingRecordingSetup || savingZoomConfig) return;
    draftChangeSequenceRef.current += 1;
    const next = { ...recordingSetupDraftRef.current, ...update };
    recordingSetupDraftRef.current = next;
    setRecordingSetup(next);
    if (selected) recordingSetupAutosaveRef.current?.schedule({ cohortId: selected._id, values: next });
  };

  const updateGoogleFormLink = (value: string) => {
    draftChangeSequenceRef.current += 1;
    googleFormDraftRef.current = value;
    setGoogleFormLink(value);
    if (selected) googleFormAutosaveRef.current?.schedule({ cohortId: selected._id, value });
  };

  useEffect(() => {
    if (!editingCohort) return;
    if (cohortEditHydrationRef.current === editingCohort._id) {
      cohortEditHydrationRef.current = null;
      return;
    }
    cohortEditAutosaveRef.current?.schedule({
      cohortId: editingCohort._id,
      values: { ...editCohortForm, recordingAccess },
    });
  }, [editingCohort, editCohortForm, recordingAccess]);

  useEffect(() => {
    const flush = () => {
      void Promise.all([
        cohortEditAutosaveRef.current?.flush(),
        studentAutosaveRef.current?.flush(),
        attendanceAutosaveRef.current?.flush(),
        googleFormAutosaveRef.current?.flush(),
        recordingSetupAutosaveRef.current?.flush(),
      ]).catch(() => undefined);
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const load = async (cohortId?: string) => {
    const requestSequence = ++loadSequenceRef.current;
    try {
      if (cohortId) {
        await Promise.all([
          cohortEditAutosaveRef.current?.flush(),
          studentAutosaveRef.current?.flush(),
          attendanceAutosaveRef.current?.flush(),
          googleFormAutosaveRef.current?.flush(),
          recordingSetupAutosaveRef.current?.flush(),
          recordingUrlsAutosaveRef.current?.flush(),
        ]);
      }
      if (requestSequence !== loadSequenceRef.current) return;
      const draftSequence = draftChangeSequenceRef.current;
      const res = await fetch(`/api/admin/crm/workshop-management${cohortId ? `?cohortId=${cohortId}` : ''}`, { headers });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        data = { error: text || `Workshop API returned ${res.status}` };
      }
      if (!res.ok) throw new Error(data.error || data.message || `Workshop API returned ${res.status}`);
      if (requestSequence !== loadSequenceRef.current) return;
      if (draftSequence !== draftChangeSequenceRef.current) {
        void load(cohortId);
        return;
      }
      setLoadError('');
      if (cohortId) {
        if (data.cohort) setSelected(data.cohort);
        setStudents(data.students || []);
        setSelectedStudentIds([]);
        setAttendance(data.attendance || []);
        setRecordings(data.recordings || []);
        setGoogleFormLink(data.cohort?.googleFormLink || '');
        googleFormDraftRef.current = data.cohort?.googleFormLink || '';
        googleFormBaselineRef.current = { cohortId, values: { googleFormLink: data.cohort?.googleFormLink || '' }, serverValues: { googleFormLink: data.cohort?.googleFormLink ?? null } };
        setRecordingSetup({
          zoomMeetingId: data.cohort?.zoomMeetingId || '',
          zoomJoinUrl: data.cohort?.zoomJoinUrl || '',
          communityId: data.zoomMapping?.communityId || data.cohort?.communityId || '',
          thumbnailUrl: data.zoomMapping?.thumbnailUrl || data.cohort?.thumbnailUrl || '',
          youtubePlaylistName: data.zoomMapping?.youtubePlaylistName || data.cohort?.youtubePlaylistName || ''
        });
        recordingSetupDraftRef.current = {
          zoomMeetingId: data.cohort?.zoomMeetingId || '',
          zoomJoinUrl: data.cohort?.zoomJoinUrl || '',
          communityId: data.zoomMapping?.communityId || data.cohort?.communityId || '',
          thumbnailUrl: data.zoomMapping?.thumbnailUrl || data.cohort?.thumbnailUrl || '',
          youtubePlaylistName: data.zoomMapping?.youtubePlaylistName || data.cohort?.youtubePlaylistName || '',
        };
        recordingSetupBaselineRef.current = {
          cohortId,
          values: { ...recordingSetupDraftRef.current },
          serverValues: {
            zoomMeetingId: data.cohort?.zoomMeetingId ?? null,
            zoomJoinUrl: data.cohort?.zoomJoinUrl ?? null,
            communityId: data.cohort?.communityId ?? null,
            thumbnailUrl: data.cohort?.thumbnailUrl ?? null,
            youtubePlaylistName: data.cohort?.youtubePlaylistName ?? null,
          },
        };
        if (data.students?.length && !attendanceForm.studentId) setAttendanceForm((prev) => ({ ...prev, studentId: data.students[0]._id }));
      } else {
        setCohorts(data.cohorts || []);
      }
    } catch (error) {
      if (requestSequence !== loadSequenceRef.current) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load workshops');
    }
  };

  const selectWorkshop = async (cohort: Cohort) => {
    try {
      await Promise.all([
        cohortEditAutosaveRef.current?.flush(),
        studentAutosaveRef.current?.flush(),
        attendanceAutosaveRef.current?.flush(),
        googleFormAutosaveRef.current?.flush(),
        recordingSetupAutosaveRef.current?.flush(),
        recordingUrlsAutosaveRef.current?.flush(),
      ]);
    } catch {
      return;
    }
    setSelected(cohort);
    const setup = {
      zoomMeetingId: cohort.zoomMeetingId || '',
      zoomJoinUrl: cohort.zoomJoinUrl || '',
      communityId: cohort.communityId || '',
      thumbnailUrl: cohort.thumbnailUrl || '',
      youtubePlaylistName: cohort.youtubePlaylistName || '',
    };
    setRecordingSetup(setup);
    recordingSetupDraftRef.current = setup;
    recordingSetupBaselineRef.current = {
      cohortId: cohort._id,
      values: setup,
      serverValues: {
        zoomMeetingId: cohort.zoomMeetingId ?? null,
        zoomJoinUrl: cohort.zoomJoinUrl ?? null,
        communityId: cohort.communityId ?? null,
        thumbnailUrl: cohort.thumbnailUrl ?? null,
        youtubePlaylistName: cohort.youtubePlaylistName ?? null,
      },
    };
    googleFormDraftRef.current = cohort.googleFormLink || '';
    setGoogleFormLink(googleFormDraftRef.current);
    googleFormBaselineRef.current = {
      cohortId: cohort._id,
      values: { googleFormLink: cohort.googleFormLink || '' },
      serverValues: { googleFormLink: cohort.googleFormLink ?? null },
    };
    setActiveTab('students');
    void load(cohort._id);
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
    setSavingStudentEdit(true);
    try {
      await studentAutosaveRef.current?.flush();
      applyStudentEditToList(editingStudent._id);
      setStudentAutosaveError('');
    } catch (error) {
      setStudentAutosaveStatus('error');
      setStudentAutosaveError(error instanceof Error ? error.message : 'Could not update student');
    } finally {
      setSavingStudentEdit(false);
    }
  };

  const openStudentEditor = async (current: Student) => {
    if (editingStudent && (await studentAutosaveRef.current?.flush().then(() => true).catch(() => false)) === false) return;
    const values = {
      name: current.name,
      email: current.email || '',
      phone: current.phone || '',
      whatsappNumber: current.whatsappNumber || '',
      active: current.active ?? true,
    };
    studentEditDraftRef.current = values;
    studentEditBaselineRef.current = {
      cohortId: selected?._id || '',
      studentId: current._id,
      expectedUpdatedAt: (current as any).updated_at,
      values: { ...values },
    };
    setStudentEditForm(values);
    setStudentAutosaveStatus('idle');
    setStudentAutosaveError('');
    setEditingStudent(current);
  };

  const closeStudentEditor = async () => {
    if (!editingStudent || !selected) {
      setEditingStudent(null);
      return;
    }
    setSavingStudentEdit(true);
    try {
      await studentAutosaveRef.current?.flush();
      applyStudentEditToList(editingStudent._id);
      setEditingStudent(null);
      studentEditBaselineRef.current = null;
    } catch (error) {
      setStudentAutosaveStatus('error');
      setStudentAutosaveError(error instanceof Error ? error.message : 'Could not save student changes');
    } finally {
      setSavingStudentEdit(false);
    }
  };

  const updateAttendanceChart = (rows: AttendanceChartRow[]) => {
    if (savingChart) return;
    draftChangeSequenceRef.current += 1;
    attendanceChartDraftRef.current = rows;
    setAttendanceChart(rows);
    if (selected && detailStudent) {
      attendanceAutosaveRef.current?.schedule({
        cohortId: selected._id,
        studentId: detailStudent._id,
        classDurationMinutes: chartClassDuration,
        rows,
      });
    }
  };

  const updateChartClassDuration = (value: string) => {
    if (savingChart) return;
    draftChangeSequenceRef.current += 1;
    setChartClassDuration(value);
    if (selected && detailStudent) {
      attendanceAutosaveRef.current?.schedule({
        cohortId: selected._id,
        studentId: detailStudent._id,
        classDurationMinutes: value,
        rows: attendanceChartDraftRef.current,
      });
    }
  };

  const closeAttendanceChart = async () => {
    setSavingChart(true);
    try {
      await attendanceAutosaveRef.current?.flush();
      setDetailStudent(null);
    } catch (error) {
      setAttendanceAutosaveStatus('error');
      setAttendanceAutosaveError(error instanceof Error ? error.message : 'Could not save attendance changes');
    } finally {
      setSavingChart(false);
    }
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
      await recordingSetupAutosaveRef.current?.flush();
    } catch (error: any) {
      setRecordingSetupAutosaveStatus('error');
      setRecordingSetupAutosaveError(error.message || 'Failed to save recording setup');
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
    const csv = reportCsv(attendanceReportTable(getAttendanceReport()));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Workshop_Report_${selected?.name || 'Cohort'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getAttendanceReport = () => {
    if (!selected) throw new Error('Select a workshop before generating a report');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: selected?.timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const query = analyticsSearch.trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');
    const filtered = students.filter(student => {
      if (!query) return true;
      const name = (student.name || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      const phone = (student.phone || '').toLowerCase();
      const wa = (student.whatsappNumber || '').toLowerCase();
      const leadNum = (student.leadNumber ? String(student.leadNumber) : '').toLowerCase();

      // Text match on name, email, phone, WhatsApp number, or lead ID
      if (name.includes(query) || email.includes(query) || phone.includes(query) || wa.includes(query) || leadNum.includes(query)) {
        return true;
      }

      // Digit-only match for phone/mobile numbers (allows searching without country code or with spaces/dashes)
      if (queryDigits.length >= 3) {
        const phoneDigits = (student.phone || '').replace(/\D/g, '');
        const waDigits = (student.whatsappNumber || '').replace(/\D/g, '');
        if (phoneDigits.includes(queryDigits) || waDigits.includes(queryDigits)) {
          return true;
        }
      }

      return false;
    });
    return buildWorkshopAttendanceReport(selected.startDate, [...cohortHolidaySet], filtered, attendance, today);
  };


  const downloadAttendanceExcel = async () => {
    if (!selected) return;
    try {
      const XLSX = await import('xlsx');
      const report = getAttendanceReport();
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet(attendanceReportTable(report));
      sheet['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 22 }, { wch: 32 }, ...Array.from({ length: 20 }, () => ({ wch: 18 }))];
      XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ['Workshop attendance report', selected.name],
        ['Generated at', new Date().toISOString()],
        ['Timezone', selected.timezone || 'Asia/Kolkata'],
        ['Scheduled sessions', report.sessions.length],
        ['Students included', report.rows.length],
        ['Search filter', analyticsSearch || 'All students'],
        ['Pending', 'No saved attendance record; not counted as absent.'],
        ['Upcoming', 'Session date has not arrived.'],
        ['Attendance percentage', 'Present sessions divided by confirmed present/absent sessions. Grades are provisional.'],
        ['Grade thresholds', 'A >= 90%, B >= 70%, C >= 50%, D >= 30%, E < 30%.'],
      ]), 'Report Notes');
      XLSX.writeFile(workbook, `Workshop_Attendance_${selected.name.replace(/[^\p{L}\p{N}_-]/gu, '_')}.xlsx`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not download attendance report');
    }
  };

  const handleEditCohort = (c: Cohort, e: React.MouseEvent) => {
    e.stopPropagation();
    const access = { ...DEFAULT_RECORDING_ACCESS, ...c.metadata?.recordingAccess };
    const draft = {
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
    };
    setEditingCohort(c);
    cohortEditHydrationRef.current = c._id;
    setRecordingAccess(access);
    recordingAccessDraftRef.current = access;
    setEditCohortForm(draft);
    editCohortDraftRef.current = draft;
    cohortEditBaselineRef.current = {
      cohortId: c._id,
      values: { ...draft, recordingAccess: access },
      serverValues: {
        name: c.name,
        startDate: c.startDate ? c.startDate.slice(0, 10) : '',
        endDate: c.endDate ? c.endDate.slice(0, 10) : null,
        holidayDates: c.holidayDates || [],
        classStartTime: c.classStartTime || null,
        classEndTime: c.classEndTime || null,
        zoomMeetingId: c.zoomMeetingId || null,
        zoomJoinUrl: c.zoomJoinUrl || null,
        whatsappGroupLink: c.whatsappGroupLink || null,
        googleFormLink: c.googleFormLink || null,
        youtubePlaylistName: c.youtubePlaylistName || null,
        thumbnailUrl: c.thumbnailUrl || null,
        autoSendRecordings: c.autoSendRecordings === true,
        autoSyncZoomAttendance: c.autoSyncZoomAttendance !== false,
        autoRecoverZoomTrash: c.autoRecoverZoomTrash === true,
        daySubjects: c.daySubjects || [],
      },
      metadata: c.metadata || {},
    };
    setCohortAutosaveStatus('idle');
    setCohortAutosaveError('');
  };

  const handleSaveEditCohort = async () => {
    if (!editingCohort) return;
    setSavingEditCohort(true);
    try {
      await cohortEditAutosaveRef.current?.flush();
      setEditingCohort(null);
      cohortEditBaselineRef.current = null;
    } catch (err) {
      setCohortAutosaveStatus('error');
      setCohortAutosaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSavingEditCohort(false);
    }
  };

  const closeEditCohort = async () => {
    setSavingEditCohort(true);
    try {
      await cohortEditAutosaveRef.current?.flush();
      setEditingCohort(null);
      cohortEditBaselineRef.current = null;
    } catch (error) {
      setCohortAutosaveStatus('error');
      setCohortAutosaveError(error instanceof Error ? error.message : 'Could not save workshop changes');
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
    downloadAnalyticsCSV();
  };

  const saveGoogleFormLink = async () => {
    if (!selected) return;
    try {
      await googleFormAutosaveRef.current?.flush();
    } catch (error) {
      setGoogleFormAutosaveStatus('error');
      setGoogleFormAutosaveError(error instanceof Error ? error.message : 'Could not save Google Forms link');
    }
  };

  const syncWhatsappGroup = async () => {
    if (!selected) return;
    setSyncingWhatsapp(true);
    try {
      const syncRes = await fetch('/api/admin/crm/workshop-management/students/sync-whatsapp', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id }) });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || 'Could not sync group students');
      await load(selected._id);
      alert(`Saved ${syncData.imported || 0} students. CRM matches: ${syncData.matchedLeads || 0}. Unresolved WhatsApp numbers: ${syncData.unresolved || 0}. Previously removed students preserved: ${syncData.preservedRemoved || 0}.`);
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
      const responseText = await res.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() };
      }
      if (!res.ok) {
        throw new Error(data.error || `Zoom attendance sync failed (${res.status})`);
      }
      await load(selected._id);
      const result = data.result || {};
      alert(result.skipped
        ? (result.message || 'Zoom has not published attendance yet. It can take up to two hours after the class ends.')
        : (result.message || `Zoom attendance updated: ${result.updated || 0} student records. ${result.unmatched || 0} Zoom participant(s) were not matched to enrolled students.`));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not sync Zoom attendance');
    } finally {
      setSyncingZoomAttendance(false);
    }
  };

  // Handle registration of a new batch (AI onboarding workflow)
  const handleNewBatchRegistration = async () => {
    setNewBatchLoading(true);
    // toast is accessed from top-level hook
    try {
      // Placeholder API calls – replace with real endpoints later
      await fetch('/api/admin/onboarding/approve', { method: 'POST', headers, body: JSON.stringify({}) });
      await fetch('/api/admin/onboarding/welcome-message', { method: 'POST', headers, body: JSON.stringify({}) });
      await fetch('/api/admin/zoom/schedule', { method: 'POST', headers, body: JSON.stringify({}) });
      await fetch('/api/admin/whatsapp/add-to-group', { method: 'POST', headers, body: JSON.stringify({}) });
      await fetch('/api/admin/onboarding/send-kit', { method: 'POST', headers, body: JSON.stringify({}) });
      toast.success('New batch registration completed successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to register new batch');
    } finally {
      setNewBatchLoading(false);
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
    for (const { classDate: date, holiday, dayNumber } of workshopSessionCalendar(startDateKey, [...cohortHolidaySet])) {
      const saved = existing.get(date);
      rows.push({ classDate: date, dayNumber: holiday ? dayNumber : dayNumber, holiday, durationMinutes: saved ? String(Math.round((saved.durationSeconds || 0) / 60)) : '0', status: holiday ? 'holiday' : saved?.joined ? 'joined' : 'absent' });
    }
    setDetailStudent(currentStudent);
    attendanceChartDraftRef.current = rows;
    setAttendanceChart(rows);
  };

  const saveStudentChart = async () => {
    if (!selected || !detailStudent) return;
    setSavingChart(true);
    try {
      await attendanceAutosaveRef.current?.flush();
      await load(selected._id);
      setDetailStudent(null);
    } catch (error) {
      setAttendanceAutosaveStatus('error');
      setAttendanceAutosaveError(error instanceof Error ? error.message : 'Could not save attendance chart');
    } finally {
      setSavingChart(false);
    }
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
      await recordingSetupAutosaveRef.current?.flush();
    } catch (error) {
      setRecordingSetupAutosaveStatus('error');
      setRecordingSetupAutosaveError(error instanceof Error ? error.message : 'Failed to save Zoom settings');
    } finally {
      setSavingZoomConfig(false);
    }
  };

  const openEditUrlsModal = (recording: Recording) => {
    setAutoSaveStatus('idle');
    setAutoSaveError('');
    recordingUrlsBaselineRef.current = {
      id: recording._id,
      values: {
        youtubeSpeakerUrl: recording.youtubeSpeakerUrl ?? null,
        youtubeSpeakerId: recording.youtubeSpeakerId ?? null,
        youtubeGalleryUrl: recording.youtubeGalleryUrl ?? null,
        youtubeGalleryId: recording.youtubeGalleryId ?? null,
        bunnySpeakerUrl: recording.bunnySpeakerUrl ?? null,
      },
    };
    setEditingRecordingUrls({
      id: recording._id,
      classDate: recording.classDate,
      dayNumber: recording.dayNumber,
      youtubeSpeakerUrl: recording.youtubeSpeakerUrl || (recording.youtubeSpeakerId ? getYoutubeUrl(recording.youtubeSpeakerId) : ''),
      youtubeGalleryUrl: recording.youtubeGalleryUrl || (recording.youtubeGalleryId ? getYoutubeUrl(recording.youtubeGalleryId) : ''),
      bunnySpeakerUrl: recording.bunnySpeakerUrl || '',
    });
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!window.confirm('Are you sure you want to delete this recording day entry?')) return;
    try {
      const res = await fetch(`/api/admin/crm/workshop-management/recordings?id=${recordingId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete recording');
      if (toast?.success) toast.success('Recording deleted successfully');
      else alert('Recording deleted successfully');
      if (selected) await load(selected._id);
    } catch (err: any) {
      if (toast?.error) toast.error(err.message || 'Error deleting recording');
      else alert(err.message || 'Error deleting recording');
    }
  };

  const handleUrlsInputChange = (field: 'youtubeSpeakerUrl' | 'youtubeGalleryUrl' | 'bunnySpeakerUrl', val: string) => {
    if (!editingRecordingUrls || savingRecordingUrls) return;
    draftChangeSequenceRef.current += 1;
    const updated = { ...editingRecordingUrls, [field]: val };
    setEditingRecordingUrls(updated);
    recordingUrlsAutosaveRef.current?.schedule(updated);
  };

  const handleUrlsInputBlur = () => {
    if (!editingRecordingUrls) return;
    void recordingUrlsAutosaveRef.current?.flush().catch(() => undefined);
  };

  const saveRecordingUrlsModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingRecordingUrls || !selected) return;
    setSavingRecordingUrls(true);
    try {
      await recordingUrlsAutosaveRef.current?.flush();
      setEditingRecordingUrls(null);
      recordingUrlsBaselineRef.current = null;
    } catch (error) {
      setAutoSaveStatus('error');
      setAutoSaveError(error instanceof Error ? error.message : 'Failed to save URLs');
    } finally {
      setSavingRecordingUrls(false);
    }
  };

  const closeRecordingUrlsModal = async () => {
    setSavingRecordingUrls(true);
    try {
      await recordingUrlsAutosaveRef.current?.flush();
      setEditingRecordingUrls(null);
      recordingUrlsBaselineRef.current = null;
    } catch (error) {
      setAutoSaveStatus('error');
      setAutoSaveError(error instanceof Error ? error.message : 'Could not save recording URLs');
    } finally {
      setSavingRecordingUrls(false);
    }
  };

  const openEditDateModal = (dateStr: string, currentDayNum?: number | null) => {
    const isHoliday = cohortHolidaySet.has(dateStr);
    setEditingDateModal({
      classDate: dateStr,
      dayNumber: currentDayNum || null,
      isHoliday,
    });
  };

  const saveDateEdit = async (dayNum: number | null, isHoliday: boolean) => {
    if (!editingDateModal || !selected) return;
    setSavingDateModal(true);
    try {
      const res = await fetch('/api/admin/crm/workshop-management/class-date', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cohortId: selected._id,
          classDate: editingDateModal.classDate,
          dayNumber: dayNum,
          isHoliday,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update date');
      await load(selected._id);
      setEditingDateModal(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update date');
    } finally {
      setSavingDateModal(false);
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
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 via-indigo-600 to-violet-600 shrink-0" />
      
      {/* Global Header & Hero Ribbon */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/50 px-4 sm:px-6 py-4 sm:py-5 text-white shadow-lg relative overflow-hidden flex-shrink-0 z-10">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-violet-600/20 to-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-gradient-to-tr from-indigo-500 to-teal-400 p-2.5 sm:p-3 rounded-2xl shadow-lg shadow-indigo-500/25 ring-2 ring-white/10 text-white shrink-0">
              <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Workshop Management</h1>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                  <Sparkles size={11} className="text-teal-300" />
                  SaaS Cohorts
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/80 font-medium mt-0.5">
                Cohorts, students admissions, Zoom attendance auto-sync & video recordings
              </p>
            </div>
          </div>

          {/* Quick KPI stats strip in header */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Batches</span>
              <span className="text-sm font-black text-white">{cohorts.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Students</span>
              <span className="text-sm font-black text-emerald-300">{students.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Zoom Ready</span>
              <span className="text-sm font-black text-cyan-300">{cohorts.filter(c => c.zoomMeetingId).length}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="relative z-10 flex items-center justify-between gap-2.5 flex-wrap mt-4 pt-3.5 border-t border-white/10">
          {/* Mobile Cohort Switcher Trigger */}
          <button
            type="button"
            onClick={() => setShowMobileCohortList(true)}
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600/60 hover:bg-indigo-600 text-white border border-indigo-400/40 shadow-xs"
          >
            <Layers size={14} className="text-teal-300" />
            <span>{selected ? selected.name : 'Select Workshop'}</span>
            <ChevronDown size={14} />
          </button>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <a
              href="/admin/crm/workshop-management"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-transform hover:scale-105 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-500/20"
            >
              <Users className="h-4 w-4" />
              Workshop Students
            </a>
            <a
              href="/admin/crm/new-registration/english"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-transform hover:scale-105 bg-teal-600 hover:bg-teal-500 text-white shadow-sm hover:shadow-teal-500/20"
            >
              <Plus className="h-4 w-4" />
              Register New Batch
            </a>
            <a
              href="/admin/crm/workshop-offer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-transform hover:scale-105 bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-sm hover:shadow-fuchsia-500/20"
            >
              <Plus className="h-4 w-4" />
              Workshop Offer
            </a>
            <button 
              onClick={() => setShowMetaFormModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <LinkIcon size={15} /> Connect Meta Form
            </button>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 hover:scale-105"
            >
              <Plus size={16} /> Add Workshop
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Workshops Selector Drawer */}
      {showMobileCohortList && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col md:hidden animate-in fade-in">
          <div className="bg-white m-3 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Select Workshop</h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-0.5 rounded-full">{cohorts.length}</span>
              </div>
              <button 
                onClick={() => setShowMobileCohortList(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search workshops..."
                  value={cohortSearchQuery}
                  onChange={(e) => setCohortSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCohorts.map((c) => (
                <div
                  key={c._id}
                  onClick={() => {
                    void selectWorkshop(c);
                    setShowMobileCohortList(false);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selected?._id === c._id
                      ? 'bg-gradient-to-r from-indigo-50 to-teal-50/40 border-indigo-400 shadow-sm ring-1 ring-indigo-400/20'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <p className={`font-black text-sm ${selected?._id === c._id ? 'text-indigo-950' : 'text-slate-800'}`}>
                    {c.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Calendar size={10} /> {new Date(c.startDate).toLocaleDateString()}
                    </span>
                    {c.zoomMeetingId && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
                        <Video size={10} /> Zoom Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Workshops List */}
        <aside className="hidden md:flex md:w-80 lg:w-88 xl:w-96 bg-white border-r border-slate-200 flex-col z-10 flex-shrink-0 shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600" />
                Workshops
              </span>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                {cohorts.length} Batches
              </span>
            </div>
            {/* Search Cohorts Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search workshops..."
                value={cohortSearchQuery}
                onChange={(e) => setCohortSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-400"
              />
              {cohortSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCohortSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCohorts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No workshops found</p>
                <p className="text-xs text-slate-400 mt-1">{cohortSearchQuery ? 'Try another search term' : 'Click "Add Workshop" to create your first batch.'}</p>
              </div>
            ) : (
              filteredCohorts.map((c) => (
                <div 
                  key={c._id} 
                  className={`group relative w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    selected?._id === c._id
                      ? 'bg-gradient-to-r from-indigo-50/95 via-teal-50/30 to-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/80 shadow-xs'
                  }`}
                  onClick={() => { void selectWorkshop(c); }}
                >
                  <div className="flex items-start justify-between gap-2 pr-12">
                    <p className={`font-black text-sm tracking-tight leading-snug ${selected?._id === c._id ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                      {c.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200/60">
                      <Calendar size={10} className="text-slate-500"/> {new Date(c.startDate).toLocaleDateString()}
                    </span>
                    {c.classStartTime && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-indigo-100">
                        <Clock size={10}/> {c.classStartTime}
                      </span>
                    )}
                    {c.zoomMeetingId && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-200">
                        <Video size={10}/> Zoom
                      </span>
                    )}
                  </div>
                  {/* Edit / Delete buttons */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Edit workshop"
                      onClick={(e) => handleEditCohort(c, e)}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-xs transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      title="Delete workshop"
                      onClick={(e) => handleDeleteCohort(c, e)}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 shadow-xs transition-colors"
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
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-100 to-teal-100 rounded-3xl flex items-center justify-center mb-6 shadow-md shadow-indigo-100 ring-4 ring-white">
                <GraduationCap className="h-12 w-12 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Select a Workshop</h2>
              <p className="max-w-md text-sm text-slate-500">Choose a workshop batch from the sidebar or tap the batch switcher to manage admitted students, sync Zoom attendance, and dispatch class recordings.</p>
              <button
                type="button"
                onClick={() => setShowMobileCohortList(true)}
                className="mt-6 md:hidden px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm flex items-center gap-2"
              >
                <Layers size={16} /> Choose Workshop
              </button>
            </div>
          ) : (
            <>
              {/* Workspace Header & Tabs */}
              <div className="bg-white px-4 sm:px-8 pt-6 sm:pt-8 border-b border-slate-200 flex-shrink-0 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{selected.name}</h2>
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Cohort
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 mt-3 text-xs sm:text-sm font-semibold text-slate-600 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-slate-700 border border-slate-200/80">
                        <Clock size={14} className="text-indigo-600" /> {selected.classStartTime || '—'} – {selected.classEndTime || '—'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl text-emerald-800 border border-emerald-200/80">
                        <Users size={14} className="text-emerald-600" /> {students.length} Students Enrolled
                      </span>
                      {selected.zoomMeetingId && (
                        <span className="inline-flex items-center gap-1.5 bg-sky-50 px-3 py-1 rounded-xl text-sky-800 border border-sky-200/80 font-mono font-bold">
                          <Video size={14} className="text-sky-600" /> ID: {selected.zoomMeetingId}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selected.zoomMeetingId || '');
                              alert('Meeting ID copied!');
                            }}
                            className="p-0.5 text-sky-500 hover:text-sky-800 hover:bg-sky-100 rounded transition-colors cursor-pointer"
                            title="Copy Meeting ID"
                          >
                            <Copy size={12} />
                          </button>
                        </span>
                      )}
                      {selected.zoomJoinUrl && (
                        <a
                          href={selected.zoomJoinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-3 py-1 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                          title="Join Zoom Meeting"
                        >
                          Join Meeting <ExternalLink size={12} />
                        </a>
                      )}
                      {selected.whatsappGroupLink && (
                        <a
                          href={selected.whatsappGroupLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                          title="Open WhatsApp Group"
                        >
                          <MessageCircle size={12} /> WA Group
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Segmented Pill Tabs */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-4 scrollbar-none">
                  {[
                    { id: 'students', label: 'Students & Attendance', icon: Users, count: students.length },
                    { id: 'recordings', label: 'Recordings', icon: Video, count: recordings.length },
                    { id: 'settings', label: 'Workshop Settings', icon: Settings },
                    { id: 'analytics', label: 'Attendance Analytics', icon: BarChart2 }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                        activeTab === tab.id 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <tab.icon size={15} />
                      <span>{tab.label}</span>
                      {typeof (tab as any).count === 'number' && (
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {(tab as any).count}
                        </span>
                      )}
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
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200">
                      <button 
                        onClick={() => { setAddStudentTab('manual'); setShowAddStudent(true); }} 
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm shadow-indigo-600/20 hover:scale-105"
                      >
                        <UserPlus size={16} /> Add Students
                      </button>

                      <button 
                        onClick={() => setSelectedStudentIds(students.length > 0 && selectedStudentIds.length === students.length ? [] : students.map(s => s._id))} 
                        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-slate-200/80"
                      >
                        <CheckCircle2 size={16} className={selectedStudentIds.length > 0 ? "text-indigo-600" : "text-slate-400"} /> 
                        {students.length > 0 && selectedStudentIds.length === students.length ? 'Deselect All' : 'Select All'}
                      </button>
                      
                      <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                      
                      {selected.zoomMeetingId && (
                        <button 
                          onClick={syncZoomAttendance} 
                          disabled={syncingZoomAttendance} 
                          className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-sky-200/80 disabled:opacity-50"
                        >
                          <RefreshCw size={15} className={syncingZoomAttendance ? 'animate-spin' : ''} />
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
                        className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors border border-rose-200/80"
                        title="Remove all duplicate rows and merge records"
                      >
                        <Trash2 size={15} />
                        Delete Duplicates
                      </button>

                      {selectedStudentIds.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                          <button onClick={() => handleBroadcast('qr')} className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl font-bold text-xs transition-colors border border-emerald-200">
                            <QrCode size={14} /> QR Broadcast
                          </button>
                          <button onClick={() => handleBroadcast('meta')} className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl font-bold text-xs transition-colors border border-blue-200">
                            <MessageCircle size={14} /> Meta Broadcast
                          </button>
                          <button onClick={() => handleBroadcast('email')} className="inline-flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-2 rounded-xl font-bold text-xs transition-colors border border-violet-200">
                            <Mail size={14} /> Email
                          </button>
                          <button onClick={removeSelectedStudents} className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-xl font-bold text-xs transition-colors border border-red-200">
                            <Trash2 size={14} /> Remove ({selectedStudentIds.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Search bar */}
                    {students.length > 0 && (
                      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-xs border border-slate-200">
                        <div className="flex-1 relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={studentsSearch}
                            onChange={e => setStudentsSearch(e.target.value)}
                            placeholder="Search student by name, mobile number, or email…"
                            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-400"
                          />
                          {studentsSearch && (
                            <button onClick={() => setStudentsSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {studentsSearch ? (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full whitespace-nowrap border border-indigo-200">
                            {students.filter(s => {
                              const q = studentsSearch.trim().toLowerCase();
                              const qd = q.replace(/\D/g, '');
                              return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q) || (s.whatsappNumber || '').toLowerCase().includes(q) ||
                                (qd.length >= 3 && ((s.phone || '').replace(/\D/g, '').includes(qd) || (s.whatsappNumber || '').replace(/\D/g, '').includes(qd)));
                            }).length} of {students.length} students
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                            {students.length} students
                          </span>
                        )}
                      </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {students.length === 0 ? (
                        <div className="text-center py-20 px-4">
                          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
                            <Users size={32} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">No students enrolled yet</h3>
                          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Import from Google Forms, sync CRM leads, or add students manually to build this batch roster.</p>
                          <button
                            onClick={() => { setAddStudentTab('manual'); setShowAddStudent(true); }}
                            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
                          >
                            <UserPlus size={14} /> Add First Student
                          </button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider">
                              <tr>
                                <th className="p-4 w-12 text-center">
                                  <input type="checkbox" checked={students.length > 0 && selectedStudentIds.length === students.length} onChange={(e) => setSelectedStudentIds(e.target.checked ? students.map((s) => s._id) : [])} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                </th>
                                <th className="p-4 w-12 text-center">#</th>
                                <th className="p-4">Code</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">WhatsApp / Phone</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">City / Country</th>
                                <th className="p-4 text-center">Attendance</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {students.filter(s => {
                                const q = studentsSearch.trim().toLowerCase();
                                if (!q) return true;
                                const qd = q.replace(/\D/g, '');
                                return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q) || (s.whatsappNumber || '').toLowerCase().includes(q) ||
                                  (qd.length >= 3 && ((s.phone || '').replace(/\D/g, '').includes(qd) || (s.whatsappNumber || '').replace(/\D/g, '').includes(qd)));
                              }).map((s, idx) => { 
                                const rows = attendance.filter((a) => String(a.studentId) === s._id && !cohortHolidaySet.has(toDateKey(a.classDate) || a.classDate)); 
                                const joinedCount = rows.filter((a) => a.joined).length;
                                const mins = Math.round(rows.reduce((n, a) => n + (a.durationSeconds || 0), 0) / 60);
                                const initials = getInitials(s.name);
                                const avatarBg = getAvatarGradient(s.name);

                                return (
                                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 text-center">
                                      <input type="checkbox" checked={selectedStudentIds.includes(s._id)} onChange={(e) => setSelectedStudentIds((prev) => e.target.checked ? [...prev, s._id] : prev.filter((id) => id !== s._id))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    </td>
                                    <td className="p-4 text-slate-400 font-semibold text-xs text-center">{idx + 1}</td>
                                    <td className="p-4 font-mono text-slate-500 text-xs">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                                        {s.leadNumber || s.leadId?.slice(-6) || '—'}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                                          {initials}
                                        </div>
                                        <button 
                                          type="button" 
                                          onClick={() => openStudentChart(s)} 
                                          className="text-left font-bold text-slate-900 hover:text-indigo-700 group flex items-center gap-1.5 transition-colors"
                                          title="View detailed attendance chart"
                                        >
                                          <span>{s.name}</span>
                                          <BarChart2 size={13} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="p-4 text-slate-700 font-medium whitespace-nowrap text-xs">
                                      {s.whatsappNumber || s.phone || <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs truncate max-w-[160px]" title={s.email}>
                                      {s.email || <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="p-4 text-xs text-slate-600">
                                      {s.metadata?.city || s.metadata?.country ? (
                                        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                          {[s.metadata?.city, s.metadata?.country].filter(Boolean).join(', ')}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${joinedCount > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        <span>{joinedCount} days</span>
                                        <span className="text-slate-400">·</span>
                                        <span className="font-normal text-[11px] text-slate-500">{mins}m</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black border ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                        {s.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={() => openStudentEditor(s)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                                          title="Edit student details"
                                        >
                                          <Edit2 size={12} /> Edit
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'qr')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer shadow-2xs" 
                                          title="Auto connect to WhatsApp QR Inbox"
                                        >
                                          <QrCode size={12} /> QR
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'meta')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs" 
                                          title="Auto connect to WhatsApp Meta Inbox"
                                        >
                                          <MessageCircle size={12} /> Meta
                                        </button>
                                        <button 
                                          onClick={() => openStudentInbox(s, 'email')} 
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200 transition-colors cursor-pointer shadow-2xs" 
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
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-indigo-800/80 rounded-3xl p-5 sm:p-6 shadow-md text-white space-y-4 relative overflow-hidden">
                      <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-3 rounded-2xl shadow-md flex-shrink-0">
                            <Video size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-white text-base sm:text-lg">Zoom Cloud Recordings Automation</h3>
                              <span className="text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                                <Sparkles size={11} /> Auto-syncs every 2 hours
                              </span>
                            </div>
                            <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl leading-relaxed">
                              Uploaded Zoom recordings automatically distribute to <strong className="text-white">YouTube</strong> (Speaker + Gallery) and <strong className="text-white">Bunny CDN</strong> (Speaker video + MP3 audio).
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={syncRecordingsNow}
                            disabled={syncingRecordings || !selected.zoomMeetingId}
                            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer backdrop-blur-sm"
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
                              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                              title="Launch Zoom Meeting"
                            >
                              Join Meeting <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Quick Input Fields for Meeting ID and Link */}
                      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1.5">
                            Zoom Meeting ID
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 85155446286"
                            value={recordingSetup.zoomMeetingId}
                            onChange={(e) => updateRecordingSetup({ zoomMeetingId: e.target.value })}
                            className="w-full font-mono text-sm rounded-xl border border-white/20 px-3.5 py-2 bg-slate-900/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          />
                        </div>

                        <div className="md:col-span-6">
                          <label className="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>Zoom Join Link</span>
                            {recordingSetup.zoomJoinUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(recordingSetup.zoomJoinUrl);
                                  alert('Zoom Join Link copied!');
                                }}
                                className="text-[11px] font-bold text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy size={11} /> Copy Link
                              </button>
                            )}
                          </label>
                          <input
                            type="url"
                            placeholder="https://us06web.zoom.us/j/85155446286?pwd=..."
                            value={recordingSetup.zoomJoinUrl}
                            onChange={(e) => updateRecordingSetup({ zoomJoinUrl: e.target.value })}
                            className="w-full text-sm rounded-xl border border-white/20 px-3.5 py-2 bg-slate-900/60 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <AutosaveIndicator status={recordingSetupAutosaveStatus} error={recordingSetupAutosaveError} onRetry={() => { void recordingSetupAutosaveRef.current?.retry().catch(() => undefined); }} />
                          <button
                            type="button"
                            onClick={saveZoomConfig}
                            disabled={savingZoomConfig}
                            className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Save size={13} />
                            {savingZoomConfig ? 'Saving...' : 'Save Now'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                      <div className="lg:col-span-1">
                        <form onSubmit={saveRecording} className="bg-gradient-to-b from-white to-indigo-50/20 rounded-3xl shadow-sm border border-slate-200/90 p-5 sm:p-6 sticky top-4">
                          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                            <div className="bg-gradient-to-tr from-indigo-500 to-violet-500 text-white p-2.5 rounded-2xl shadow-xs"><PlayCircle size={20}/></div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">New Delivery</h3>
                              <p className="text-xs text-slate-500">Record a session's video links</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Class Date *</label>
                              <input required type="date" value={recordingForm.classDate} onChange={(e) => setRecordingForm({ ...recordingForm, classDate: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white text-sm focus:ring-2 focus:ring-indigo-300" />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500" /> YouTube Links
                              </label>
                              <input placeholder="Speaker Video ID or URL" value={recordingForm.youtubeSpeakerId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeSpeakerId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white mb-2 text-xs focus:ring-2 focus:ring-indigo-300" />
                              <input placeholder="Gallery Video ID or URL" value={recordingForm.youtubeGalleryId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeGalleryId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-indigo-300" />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Bunny CDN URLs
                              </label>
                              <input placeholder="Bunny Speaker URL" value={recordingForm.bunnySpeakerUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnySpeakerUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white mb-2 text-xs focus:ring-2 focus:ring-indigo-300" />
                              <input placeholder="Bunny Gallery URL" value={recordingForm.bunnyGalleryUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnyGalleryUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-indigo-300" />
                            </div>
                            
                            <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 py-3 font-bold text-white shadow-md shadow-indigo-600/20 transition-all mt-4 cursor-pointer text-sm hover:scale-105">
                              Save Delivery
                            </button>
                          </div>
                        </form>
                      </div>
                      
                      <div className="lg:col-span-2 space-y-4">
                        {recordings.length === 0 ? (
                          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
                              <Video size={32} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-base mb-1">No recordings logged yet</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">Click &quot;Sync Zoom Recordings&quot; above to auto-import cloud recordings or use the form on the left to manually save daily deliveries.</p>
                          </div>
                        ) : (
                          recordings.map((recording) => (
                            <div key={recording._id} className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-start gap-4 hover:border-indigo-300 hover:shadow-md transition-all">
                              <div className="bg-gradient-to-b from-indigo-50 to-indigo-100/60 px-3 sm:px-4 py-3 rounded-2xl text-center min-w-[76px] sm:min-w-[84px] flex flex-col justify-center border border-indigo-200/60 shrink-0">
                                <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider mb-0.5">Day</p>
                                <input 
                                  type="text" 
                                  className="w-12 text-center text-xl sm:text-2xl font-black text-indigo-700 bg-transparent border-b-2 border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none transition-colors mx-auto"
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
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                  <h4 className="font-black text-slate-900 text-base sm:text-lg">
                                    {new Date(recording.classDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEditUrlsModal(recording)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                                      title="Edit YouTube & Bunny URLs for this day"
                                    >
                                      <Edit2 size={12} /> Edit URLs
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRecording(recording._id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                                      title="Delete this recording entry"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                </div>
                                <input 
                                  type="text"
                                  className="w-full text-xs sm:text-sm font-semibold text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors pb-1"
                                  placeholder="Enter session subject or topic..."
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
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-100">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Speaker View</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {(recording.youtubeSpeakerUrl || recording.youtubeSpeakerId) ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-2xs" 
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
                                            <Copy size={12}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50/60 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-dashed border-red-200 hover:border-red-300 transition-colors cursor-pointer"
                                          title="Add YouTube Speaker URL"
                                        >
                                          <Plus size={12}/> YouTube
                                        </button>
                                      )}

                                      {recording.bunnySpeakerUrl ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs" 
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
                                            <Copy size={12}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50/60 hover:bg-amber-50 px-2.5 py-1.5 rounded-xl border border-dashed border-amber-200 hover:border-amber-300 transition-colors cursor-pointer"
                                          title="Add Bunny Speaker URL"
                                        >
                                          <Plus size={12}/> Bunny
                                        </button>
                                      )}
                                      {recording.metadata?.bunnyAudioUrl && (
                                        <a href={recording.metadata.bunnyAudioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                                          <Download size={13}/> MP3 Audio
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Gallery View</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {(recording.youtubeGalleryUrl || recording.youtubeGalleryId) ? (
                                        <div className="flex items-center gap-1">
                                          <a 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-2xs" 
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
                                            <Copy size={12}/>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openEditUrlsModal(recording)}
                                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50/60 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-dashed border-red-200 hover:border-red-300 transition-colors cursor-pointer"
                                          title="Add YouTube Gallery URL"
                                        >
                                          <Plus size={12}/> YouTube
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(recording.metadata?.zoomSpeakerUrl || recording.metadata?.zoomShareUrl) && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
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
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs border border-indigo-200/60">
                                  <Users size={13}/> {(recording.deliveredStudentIds || []).length || 0}
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
                  <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    
                    {/* Google Form Settings */}
                    <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-white p-6 shadow-sm hover:shadow-md transition-all group">
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/20 transition-colors" />
                      
                      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-emerald-100/60">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                          <Link size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base">Google Form Integration</h3>
                          <p className="text-xs text-slate-500">Public student enquiry & registration URL</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                            CRM Public Form URL
                          </label>
                          <div className="relative">
                            <input 
                              type="url" 
                              placeholder="https://swaryoga.com/enquiry?w=..." 
                              value={googleFormLink} 
                              onChange={(e) => updateGoogleFormLink(e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50/80 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-500 transition-all" 
                            />
                            {googleFormLink && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(googleFormLink);
                                  toast.success('Form URL copied to clipboard');
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Copy link"
                              >
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <AutosaveIndicator status={googleFormAutosaveStatus} error={googleFormAutosaveError} onRetry={() => { void googleFormAutosaveRef.current?.retry().catch(() => undefined); }} />
                        
                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            type="button" 
                            onClick={saveGoogleFormLink} 
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 px-4 shadow-sm shadow-emerald-600/20 text-sm transition-all cursor-pointer"
                          >
                            <Save size={15} /> Save Now
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { if (googleFormLink) window.open(googleFormLink, '_blank'); }} 
                            disabled={!googleFormLink}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold py-2.5 px-4 hover:bg-slate-50 hover:border-slate-300 text-sm transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            <ExternalLink size={14} /> Open Form
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Automations */}
                    <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/20 to-white p-6 shadow-sm hover:shadow-md transition-all group">
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-400/20 transition-colors" />

                      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-violet-100/60">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
                          <Settings size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base">Workshop Automations</h3>
                          <p className="text-xs text-slate-500">Autonomous Zoom recording sync & AI workflows</p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <button 
                          type="button" 
                          onClick={() => void runWorkshopWorker(true)} 
                          disabled={runningWorker} 
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                            runningWorker 
                              ? "border-amber-300 bg-amber-50/90 text-amber-900" 
                              : "border-violet-200/80 bg-violet-50/70 hover:bg-violet-100/80 hover:border-violet-300 text-violet-950 shadow-2xs"
                          }`}
                        >
                          <div>
                            {runningWorker ? (
                              <>
                                <p className="font-bold text-sm text-amber-900 flex items-center gap-2">
                                  <RefreshCw size={14} className="animate-spin text-amber-600" />
                                  Simulating Tasks...
                                </p>
                                <p className="text-xs text-amber-700 mt-1">Please wait, inspecting queue...</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-sm text-violet-950 flex items-center gap-2">
                                  <Eye size={15} className="text-violet-600" />
                                  Preview AI Worker
                                </p>
                                <p className="text-xs text-violet-600 mt-0.5">Dry-run tasks without sending real messages</p>
                              </>
                            )}
                          </div>
                          <span className="p-2 rounded-xl bg-white/70 text-violet-600">
                            {runningWorker ? <RefreshCw size={16} className="animate-spin text-amber-600" /> : <ChevronRight size={16} className="text-violet-500" />}
                          </span>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => void runWorkshopWorker(false)} 
                          disabled={runningWorker} 
                          className={`w-full flex items-center justify-between p-4 rounded-2xl shadow-sm transition-all text-left text-white cursor-pointer ${
                            runningWorker 
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20" 
                              : "bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 shadow-violet-600/25 hover:shadow-md"
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-sm flex items-center gap-2">
                              {runningWorker ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={15} className="text-violet-200" />}
                              {runningWorker ? "Uploading & Syncing..." : "Run AI Worker Now"}
                            </p>
                            <p className="text-xs mt-0.5 text-white/80">
                              {runningWorker ? "Processing recordings & Zoom cloud files (2-3 mins)" : "Execute pending tasks, auto-recordings & WhatsApp broadcasts"}
                            </p>
                          </div>
                          <span className="p-2 rounded-xl bg-white/15 text-white">
                            {runningWorker ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} className="text-amber-300" />}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Zoom Recording Setup */}
                    <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-sky-50/20 to-white p-6 shadow-sm hover:shadow-md transition-all md:col-span-2 group">
                      <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-400/20 transition-colors" />

                      <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-blue-100/60">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                          <Video size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 text-base">Zoom Recording &amp; Community Config</h3>
                          <p className="text-xs text-slate-500">Configure meeting ID, target WhatsApp community, and YouTube playlist</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Video size={13} className="text-blue-600" /> Zoom Meeting ID
                            </label>
                            <input 
                              type="text" 
                              placeholder="e.g. 84592019482" 
                              value={recordingSetup.zoomMeetingId} 
                              onChange={(e) => updateRecordingSetup({ zoomMeetingId: e.target.value })} 
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50/80 focus:bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-500 transition-all font-mono" 
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Users size={13} className="text-blue-600" /> Target Community
                            </label>
                            <select 
                              value={recordingSetup.communityId} 
                              onChange={(e) => updateRecordingSetup({ communityId: e.target.value })} 
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50/80 focus:bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-500 transition-all"
                            >
                              <option value="">-- Select Community --</option>
                              {communities.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <PlayCircle size={13} className="text-red-500" /> YouTube Playlist Name <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                            </label>
                            <input 
                              type="text" 
                              placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}" 
                              value={recordingSetup.youtubePlaylistName} 
                              onChange={(e) => updateRecordingSetup({ youtubePlaylistName: e.target.value })} 
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50/80 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-500 transition-all" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Link size={13} className="text-slate-400" /> Custom Thumbnail URL <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                            </label>
                            <input 
                              type="url" 
                              placeholder="https://..." 
                              value={recordingSetup.thumbnailUrl} 
                              onChange={(e) => updateRecordingSetup({ thumbnailUrl: e.target.value })} 
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50/80 focus:bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-500 transition-all" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <AutosaveIndicator status={recordingSetupAutosaveStatus} error={recordingSetupAutosaveError} onRetry={() => { void recordingSetupAutosaveRef.current?.retry().catch(() => undefined); }} />
                        <button 
                          type="button" 
                          onClick={saveRecordingSetup} 
                          disabled={savingRecordingSetup} 
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-2.5 text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {savingRecordingSetup ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Save size={15} /> Save Settings Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* === ANALYTICS TAB === */}
                {activeTab === 'analytics' && (() => {
                  const report = getAttendanceReport();
                  const uniqueDates = report.sessions.map(session => session.classDate);
                  const visibleStudents = students.filter(student => report.rows.some(row => row.student._id === student._id));
                  const attendanceByStudent = report.rows;
                  const gradeDistribution = attendanceByStudent.reduce<Record<string, number>>((acc, row) => { acc[row.grade] = (acc[row.grade] || 0) + 1; return acc; }, {});
                  const confirmedStudents = report.rows.filter(row => row.percent !== null);
                  const averageAttendance = confirmedStudents.length ? `${Math.round(confirmedStudents.reduce((sum, row) => sum + (row.percent ?? 0), 0) / confirmedStudents.length)}%` : 'Pending';
                  const totalPresent = report.rows.reduce((sum, row) => sum + row.attended, 0);

                  return (
                    <div className="max-w-6xl mx-auto space-y-6">
                      <style>{`
                        @media print {
                          @page { size: landscape; margin: 1cm; }
                          body * { visibility: hidden; }
                          #analytics-print-area, #analytics-print-area * { visibility: visible; }
                          #analytics-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                          #analytics-print-area table { font-size: 8px; table-layout: fixed; }
                          #analytics-print-area th, #analytics-print-area td { padding: 4px !important; white-space: normal !important; overflow-wrap: anywhere; }
                          #analytics-print-area tr { break-inside: avoid; }
                          #analytics-print-area thead { display: table-header-group; }
                          #analytics-print-area .report-student { position: static !important; }
                          .no-print { display: none !important; }
                        }
                      `}</style>
                      <div id="analytics-print-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200">
                          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Swar Yoga · Workshop Attendance Report</p>
                          <h2 className="mt-2 text-2xl font-bold text-slate-900">{selected.name}</h2>
                          <p className="mt-1 text-sm text-slate-500">{selected.startDate} – {report.sessions.at(-1)?.classDate} · {report.sessions.length} sessions · {selected.timezone || 'Asia/Kolkata'}</p>
                          <p className="mt-2 text-xs text-slate-500">Generated {new Date().toLocaleString()} · {analyticsSearch ? `Filtered students: ${analyticsSearch}` : 'All students'}</p>
                          <p className="mt-3 text-xs text-amber-800">Pending = no saved attendance record. Upcoming = future session. Neither is counted as absent. Percentages and grades are provisional, based only on confirmed records.</p>
                        </div>
                        <div className="px-6 py-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                              <BarChart2 size={12} className="text-indigo-400" /> Swar Yoga · Attendance Master Report
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {selected.timezone || 'Asia/Kolkata'}
                            </span>
                          </div>
                          <h2 className="mt-2 text-2xl font-black text-white tracking-tight">{selected.name}</h2>
                          <p className="mt-1 text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                            <span>{selected.startDate} – {report.sessions.at(-1)?.classDate}</span>
                            <span>•</span>
                            <span className="font-semibold text-indigo-300">{report.sessions.length} sessions</span>
                            <span>•</span>
                            <span className="text-slate-400">Generated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                          <p className="mt-2 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 max-w-3xl">
                            💡 Pending = no saved attendance record. Upcoming = future session. Neither is counted as absent. Percentages and grades are provisional based on confirmed records.
                          </p>
                        </div>

                        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-4 no-print">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                              <BarChart2 size={20}/>
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800 text-base">Daily Attendance Matrix</h3>
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Overview of student attendance durations across all classes.</span>
                                {cohortHolidaySet.size > 0 && (
                                  <span className="relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() => setShowHolidayPicker(!showHolidayPicker)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                                      title="Click to view or edit hidden holiday dates"
                                    >
                                      <span>🏖️ {cohortHolidaySet.size} Holiday{cohortHolidaySet.size > 1 ? 's' : ''} Hidden</span>
                                      <span className="text-[9px]">▼</span>
                                    </button>
                                    {showHolidayPicker && (
                                      <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 animate-in fade-in zoom-in-95 text-left">
                                        <div className="text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100 flex items-center justify-between">
                                          <span>Configured Holidays</span>
                                          <button type="button" onClick={() => setShowHolidayPicker(false)} className="text-slate-400 hover:text-slate-700">✕</button>
                                        </div>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                          {Array.from(cohortHolidaySet).sort().map(hDate => (
                                            <div key={hDate} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                                              <span className="font-semibold text-slate-700">
                                                {new Date(`${hDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setShowHolidayPicker(false);
                                                  openEditDateModal(hDate, null);
                                                }}
                                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-800 font-bold text-[10px] cursor-pointer shadow-2xs"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {selected.zoomMeetingId && (
                              <button onClick={syncZoomAttendance} disabled={syncingZoomAttendance} className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-sky-500/20 disabled:opacity-50 cursor-pointer">
                                <RefreshCw size={14} className={syncingZoomAttendance ? 'animate-spin' : ''} />
                                {syncingZoomAttendance ? 'Syncing...' : 'Sync Zoom Data'}
                              </button>
                            )}
                            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                              <Printer size={14} />
                              Print PDF
                            </button>
                            <button onClick={() => void downloadAttendanceExcel()} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/20 cursor-pointer">
                              <FileSpreadsheet size={14} /> Download Excel
                            </button>
                            <button onClick={downloadAnalyticsCSV} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
                              <Download size={14} />
                              Download CSV
                            </button>
                          </div>
                        </div>

                        {/* 5 KPI Stat Cards with Gradient Glass Aesthetics */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-6 bg-slate-50/50 border-b border-slate-100">
                          <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50/90 via-indigo-50/40 to-white border border-indigo-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">Students</span>
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <Users size={14} />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-indigo-950">{visibleStudents.length}</div>
                            <div className="text-[10px] text-indigo-600/80 font-medium mt-0.5">Enrolled cohort batch</div>
                          </div>

                          <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white border border-blue-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">Scheduled Sessions</span>
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                <Calendar size={14} />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-blue-950">{uniqueDates.length}</div>
                            <div className="text-[10px] text-blue-600/80 font-medium mt-0.5">Total class days</div>
                          </div>

                          <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Present Records</span>
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <CheckCircle2 size={14} />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-emerald-950">{totalPresent}</div>
                            <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Joined attendances</div>
                          </div>

                          <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-50/90 via-violet-50/40 to-white border border-purple-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">Avg Attendance</span>
                              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                                <GraduationCap size={14} />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-purple-950">{averageAttendance}</div>
                            <div className="text-[10px] text-purple-600/80 font-medium mt-0.5">Confirmed rate</div>
                          </div>

                          <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-50/90 via-yellow-50/40 to-white border border-amber-200/70 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">Pending Records</span>
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                <Clock size={14} />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-amber-950">{report.rows.reduce((sum, row) => sum + row.pending, 0)}</div>
                            <div className="text-[10px] text-amber-600/80 font-medium mt-0.5">Awaiting sync</div>
                          </div>
                        </div>

                        {/* Provisional Grades */}
                        <div className="px-6 py-4 flex flex-wrap items-center gap-2.5 border-b border-slate-100 bg-white">
                          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-500" /> Provisional Grades:
                          </span>
                          {(['A', 'B', 'C', 'D', 'E'] as const).map((grade) => (
                            <span 
                              key={grade} 
                              className={`px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                                grade === 'A' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs' : 
                                grade === 'B' ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs' : 
                                grade === 'C' ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs' : 
                                grade === 'D' ? 'bg-orange-50 text-orange-800 border-orange-200 shadow-2xs' : 
                                'bg-rose-50 text-rose-800 border-rose-200 shadow-2xs'
                              }`}
                            >
                              Grade {grade}: {gradeDistribution[grade] || 0}
                            </span>
                          ))}
                          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Not graded: {gradeDistribution.Pending || 0}
                          </span>
                        </div>

                        {/* Search bar — no-print */}
                        <div className="no-print px-6 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                          <div className="flex-1 relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={analyticsSearch}
                              onChange={e => setAnalyticsSearch(e.target.value)}
                              placeholder="Search by student name, mobile number or email…"
                              className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 placeholder-slate-400 text-slate-800 transition-all shadow-2xs"
                            />
                            {analyticsSearch && (
                              <button onClick={() => setAnalyticsSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          {analyticsSearch ? (
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl whitespace-nowrap">
                              {report.rows.length} of {students.length} matched
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap">
                              {students.length} students total
                            </span>
                          )}
                        </div>

                        <div className="overflow-x-auto print:overflow-visible">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-4 w-12 text-center text-slate-400">#</th>
                                <th className="report-student sticky left-0 z-10 bg-slate-50/95 backdrop-blur-xs px-6 py-4 min-w-[240px]">Student / Summary</th>
                                <th className="px-6 py-4">Phone / WA</th>
                                <th className="px-6 py-4">Email</th>
                                {uniqueDates.map(date => {
                                  const recording = recordings.find(r => r.classDate === date);
                                  const dayNum = selected?.metadata?.dateDayMap?.[date] || report.sessions.find(session => session.classDate === date)?.dayNumber || recording?.dayNumber || null;
                                  const dateObj = new Date(`${date}T00:00:00`);
                                  const monthShort = dateObj.toLocaleDateString(undefined, { month: 'short' });
                                  const dayOfMonth = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
                                  const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });

                                  return (
                                    <th key={date} className="px-3 py-3 whitespace-nowrap text-center group border-r border-slate-100 last:border-r-0">
                                      <div className="flex flex-col items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openEditDateModal(date, dayNum)}
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 font-black text-xs transition-colors cursor-pointer shadow-2xs"
                                          title={`Click to edit Day Number or mark as Holiday for ${date}`}
                                        >
                                          <span>{dayNum ? `Day ${dayNum}` : 'Set Day'}</span>
                                          <Edit2 size={10} className="text-indigo-400 group-hover:text-indigo-700" />
                                        </button>
                                        <div className="text-[11px] font-bold text-slate-700 tracking-tight">
                                          {monthShort} {dayOfMonth}
                                        </div>
                                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                                          {weekday}
                                        </div>
                                      </div>
                                    </th>
                                  );
                                })}
                                <th className="px-4 py-4 whitespace-nowrap text-right no-print">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {report.rows.map((row, idx) => {
                                const s = row.student;
                                return (
                                <tr key={s._id} className="hover:bg-indigo-50/20 transition-colors group">
                                  <td className="px-4 py-4 text-slate-400 font-semibold text-xs text-center">{idx + 1}</td>
                                  <td className="report-student sticky left-0 bg-white group-hover:bg-slate-50/90 px-6 py-4 whitespace-nowrap transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(s.name)} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
                                        {getInitials(s.name)}
                                      </div>
                                      <div>
                                        <button 
                                          type="button"
                                          onClick={() => openStudentChart(s)}
                                          className="font-extrabold text-slate-800 hover:text-indigo-600 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                          {s.name}
                                          <BarChart2 size={12} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                        <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                                          <span className="font-bold text-indigo-700">{row.attended}/{row.confirmed}</span> confirmed · {row.totalMinutes}m · 
                                          <span className={`ml-1 font-bold ${row.grade === 'A' ? 'text-emerald-600' : row.grade === 'B' ? 'text-blue-600' : row.grade === 'C' ? 'text-amber-600' : 'text-slate-600'}`}>
                                            {row.percent === null ? 'Not graded' : `${row.percent}% (${row.grade})`}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <p className="text-xs text-slate-700 font-medium font-mono">{s.whatsappNumber || s.phone || <span className="text-slate-300 font-sans">—</span>}</p>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <p className="text-xs text-slate-500">{s.email || <span className="text-slate-300">—</span>}</p>
                                  </td>
                                  {uniqueDates.map(date => {
                                    const record = attendance.find(a => String(a.studentId) === String(s._id) && a.classDate === date);
                                    const recording = recordings.find(r => r.classDate === date);
                                    const hasRecording = !!(recording?.youtubeSpeakerUrl || recording?.youtubeGalleryUrl || recording?.bunnySpeakerUrl || recording?.bunnyGalleryUrl || recording?.metadata?.zoomSpeakerUrl || recording?.metadata?.zoomShareUrl);

                                    if (record && row.cells.find(cell => cell.classDate === date)?.status === 'Present') {
                                      const mins = Math.round(record.durationSeconds / 60);
                                      return (
                                        <td key={date} className="px-3 py-3 text-center">
                                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200/80 shadow-2xs">
                                            <CheckCircle2 size={11} className="text-emerald-500" />
                                            <span>{mins}m</span>
                                          </span>
                                        </td>
                                      );
                                    }
                                    return (
                                      <td key={date} className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-xs border ${
                                            row.cells.find(cell => cell.classDate === date)?.status === 'Absent' 
                                              ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
                                              : 'bg-slate-50 text-slate-500 border-slate-200'
                                          }`}>
                                            {row.cells.find(cell => cell.classDate === date)?.status}
                                          </span>
                                          {hasRecording && record && !record.joined && (
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
                                              className="no-print inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[10px] border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                                            >
                                              <Send size={9} /> Send
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className="px-4 py-4 whitespace-nowrap no-print text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => openStudentEditor(s)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                        title="Edit student details"
                                      >
                                        <Edit2 size={12} /> Edit
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'qr')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer shadow-2xs" 
                                        title="Auto connect to WhatsApp QR Inbox"
                                      >
                                        <QrCode size={12} /> QR
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'meta')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs" 
                                        title="Auto connect to WhatsApp Meta Inbox"
                                      >
                                        <MessageCircle size={12} /> Meta
                                      </button>
                                      
                                      <button 
                                        onClick={() => openStudentInbox(s, 'email')} 
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200 transition-colors cursor-pointer shadow-2xs" 
                                        title="Auto connect to Email Inbox"
                                      >
                                        <Mail size={12} /> Email
                                      </button>

                                      <button 
                                        onClick={() => { setMessageModal({ student: s, channel: 'qr' }); setMessageText(''); }} 
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer" 
                                        title="Quick message modal"
                                      >
                                        <Send size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                );
                              })}
                              {report.rows.length === 0 && students.length > 0 && (
                                <tr><td colSpan={5 + uniqueDates.length} className="px-6 py-8 text-center text-slate-400 text-sm">{analyticsSearch ? `No students match "${analyticsSearch}"` : 'No students match your search.'}</td></tr>
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
              <button type="button" onClick={() => void closeStudentEditor()} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                <input type="text" required value={studentEditForm.name} onChange={(e) => updateStudentEditForm({ name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input type="email" value={studentEditForm.email} onChange={(e) => updateStudentEditForm({ email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                <input type="tel" value={studentEditForm.phone} onChange={(e) => updateStudentEditForm({ phone: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">WhatsApp Number</label>
                <input type="tel" value={studentEditForm.whatsappNumber} onChange={(e) => updateStudentEditForm({ whatsappNumber: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-white transition-colors">
                <input type="checkbox" checked={studentEditForm.active} onChange={(e) => updateStudentEditForm({ active: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="font-bold text-slate-700 text-sm">Active Student</span>
              </label>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <AutosaveIndicator status={studentAutosaveStatus} error={studentAutosaveError} onRetry={() => { void studentAutosaveRef.current?.retry().catch(() => undefined); }} />
              <button type="button" onClick={() => void closeStudentEditor()} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
              <button type="submit" disabled={savingStudentEdit} className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-60">{savingStudentEdit ? 'Saving...' : 'Save Now'}</button>
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
              <button onClick={() => void closeEditCohort()} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {([['name','Workshop Name','text'],['startDate','Start Date','date'],['endDate','End Date','date'],['classStartTime','Start Time','time'],['classEndTime','End Time','time'],['zoomMeetingId','Zoom Meeting ID','text'],['zoomJoinUrl','Zoom Join Link','url'],['whatsappGroupLink','WA Group Link','url'],['googleFormLink','CRM Form URL','url']] as const).map(([key, label, type]) => (
                  <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
                    <input type={type} value={editCohortForm[key as keyof typeof editCohortForm] as string} onChange={(e) => updateEditCohortForm({ [key]: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                  </div>
                ))}

                <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="mb-3 flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Holiday Dates (3 to 6)</label>
                    <button type="button" onClick={() => updateEditCohortForm(prev => ({ ...prev, holidayDates: [...prev.holidayDates, ''] }))} disabled={editCohortForm.holidayDates.length >= 6} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">+ Add Holiday</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {editCohortForm.holidayDates.map((value, index) => (
                      <div key={`edit-holiday-${index}`} className="flex items-center gap-2">
                        <input type="date" value={value} onChange={(e) => updateEditCohortForm((prev) => ({ ...prev, holidayDates: prev.holidayDates.map((date, dateIndex) => dateIndex === index ? e.target.value : date) }))} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white" />
                        <button type="button" onClick={() => updateEditCohortForm(prev => ({ ...prev, holidayDates: prev.holidayDates.filter((_, i) => i !== index) }))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
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
                      <input type="text" placeholder="e.g., Swar Yoga 7 days {MONTH} {YEAR}" value={editCohortForm.youtubePlaylistName} onChange={(e) => updateEditCohortForm({ youtubePlaylistName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Thumbnail URL</label>
                      <input type="url" placeholder="https://..." value={editCohortForm.thumbnailUrl} onChange={(e) => updateEditCohortForm({ thumbnailUrl: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-slate-50 focus:bg-white text-sm" />
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
                          onChange={(e) => updateEditCohortForm(prev => ({ ...prev, daySubjects: prev.daySubjects.map((d, i) => i === idx ? { ...d, subject: e.target.value } : d) }))}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="sm:col-span-2 rounded-xl border border-indigo-100 p-4 space-y-3">
                  <h3 className="font-bold text-indigo-900">Recording access · shared 14-session allowance</h3>
                  <label className="flex gap-2 items-center">
                    <input type="checkbox" checked={recordingAccess.enabled} onChange={e => updateRecordingAccess({ enabled: e.target.checked })} />
                    Enable keyword requests and attendance-based recording access
                  </label>
                  <p className="text-xs text-slate-600">Only verified absent or incomplete attendance qualifies. Automatic delivery and requests use the same allowance; repeated requests for one class do not use another day. Missing attendance is not treated as absence.</p>
                  <label className="block text-sm">Recording days allowed
                    <select value={recordingAccess.maxDays} onChange={e => updateRecordingAccess({ maxDays: Number(e.target.value) })} className="block rounded border p-2 mt-1">
                      {[3, 4, 5].map(days => <option key={days} value={days}>{days} of 14 sessions</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">Minutes required to complete attendance
                    <input type="number" min={1} max={240} value={recordingAccess.minimumMinutes} onChange={e => updateRecordingAccess({ minimumMinutes: Number(e.target.value) })} className="block rounded border p-2 mt-1" />
                  </label>
                  <label className="block text-sm">Keywords or template-button payloads (comma-separated)
                    <input value={recordingAccess.keywords.join(', ')} onChange={e => updateRecordingAccess({ keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })} className="block w-full rounded border p-2 mt-1" />
                  </label>
                  <label className="block text-sm">Approved Meta recording template name or ID
                    <input value={recordingAccess.templateId} onChange={e => updateRecordingAccess({ templateId: e.target.value })} className="block w-full rounded border p-2 mt-1" />
                  </label>
                  <p className="text-xs text-slate-500">Template body must have one variable {'{{1}}'} for the saved recording links. Delivery uses Meta WhatsApp, not an unrestricted group broadcast. Enable automatic sending separately below.</p>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoSendRecordings} onChange={(e) => updateEditCohortForm({ autoSendRecordings: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Automatically send recordings by WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoSyncZoomAttendance} onChange={(e) => updateEditCohortForm({ autoSyncZoomAttendance: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Auto Sync Zoom Attendance</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-100 bg-violet-50/50 cursor-pointer hover:bg-violet-50 transition-colors">
                    <input type="checkbox" checked={editCohortForm.autoRecoverZoomTrash} onChange={(e) => updateEditCohortForm({ autoRecoverZoomTrash: e.target.checked })} className="w-5 h-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-bold text-violet-900 text-sm">Auto-Recover Zoom Trash (Sync Deleted)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <AutosaveIndicator status={cohortAutosaveStatus} error={cohortAutosaveError} onRetry={() => { void cohortEditAutosaveRef.current?.retry().catch(() => undefined); }} />
              <button onClick={() => void closeEditCohort()} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
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
                      <p className="text-sm text-slate-500">Read group members using the workshop owner's QR session and fill missing name, email and place from matching CRM leads. Existing details and removed students are preserved. Unresolved WhatsApp LIDs are reported, not used as phone numbers.</p>
                      <label className="flex items-center justify-center gap-2 mt-3 text-sm font-bold text-emerald-800">
                        <input type="checkbox" checked={Boolean((selected as any).autoSyncWhatsappGroup)} disabled={syncingWhatsapp}
                          onChange={async (event) => {
                            setSyncingWhatsapp(true);
                            try {
                              const response = await fetch('/api/admin/crm/workshop-management', { method: 'PATCH', headers,
                                body: JSON.stringify({ cohortId: selected._id, autoSyncWhatsappGroup: event.target.checked,
                                  previous: { autoSyncWhatsappGroup: (selected as any).autoSyncWhatsappGroup } }) });
                              const data = await response.json();
                              if (!response.ok) throw new Error(data.error || 'Auto-Sync choice was not saved');
                              await load(selected._id);
                            } catch (error) { alert(error instanceof Error ? error.message : 'Auto-Sync choice was not saved'); }
                            finally { setSyncingWhatsapp(false); }
                          }} />
                        Auto-Sync group students every 15 minutes (also while this page is closed)
                      </label>
                      {selected.metadata?.whatsappStudentSyncError && <p role="alert" className="mt-2 text-sm text-red-700">{selected.metadata.whatsappStudentSyncError}</p>}
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
              <button onClick={() => void closeAttendanceChart()} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"><X size={20}/></button>
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
                    <input type="number" min={1} value={chartClassDuration} onChange={(e) => updateChartClassDuration(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800" />
                  </label>
                  <AutosaveIndicator status={attendanceAutosaveStatus} error={attendanceAutosaveError} onRetry={() => { void attendanceAutosaveRef.current?.retry().catch(() => undefined); }} />
                  <button type="button" onClick={() => void saveStudentChart()} disabled={savingChart} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 font-bold text-white shadow-sm transition-colors disabled:opacity-50">
                    {savingChart ? 'Saving...' : 'Save Now'}
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
                            <input type="number" min={0} value={row.durationMinutes} onChange={(e) => updateAttendanceChart(attendanceChart.map((item, itemIndex) => itemIndex === index ? { ...item, durationMinutes: e.target.value } : item))} className="w-20 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white px-2 py-1.5 text-center font-bold" />
                          )}
                        </td>
                        <td className="p-4">
                          {row.holiday ? '—' : (
                            <select value={row.status} onChange={(e) => updateAttendanceChart(attendanceChart.map((item, itemIndex) => itemIndex === index ? { ...item, status: e.target.value as AttendanceChartRow['status'] } : item))} className="rounded-lg border border-slate-200 bg-slate-50 focus:bg-white px-3 py-1.5 font-semibold text-slate-700">
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    Day {editingRecordingUrls.dayNumber || '–'} Recording URLs
                  </h3>
                  <AutosaveIndicator status={autoSaveStatus} error={autoSaveError} onRetry={() => { void recordingUrlsAutosaveRef.current?.retry().catch(() => undefined); }} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(editingRecordingUrls.classDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void closeRecordingUrlsModal()}
                className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
              >
                <X size={18}/>
              </button>
            </div>
            <form onSubmit={saveRecordingUrlsModal} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Provide YouTube &amp; Bunny URLs. Links auto-save immediately as you paste or type.</span>
                <div className="flex-shrink-0 ml-2">
                  <AutosaveIndicator status={autoSaveStatus} error={autoSaveError} onRetry={() => { void recordingUrlsAutosaveRef.current?.retry().catch(() => undefined); }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PlayCircle size={14} className="text-red-600"/> YouTube Speaker View URL / Video ID
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) handleUrlsInputChange('youtubeSpeakerUrl', text.trim());
                      } catch (e) {}
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="https://youtu.be/... or video ID (with or without screen share)" 
                  value={editingRecordingUrls.youtubeSpeakerUrl} 
                  onChange={(e) => handleUrlsInputChange('youtubeSpeakerUrl', e.target.value)} 
                  onBlur={handleUrlsInputBlur}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PlayCircle size={14} className="text-red-600"/> YouTube Gallery View URL / Video ID
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) handleUrlsInputChange('youtubeGalleryUrl', text.trim());
                      } catch (e) {}
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="https://youtu.be/... or video ID" 
                  value={editingRecordingUrls.youtubeGalleryUrl} 
                  onChange={(e) => handleUrlsInputChange('youtubeGalleryUrl', e.target.value)} 
                  onBlur={handleUrlsInputBlur}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PlayCircle size={14} className="text-orange-600"/> Bunny Speaker View URL
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) handleUrlsInputChange('bunnySpeakerUrl', text.trim());
                      } catch (e) {}
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="https://iframe.mediadelivery.net/play/606386/... or Bunny URL" 
                  value={editingRecordingUrls.bunnySpeakerUrl} 
                  onChange={(e) => handleUrlsInputChange('bunnySpeakerUrl', e.target.value)} 
                  onBlur={handleUrlsInputBlur}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                />
                <p className="text-[11px] text-slate-500 mt-1">Direct Bunny Stream player URL (Hindi / English / Marathi) or Bunny CDN video.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400">URL changes save automatically.</div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => void closeRecordingUrlsModal()}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingRecordingUrls}
                    className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {savingRecordingUrls ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Saving...
                      </>
                    ) : autoSaveStatus === 'saved' ? (
                      <>
                        <CheckCircle2 size={13} /> Saved ✓
                      </>
                    ) : (
                      'Save Now'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Date & Day Number Modal */}
      {editingDateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150 border border-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Edit Class Date & Day</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    {new Date(`${editingDateModal.classDate}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDateModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Holiday Toggle Section */}
              <div className={`p-4 rounded-2xl border transition-colors ${
                editingDateModal.isHoliday
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <label 
                      htmlFor="holidayToggleCheckbox" 
                      className="font-bold text-sm text-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <span>🏖️ Mark as Holiday</span>
                      {editingDateModal.isHoliday && (
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          Holiday
                        </span>
                      )}
                    </label>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {editingDateModal.isHoliday
                        ? 'This date is marked as a holiday. It is hidden from the attendance analytics table and report.'
                        : 'Marking as a holiday will hide this date from the attendance table and CSV exports.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="holidayToggleCheckbox"
                    checked={editingDateModal.isHoliday}
                    onChange={(e) => {
                      const isHol = e.target.checked;
                      setEditingDateModal(prev => prev ? {
                        ...prev,
                        isHoliday: isHol,
                        dayNumber: isHol ? null : prev.dayNumber,
                      } : null);
                    }}
                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Day Number (1 to 15) Section */}
              <div className={editingDateModal.isHoliday ? 'opacity-40 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Day Number (1 - 15)
                  </label>
                  {editingDateModal.dayNumber && (
                    <button
                      type="button"
                      onClick={() => setEditingDateModal(prev => prev ? { ...prev, dayNumber: null } : null)}
                      className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* 1 to 15 quick grid buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((d) => {
                    const isSelected = editingDateModal.dayNumber === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setEditingDateModal(prev => prev ? { ...prev, dayNumber: d, isHoliday: false } : null);
                        }}
                        className={`py-2 px-1 text-center rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200'
                            : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200'
                        }`}
                      >
                        Day {d}
                      </button>
                    );
                  })}
                </div>

                {/* Custom day number input for flexibility */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Custom Day:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 16"
                    value={editingDateModal.dayNumber ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      setEditingDateModal(prev => prev ? { ...prev, dayNumber: val, isHoliday: false } : null);
                    }}
                    className="w-20 px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-center font-bold"
                  />
                  {editingDateModal.dayNumber && (
                    <span className="text-xs font-extrabold text-indigo-600">
                      → Day {editingDateModal.dayNumber} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDateModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingDateModal}
                  onClick={() => saveDateEdit(editingDateModal.dayNumber, editingDateModal.isHoliday)}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingDateModal ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Date Settings'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta Form Connect Modal */}
      {showMetaFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl">
                  <LinkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Connect Facebook/Instagram Form</h3>
                  <p className="text-sm text-slate-500 font-medium">Configure Meta Webhooks to receive leads instantly.</p>
                </div>
              </div>
              <button onClick={() => setShowMetaFormModal(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-lg text-xs">Recommended</span>
                    Instant Forms Setup (Business Suite)
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">Use this if you are connecting through Facebook Business Suite (Lead Access -&gt; CRM Setup) or if you are using the newer <code>leadgen_conditional_questions_responses</code> webhook.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">https://swaryoga.com/api/webhooks/meta-instant-forms</code>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verify Token</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">swaryoga_webhook_123</code>
                        <span className="text-xs text-slate-500 ml-2 italic">(Your system verify token)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-2">Classic Graph API Leadgen Webhook</h4>
                  <p className="text-sm text-slate-600 mb-4">Use this if you are building a custom App in the Meta for Developers dashboard and subscribing to the <code>leadgen</code> Page webhook.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">https://swaryoga.com/api/webhooks/meta/leadgen</code>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verify Token</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">swaryoga_webhook_123</code>
                        <span className="text-xs text-slate-500 ml-2 italic">(Your system verify token)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                  <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h5 className="font-bold text-blue-900 text-sm mb-1">How to connect in Meta Business Suite</h5>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                      <li>Go to your Facebook Page -&gt; Meta Business Suite</li>
                      <li>Click on All Tools -&gt; Instant Forms</li>
                      <li>Go to the CRM Setup tab</li>
                      <li>Search for "Custom Webhook" (or simply "Webhook")</li>
                      <li>Paste the Webhook URL (from the Recommended section above) and provide the Verify Token</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setShowMetaFormModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors border border-slate-200"
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
