'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  Loader,
  AlertCircle,
  CheckCircle,
  X,
  Video,
  Bot,
  Calendar,
  Clock,
  Radio,
  Users,
  Sparkles,
  Link as LinkIcon,
  KeyRound,
  MessageSquare,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SadhanaFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  token?: string;
}

const daysOptions = [
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
  { value: 0, label: 'Sun', full: 'Sunday' },
];

export default function SadhanaForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  token = '',
}: SadhanaFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    botName: initialData?.botName || 'Swar Sadhana Bot',
    chatMessages: (() => {
      const existing = Array.isArray(initialData?.chatMessages) ? initialData.chatMessages : [];
      const slots = [0, 1, 2, 3].map((i) => existing[i] || { message: '', delayMinutes: 0 });
      return slots;
    })(),
    enableAiChatReplies: initialData?.enableAiChatReplies || false,
    videoUrl: initialData?.videoUrl || '',
    videoDuration: initialData?.videoDuration || 40,
    botJoinMinutes: initialData?.botJoinMinutes || 5,
    autoCloseMinutes: initialData?.autoCloseMinutes || 40,
    enableBotAutomation: initialData?.enableBotAutomation !== false,
    zoomType: initialData?.zoomLink ? 'link' : initialData?.zoomId ? 'credentials' : 'link',
    zoomLink: initialData?.zoomLink || '',
    zoomId: initialData?.zoomId || '',
    zoomPassword: initialData?.zoomPassword || '',
    times: initialData?.schedule?.times || ['06:00', '18:00'],
    days: initialData?.schedule?.days || [1, 2, 3, 4, 5],
    repeatFrequency: initialData?.schedule?.repeatFrequency || 'weekly',
    startDate: initialData?.schedule?.startDate || new Date().toISOString().split('T')[0],
    timezone: initialData?.schedule?.timezone || 'Asia/Kolkata',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showZoomCreds, setShowZoomCreds] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Participant Management
  const [participantEmails, setParticipantEmails] = useState<string[]>(
    initialData?.participantEmails || []
  );
  const [participantPhones, setParticipantPhones] = useState<string[]>(
    initialData?.participantPhones || []
  );
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [enableEmailReminders, setEnableEmailReminders] = useState(
    initialData?.enableEmailReminders !== false
  );
  const [enableWhatsAppReminders, setEnableWhatsAppReminders] = useState(
    initialData?.enableWhatsAppReminders !== false
  );
  const [whatsappProvider, setWhatsappProvider] = useState<'qr' | 'meta' | 'both'>(
    initialData?.whatsappProvider || 'qr'
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Schedule name is required';
    if (!formData.videoUrl.trim()) newErrors.videoUrl = 'Video URL is required';

    if (formData.zoomType === 'link' && !formData.zoomLink.trim()) {
      newErrors.zoomLink = 'Zoom meeting link is required';
    }
    if (formData.zoomType === 'credentials') {
      if (!formData.zoomId.trim()) newErrors.zoomId = 'Zoom ID is required';
      if (!formData.zoomPassword.trim()) newErrors.zoomPassword = 'Zoom password is required';
    }

    if (formData.times.length === 0) newErrors.times = 'At least one delivery time is required';
    if (formData.days.length === 0) newErrors.days = 'Select at least one active day';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid video format. Please upload MP4, WebM, MOV, or AVI.');
        setUploading(false);
        return;
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = Math.round(file.size / 1024 / 1024);
        setUploadError(`Video file too large (${sizeMB}MB). Maximum allowed is 50MB.`);
        setUploading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('fileType', 'videos');
      formDataToSend.append('accessLevel', 'admin');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          if (!xhr.responseText) {
            setUploadError(`Empty response from server (HTTP ${xhr.status})`);
            setUploading(false);
            return;
          }

          const response = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && response.success && response.data?.url) {
            setFormData((prev) => ({ ...prev, videoUrl: response.data.url }));
            setUploading(false);
            setUploadProgress(0);
          } else {
            const errorMsg = response.error || response.message || `Upload failed (${xhr.status})`;
            setUploadError(errorMsg);
            setUploading(false);
          }
        } catch {
          setUploadError('Error processing upload response.');
          setUploading(false);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadError('Network error during video upload.');
        setUploading(false);
      });

      xhr.addEventListener('abort', () => {
        setUploadError('Video upload was cancelled.');
        setUploading(false);
      });

      xhr.open('POST', '/api/admin/crm/sadhana-scheduler/upload-video');
      const cleanToken = (token || '').trim().replace(/^Bearer\s+/i, '');
      xhr.setRequestHeader('Authorization', `Bearer ${cleanToken}`);

      const uploadTimeout = setTimeout(() => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          xhr.abort();
          setUploadError('Upload timed out. Please try again with a smaller file.');
          setUploading(false);
        }
      }, 30000);

      xhr.addEventListener('loadend', () => {
        clearTimeout(uploadTimeout);
      });

      xhr.send(formDataToSend);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const handleDayToggle = (day: number) => {
    const newDays = formData.days.includes(day)
      ? formData.days.filter((d) => d !== day)
      : [...formData.days, day].sort((a, b) => a - b);
    setFormData({ ...formData, days: newDays });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name,
      botName: formData.botName,
      chatMessages: formData.chatMessages.filter((m) => m.message.trim()),
      enableAiChatReplies: formData.enableAiChatReplies,
      videoUrl: formData.videoUrl,
      videoDuration: formData.videoDuration,
      botJoinMinutes: formData.botJoinMinutes,
      autoCloseMinutes: formData.autoCloseMinutes,
      enableBotAutomation: formData.enableBotAutomation,
      zoomLink: formData.zoomType === 'link' ? formData.zoomLink : undefined,
      zoomId: formData.zoomType === 'credentials' ? formData.zoomId : undefined,
      zoomPassword: formData.zoomType === 'credentials' ? formData.zoomPassword : undefined,
      schedule: {
        times: formData.times.filter(Boolean),
        days: formData.days,
        repeatFrequency: formData.repeatFrequency,
        startDate: formData.startDate,
        timezone: formData.timezone,
      },
      participantEmails: enableEmailReminders ? participantEmails : [],
      participantPhones: enableWhatsAppReminders ? participantPhones : [],
      enableEmailReminders,
      enableWhatsAppReminders,
      whatsappProvider,
    };

    onSubmit(payload);
  };

  const addEmail = () => {
    if (emailInput.trim() && !participantEmails.includes(emailInput.trim())) {
      if (participantEmails.length < 299) {
        setParticipantEmails([...participantEmails, emailInput.trim()]);
        setEmailInput('');
      } else {
        alert('Maximum 299 email recipients allowed.');
      }
    }
  };

  const removeEmail = (email: string) => {
    setParticipantEmails(participantEmails.filter((e) => e !== email));
  };

  const addPhone = () => {
    if (phoneInput.trim()) {
      const normalized = phoneInput.replace(/\D/g, '');
      if (!participantPhones.includes(normalized)) {
        if (participantPhones.length < 299) {
          setParticipantPhones([...participantPhones, normalized]);
          setPhoneInput('');
        } else {
          alert('Maximum 299 phone recipients allowed.');
        }
      }
    }
  };

  const removePhone = (phone: string) => {
    setParticipantPhones(participantPhones.filter((p) => p !== phone));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{initialData ? '✏️ Edit Sadhana Schedule' : '✨ Create Sadhana Schedule'}</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Configure automated morning routines, Zoom bot joining, and participant engagement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader size={15} className="animate-spin" /> : null}
            <span>{initialData ? 'Update Schedule' : 'Save & Activate'}</span>
          </button>
        </div>
      </div>

      {/* 1. Basic Details */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">1. Routine Identity</h3>
            <p className="text-[11px] text-slate-500">Name your routine and customize how the automated bot appears in Zoom.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Schedule Routine Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning 6AM Swar Sadhana"
              className={`w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border ${
                errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              } outline-none text-sm transition shadow-2xs`}
            />
            {errors.name && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Bot size={13} className="text-indigo-600" />
              <span>Bot Display Name (In Zoom)</span>
            </label>
            <input
              type="text"
              value={formData.botName}
              onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
              placeholder="e.g., 🤖 Swar Sadhana Host"
              className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition shadow-2xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">This name will be shown in the Zoom participants list.</p>
          </div>
        </div>
      </div>

      {/* 2. Schedule & Recurrence */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">2. Timing & Delivery Days</h3>
            <p className="text-[11px] text-slate-500">Pick active weekdays, multiple session times, and repeat frequency.</p>
          </div>
        </div>

        {/* Days selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Active Days *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {daysOptions.map((day) => {
              const active = formData.days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200/60'
                  }`}
                >
                  <span>{day.label}</span>
                  <span className={`text-[10px] font-normal ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {day.full.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.days && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.days}</p>}
        </div>

        {/* Times & Recurrence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Times */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Daily Time Slots *
            </label>
            <div className="space-y-2">
              {formData.times.map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(idx, e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-semibold transition"
                    />
                  </div>
                  {formData.times.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          times: formData.times.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Remove time slot"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {formData.times.length < 4 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, times: [...formData.times, '18:00'] })}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-indigo-50 transition cursor-pointer"
                >
                  <span>+ Add Another Time Slot (Up to 4)</span>
                </button>
              )}
            </div>
            {errors.times && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.times}</p>}
          </div>

          {/* Timezone & Frequency */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Repeat Cadence
              </label>
              <select
                value={formData.repeatFrequency}
                onChange={(e) => setFormData({ ...formData, repeatFrequency: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm transition"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Video & CDN Source */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center">
            <Video size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">3. Sadhana Video Source</h3>
            <p className="text-[11px] text-slate-500">Provide high-speed MP4/HLS URL or upload directly to Bunny CDN.</p>
          </div>
        </div>

        {!formData.videoUrl && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleVideoUpload(file);
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-6 text-center cursor-pointer transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={(e) => {
                if (e.target.files?.[0]) handleVideoUpload(e.target.files[0]);
              }}
              className="hidden"
            />
            {uploading ? (
              <div className="space-y-2">
                <Loader className="mx-auto text-indigo-600 animate-spin" size={28} />
                <p className="text-slate-800 font-bold text-sm">Uploading to Bunny CDN... {uploadProgress}%</p>
                <div className="w-full max-w-xs mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-pink-500 h-2 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto text-indigo-500 group-hover:scale-110 transition duration-150 mb-2" size={28} />
                <p className="text-slate-800 font-bold text-sm">Drag & drop your Sadhana video here, or click to browse</p>
                <p className="text-slate-400 text-xs mt-0.5">Supports MP4, WebM, MOV (Max 50MB direct)</p>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-rose-700 text-xs font-semibold">{uploadError}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Video Direct Link (MP4 / HLS / CDN) *
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => {
                setFormData({ ...formData, videoUrl: e.target.value });
                setUploadError(null);
              }}
              placeholder="https://vz-xxx.b-cdn.net/sadhana-session.mp4"
              className={`flex-1 px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border ${
                errors.videoUrl ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              } outline-none text-sm transition font-mono`}
            />
            {formData.videoUrl && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, videoUrl: '' })}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Clear video URL"
              >
                Clear
              </button>
            )}
          </div>
          {formData.videoUrl && (
            <p className="text-emerald-700 text-xs mt-1.5 font-semibold flex items-center gap-1.5">
              <CheckCircle size={14} /> Video URL validated and ready for automated streaming
            </p>
          )}
          {errors.videoUrl && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.videoUrl}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Video Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="240"
              value={formData.videoDuration}
              onChange={(e) => setFormData({ ...formData, videoDuration: parseInt(e.target.value) || 40 })}
              className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Expected session runtime for countdowns & progress sync.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Auto-Close Room (Minutes after start)
            </label>
            <input
              type="number"
              min="1"
              max="240"
              value={formData.autoCloseMinutes}
              onChange={(e) => setFormData({ ...formData, autoCloseMinutes: parseInt(e.target.value) || 40 })}
              className="w-full px-3.5 py-2 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">Bot automatically closes the meeting room after this duration.</p>
          </div>
        </div>
      </div>

      {/* 4. Zoom Meeting Connectivity */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">4. Zoom Connection</h3>
            <p className="text-[11px] text-slate-500">Provide direct Zoom invite link or Meeting ID with passcode.</p>
          </div>
        </div>

        {/* Radio toggle */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="radio"
              name="zoomType"
              value="link"
              checked={formData.zoomType === 'link'}
              onChange={() => setFormData({ ...formData, zoomType: 'link' })}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span>Full Zoom Link (Recommended)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="radio"
              name="zoomType"
              value="credentials"
              checked={formData.zoomType === 'credentials'}
              onChange={() => setFormData({ ...formData, zoomType: 'credentials' })}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            <span>Meeting ID & Password</span>
          </label>
        </div>

        {formData.zoomType === 'link' ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Zoom Meeting URL *
            </label>
            <input
              type="url"
              value={formData.zoomLink}
              onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
              placeholder="https://us02web.zoom.us/j/1234567890?pwd=..."
              className={`w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border ${
                errors.zoomLink ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
              } outline-none text-sm transition font-mono`}
            />
            {errors.zoomLink && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.zoomLink}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Meeting ID *
              </label>
              <input
                type="text"
                value={formData.zoomId}
                onChange={(e) => setFormData({ ...formData, zoomId: e.target.value })}
                placeholder="123 4567 8901"
                className={`w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border ${
                  errors.zoomId ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                } outline-none text-sm transition font-mono`}
              />
              {errors.zoomId && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.zoomId}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Meeting Passcode *
              </label>
              <div className="relative">
                <input
                  type={showZoomCreds ? 'text' : 'password'}
                  value={formData.zoomPassword}
                  onChange={(e) => setFormData({ ...formData, zoomPassword: e.target.value })}
                  placeholder="Passcode"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white text-slate-800 rounded-xl border ${
                    errors.zoomPassword ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'
                  } outline-none text-sm transition pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowZoomCreds(!showZoomCreds)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showZoomCreds ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.zoomPassword && <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.zoomPassword}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 5. Automated Bot & Live Chat Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">5. Bot Join & In-Meeting Chat</h3>
            <p className="text-[11px] text-slate-500">Configure bot join lead time, scheduled welcome messages, and AI responses.</p>
          </div>
        </div>

        {/* Master bot switch */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-slate-900 block">Enable Automated Bot Joining</span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Bot automatically starts at the scheduled time, sends messages, and streams the Sadhana video.
            </span>
          </div>
          <input
            type="checkbox"
            checked={formData.enableBotAutomation}
            onChange={(e) => setFormData({ ...formData, enableBotAutomation: e.target.checked })}
            className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        {formData.enableBotAutomation && (
          <div className="space-y-4 pt-2">
            {/* Join lead time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bot Join Lead Time (Minutes before session)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[2, 3, 5].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setFormData({ ...formData, botJoinMinutes: mins })}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      formData.botJoinMinutes === mins
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                    }`}
                  >
                    {mins} Minutes Before
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduled Chat Messages */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-indigo-600" />
                <span>Scheduled Chat Messages (Up to 4)</span>
              </label>
              <div className="space-y-3">
                {formData.chatMessages.map((slot, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">Message Slot #{idx + 1}</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Send at:</span>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={slot.delayMinutes}
                          onChange={(e) => {
                            const next = [...formData.chatMessages];
                            next[idx] = { ...next[idx], delayMinutes: parseInt(e.target.value) || 0 };
                            setFormData({ ...formData, chatMessages: next });
                          }}
                          className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-bold text-center"
                        />
                        <span>min after join</span>
                      </div>
                    </div>
                    <textarea
                      value={slot.message}
                      onChange={(e) => {
                        const next = [...formData.chatMessages];
                        next[idx] = { ...next[idx], message: e.target.value };
                        setFormData({ ...formData, chatMessages: next });
                      }}
                      placeholder={idx === 0 ? 'e.g. Welcome to Sadhana! Please keep your audio muted 🙏' : 'e.g. In case of issues, check the community feed...'}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 text-xs outline-none resize-none transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* AI Chat Replies Switch */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-600" />
                  <span>AI In-Meeting Q&A Helper</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  When enabled, the bot automatically answers simple attendee questions asked in Zoom chat.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.enableAiChatReplies}
                onChange={(e) => setFormData({ ...formData, enableAiChatReplies: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. Participant Reminders (Email & WhatsApp) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">6. Participant Reminders</h3>
            <p className="text-[11px] text-slate-500">Auto-dispatch session alerts via WhatsApp & Email before every routine.</p>
          </div>
        </div>

        {/* Email Reminders */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={enableEmailReminders}
                onChange={(e) => setEnableEmailReminders(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
              <span>Send Email Reminders (30m & 15m before)</span>
            </label>
            <span className="text-xs text-slate-400 font-semibold">{participantEmails.length}/299 recipients</span>
          </div>

          {enableEmailReminders && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  placeholder="Enter email address..."
                  className="flex-1 px-3 py-2 bg-white text-slate-800 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Add
                </button>
              </div>

              {participantEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                  {participantEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Reminders */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={enableWhatsAppReminders}
                onChange={(e) => setEnableWhatsAppReminders(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span>Send WhatsApp Alerts (15m before)</span>
            </label>
            <span className="text-xs text-slate-400 font-semibold">{participantPhones.length}/299 recipients</span>
          </div>

          {enableWhatsAppReminders && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    WhatsApp Gateway Provider
                  </label>
                  <select
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white text-slate-800 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="qr">🔗 QR WhatsApp Bridge (Recommended)</option>
                    <option value="meta">📱 Official Meta Cloud API</option>
                    <option value="both">🔄 Smart Fallback (QR + Meta)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Add Phone (e.g. 919876543210)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
                      placeholder="919876543210"
                      className="flex-1 px-3 py-2 bg-white text-slate-800 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={addPhone}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {participantPhones.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                  {participantPhones.map((phone) => (
                    <span
                      key={phone}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium"
                    >
                      <span>+{phone}</span>
                      <button
                        type="button"
                        onClick={() => removePhone(phone)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500 hidden sm:block">
          All routine parameters and bot timings are synced into Bunny Database.
        </p>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            <span>{initialData ? 'Update Schedule' : 'Create & Activate'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
