'use client';

import { useEffect, useState } from 'react';

interface Cohort { _id: string; name: string; startDate: string; endDate?: string; holidayDates?: string[]; classStartTime?: string; classEndTime?: string; zoomMeetingId?: string; zoomJoinUrl?: string; whatsappGroupLink?: string; googleFormLink?: string; aiWorkerEnabled?: boolean; autoSendRecordings?: boolean; }
interface Student { _id: string; name: string; email?: string; phone?: string; whatsappNumber?: string; leadId?: string; leadNumber?: string; active: boolean; }
interface Attendance { studentId: string; classDate: string; joined: boolean; durationSeconds: number; attendancePercent: number; }
interface AttendanceChartRow { classDate: string; dayNumber: number; holiday: boolean; durationMinutes: string; status: 'joined' | 'absent' | 'holiday'; }
interface Recording { _id: string; cohortId: string; classDate: string; dayNumber?: number; youtubeSpeakerId?: string; youtubeGalleryId?: string; youtubeSpeakerUrl?: string; youtubeGalleryUrl?: string; bunnySpeakerUrl?: string; bunnyGalleryUrl?: string; deliveredStudentIds?: string[]; }

export default function WorkshopManagementPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<Cohort | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentEditForm, setStudentEditForm] = useState({ name: '', email: '', phone: '', whatsappNumber: '', active: true });
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', aiWorkerEnabled: true, autoSendRecordings: false });
  const [student, setStudent] = useState({ name: '', email: '', phone: '', whatsappNumber: '' });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: '', classDate: '', durationMinutes: '0', classDurationMinutes: '60' });
  const [recordingForm, setRecordingForm] = useState({ classDate: '', youtubeSpeakerId: '', youtubeGalleryId: '', bunnySpeakerUrl: '', bunnyGalleryUrl: '', deliveredStudentIds: '' });
  const [loading, setLoading] = useState(false);
  const [importingStudents, setImportingStudents] = useState(false);
  const [studentImportFile, setStudentImportFile] = useState<File | null>(null);
  const [studentImportColumns, setStudentImportColumns] = useState<string[]>([]);
  const [studentImportMapping, setStudentImportMapping] = useState({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
  const [selectedImportFields, setSelectedImportFields] = useState<string[]>(['name', 'email', 'phone', 'whatsappNumber', 'whatsappJid']);
  const [googleFormLink, setGoogleFormLink] = useState('');
  const [syncingWhatsapp, setSyncingWhatsapp] = useState(false);
  const [syncingZoomAttendance, setSyncingZoomAttendance] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showStudentTools, setShowStudentTools] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [attendanceChart, setAttendanceChart] = useState<AttendanceChartRow[]>([]);
  const [chartClassDuration, setChartClassDuration] = useState('60');
  const [savingChart, setSavingChart] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [runningWorker, setRunningWorker] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async (cohortId?: string) => {
    const res = await fetch(`/api/admin/crm/workshop-management${cohortId ? `?cohortId=${cohortId}` : ''}`, { headers });
    const data = await res.json();
    if (!res.ok) return;
    if (cohortId) {
      setStudents(data.students || []);
      setSelectedStudentIds([]);
      setAttendance(data.attendance || []);
      setRecordings(data.recordings || []);
      setGoogleFormLink(data.cohort?.googleFormLink || '');
      if (data.students?.length && !attendanceForm.studentId) setAttendanceForm((prev) => ({ ...prev, studentId: data.students[0]._id }));
    } else {
      setCohorts(data.cohorts || []);
    }
  };

  useEffect(() => { load(); }, []);

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
      setForm({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '', aiWorkerEnabled: true, autoSendRecordings: false });
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
      setAttendanceForm((prev) => ({ ...prev, studentId: data.student._id || prev.studentId }));
    } else {
      alert(data.error || 'Could not save student');
    }
  };

  const openStudentEditor = (currentStudent: Student) => {
    setEditingStudent(currentStudent);
    setStudentEditForm({
      name: currentStudent.name || '',
      email: currentStudent.email || '',
      phone: currentStudent.phone || '',
      whatsappNumber: currentStudent.whatsappNumber || '',
      active: currentStudent.active !== false,
    });
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
    else setSelected(data.cohort);
  };

  const openGoogleForm = () => {
    const link = googleFormLink.trim();
    if (!link || !/^https?:\/\//i.test(link)) {
      alert('Please save a valid Google Forms link first.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
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

  const saveAttendance = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    const durationSeconds = Math.max(0, Number(attendanceForm.durationMinutes || 0) * 60);
    const classDurationSeconds = Math.max(1, Number(attendanceForm.classDurationMinutes || 60) * 60);
    const res = await fetch('/api/admin/crm/workshop-management/attendance', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id, studentId: attendanceForm.studentId, classDate: attendanceForm.classDate || new Date().toISOString().slice(0, 10), durationSeconds, classDurationSeconds, source: 'manual' }) });
    const data = await res.json();
    if (res.ok) {
      await load(selected._id);
      setAttendanceForm((prev) => ({ ...prev, classDate: '', durationMinutes: '0', classDurationMinutes: prev.classDurationMinutes }));
    } else {
      alert(data.error || 'Could not save attendance');
    }
  };

  const toDateKey = (value: unknown): string | null => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(String(value || ''));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  };

  const openStudentChart = (currentStudent: Student) => {
    if (!selected) return;
    const startDateKey = toDateKey(selected.startDate);
    if (!startDateKey) {
      alert('This workshop has an invalid start date. Please correct the workshop schedule first.');
      return;
    }
    const holidaySet = new Set((selected.holidayDates || []).map(toDateKey).filter((date): date is string => Boolean(date)));
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
      const holiday = holidaySet.has(date) || cursor.getDay() === 0;
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

  const saveRecording = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return;
    const studentIds = recordingForm.deliveredStudentIds.split(',').map((x) => x.trim()).filter(Boolean);
    const res = await fetch('/api/admin/crm/workshop-management/recordings', { method: 'POST', headers, body: JSON.stringify({ cohortId: selected._id, classDate: recordingForm.classDate || new Date().toISOString().slice(0, 10), youtubeSpeakerId: recordingForm.youtubeSpeakerId || undefined, youtubeGalleryId: recordingForm.youtubeGalleryId || undefined, bunnySpeakerUrl: recordingForm.bunnySpeakerUrl || undefined, bunnyGalleryUrl: recordingForm.bunnyGalleryUrl || undefined, deliveredStudentIds: studentIds }) });
    const data = await res.json();
    if (res.ok) {
      await load(selected._id);
      setRecordingForm({ classDate: '', youtubeSpeakerId: '', youtubeGalleryId: '', bunnySpeakerUrl: '', bunnyGalleryUrl: '', deliveredStudentIds: '' });
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

  return <main className="min-h-screen bg-slate-50 p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Workshop Student Management</h1><p className="mt-1 text-sm text-indigo-100">Manage cohorts, WhatsApp groups, Zoom attendance, recordings, and student history.</p></div><button type="button" onClick={() => setShowCreateForm((open) => !open)} className="rounded-xl bg-white px-4 py-2.5 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50">{showCreateForm ? 'Close form' : '+ Add New Workshop'}</button></header>
      {showCreateForm && <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Create workshop / batch</h2><p className="text-sm text-slate-500">Set the class schedule, holidays, links, and automation options.</p></div><button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600">Cancel</button></div><form onSubmit={createCohort} className="grid gap-3 md:grid-cols-3">
        {([['name','Workshop name'],['startDate','Start date'],['endDate','End date'],['classStartTime','Class start time'],['classEndTime','Class end time'],['zoomMeetingId','Zoom meeting ID'],['zoomJoinUrl','Zoom meeting link'],['whatsappGroupLink','WhatsApp group link']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input required={key === 'name' || key === 'startDate'} type={key.includes('Date') ? 'date' : key.includes('Time') ? 'time' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>)}

        <div className="md:col-span-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-700">Holiday dates (3 to 6)</label>
            <button type="button" onClick={addHolidayDateField} disabled={form.holidayDates.length >= 6} className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">+ Add</button>
          </div>

          <div className="space-y-3">
            {form.holidayDates.map((value, index) => (
              <div key={`holiday-${index}`} className="flex items-center gap-3">
                <input
                  type="date"
                  value={value}
                  onChange={(e) => setForm((prev) => ({ ...prev, holidayDates: prev.holidayDates.map((date, dateIndex) => dateIndex === index ? e.target.value : date) }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
                />
                {form.holidayDates.length > 3 && (
                  <button type="button" onClick={() => removeHolidayDateField(index)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm font-semibold text-red-600">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-5 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm md:col-span-3">
          <label className="flex items-center gap-2 font-medium text-violet-900"><input type="checkbox" checked={form.aiWorkerEnabled} onChange={(e) => setForm({ ...form, aiWorkerEnabled: e.target.checked })} /> Enable Workshop AI Worker</label>
          <label className="flex items-center gap-2 font-medium text-violet-900"><input type="checkbox" checked={form.autoSendRecordings} onChange={(e) => setForm({ ...form, autoSendRecordings: e.target.checked })} /> Automatically send recordings by WhatsApp</label>
        </div>

        <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white md:col-span-3">{loading ? 'Saving…' : 'Save workshop'}</button>
      </form></section>}
      <section className="grid gap-5 lg:grid-cols-[290px_1fr]">
        <aside className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Workshops</h2><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{cohorts.length}</span></div>{cohorts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No workshops yet.<br />Click <b>+ Add New Workshop</b> to begin.</div> : cohorts.map((c) => <button key={c._id} onClick={() => { setSelected(c); void load(c._id); }} className={`mb-2 w-full rounded-xl border p-3 text-left transition ${selected?._id === c._id ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-transparent bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50'}`}><b className="block truncate">{c.name}</b><span className="mt-1 block text-xs text-slate-500">Starts {new Date(c.startDate).toLocaleDateString()} · {c.zoomMeetingId ? 'Zoom ready' : 'Zoom pending'}</span></button>)}</aside>
        <section className="min-w-0 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">{!selected ? <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500"><div><div className="mb-2 text-4xl">📚</div><p className="font-semibold text-slate-700">Select a workshop to manage students</p><p className="mt-1 text-sm">Choose a workshop from the left, or create a new one above.</p></div></div> : <>
          <div className="mb-5"><h2 className="text-xl font-bold">{selected.name}</h2><p className="text-sm text-slate-500">{selected.classStartTime || '—'}–{selected.classEndTime || '—'} · Zoom {selected.zoomMeetingId || 'not set'} · {students.length} students</p><div className="mt-3 flex flex-wrap gap-2">{selected.whatsappGroupLink && <button type="button" onClick={() => void syncWhatsappGroup()} disabled={syncingWhatsapp} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{syncingWhatsapp ? 'Syncing WhatsApp group…' : 'Sync WhatsApp group students'}</button>}{selected.zoomMeetingId && <button type="button" onClick={() => void syncZoomAttendance()} disabled={syncingZoomAttendance} className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{syncingZoomAttendance ? 'Syncing Zoom attendance…' : 'Sync Zoom attendance'}</button>}<button type="button" onClick={() => void runWorkshopWorker(true)} disabled={runningWorker} className="rounded bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Preview AI worker</button><button type="button" onClick={() => void runWorkshopWorker(false)} disabled={runningWorker} className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{runningWorker ? 'Running worker…' : 'Run Workshop AI Worker'}</button></div></div>

          <button type="button" onClick={() => setShowStudentTools((open) => !open)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left font-semibold text-emerald-800 transition hover:bg-emerald-100">{showStudentTools ? 'Close student tools' : '+ Add Students'}</button>

          {showStudentTools && <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-800">Choose data to collect/import</h3>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setSelectedImportFields(importFieldOptions.map(([key]) => key))} className="font-semibold text-indigo-700">Select all</button>
                <button type="button" onClick={() => setSelectedImportFields(['name'])} className="font-semibold text-slate-600">Clear optional fields</button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={allImportFieldsSelected} onChange={(e) => setSelectedImportFields(e.target.checked ? importFieldOptions.map(([key]) => key) : ['name'])} /> Select all fields</label>
              {importFieldOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selectedImportFields.includes(key)} disabled={key === 'name'} onChange={(e) => setSelectedImportFields((prev) => e.target.checked ? [...prev, key] : prev.filter((field) => field !== key))} /> {label}{key === 'name' && <span className="text-xs text-red-600">required</span>}</label>)}
            </div>
            <p className="mt-2 text-xs text-slate-500">Only checked fields will be imported from the Google Forms Excel file. Name is required for every student.</p>
          <div className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={addStudent} className="rounded-lg bg-slate-50 p-4"><h3 className="mb-3 font-semibold">Add student</h3><div className="grid gap-3 md:grid-cols-2"><input required placeholder="Student name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="Email" value={student.email} onChange={(e) => setStudent({ ...student, email: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="Phone" value={student.phone} onChange={(e) => setStudent({ ...student, phone: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="WhatsApp number" value={student.whatsappNumber} onChange={(e) => setStudent({ ...student, whatsappNumber: e.target.value })} className="rounded border px-3 py-2" /><button className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white md:col-span-2">Add student</button></div><div className="mt-4 border-t border-slate-200 pt-4 space-y-3"><label className="block text-sm font-medium text-slate-700">Google Forms link (optional)<input type="url" placeholder="https://docs.google.com/forms/..." value={googleFormLink} onChange={(e) => setGoogleFormLink(e.target.value)} className="mt-2 block w-full rounded border bg-white px-3 py-2 text-sm font-normal" /></label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={saveGoogleFormLink} className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white">Save link</button><button type="button" onClick={openGoogleForm} className="rounded bg-sky-600 px-3 py-2 font-semibold text-white">Open Google Form</button></div><label className="block text-sm font-medium text-slate-700">Import Google Forms Excel export<input type="file" accept=".xlsx,.xls,.csv" onChange={importStudents} disabled={importingStudents} className="mt-2 block w-full rounded border bg-white px-3 py-2 text-sm font-normal" /></label>{studentImportColumns.length > 0 && <div className="grid gap-2 sm:grid-cols-2"><p className="sm:col-span-2 text-sm font-semibold text-slate-700">Select columns before importing</p>{([['name','Name'],['email','Email'],['phone','Phone'],['whatsappNumber','WhatsApp number'],['whatsappJid','WhatsApp JID']] as const).map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<select value={studentImportMapping[key]} onChange={(e) => setStudentImportMapping({ ...studentImportMapping, [key]: e.target.value })} className="mt-1 w-full rounded border bg-white px-2 py-2 text-sm"><option value="">Auto-detect</option>{studentImportColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}<button type="button" onClick={() => void autoImportStudents()} disabled={importingStudents} className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white sm:col-span-2 disabled:opacity-50">{importingStudents ? 'Importing all data…' : 'Auto-import all detected data'}</button><button type="button" onClick={() => void importMappedStudents()} disabled={importingStudents || !studentImportMapping.name} className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white sm:col-span-2 disabled:opacity-50">{importingStudents ? 'Importing students…' : 'Import selected fields'}</button></div>}<p className="text-xs text-slate-500">Auto-import detects the standard fields and preserves additional Google Forms columns in student metadata. Existing students are updated instead of duplicated.</p></div></form>

            <form onSubmit={saveAttendance} className="rounded-lg bg-slate-50 p-4"><h3 className="mb-3 font-semibold">Record attendance</h3><div className="grid gap-3 md:grid-cols-2"><select value={attendanceForm.studentId} onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })} className="rounded border px-3 py-2"><option value="">Select student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select><input type="date" value={attendanceForm.classDate} onChange={(e) => setAttendanceForm({ ...attendanceForm, classDate: e.target.value })} className="rounded border px-3 py-2" /><input type="number" min={0} placeholder="Minutes attended" value={attendanceForm.durationMinutes} onChange={(e) => setAttendanceForm({ ...attendanceForm, durationMinutes: e.target.value })} className="rounded border px-3 py-2" /><input type="number" min={1} placeholder="Class duration minutes" value={attendanceForm.classDurationMinutes} onChange={(e) => setAttendanceForm({ ...attendanceForm, classDurationMinutes: e.target.value })} className="rounded border px-3 py-2" /><button className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white md:col-span-2">Save attendance</button></div></form>
          </div></div>}

          <form onSubmit={saveRecording} className="rounded-lg bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold">Recording delivery</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input type="date" value={recordingForm.classDate} onChange={(e) => setRecordingForm({ ...recordingForm, classDate: e.target.value })} className="rounded border px-3 py-2" />
              <input placeholder="YouTube speaker video ID" value={recordingForm.youtubeSpeakerId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeSpeakerId: e.target.value })} className="rounded border px-3 py-2" />
              <input placeholder="YouTube gallery video ID" value={recordingForm.youtubeGalleryId} onChange={(e) => setRecordingForm({ ...recordingForm, youtubeGalleryId: e.target.value })} className="rounded border px-3 py-2" />
              <input placeholder="Bunny speaker URL" value={recordingForm.bunnySpeakerUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnySpeakerUrl: e.target.value })} className="rounded border px-3 py-2" />
              <input placeholder="Bunny gallery URL" value={recordingForm.bunnyGalleryUrl} onChange={(e) => setRecordingForm({ ...recordingForm, bunnyGalleryUrl: e.target.value })} className="rounded border px-3 py-2" />
              <input placeholder="Delivered student IDs (comma separated)" value={recordingForm.deliveredStudentIds} onChange={(e) => setRecordingForm({ ...recordingForm, deliveredStudentIds: e.target.value })} className="rounded border px-3 py-2" />
              <button className="rounded bg-amber-600 px-3 py-2 font-semibold text-white md:col-span-2 xl:col-span-3">Save recording delivery</button>
            </div>
          </form>

          <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-slate-800">Workshop students</h3><button type="button" onClick={() => void removeSelectedStudents()} disabled={!selectedStudentIds.length} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Remove selected ({selectedStudentIds.length})</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2"><input type="checkbox" checked={students.length > 0 && selectedStudentIds.length === students.length} onChange={(e) => setSelectedStudentIds(e.target.checked ? students.map((s) => s._id) : [])} /></th><th className="p-2">Student / CRM Lead</th><th className="p-2">Phone</th><th className="p-2">Attendance days</th><th className="p-2">Status</th></tr></thead><tbody>{students.map((s) => { const rows = attendance.filter((a) => String(a.studentId) === s._id); return <tr key={s._id} className="border-b"><td className="p-2"><input type="checkbox" checked={selectedStudentIds.includes(s._id)} onChange={(e) => setSelectedStudentIds((prev) => e.target.checked ? [...prev, s._id] : prev.filter((id) => id !== s._id))} /></td><td className="p-2 font-medium"><button type="button" onClick={() => openStudentChart(s)} className="text-left font-semibold text-indigo-700 hover:underline">{s.name}</button><span className="block text-xs text-slate-400">{s.email || ''}</span><span className="block text-xs font-semibold text-violet-600">Lead: {s.leadNumber || 'Not linked'}</span></td><td className="p-2">{s.phone || s.whatsappNumber || '—'}</td><td className="p-2">{rows.filter((a) => a.joined).length} joined · {Math.round(rows.reduce((n, a) => n + (a.durationSeconds || 0), 0) / 60)} min</td><td className="p-2">{s.active ? 'Active' : 'Inactive'}</td></tr>; })}</tbody></table></div>

          {detailStudent && <section className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-slate-900">{detailStudent.name}</h3><p className="text-sm text-slate-600">{detailStudent.email || 'No email'} · {detailStudent.phone || detailStudent.whatsappNumber || 'No phone'}</p></div><button type="button" onClick={() => setDetailStudent(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Close</button></div><div className="mb-4 flex items-center gap-3 text-sm"><label className="font-medium">Class duration minutes<input type="number" min={1} value={chartClassDuration} onChange={(e) => setChartClassDuration(e.target.value)} className="ml-2 w-24 rounded border px-2 py-1" /></label><span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-800">14 class days</span></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-indigo-600 text-white"><tr><th className="p-3">Class</th><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Duration (minutes)</th><th className="p-3">Attendance</th></tr></thead><tbody>{attendanceChart.map((row, index) => <tr key={row.classDate} className={row.holiday ? 'bg-amber-50' : index % 2 ? 'bg-slate-50' : 'bg-white'}><td className="p-3 font-semibold">{row.holiday ? '—' : `Day ${row.dayNumber}`}</td><td className="p-3">{new Date(`${row.classDate}T00:00:00`).toLocaleDateString()}</td><td className="p-3">{row.holiday ? <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-900">Holiday</span> : 'Class'}</td><td className="p-3">{row.holiday ? '—' : <input type="number" min={0} value={row.durationMinutes} onChange={(e) => setAttendanceChart((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, durationMinutes: e.target.value } : item))} className="w-28 rounded border px-2 py-1" />}</td><td className="p-3">{row.holiday ? '—' : <select value={row.status} onChange={(e) => setAttendanceChart((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, status: e.target.value as AttendanceChartRow['status'] } : item))} className="rounded border px-2 py-1"><option value="joined">Joined</option><option value="absent">Absent</option></select>}</td></tr>)}</tbody></table></div><button type="button" onClick={() => void saveStudentChart()} disabled={savingChart} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{savingChart ? 'Saving attendance…' : 'Save attendance chart'}</button></section>}

          {recordings.length > 0 && <div className="rounded-lg border border-slate-200 p-4"><h3 className="mb-3 font-semibold">Recording deliveries</h3><div className="space-y-2">{recordings.map((recording) => <div key={recording._id} className="rounded border border-slate-200 p-3 text-sm">
            <div className="mb-1 font-medium">{new Date(recording.classDate).toLocaleDateString()}</div>
            <div className="mb-1 font-semibold text-indigo-700">Day {recording.dayNumber || '—'}</div>
            <div className="text-slate-600">Speaker: {recording.youtubeSpeakerUrl || recording.youtubeSpeakerId ? <a className="text-indigo-600 underline" href={recording.youtubeSpeakerUrl || `https://youtu.be/${recording.youtubeSpeakerId}`} target="_blank" rel="noreferrer">YouTube (Unlisted)</a> : '—'} · {recording.bunnySpeakerUrl ? <a className="text-indigo-600 underline" href={recording.bunnySpeakerUrl} target="_blank" rel="noreferrer">Bunny</a> : '—'}</div>
            <div className="text-slate-600">Gallery: {recording.youtubeGalleryUrl || recording.youtubeGalleryId ? <a className="text-indigo-600 underline" href={recording.youtubeGalleryUrl || `https://youtu.be/${recording.youtubeGalleryId}`} target="_blank" rel="noreferrer">YouTube (Unlisted)</a> : '—'} · {recording.bunnyGalleryUrl ? <a className="text-indigo-600 underline" href={recording.bunnyGalleryUrl} target="_blank" rel="noreferrer">Bunny</a> : '—'}</div>
            <div className="mt-1 text-xs text-slate-500">Delivered students: {(recording.deliveredStudentIds || []).length || 0}</div>
          </div>)}</div></div>}
        </>}</section>
      </section>
    </div>
  </main>;
}
