'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Copy, AlertCircle, Loader, Upload, Eye, EyeOff, X, CheckCircle } from 'lucide-react';

interface SadhanaFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  token?: string;
}

const daysOptions = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
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
    botName: initialData?.botName || 'Swar Sadhana',
    chatMessage: initialData?.chatMessage || '',
    chatDelayMinutes: initialData?.chatDelayMinutes || 0,
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

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.videoUrl.trim()) newErrors.videoUrl = 'Video URL is required';

    if (formData.zoomType === 'link' && !formData.zoomLink.trim()) {
      newErrors.zoomLink = 'Zoom link is required';
    }
    if (formData.zoomType === 'credentials') {
      if (!formData.zoomId.trim()) newErrors.zoomId = 'Zoom ID is required';
      if (!formData.zoomPassword.trim()) newErrors.zoomPassword = 'Zoom password is required';
    }

    if (formData.times.length === 0) newErrors.times = 'At least one time is required';
    if (formData.days.length === 0) newErrors.days = 'At least one day is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVideoUpload = async (file: File) => {
    try {
      console.log('[Sadhana Upload] Starting upload for:', file.name);
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        console.error('[Sadhana Upload] Invalid file type:', file.type);
        setUploadError('Invalid video type. Please upload MP4, WebM, MOV, or AVI.');
        setUploading(false);
        return;
      }

      // Validate file size (50MB max - realistic Vercel limit after multipart overhead)
      // Files > 50MB will fail with FUNCTION_PAYLOAD_TOO_LARGE error
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = Math.round(file.size / 1024 / 1024);
        console.error('[Sadhana Upload] File too large:', sizeMB, 'MB');
        setUploadError(`Video too large (${sizeMB}MB). Maximum size is 50MB. For larger videos, please compress or use chunked upload.`);
        setUploading(false);
        return;
      }

      console.log('[Sadhana Upload] File validated:', { name: file.name, size: Math.round(file.size / 1024 / 1024) + 'MB', type: file.type });

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('fileType', 'videos');
      formDataToSend.append('accessLevel', 'admin');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          console.log(`[Sadhana Upload] Progress: ${percentComplete}%`);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          console.log('[Sadhana Upload] Load event fired, status:', xhr.status);
          console.log('[Sadhana Upload] Response headers:', {
            contentType: xhr.getResponseHeader('content-type'),
            contentLength: xhr.getResponseHeader('content-length'),
          });

          if (!xhr.responseText) {
            console.error('[Sadhana Upload] Empty response text');
            setUploadError('Empty response from server (HTTP ' + xhr.status + ')');
            setUploading(false);
            return;
          }

          console.log('[Sadhana Upload] Raw response text (first 500 chars):', xhr.responseText.substring(0, 500));
          console.log('[Sadhana Upload] Raw response text (all):', xhr.responseText);

          let response;
          try {
            response = JSON.parse(xhr.responseText);
            console.log('[Sadhana Upload] ✅ Parsed response:', JSON.stringify(response, null, 2));
          } catch (parseErr) {
            console.error('[Sadhana Upload] ❌ JSON parse error:', parseErr);
            console.error('[Sadhana Upload] Failed to parse response:', xhr.responseText);
            console.error('[Sadhana Upload] Response length:', xhr.responseText.length);
            console.error('[Sadhana Upload] Response type:', typeof xhr.responseText);
            console.error('[Sadhana Upload] Response starts with:', xhr.responseText.charAt(0), xhr.responseText.charCodeAt(0));
            setUploadError(`Server error (Status ${xhr.status}): Invalid response format. Check browser console for details.`);
            setUploading(false);
            return;
          }

          if (xhr.status === 200 && response.success && response.data?.url) {
            console.log('[Sadhana Upload] ✅ Success! URL:', response.data.url);
            setFormData({ ...formData, videoUrl: response.data.url });
            setUploading(false);
            setUploadProgress(0);
          } else if (xhr.status >= 400) {
            const errorMsg = response.error || response.message || `Upload failed (${xhr.status})`;
            console.error('[Sadhana Upload] ❌ Server error:', errorMsg);
            setUploadError(errorMsg);
            setUploading(false);
          } else {
            console.warn('[Sadhana Upload] ⚠️ Unexpected response:', response);
            setUploadError(response.error || 'Upload failed - unknown error');
            setUploading(false);
          }
        } catch (err) {
          console.error('[Sadhana Upload] ❌ Load handler error:', err);
          setUploadError('Error processing upload response');
          setUploading(false);
        }
      });

      xhr.addEventListener('error', () => {
        console.error('[Sadhana Upload] Network error');
        setUploadError('Network error during upload');
        setUploading(false);
      });

      xhr.addEventListener('abort', () => {
        console.warn('[Sadhana Upload] Upload aborted');
        setUploadError('Upload was cancelled');
        setUploading(false);
      });

      xhr.open('POST', '/api/admin/crm/sadhana-scheduler/upload-video');
      const cleanToken = (token || '').trim().replace(/^Bearer\s+/i, '');
      xhr.setRequestHeader('Authorization', `Bearer ${cleanToken}`);

      console.log('[Sadhana Upload] XHR opened, sending file...');

      // Add timeout handler (30 seconds)
      const uploadTimeout = setTimeout(() => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
          console.error('[Sadhana Upload] Upload timeout after 30s');
          xhr.abort();
          setUploadError('Upload timeout - please try again with a smaller file');
          setUploading(false);
        }
      }, 30000);

      xhr.addEventListener('loadend', () => {
        console.log('[Sadhana Upload] loadend event fired');
        clearTimeout(uploadTimeout);
      });

      xhr.send(formDataToSend);
      console.log('[Sadhana Upload] FormData sent');
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
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData = {
      name: formData.name,
      botName: formData.botName || 'Swar Sadhana',
      chatMessage: formData.chatMessage || '',
      chatDelayMinutes: formData.chatDelayMinutes || 0,
      videoUrl: formData.videoUrl,
      videoDuration: formData.videoDuration || 40,
      botJoinMinutes: formData.botJoinMinutes || 5,
      autoCloseMinutes: formData.autoCloseMinutes || 40,
      enableBotAutomation: formData.enableBotAutomation !== false,
      schedule: {
        times: formData.times.sort(),
        days: formData.days,
        repeatFrequency: formData.repeatFrequency,
        startDate: formData.startDate,
        timezone: formData.timezone,
      },
      ...(formData.zoomType === 'link'
        ? { zoomLink: formData.zoomLink, zoomId: null, zoomPassword: null }
        : { zoomId: formData.zoomId, zoomPassword: formData.zoomPassword, zoomLink: null }),
      // Participant information
      participantEmails,
      participantPhones,
      enableEmailReminders,
      enableWhatsAppReminders,
      whatsappProvider,
    };

    onSubmit(submitData);
  };

  // Helper functions for participant management
  const addEmail = () => {
    if (emailInput.trim() && !participantEmails.includes(emailInput.trim())) {
      if (participantEmails.length < 299) {
        setParticipantEmails([...participantEmails, emailInput.trim()]);
        setEmailInput('');
      } else {
        alert('Maximum 299 emails allowed');
      }
    }
  };

  const removeEmail = (email: string) => {
    setParticipantEmails(participantEmails.filter(e => e !== email));
  };

  const addPhone = () => {
    if (phoneInput.trim()) {
      const normalized = phoneInput.replace(/\D/g, '');
      if (!participantPhones.includes(normalized)) {
        if (participantPhones.length < 299) {
          setParticipantPhones([...participantPhones, normalized]);
          setPhoneInput('');
        } else {
          alert('Maximum 299 phone numbers allowed');
        }
      }
    }
  };

  const removePhone = (phone: string) => {
    setParticipantPhones(participantPhones.filter(p => p !== phone));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">📋 Basic Information</h3>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Schedule Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Sadhana - Mon to Fri"
              className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                errors.name ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Bot Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              🤖 Bot Name (Appears in Zoom meeting)
            </label>
            <input
              type="text"
              value={formData.botName}
              onChange={(e) => setFormData({ ...formData, botName: e.target.value })}
              placeholder="e.g., Swar Sadhana"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="text-gray-500 text-xs mt-1">
              This is the name the bot will display as in your Zoom meeting.
            </p>
          </div>

          {/* Chat Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              💬 Chat Message <span className="text-gray-500 text-xs ml-1">(optional — posted in the meeting chat)</span>
            </label>
            <textarea
              value={formData.chatMessage}
              onChange={(e) => setFormData({ ...formData, chatMessage: e.target.value })}
              placeholder="e.g., Welcome all! Be connected — Mohan sir 🙏"
              rows={2}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">Send after</label>
              <input
                type="number"
                min="0"
                value={formData.chatDelayMinutes}
                onChange={(e) => setFormData({ ...formData, chatDelayMinutes: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <span className="text-sm text-gray-300">minute(s) of joining</span>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Leave the message blank to skip sending a chat message. 0 minutes sends it as soon as the bot joins.
            </p>
          </div>

        {/* Video URL or Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sadhana Video URL * 
              <span className="text-gray-500 text-xs ml-1">(Upload or paste link)</span>
            </label>

            {/* Upload Section */}
            {!formData.videoUrl && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleVideoUpload(file);
                }}
                className="mb-4 border-2 border-dashed border-purple-500/50 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition bg-purple-900/10"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleVideoUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {uploading ? (
                  <div className="space-y-3">
                    <Loader className="mx-auto text-purple-400 animate-spin" size={32} />
                    <p className="text-purple-300 font-medium">
                      Uploading to Bunny CDN... {uploadProgress}%
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto text-purple-400 mb-2" size={32} />
                    <p className="text-gray-300 font-medium mb-1">
                      Drag and drop your video here
                    </p>
                    <p className="text-gray-500 text-sm mb-3">
                      or click to select (MP4, WebM, MOV, AVI - Max 50MB)
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
                    >
                      Choose File
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-300 text-sm">{uploadError}</p>
              </div>
            )}

            {/* Video URL Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, videoUrl: e.target.value });
                    setUploadError(null);
                  }}
                  placeholder="https://yourcdn.com/video.mp4"
                  className={`flex-1 px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                    errors.videoUrl
                      ? 'border-red-500'
                      : 'border-gray-600'
                  }`}
                />
                {formData.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, videoUrl: '' })}
                    className="px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition"
                    title="Clear video URL"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Video URL Success Indicator */}
              {formData.videoUrl && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={16} />
                  <span>Video ready</span>
                </div>
              )}

              {errors.videoUrl && (
                <p className="text-red-400 text-sm mt-1">{errors.videoUrl}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">🎥 Zoom Configuration</h3>

        {/* Zoom Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Zoom Connection Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="zoomType"
                value="link"
                checked={formData.zoomType === 'link'}
                onChange={(e) =>
                  setFormData({ ...formData, zoomType: e.target.value })
                }
                className="mr-2"
              />
              <span className="text-gray-300">Zoom Link</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="zoomType"
                value="credentials"
                checked={formData.zoomType === 'credentials'}
                onChange={(e) =>
                  setFormData({ ...formData, zoomType: e.target.value })
                }
                className="mr-2"
              />
              <span className="text-gray-300">ID & Password</span>
            </label>
          </div>
        </div>

        {/* Zoom Link */}
        {formData.zoomType === 'link' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Zoom Meeting Link *
            </label>
            <input
              type="url"
              value={formData.zoomLink}
              onChange={(e) => setFormData({ ...formData, zoomLink: e.target.value })}
              placeholder="https://zoom.us/j/..."
              className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                errors.zoomLink ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {errors.zoomLink && (
              <p className="text-red-400 text-sm mt-1">{errors.zoomLink}</p>
            )}
          </div>
        )}

        {/* Zoom Credentials */}
        {formData.zoomType === 'credentials' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zoom Meeting ID *
              </label>
              <input
                type="text"
                value={formData.zoomId}
                onChange={(e) => setFormData({ ...formData, zoomId: e.target.value })}
                placeholder="e.g., 123456789"
                className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                  errors.zoomId ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.zoomId && (
                <p className="text-red-400 text-sm mt-1">{errors.zoomId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Zoom Password *
              </label>
              <div className="flex gap-2">
                <input
                  type={showZoomCreds ? 'text' : 'password'}
                  value={formData.zoomPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, zoomPassword: e.target.value })
                  }
                  placeholder="e.g., 123456"
                  className={`flex-1 px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
                    errors.zoomPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowZoomCreds(!showZoomCreds)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  {showZoomCreds ? '🙈' : '👁'}
                </button>
              </div>
              {errors.zoomPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.zoomPassword}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bot Automation Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">🤖 Bot Automation</h3>
        
        {/* Enable Bot Automation */}
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enableBotAutomation}
              onChange={(e) => setFormData({ ...formData, enableBotAutomation: e.target.checked })}
              className="mr-3 w-4 h-4 bg-gray-700 border border-gray-600 rounded accent-purple-600"
            />
            <span className="text-gray-300 font-medium">Enable Bot Automation</span>
          </label>
          <p className="text-gray-500 text-sm mt-1 ml-7">
            When enabled, the bot will automatically join, send countdown messages, and play the video.
          </p>
        </div>

        {formData.enableBotAutomation && (
          <>
            {/* Bot Join Minutes */}
            <div className="mb-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bot Join Time (minutes before scheduled time)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 5].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setFormData({ ...formData, botJoinMinutes: mins })}
                    className={`px-3 py-2 rounded-lg font-medium transition ${
                      formData.botJoinMinutes === mins
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                🤖 Bot will join and send "Ready" message this many minutes before the scheduled time.
              </p>
            </div>

            {/* Video Duration */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Video Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={formData.videoDuration}
                onChange={(e) => setFormData({ ...formData, videoDuration: parseInt(e.target.value) || 40 })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-gray-500 text-xs mt-1">How long the video plays (used for auto-close)</p>
            </div>

            {/* Auto-Close Time */}
            <div className="mb-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Auto-Close Meeting (minutes after video starts)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={formData.autoCloseMinutes}
                onChange={(e) => setFormData({ ...formData, autoCloseMinutes: parseInt(e.target.value) || 40 })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
              <p className="text-gray-500 text-xs mt-2">
                🔒 Meeting will automatically close this many minutes after the video starts. E.g., enter 40 to close after 40 minutes.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Schedule Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">⏰ Schedule Configuration</h3>

        {/* Times */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Delivery Times * (24-hour format)
          </label>
          <div className="space-y-2">
            {formData.times.map((time, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      times: formData.times.filter((_, i) => i !== index),
                    });
                  }}
                  className="px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, times: [...formData.times, '12:00'] })
              }
              className="mt-2 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-lg transition"
            >
              + Add Time
            </button>
          </div>
          {errors.times && (
            <p className="text-red-400 text-sm mt-1">{errors.times}</p>
          )}
        </div>

        {/* Days */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Repeat Days * (Select at least one)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {daysOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`px-3 py-2 rounded-lg font-medium transition ${
                  formData.days.includes(day.value)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {errors.days && (
            <p className="text-red-400 text-sm mt-2">{errors.days}</p>
          )}
        </div>

        {/* Repeat Frequency */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Repeat Frequency
          </label>
          <select
            value={formData.repeatFrequency}
            onChange={(e) =>
              setFormData({
                ...formData,
                repeatFrequency: e.target.value as any,
              })
            }
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Start Date & Timezone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Participant Management */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">👥 Participant Management</h3>

        {/* Email Reminders Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="emailReminders"
              checked={enableEmailReminders}
              onChange={(e) => setEnableEmailReminders(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="emailReminders" className="text-sm font-medium text-gray-300">
              📧 Enable Email Reminders (30 & 15 min before)
            </label>
          </div>

          {enableEmailReminders && (
            <div className="space-y-2 pl-7">
              <label className="block text-sm text-gray-400">Add Email Addresses (Max 299)</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                  placeholder="participant@example.com"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition"
                >
                  Add
                </button>
              </div>

              {/* Email List */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {participantEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded text-sm">
                    <span className="text-gray-300">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">{participantEmails.length}/299 emails added</p>
            </div>
          )}
        </div>

        {/* WhatsApp Reminders Section */}
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="whatsappReminders"
              checked={enableWhatsAppReminders}
              onChange={(e) => setEnableWhatsAppReminders(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="whatsappReminders" className="text-sm font-medium text-gray-300">
              💬 Enable WhatsApp Reminders (15 min before)
            </label>
          </div>

          {enableWhatsAppReminders && (
            <div className="space-y-2 pl-7">
              {/* WhatsApp Provider Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">WhatsApp Provider</label>
                <select
                  value={whatsappProvider}
                  onChange={(e) => setWhatsappProvider(e.target.value as 'qr' | 'meta' | 'both')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="qr">🔗 QR WhatsApp Bridge (Recommended)</option>
                  <option value="meta">📱 Meta Business API</option>
                  <option value="both">🔄 Both (Auto-Fallback - Most Reliable)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {whatsappProvider === 'qr' && 'Uses your existing QR WhatsApp service'}
                  {whatsappProvider === 'meta' && 'Uses official Meta WhatsApp Business API'}
                  {whatsappProvider === 'both' && 'Tries QR first, then Meta if QR fails'}
                </p>
              </div>

              {/* Phone Input */}
              <label className="block text-sm text-gray-400">Add WhatsApp Numbers (Max 299)</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                  placeholder="91-9876543210 or 919876543210"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={addPhone}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition"
                >
                  Add
                </button>
              </div>

              {/* Phone List */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {participantPhones.map((phone) => (
                  <div key={phone} className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded text-sm">
                    <span className="text-gray-300">+91 {phone.slice(-10)}</span>
                    <button
                      type="button"
                      onClick={() => removePhone(phone)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">{participantPhones.length}/299 phone numbers added</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader size={18} className="animate-spin" /> : null}
          {initialData ? 'Update Schedule' : 'Create Schedule'}
        </button>
      </div>
    </form>
  );
}
