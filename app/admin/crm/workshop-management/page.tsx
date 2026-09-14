'use client';

import { useEffect, useState } from 'react';

interface Cohort { _id: string; name: string; startDate: string; endDate?: string; holidayDates?: string[]; classStartTime?: string; classEndTime?: string; zoomMeetingId?: string; zoomJoinUrl?: string; whatsappGroupLink?: string; googleFormLink?: string; }
interface Student { _id: string; name: string; email?: string; phone?: string; whatsappNumber?: string; active: boolean; }
interface Attendance { studentId: string; classDate: string; joined: boolean; durationSeconds: number; attendancePercent: number; }
interface Recording { _id: string; cohortId: string; classDate: string; dayNumber?: number; youtubeSpeakerId?: string; youtubeGalleryId?: string; youtubeSpeakerUrl?: string; youtubeGalleryUrl?: string; bunnySpeakerUrl?: string; bunnyGalleryUrl?: string; deliveredStudentIds?: string[]; }

export default function WorkshopManagementPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selected, setSelected] = useState<Cohort | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '' });
  const [student, setStudent] = useState({ name: '', email: '', phone: '', whatsappNumber: '' });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: '', classDate: '', durationMinutes: '0', classDurationMinutes: '60' });
  const [recordingForm, setRecordingForm] = useState({ classDate: '', youtubeSpeakerId: '', youtubeGalleryId: '', bunnySpeakerUrl: '', bunnyGalleryUrl: '', deliveredStudentIds: '' });
  const [loading, setLoading] = useState(false);
  const [importingStudents, setImportingStudents] = useState(false);
  const [studentImportFile, setStudentImportFile] = useState<File | null>(null);
  const [studentImportColumns, setStudentImportColumns] = useState<string[]>([]);
  const [studentImportMapping, setStudentImportMapping] = useState({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
  const [googleFormLink, setGoogleFormLink] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('admin_token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async (cohortId?: string) => {
    const res = await fetch(`/api/admin/crm/workshop-management${cohortId ? `?cohortId=${cohortId}` : ''}`, { headers });
    const data = await res.json();
    if (!res.ok) return;
    if (cohortId) {
      setStudents(data.students || []);
      setAttendance(data.attendance || []);
      setRecordings(data.recordings || []);
      if (data.students?.length && !attendanceForm.studentId) setAttendanceForm((prev) => ({ ...prev, studentId: data.students[0]._id }));
    } else {
      setCohorts(data.cohorts || []);
    }
  };

  useEffect(() => { load(); }, []);

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
      setForm({ name: '', startDate: '', endDate: '', holidayDates: ['', '', ''], classStartTime: '', classEndTime: '', zoomMeetingId: '', zoomJoinUrl: '', whatsappGroupLink: '' });
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

  const importMappedStudents = async () => {
    if (!studentImportFile || !selected) return;
    setImportingStudents(true);
    const body = new FormData();
    body.append('cohortId', selected._id);
    body.append('file', studentImportFile);
    body.append('mapping', JSON.stringify(studentImportMapping));
    body.append('googleFormLink', googleFormLink);
    const res = await fetch('/api/admin/crm/workshop-management/students/import', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const data = await res.json();
    setImportingStudents(false);
    if (res.ok) {
      await load(selected._id);
      setStudentImportFile(null);
      setStudentImportColumns([]);
      setStudentImportMapping({ name: '', email: '', phone: '', whatsappNumber: '', whatsappJid: '' });
      alert(`Imported ${data.imported || 0} students. Skipped ${data.skipped || 0} rows.`);
    } else {
      alert(data.error || 'Could not import students');
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

  return <main className="min-h-screen bg-slate-50 p-6">
    <div className="mx-auto max-w-7xl space-y-6">
      <header><h1 className="text-2xl font-bold text-slate-900">Workshop Student Management</h1><p className="text-sm text-slate-500">Manage cohorts, WhatsApp groups, Zoom attendance, recordings, and student history.</p></header>
      <section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Create workshop / batch</h2><form onSubmit={createCohort} className="grid gap-3 md:grid-cols-3">
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

        <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white md:col-span-3">{loading ? 'Saving…' : 'Save workshop'}</button>
      </form></section>
      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold">Workshops</h2>{cohorts.map((c) => <button key={c._id} onClick={() => { setSelected(c); void load(c._id); }} className={`mb-2 w-full rounded-lg p-3 text-left ${selected?._id === c._id ? 'bg-indigo-50 text-indigo-800' : 'bg-slate-50'}`}><b>{c.name}</b><span className="block text-xs text-slate-500">{new Date(c.startDate).toLocaleDateString()}</span></button>)}</aside>
        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">{!selected ? <p className="text-slate-500">Select a workshop to manage students.</p> : <>
          <div className="mb-5"><h2 className="text-xl font-bold">{selected.name}</h2><p className="text-sm text-slate-500">{selected.classStartTime || '—'}–{selected.classEndTime || '—'} · Zoom {selected.zoomMeetingId || 'not set'} · {students.length} students</p></div>

          <div className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={addStudent} className="rounded-lg bg-slate-50 p-4"><h3 className="mb-3 font-semibold">Add student</h3><div className="grid gap-3 md:grid-cols-2"><input required placeholder="Student name" value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="Email" value={student.email} onChange={(e) => setStudent({ ...student, email: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="Phone" value={student.phone} onChange={(e) => setStudent({ ...student, phone: e.target.value })} className="rounded border px-3 py-2" /><input placeholder="WhatsApp number" value={student.whatsappNumber} onChange={(e) => setStudent({ ...student, whatsappNumber: e.target.value })} className="rounded border px-3 py-2" /><button className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white md:col-span-2">Add student</button></div><div className="mt-4 border-t border-slate-200 pt-4 space-y-3"><label className="block text-sm font-medium text-slate-700">Google Forms link (optional)<input type="url" placeholder="https://docs.google.com/forms/..." value={googleFormLink} onChange={(e) => setGoogleFormLink(e.target.value)} className="mt-2 block w-full rounded border bg-white px-3 py-2 text-sm font-normal" /></label><label className="block text-sm font-medium text-slate-700">Import Google Forms Excel export<input type="file" accept=".xlsx,.xls,.csv" onChange={importStudents} disabled={importingStudents} className="mt-2 block w-full rounded border bg-white px-3 py-2 text-sm font-normal" /></label>{studentImportColumns.length > 0 && <div className="grid gap-2 sm:grid-cols-2"><p className="sm:col-span-2 text-sm font-semibold text-slate-700">Select columns before importing</p>{([['name','Name'],['email','Email'],['phone','Phone'],['whatsappNumber','WhatsApp number'],['whatsappJid','WhatsApp JID']] as const).map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<select value={studentImportMapping[key]} onChange={(e) => setStudentImportMapping({ ...studentImportMapping, [key]: e.target.value })} className="mt-1 w-full rounded border bg-white px-2 py-2 text-sm"><option value="">Auto-detect</option>{studentImportColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}<button type="button" onClick={importMappedStudents} disabled={importingStudents || !studentImportMapping.name} className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white sm:col-span-2 disabled:opacity-50">{importingStudents ? 'Importing students…' : 'Import mapped students'}</button></div>}<p className="text-xs text-slate-500">Upload your Google Forms export, select the matching columns, then import. Existing students are updated instead of duplicated.</p></div></form>

            <form onSubmit={saveAttendance} className="rounded-lg bg-slate-50 p-4"><h3 className="mb-3 font-semibold">Record attendance</h3><div className="grid gap-3 md:grid-cols-2"><select value={attendanceForm.studentId} onChange={(e) => setAttendanceForm({ ...attendanceForm, studentId: e.target.value })} className="rounded border px-3 py-2"><option value="">Select student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select><input type="date" value={attendanceForm.classDate} onChange={(e) => setAttendanceForm({ ...attendanceForm, classDate: e.target.value })} className="rounded border px-3 py-2" /><input type="number" min={0} placeholder="Minutes attended" value={attendanceForm.durationMinutes} onChange={(e) => setAttendanceForm({ ...attendanceForm, durationMinutes: e.target.value })} className="rounded border px-3 py-2" /><input type="number" min={1} placeholder="Class duration minutes" value={attendanceForm.classDurationMinutes} onChange={(e) => setAttendanceForm({ ...attendanceForm, classDurationMinutes: e.target.value })} className="rounded border px-3 py-2" /><button className="rounded bg-indigo-600 px-3 py-2 font-semibold text-white md:col-span-2">Save attendance</button></div></form>
          </div>

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

          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Student</th><th className="p-2">Phone</th><th className="p-2">Attendance days</th><th className="p-2">Status</th></tr></thead><tbody>{students.map((s) => { const rows = attendance.filter((a) => String(a.studentId) === s._id); return <tr key={s._id} className="border-b"><td className="p-2 font-medium">{s.name}<span className="block text-xs text-slate-400">{s.email || ''}</span></td><td className="p-2">{s.phone || s.whatsappNumber || '—'}</td><td className="p-2">{rows.filter((a) => a.joined).length} joined · {Math.round(rows.reduce((n, a) => n + (a.durationSeconds || 0), 0) / 60)} min</td><td className="p-2">{s.active ? 'Active' : 'Inactive'}</td></tr>; })}</tbody></table></div>

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
