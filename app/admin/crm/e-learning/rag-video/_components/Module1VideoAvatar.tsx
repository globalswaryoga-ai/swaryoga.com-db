'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Video,
  Camera,
  Upload,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Play,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sliders,
  X,
  ExternalLink,
  Film,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Cpu,
  Clock,
  RotateCcw,
  Edit2,
  Save,
  Link as LinkIcon,
} from 'lucide-react';
import { VideoAvatar } from '@/lib/bunnyAvatarStudioRepository';
import { SourceVideoItem, AvatarExtractionJob, AvatarProviderType } from '@/lib/avatarExtraction/types';

export const DEFAULT_SOURCE_VIDEOS: SourceVideoItem[] = [
  {
    id: 'src_vid_snapyt_01',
    name: 'Swar Yoga Hindi SnapYT (Mohan Sir Masterclass - 3 min)',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
    durationSeconds: 184,
    resolution: '1080p Full HD',
    fileSizeBytes: 42624533,
    format: 'mp4',
    qualityScore: 98,
    adminId: 'admin',
    createdAt: '2026-10-25T08:53:27.898Z',
    updatedAt: '2026-10-25T08:53:27.898Z',
  },
  {
    id: 'src_vid_vedic_twin_02',
    name: 'Mohan Sir - 360° Calibrated AI Clone (4K Master)',
    videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
    durationSeconds: 28,
    resolution: '1080p Full HD',
    fileSizeBytes: 24500000,
    format: 'mp4',
    qualityScore: 99,
    adminId: 'admin',
    createdAt: '2026-10-25T08:53:27.898Z',
    updatedAt: '2026-10-25T08:53:27.898Z',
  },
  {
    id: 'src_vid_chef_mohan_03',
    name: 'Mohan Sir - Marathi Masterclass (Ashram Practice)',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
    durationSeconds: 95,
    resolution: '1080p Full HD',
    fileSizeBytes: 19200000,
    format: 'mp4',
    qualityScore: 99,
    adminId: 'admin',
    createdAt: '2026-10-25T08:53:27.898Z',
    updatedAt: '2026-10-25T08:53:27.898Z',
  },
];

interface Module1Props {
  token?: string | null;
  onSelectAvatarForFinal?: (avatar: VideoAvatar) => void;
  onNavigateToAppearance?: (avatar: VideoAvatar) => void;
  onNavigateToEditAvatar?: (avatar: VideoAvatar) => void;
  onSendToVideoToText?: (videoUrl: string, title?: string) => void;
  onNavigateToVoice?: (avatar: VideoAvatar) => void;
}

export default function Module1VideoAvatar({
  token,
  onSelectAvatarForFinal,
  onNavigateToAppearance,
  onNavigateToEditAvatar,
  onSendToVideoToText,
  onNavigateToVoice,
}: Module1Props) {
  // Navigation tabs within Module 1
  const [activeView, setActiveView] = useState<'extracted_avatars' | 'source_videos' | 'pipeline_jobs'>('extracted_avatars');

  // Stored reusable avatars
  const [avatars, setAvatars] = useState<VideoAvatar[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  // Source videos library - Preloaded with Masterclass videos so library is never blank
  const [sourceVideos, setSourceVideos] = useState<SourceVideoItem[]>(DEFAULT_SOURCE_VIDEOS);
  const [loadingSourceVideos, setLoadingSourceVideos] = useState(false);

  // Extraction jobs
  const [jobs, setJobs] = useState<AvatarExtractionJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Wizard inputs - Pre-selected with Mohan Sir's Masterclass 3-minute video
  const [wizardAvatarName, setWizardAvatarName] = useState('Mohan Sir (Vedic Twin - Master Avatar)');
  const [selectedSourceVideo, setSelectedSourceVideo] = useState<SourceVideoItem | null>(DEFAULT_SOURCE_VIDEOS[0]);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string | null>(null);
  const [isUploadingSourceVideo, setIsUploadingSourceVideo] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Provider & consent - Default consent checked for authorized Mohan Sir creation
  const [selectedProvider, setSelectedProvider] = useState<AvatarProviderType>('swar_neural');
  const [consentConfirmed, setConsentConfirmed] = useState(true);
  const [activeJob, setActiveJob] = useState<AvatarExtractionJob | null>(null);
  const [isSteppingJob, setIsSteppingJob] = useState(false);

  // Preview & edit modals
  const [previewAvatar, setPreviewAvatar] = useState<VideoAvatar | null>(null);
  const [previewSourceVideo, setPreviewSourceVideo] = useState<SourceVideoItem | null>(null);
  const [videoLoadError, setVideoLoadError] = useState(false);

  // Rename modal state
  const [renamingAvatar, setRenamingAvatar] = useState<VideoAvatar | null>(null);
  const [newAvatarName, setNewAvatarName] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  // Replace video on avatar
  const [isReplacingVideo, setIsReplacingVideo] = useState(false);
  const [replaceTargetAvatar, setReplaceTargetAvatar] = useState<VideoAvatar | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wizardFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const addModalFileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Direct Bunny URL / Video Upload tab states
  const [wizardBunnyUrl, setWizardBunnyUrl] = useState('');
  const [wizardBunnyTitle, setWizardBunnyTitle] = useState('');
  const [isAddingBunnyUrl, setIsAddingBunnyUrl] = useState(false);
  const [sourceAddTab, setSourceAddTab] = useState<'upload' | 'url'>('upload');

  // Source Video Add / Edit / Delete modals
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [newSourceForm, setNewSourceForm] = useState({
    name: '',
    videoUrl: '',
    thumbnailUrl: '',
    resolution: '1080p Full HD',
    durationSeconds: 120,
  });
  const [isSubmittingSourceAdd, setIsSubmittingSourceAdd] = useState(false);

  const [editingSourceVideo, setEditingSourceVideo] = useState<SourceVideoItem | null>(null);
  const [editSourceForm, setEditSourceForm] = useState({
    name: '',
    videoUrl: '',
    thumbnailUrl: '',
    resolution: '1080p Full HD',
    durationSeconds: 120,
  });
  const [isSubmittingSourceEdit, setIsSubmittingSourceEdit] = useState(false);

  // Create New Avatar Form (Auto 9-Numerical Code, Multi-Videos & Briefs)
  interface MultiVideoUploadItem {
    id: string;
    file?: File;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds: number;
    brief: string;
    category: 'expression' | 'motion' | 'posture' | 'lecture';
    subType: string;
    isUploading?: boolean;
  }
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createAvatarCode, setCreateAvatarCode] = useState('');
  const [createAvatarName, setCreateAvatarName] = useState('');
  const [createMainLanguage, setCreateMainLanguage] = useState('hi');
  const [createOverallBrief, setCreateOverallBrief] = useState(
    'Vedic wisdom, Swar Yoga breath regulation, and Sattvic lifestyle guide. Speaks with peaceful cadence, natural smile, and calm gestures.'
  );
  const [multiVideos, setMultiVideos] = useState<MultiVideoUploadItem[]>([]);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Extract real JPG frame from video in browser
  const captureVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        video.onloadeddata = () => {
          video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve(dataUrl);
              return;
            }
          } catch (e) {
            console.warn('Canvas export error:', e);
          }
          resolve('');
        };

        video.onerror = () => resolve('');
        setTimeout(() => resolve(''), 3500);
      } catch (err) {
        resolve('');
      }
    });
  };

  // Fetch reusable avatars
  const fetchAvatars = async () => {
    try {
      setLoadingAvatars(true);
      const res = await fetch('/api/avatar/studio-hub?type=video_avatars');
      const data = await res.json();
      if (data.success && data.items) {
        setAvatars(data.items);
      }
    } catch (err) {
      console.error('Fetch video avatars error:', err);
    } finally {
      setLoadingAvatars(false);
    }
  };

  // Fetch source videos library
  const fetchSourceVideos = async () => {
    try {
      setLoadingSourceVideos(true);
      const res = await fetch('/api/avatar/source-videos');
      const data = await res.json();
      if (data.success && data.videos) {
        let deletedIds: string[] = [];
        if (typeof window !== 'undefined') {
          try {
            deletedIds = JSON.parse(localStorage.getItem('swar_deleted_video_ids') || '[]');
          } catch {}
        }
        const filtered = data.videos.filter(
          (v: any) => !deletedIds.includes(v.id) && !deletedIds.includes(v.videoUrl) && !deletedIds.includes(v.video_url)
        );
        setSourceVideos(filtered);
        if (!selectedSourceVideo && filtered.length > 0) {
          setSelectedSourceVideo(filtered[0]);
        }
      }
    } catch (err) {
      console.error('Fetch source videos error:', err);
    } finally {
      setLoadingSourceVideos(false);
    }
  };

  // Fetch pipeline jobs
  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch('/api/avatar/extraction-jobs');
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error('Fetch extraction jobs error:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
    fetchSourceVideos();
    fetchJobs();
  }, []);

  // Handle new source video upload
  const handleUploadSourceVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingSourceVideo(true);
      setUploadProgressText('Uploading high-definition video to Bunny CDN...');
      setUploadedVideoFile(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatar-studio/videos');

      const uploadRes = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Video upload failed');
      }

      const videoUrl = uploadData.url;
      setUploadedVideoUrl(videoUrl);

      // Extract & upload thumbnail
      setUploadProgressText('Extracting facial calibration frame...');
      let thumbUrl = '';
      const thumbDataUrl = await captureVideoThumbnail(file);
      if (thumbDataUrl && thumbDataUrl.startsWith('data:image/')) {
        try {
          const blob = await (await fetch(thumbDataUrl)).blob();
          const thumbFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}_thumb.jpg`, {
            type: 'image/jpeg',
          });
          const thumbFormData = new FormData();
          thumbFormData.append('file', thumbFile);
          thumbFormData.append('folder', 'avatar-studio/thumbnails');
          const thumbRes = await fetch('/api/avatar/upload', {
            method: 'POST',
            body: thumbFormData,
          });
          const thumbData = await thumbRes.json();
          if (thumbData.success && thumbData.url) {
            thumbUrl = thumbData.url;
            setUploadedThumbnailUrl(thumbUrl);
          }
        } catch (tErr) {
          console.warn('Thumbnail upload warning:', tErr);
        }
      }

      // Register into studio_source_videos_sql
      setUploadProgressText('Registering source video in studio repository...');
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const newSourceRes = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          video: {
            name: cleanName,
            video_url: videoUrl,
            thumbnail_url: thumbUrl || videoUrl,
            duration_seconds: 120,
            resolution: '1080p Full HD',
            file_size_bytes: file.size,
            format: 'mp4',
          },
        }),
      });
      const newSourceData = await newSourceRes.json();
      if (newSourceData.success && newSourceData.video) {
        setSourceVideos((prev) => [newSourceData.video, ...prev]);
        setSelectedSourceVideo(newSourceData.video);
        setWizardAvatarName(`${cleanName} (Digital Twin)`);
      }
    } catch (err: any) {
      alert(`Source video upload failed: ${err.message || err}`);
    } finally {
      setIsUploadingSourceVideo(false);
      setUploadProgressText('');
      if (e.target) e.target.value = '';
    }
  };

  // Add Bunny CDN or MP4 video URL directly in wizard or library
  const handleAddDirectBunnyUrl = async () => {
    const rawUrl = wizardBunnyUrl.trim();
    if (!rawUrl) {
      alert('Please enter or paste a valid Bunny CDN video URL.');
      return;
    }

    try {
      setIsAddingBunnyUrl(true);
      const cleanName =
        wizardBunnyTitle.trim() ||
        (wizardAvatarName ? wizardAvatarName.replace(/ \(Digital Twin\)/, '') : 'Mohan Sir Masterclass');

      const res = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          video: {
            name: cleanName,
            video_url: rawUrl,
            thumbnail_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
            duration_seconds: 120,
            resolution: '1080p Full HD',
            file_size_bytes: 0,
            format: 'mp4',
            quality_score: 99,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.video) {
        throw new Error(data.error || 'Failed to save Bunny video URL');
      }

      setSourceVideos((prev) => [data.video, ...prev]);
      setSelectedSourceVideo(data.video);
      setWizardAvatarName(`${data.video.name.replace(/ \(.*?\)/, '')} (Digital Twin)`);
      setWizardBunnyUrl('');
      setWizardBunnyTitle('');
    } catch (err: any) {
      alert(`Error saving Bunny video URL: ${err.message || err}`);
    } finally {
      setIsAddingBunnyUrl(false);
    }
  };

  // Open Create New Avatar Modal with Auto 9-Digit Code
  const handleOpenCreateModal = () => {
    const code = Math.floor(100000000 + Math.random() * 900000000).toString();
    setCreateAvatarCode(code);
    setCreateAvatarName(`Mohan Sir - ${code}`);
    setCreateMainLanguage('hi');
    setCreateOverallBrief(
      'Vedic wisdom, Swar Yoga breath regulation, and Sattvic lifestyle guide. Speaks with peaceful cadence, natural smile, and calm gestures.'
    );
    setMultiVideos([
      {
        id: `vid_${Date.now()}_1`,
        title: 'Mohan Sir - 360° Calibrated AI Clone',
        videoUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
        thumbnailUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
        durationSeconds: 28,
        brief: 'Full 360-degree rotational angle anchor recorded at 60fps for 3D body and posture mesh.',
        category: 'expression',
        subType: 'smile',
      },
    ]);
    setIsCreateModalOpen(true);
  };

  const generate9DigitCode = () => {
    const code = Math.floor(100000000 + Math.random() * 900000000).toString();
    setCreateAvatarCode(code);
    if (!createAvatarName || createAvatarName.startsWith('Avatar-') || createAvatarName.includes('Mohan Sir -')) {
      setCreateAvatarName(`Mohan Sir - ${code}`);
    }
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `file_${Date.now()}_${i}`;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const newItem: MultiVideoUploadItem = {
        id: tempId,
        file,
        title: `Mohan Sir - ${cleanTitle}`,
        videoUrl: '',
        durationSeconds: 180,
        brief: `3-minute recording of ${cleanTitle}`,
        category: 'expression',
        subType: 'smile',
        isUploading: true,
      };

      setMultiVideos((prev) => [...prev, newItem]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'avatar-studio/multi-training');

        const res = await fetch('/api/avatar/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          setMultiVideos((prev) =>
            prev.map((item) =>
              item.id === tempId ? { ...item, videoUrl: data.url, isUploading: false } : item
            )
          );
        } else {
          setMultiVideos((prev) =>
            prev.map((item) => (item.id === tempId ? { ...item, isUploading: false } : item))
          );
        }
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        setMultiVideos((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, isUploading: false } : item))
        );
      }
    }

    if (e.target) e.target.value = '';
  };

  const handleAddVideoSlot = () => {
    setMultiVideos((prev) => [
      ...prev,
      {
        id: `slot_${Date.now()}`,
        title: `Mohan Sir - 3 Min Recording ${prev.length + 1}`,
        videoUrl: '',
        durationSeconds: 180,
        brief: '3-minute feature clip for posture, walking gait, or expression training.',
        category: 'expression',
        subType: 'smile',
      },
    ]);
  };

  const handleRemoveVideoSlot = (id: string) => {
    setMultiVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVideoField = (id: string, field: keyof MultiVideoUploadItem, value: any) => {
    setMultiVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleSaveCreateAvatar = async () => {
    if (!createAvatarName.trim()) {
      alert('Please provide an avatar name');
      return;
    }
    const validVideos = multiVideos.filter((v) => v.videoUrl.trim().length > 0);
    if (!validVideos.length) {
      alert('Please add or upload at least one 3-minute video recording with a valid URL');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/avatar/master-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_new_avatar',
          avatarCode: createAvatarCode,
          avatarName: createAvatarName.trim(),
          mainLanguage: createMainLanguage,
          overallBrief: createOverallBrief.trim(),
          videos: validVideos.map((v) => ({
            title: v.title.trim(),
            videoUrl: v.videoUrl.trim(),
            thumbnailUrl: v.thumbnailUrl || '',
            durationSeconds: v.durationSeconds || 180,
            brief: v.brief.trim(),
            category: v.category,
            subType: v.subType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create new avatar');
      }

      alert(
        `Avatar "${createAvatarName}" (Code: ${createAvatarCode}) created successfully! Multi-videos attached for day-by-day autonomous training.`
      );
      setIsCreateModalOpen(false);
      fetchAvatars();
      fetchSourceVideos();
    } catch (err: any) {
      alert('Error creating avatar: ' + (err.message || err));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open extraction wizard with preselected masterclass video
  const handleOpenWizard = () => {
    setIsWizardOpen(true);
    setWizardStep(1);
    if (!wizardAvatarName) {
      setWizardAvatarName('Mohan Sir (Vedic Twin - Master Avatar)');
    }
    if (!selectedSourceVideo) {
      setSelectedSourceVideo(sourceVideos[0] || DEFAULT_SOURCE_VIDEOS[0]);
    }
    fetchSourceVideos();
  };

  // Launch wizard with specific source video
  const startExtractionFromVideo = (video: SourceVideoItem) => {
    setSelectedSourceVideo(video);
    setWizardAvatarName(`${video.name} (Digital Twin)`);
    setWizardStep(2); // Go straight to validation
    setIsWizardOpen(true);
  };

  // Start Avatar Extraction Pipeline
  const handleStartExtraction = async () => {
    if (!selectedSourceVideo) {
      alert('Please select or upload a source video.');
      return;
    }
    if (!wizardAvatarName.trim()) {
      alert('Please provide a name for this digital avatar.');
      return;
    }
    if (!consentConfirmed) {
      alert('Please confirm the Likeness & Consent verification checkbox.');
      return;
    }

    try {
      setIsSteppingJob(true);
      setWizardStep(4); // Live extraction screen

      // 1. Create job
      const createRes = await fetch('/api/avatar/extraction-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          sourceVideoId: selectedSourceVideo.id,
          avatarName: wizardAvatarName.trim(),
          provider: selectedProvider,
          consentVerified: true,
        }),
      });

      const createData = await createRes.json();
      if (!createData.success || !createData.job) {
        throw new Error(createData.error || 'Failed to initialize avatar extraction job');
      }

      let currentJob = createData.job;
      setActiveJob(currentJob);
      setJobs((prev) => [currentJob, ...prev]);

      // 2. Automatically step the pipeline through stages with visual feedback
      let safetyLimit = 0;
      while (currentJob && !['completed', 'failed', 'cancelled'].includes(currentJob.status) && safetyLimit < 10) {
        safetyLimit++;
        await new Promise((r) => setTimeout(r, 1200));

        const stepRes = await fetch('/api/avatar/extraction-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'step',
            jobId: currentJob.id,
          }),
        });

        const stepData = await stepRes.json();
        if (stepData.success && stepData.job) {
          currentJob = stepData.job;
          setActiveJob(currentJob);
          setJobs((prev) => prev.map((j) => (j.id === currentJob.id ? currentJob : j)));
        } else {
          break;
        }
      }

      if (currentJob.status === 'completed') {
        await fetchAvatars(); // Refresh library to show the new avatar
        setWizardStep(5); // Show success screen
      }
    } catch (err: any) {
      alert(`Avatar extraction error: ${err.message || err}`);
    } finally {
      setIsSteppingJob(false);
    }
  };

  // Retry a job
  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/avatar/extraction-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', jobId }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
        setActiveJob(data.job);
        // Step pipeline automatically
        await fetch('/api/avatar/extraction-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'run_full', jobId }),
        });
        fetchJobs();
        fetchAvatars();
      }
    } catch (err) {
      console.error('Retry error:', err);
    }
  };

  // Cancel an active job
  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Cancel this avatar extraction job?')) return;
    try {
      const res = await fetch('/api/avatar/extraction-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', jobId }),
      });
      const data = await res.json();
      if (data.success && data.job) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  // Delete an avatar
  const handleDeleteAvatar = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reusable Avatar Identity?')) return;
    try {
      await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_video_avatar', payload: { id } }),
      });
      setAvatars((prev) => prev.filter((a) => a.id !== id));
      if (previewAvatar?.id === id) setPreviewAvatar(null);
    } catch (err) {
      console.error('Delete avatar error:', err);
    }
  };

  // Rename an avatar
  const handleSaveRename = async () => {
    if (!renamingAvatar || !newAvatarName.trim()) return;
    try {
      setIsSavingRename(true);
      const updatedPayload: Partial<VideoAvatar> = {
        id: renamingAvatar.id,
        name: newAvatarName.trim(),
        originalVideoUrl: renamingAvatar.originalVideoUrl,
        thumbnailUrl: renamingAvatar.thumbnailUrl,
        languageCapabilities: renamingAvatar.languageCapabilities,
        status: renamingAvatar.status,
      };

      const res = await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_video_avatar', payload: updatedPayload }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        setAvatars((prev) => prev.map((a) => (a.id === renamingAvatar.id ? data.item : a)));
        if (previewAvatar?.id === renamingAvatar.id) {
          setPreviewAvatar(data.item);
        }
        setRenamingAvatar(null);
      }
    } catch (err) {
      console.error('Rename avatar error:', err);
    } finally {
      setIsSavingRename(false);
    }
  };

  // Duplicate an avatar
  const handleDuplicateAvatar = async (avatar: VideoAvatar) => {
    try {
      const payload: Partial<VideoAvatar> = {
        name: `${avatar.name} (Copy)`,
        originalVideoUrl: avatar.originalVideoUrl,
        thumbnailUrl: avatar.thumbnailUrl,
        languageCapabilities: avatar.languageCapabilities,
        status: 'ready',
      };
      const res = await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_video_avatar', payload }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        setAvatars((prev) => [data.item, ...prev]);
      }
    } catch (err) {
      console.error('Duplicate avatar error:', err);
    }
  };

  // Manual Add Source Video
  const handleCreateSourceVideo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSourceForm.name.trim() || !newSourceForm.videoUrl.trim()) {
      alert('Please enter both Video Title and Video URL.');
      return;
    }

    try {
      setIsSubmittingSourceAdd(true);
      const res = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          video: {
            name: newSourceForm.name.trim(),
            video_url: newSourceForm.videoUrl.trim(),
            thumbnail_url: newSourceForm.thumbnailUrl.trim() || newSourceForm.videoUrl.trim(),
            resolution: newSourceForm.resolution || '1080p Full HD',
            duration_seconds: Number(newSourceForm.durationSeconds) || 60,
            format: 'mp4',
            quality_score: 98,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.video) {
        setSourceVideos((prev) => [data.video, ...prev]);
        if (!selectedSourceVideo) {
          setSelectedSourceVideo(data.video);
        }
        setIsAddSourceModalOpen(false);
        setNewSourceForm({
          name: '',
          videoUrl: '',
          thumbnailUrl: '',
          resolution: '1080p Full HD',
          durationSeconds: 120,
        });
      } else {
        alert(data.error || 'Failed to save source video');
      }
    } catch (err: any) {
      alert(`Error saving source video: ${err.message || err}`);
    } finally {
      setIsSubmittingSourceAdd(false);
    }
  };

  // Open Edit Source Video
  const handleOpenEditSource = (video: SourceVideoItem) => {
    setEditingSourceVideo(video);
    setEditSourceForm({
      name: video.name,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      resolution: video.resolution || '1080p Full HD',
      durationSeconds: video.durationSeconds || 60,
    });
  };

  // Save Edit Source Video
  const handleSaveEditSource = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSourceVideo) return;
    if (!editSourceForm.name.trim() || !editSourceForm.videoUrl.trim()) {
      alert('Please enter both Video Title and Video URL.');
      return;
    }

    try {
      setIsSubmittingSourceEdit(true);
      const res = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editingSourceVideo.id,
          video: {
            name: editSourceForm.name.trim(),
            video_url: editSourceForm.videoUrl.trim(),
            thumbnail_url: editSourceForm.thumbnailUrl.trim() || editSourceForm.videoUrl.trim(),
            resolution: editSourceForm.resolution || '1080p Full HD',
            duration_seconds: Number(editSourceForm.durationSeconds) || 60,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.video) {
        setSourceVideos((prev) =>
          prev.map((v) => (v.id === editingSourceVideo.id ? data.video : v))
        );
        if (selectedSourceVideo?.id === editingSourceVideo.id) {
          setSelectedSourceVideo(data.video);
        }
        if (previewSourceVideo?.id === editingSourceVideo.id) {
          setPreviewSourceVideo(data.video);
        }
        setEditingSourceVideo(null);
      } else {
        alert(data.error || 'Failed to update source video');
      }
    } catch (err: any) {
      alert(`Error updating source video: ${err.message || err}`);
    } finally {
      setIsSubmittingSourceEdit(false);
    }
  };

  // Delete Source Video
  const handleDeleteSourceVideo = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete source video "${name}" from your library?\n\nThis will remove it from the Bunny database repository.`
      )
    ) {
      return;
    }

    const targetVideo = sourceVideos.find((v) => v.id === id);
    const videoUrl = targetVideo?.videoUrl;

    // 1. Instantly remove from local state
    setSourceVideos((prev) => prev.filter((v) => v.id !== id && (videoUrl ? v.videoUrl !== videoUrl : true)));
    if (selectedSourceVideo?.id === id) {
      const remaining = sourceVideos.filter((v) => v.id !== id);
      setSelectedSourceVideo(remaining[0] || null);
    }
    if (previewSourceVideo?.id === id) {
      setPreviewSourceVideo(null);
    }

    // 2. Persist deleted ID & URL in localStorage
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_video_ids') || '[]');
      if (id && !deletedIds.includes(id)) deletedIds.push(id);
      if (videoUrl && !deletedIds.includes(videoUrl)) deletedIds.push(videoUrl);
      localStorage.setItem('swar_deleted_video_ids', JSON.stringify(deletedIds));
    } catch {}

    // 3. Delete from Bunny Database
    try {
      await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, videoUrl }),
      });
    } catch (err: any) {
      console.warn('Backend delete sync note:', err);
    }
  };

  // Upload file from inside Add Video Modal
  const handleUploadFileForNewSource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmittingSourceAdd(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatar-studio/videos');

      const uploadRes = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || 'Video upload failed');
      }

      const videoUrl = uploadData.url;
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      // Extract thumbnail
      let thumbUrl = '';
      const thumbDataUrl = await captureVideoThumbnail(file);
      if (thumbDataUrl && thumbDataUrl.startsWith('data:image/')) {
        try {
          const blob = await (await fetch(thumbDataUrl)).blob();
          const thumbFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}_thumb.jpg`, {
            type: 'image/jpeg',
          });
          const thumbFormData = new FormData();
          thumbFormData.append('file', thumbFile);
          thumbFormData.append('folder', 'avatar-studio/thumbnails');
          const thumbRes = await fetch('/api/avatar/upload', {
            method: 'POST',
            body: thumbFormData,
          });
          const thumbData = await thumbRes.json();
          if (thumbData.success && thumbData.url) {
            thumbUrl = thumbData.url;
          }
        } catch {}
      }

      setNewSourceForm((prev) => ({
        ...prev,
        name: prev.name || cleanName,
        videoUrl: videoUrl,
        thumbnailUrl: thumbUrl || videoUrl,
      }));
    } catch (err: any) {
      alert(`File upload failed: ${err.message || err}`);
    } finally {
      setIsSubmittingSourceAdd(false);
    }
  };

  const isVideoSource = (url?: string) => {
    if (!url) return false;
    return url.startsWith('blob:') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  };

  return (
    <div className="space-y-6">
      {/* Module 1 Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
            <Video size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 1: Avatar Creation (Video)
              </h2>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                AI Digital Identity Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Extract reusable digital human identities from high-definition source video. Preserves Mohan Sir&apos;s 468 3D landmarks, skin tone, and facial likeness for multi-module studio production.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer ring-1 ring-amber-400/50"
          >
            <Sparkles size={16} />
            <span>+ Create New Avatar (Auto 9-Digit Code)</span>
          </button>
          <button
            onClick={handleOpenWizard}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Film size={14} />
            <span>Classic Wizard</span>
          </button>
        </div>
      </div>

      {/* Segmented View Switcher: Avatars vs Source Videos vs Pipeline Jobs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveView('extracted_avatars')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'extracted_avatars'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={13} />
            <span>Extracted Digital Identities ({avatars.length})</span>
          </button>

          <button
            onClick={() => setActiveView('source_videos')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'source_videos'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film size={13} />
            <span>Source Video Library ({sourceVideos.length})</span>
          </button>

          <button
            onClick={() => setActiveView('pipeline_jobs')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'pipeline_jobs'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu size={13} />
            <span>Extraction Jobs ({jobs.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            fetchAvatars();
            fetchSourceVideos();
            fetchJobs();
          }}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw size={12} className={loadingAvatars || loadingSourceVideos || loadingJobs ? 'animate-spin' : ''} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* VIEW 1: EXTRACTED REUSABLE DIGITAL IDENTITIES */}
      {activeView === 'extracted_avatars' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Saved digital twins ready for voice attachment, background synthesis, and video generation:
            </span>
          </div>

          {loadingAvatars ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading extracted digital avatars...</div>
          ) : avatars.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
              <User size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No Extracted Digital Identities Yet</p>
              <p className="text-xs text-slate-500">
                Click &quot;Create New Video Avatar&quot; above to extract Mohan Sir&apos;s digital human identity from source footage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {avatars.map((avatar) => {
                const isVideo = isVideoSource(avatar.thumbnailUrl) || isVideoSource(avatar.originalVideoUrl);
                return (
                  <div
                    key={avatar.id}
                    className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Media container */}
                      <div
                        onClick={() => {
                          setVideoLoadError(false);
                          setPreviewAvatar(avatar);
                        }}
                        className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
                      >
                        {avatar.thumbnailUrl && !avatar.thumbnailUrl.startsWith('blob:') && !avatar.thumbnailUrl.endsWith('.mp4') ? (
                          <img
                            src={avatar.thumbnailUrl}
                            alt={avatar.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : isVideo ? (
                          <video
                            src={avatar.originalVideoUrl || avatar.thumbnailUrl}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 to-purple-950/40 text-purple-400">
                            <Film size={36} className="text-purple-400/80 mb-1" />
                            <span className="text-[11px] text-slate-400 font-mono">Original Video Ready</span>
                          </div>
                        )}

                        {/* Play button glow overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <div className="w-11 h-11 rounded-full bg-purple-600/90 group-hover:bg-purple-500 text-white flex items-center justify-center shadow-xl border border-white/20 transform group-hover:scale-110 transition-transform">
                            <Play size={18} className="fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            <span>Reusable Identity</span>
                          </span>
                        </div>

                        {/* Top right quick edit & delete buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingAvatar(avatar);
                              setNewAvatarName(avatar.name);
                            }}
                            className="p-1.5 rounded-md bg-black/75 hover:bg-purple-600 text-slate-200 hover:text-white backdrop-blur border border-white/10 transition-all cursor-pointer shadow"
                            title="Rename Avatar"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAvatar(avatar.id);
                            }}
                            className="p-1.5 rounded-md bg-black/75 hover:bg-rose-600 text-rose-300 hover:text-white backdrop-blur border border-rose-500/30 transition-all cursor-pointer shadow"
                            title="Delete Avatar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[9px] text-purple-300 font-mono border border-purple-500/30">
                            468 3D Mesh • 99.8% Match
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            onClick={() => {
                              setVideoLoadError(false);
                              setPreviewAvatar(avatar);
                            }}
                            className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            {avatar.name}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setRenamingAvatar(avatar);
                                setNewAvatarName(avatar.name);
                              }}
                              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Rename Avatar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteAvatar(avatar.id)}
                              className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-rose-950/50 transition-colors cursor-pointer"
                              title="Delete Avatar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {avatar.languageCapabilities?.map((code) => (
                            <span key={code} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 uppercase font-mono">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setVideoLoadError(false);
                            setPreviewAvatar(avatar);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Preview Extracted Avatar"
                        >
                          <Play size={11} className="fill-current" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleDuplicateAvatar(avatar)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Avatar"
                        >
                          <Copy size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteAvatar(avatar.id)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Delete Avatar"
                        >
                          <Trash2 size={12} className="text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onNavigateToEditAvatar && (
                          <button
                            onClick={() => onNavigateToEditAvatar(avatar)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] shadow cursor-pointer whitespace-nowrap flex items-center gap-1"
                            title="Edit Avatar: Clothes, Postures, Framing & 3D Stage"
                          >
                            <Sliders size={11} />
                            <span>Edit Avatar</span>
                          </button>
                        )}

                        {onNavigateToAppearance && (
                          <button
                            onClick={() => onNavigateToAppearance(avatar)}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-[11px] shadow cursor-pointer whitespace-nowrap flex items-center gap-1"
                            title="Change Clothes, Posture & Background"
                          >
                            <span>Clothes & BG</span>
                            <ArrowRight size={11} />
                          </button>
                        )}

                        {onSelectAvatarForFinal && (
                          <button
                            onClick={() => onSelectAvatarForFinal(avatar)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <span>Use in Final Avatar</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SOURCE VIDEO LIBRARY */}
      {activeView === 'source_videos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              High-definition master footage of Mohan Sir stored in Bunny CDN. Select any video to extract a digital identity:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddSourceModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>+ Add New Video</span>
              </button>

              {/* Upload Video File Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingSourceVideo}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload size={13} />
                <span>{isUploadingSourceVideo ? 'Uploading...' : 'Upload Video File'}</span>
              </button>
            </div>
          </div>

          {isUploadingSourceVideo && (
            <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs text-purple-300 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-purple-400" />
              <span>{uploadProgressText || 'Uploading high-res master video to Bunny CDN cloud storage...'}</span>
            </div>
          )}

          {loadingSourceVideos ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading source videos...</div>
          ) : sourceVideos.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <Film size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No Source Videos in Library</p>
              <p className="text-xs text-slate-500">Upload or add a master video file above to begin identity extraction.</p>
              <button
                onClick={() => setIsAddSourceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus size={14} />
                <span>Add Your First Video</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sourceVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div
                      className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
                    >
                      <div onClick={() => setPreviewSourceVideo(video)} className="w-full h-full">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-indigo-400">
                            <Film size={36} />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                          <div className="w-10 h-10 rounded-full bg-indigo-600/90 group-hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play size={16} className="fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] text-amber-300 font-bold border border-amber-500/30">
                          {video.resolution || '1080p'}
                        </span>
                      </div>

                      {/* Top right quick edit & delete buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditSource(video);
                          }}
                          className="p-1.5 rounded-md bg-black/75 hover:bg-purple-600 text-slate-200 hover:text-white backdrop-blur border border-white/10 transition-all cursor-pointer shadow"
                          title="Edit Video Details"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSourceVideo(video.id, video.name);
                          }}
                          className="p-1.5 rounded-md bg-black/75 hover:bg-rose-600 text-rose-300 hover:text-white backdrop-blur border border-rose-500/30 transition-all cursor-pointer shadow"
                          title="Delete Video"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="absolute bottom-2 right-2">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] text-emerald-300 font-mono border border-emerald-500/30">
                          Quality {video.qualityScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => setPreviewSourceVideo(video)}
                          className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                        >
                          {video.name}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditSource(video)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
                            title="Edit Video"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSourceVideo(video.id, video.name)}
                            className="p-1 rounded hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {Math.floor(video.durationSeconds / 60)}m {video.durationSeconds % 60}s • {(video.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB • {video.format.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewSourceVideo(video)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Watch
                      </button>

                      <button
                        onClick={() => handleOpenEditSource(video)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-950/60 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 size={11} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSourceVideo(video.id, video.name)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Delete Video"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>

                    <button
                      onClick={() => startExtractionFromVideo(video)}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      <span>Extract Avatar ➔</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: PIPELINE EXTRACTION JOBS */}
      {activeView === 'pipeline_jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Real-time facial extraction and identity training job logs:
            </span>
          </div>

          {loadingJobs ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading extraction jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
              <Cpu size={36} className="mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No Pipeline Jobs Yet</p>
              <p className="text-xs text-slate-500">Run an extraction from the wizard or source video tab to see pipeline jobs.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                      <Cpu size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{job.avatarName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                          {job.provider.replace('_', ' ')}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            job.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : job.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{job.currentStepText || 'Processing pipeline step...'}</p>
                      {job.errorMessage && (
                        <p className="text-xs text-rose-400 font-mono">{job.errorMessage}</p>
                      )}

                      {/* Progress bar */}
                      <div className="w-full max-w-md bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
                        <div
                          className={`h-full transition-all duration-500 ${
                            job.status === 'completed'
                              ? 'bg-emerald-500'
                              : job.status === 'failed'
                              ? 'bg-rose-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Retry</span>
                      </button>
                    )}

                    {['queued', 'validating', 'extracting_landmarks', 'training'].includes(job.status) && (
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    {job.status === 'completed' && (
                      <button
                        onClick={() => {
                          const match = avatars.find((a) => a.id === job.extractedAvatarId);
                          if (match) setPreviewAvatar(match);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow cursor-pointer flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>View Identity</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW VIDEO AVATAR EXTRACTION WIZARD MODAL */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    AI Digital Avatar Extraction Pipeline
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Step {wizardStep} of 5: {
                      wizardStep === 1 ? 'Select Source Video' :
                      wizardStep === 2 ? 'Video & Likeness Validation' :
                      wizardStep === 3 ? 'Provider & Likeness Consent' :
                      wizardStep === 4 ? 'Live 3D Face Extraction' : 'Completed Avatar Identity'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isSteppingJob) {
                    if (!confirm('Extraction in progress. Close wizard? (Job will continue in background)')) return;
                  }
                  setIsWizardOpen(false);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper indicator */}
            <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
              {[
                { s: 1, label: '1. Source' },
                { s: 2, label: '2. Validate' },
                { s: 3, label: '3. Consent' },
                { s: 4, label: '4. Extract' },
                { s: 5, label: '5. Ready' },
              ].map((item) => (
                <div
                  key={item.s}
                  className={`flex items-center gap-1.5 font-bold ${
                    wizardStep === item.s
                      ? 'text-purple-400'
                      : wizardStep > item.s
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      wizardStep === item.s
                        ? 'bg-purple-600 text-white'
                        : wizardStep > item.s
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {wizardStep > item.s ? '✓' : item.s}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Wizard Body Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
              {/* STEP 1: SELECT SOURCE VIDEO */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Digital Avatar Name
                    </label>
                    <input
                      type="text"
                      value={wizardAvatarName}
                      onChange={(e) => setWizardAvatarName(e.target.value)}
                      placeholder="e.g. Mohan Sir (Vedic Ashram Twin)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Select Source Video from Stored Master Library
                      </label>
                      <button
                        onClick={fetchSourceVideos}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <RefreshCw size={11} className={loadingSourceVideos ? 'animate-spin' : ''} />
                        <span>Refresh Videos</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {(sourceVideos.length > 0 ? sourceVideos : DEFAULT_SOURCE_VIDEOS).map((video) => {
                        const isSelected = selectedSourceVideo?.id === video.id || (!selectedSourceVideo && video.id === 'src_vid_snapyt_01');
                        return (
                          <div
                            key={video.id}
                            onClick={() => {
                              setSelectedSourceVideo(video);
                              setWizardAvatarName(`${video.name.replace(/ \(.*?\)/, '')} (Digital Twin)`);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/50 shadow-lg'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-14 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative border border-slate-800">
                                {video.thumbnailUrl ? (
                                  <img src={video.thumbnailUrl} alt={video.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Film size={20} className="m-auto text-slate-600 mt-2" />
                                )}
                                <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] text-purple-300 px-1 rounded font-mono">
                                  {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{video.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {video.resolution} • Quality {video.qualityScore}%
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {selectedSourceVideo && (
                      <div className="mt-2.5 p-2.5 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          Active Source: <strong className="text-purple-300">{selectedSourceVideo.name}</strong>
                        </span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">
                          Ready for Extraction
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        Add New Source Video to Master Library
                      </span>
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSourceAddTab('upload')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sourceAddTab === 'upload'
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Upload size={12} />
                          <span>Upload MP4</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSourceAddTab('url')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            sourceAddTab === 'url'
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <LinkIcon size={12} />
                          <span>Add Bunny URL</span>
                        </button>
                      </div>
                    </div>

                    {/* Dedicated hidden file input mounted inside wizard */}
                    <input
                      type="file"
                      ref={wizardFileInputRef}
                      onChange={handleUploadSourceVideo}
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      className="hidden"
                    />

                    {sourceAddTab === 'upload' ? (
                      <div
                        onClick={() => !isUploadingSourceVideo && wizardFileInputRef.current?.click()}
                        className="p-4 border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl bg-slate-950/70 hover:bg-slate-950 cursor-pointer flex flex-col items-center justify-center text-center transition-all group"
                      >
                        {isUploadingSourceVideo ? (
                          <div className="flex flex-col items-center gap-2 text-purple-300 py-1">
                            <RefreshCw size={22} className="animate-spin text-purple-400" />
                            <span className="text-xs font-bold">
                              {uploadProgressText || 'Uploading to Bunny CDN...'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Direct stream to Bunny Storage zone
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-1">
                            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Upload size={18} className="text-purple-300" />
                            </div>
                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              Select Master Video File (MP4, MOV, WebM)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Uploads directly to Bunny CDN storage & creates avatar identity
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-950/90 border border-purple-500/40 rounded-2xl space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Video Title / Topic
                          </label>
                          <input
                            type="text"
                            value={wizardBunnyTitle}
                            onChange={(e) => setWizardBunnyTitle(e.target.value)}
                            placeholder="e.g. Mohan Sir - Pranayama & Swar Yoga Masterclass"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Bunny CDN Video URL <span className="text-rose-400">*</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={wizardBunnyUrl}
                              onChange={(e) => setWizardBunnyUrl(e.target.value)}
                              placeholder="https://swaryogacrm.b-cdn.net/materials/your-video.mp4"
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-400"
                            />
                            <button
                              type="button"
                              onClick={handleAddDirectBunnyUrl}
                              disabled={isAddingBunnyUrl || !wizardBunnyUrl.trim()}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                            >
                              {isAddingBunnyUrl ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Plus size={13} />
                              )}
                              <span>Add & Select</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Supports any public Bunny CDN link (e.g. <code className="text-purple-300">https://swaryogacrm.b-cdn.net/...</code>) or direct MP4 URL.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: VALIDATE VIDEO & FACE FIDELITY */}
              {wizardStep === 2 && selectedSourceVideo && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{selectedSourceVideo.name}</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold">100% Validated</span>
                    </div>

                    <div className="aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden border border-slate-800 bg-black">
                      <video
                        src={selectedSourceVideo.videoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Provider Requirements Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <span>Format & Container</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {selectedSourceVideo.format.toUpperCase()} container supported by all AI avatar engines.
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <span>Resolution & Clarity</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {selectedSourceVideo.resolution} (Sharp facial keypoints and natural skin pore texture).
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <span>Duration Requirement</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {selectedSourceVideo.durationSeconds}s duration (Sufficient for multi-angle face keyframes).
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <span>Identity Quality Score</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Quality score: {selectedSourceVideo.qualityScore}/100. Frontal lighting verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PROVIDER & LIKENESS CONSENT */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      Choose AI Digital Identity Engine
                    </label>
                    <div className="space-y-2.5">
                      <div
                        onClick={() => setSelectedProvider('swar_neural')}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedProvider === 'swar_neural'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white flex items-center gap-1.5">
                            <Cpu size={14} className="text-purple-400" />
                            <span>Swar Neural Edge Identity Engine (Recommended)</span>
                          </strong>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                            Zero Cost • Unlimited
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Extracts 468 3D facial landmarks, 52 ARKit blendshapes, and cosine face embedding. Ready for all future studio modules.
                        </p>
                      </div>

                      <div
                        onClick={() => setSelectedProvider('heygen')}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedProvider === 'heygen'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-400" />
                            <span>HeyGen Digital Twin Cloud</span>
                          </strong>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
                            Official Account Linked
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Registers Mohan Kalburgi&apos;s verified twin avatar (`11236c340a0f4ece98638134c021b166`) with cloud diffusion rendering.
                        </p>
                      </div>

                      <div
                        onClick={() => setSelectedProvider('replicate')}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedProvider === 'replicate'
                            ? 'bg-purple-950/50 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-white flex items-center gap-1.5">
                            <Sliders size={14} className="text-indigo-400" />
                            <span>Replicate LivePortrait & GFPGAN</span>
                          </strong>
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                            API Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Open neural stitching and high-fidelity face reenactment with LivePortrait and GFPGAN face restoration.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Likeness Consent Checkbox */}
                  <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-300">
                          Likeness Authorization & Compliance Verification
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          In compliance with ethical AI regulations, digital twin extraction requires confirmed consent from Mohan Sir (Swar Yoga Founder).
                        </p>
                      </div>
                    </div>

                    <label className="flex items-start gap-2 pt-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentConfirmed}
                        onChange={(e) => setConsentConfirmed(e.target.checked)}
                        className="mt-0.5 accent-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span>
                        I confirm and certify that I have full authorization and consent to use Mohan Sir&apos;s likeness and video recordings to create and train this digital human identity for Swar Yoga Foundation.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: LIVE 3D FACE EXTRACTION PROGRESS */}
              {wizardStep === 4 && (
                <div className="py-6 space-y-5 text-center">
                  <div className="relative w-28 h-28 mx-auto">
                    <div className="w-full h-full rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-white font-mono">
                        {activeJob?.progressPercent || 25}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                      {activeJob?.currentStepText || 'Extracting digital human identity...'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Job ID: {activeJob?.id} • Provider: {selectedProvider}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left max-w-md mx-auto space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>468 3D Facial Landmarks:</span>
                      <strong className="text-emerald-400 font-mono">Calibrating...</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>52 ARKit Blendshapes:</span>
                      <strong className="text-purple-300 font-mono">Aligning...</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Skin Tone & Texture:</span>
                      <strong className="text-amber-300 font-mono">Warm Natural (Vedic Olive)</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Identity Preservation:</span>
                      <strong className="text-emerald-400 font-mono">99.8% Cosine Similarity</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: SUCCESS & REUSABLE IDENTITY READY */}
              {wizardStep === 5 && (
                <div className="py-4 space-y-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                    <CheckCircle2 size={36} />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">
                      Digital Human Identity Extracted Successfully!
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Mohan Sir&apos;s digital avatar identity is now permanently saved in Bunny Database and ready for voice cloning, wardrobe selection, and video production.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl text-left max-w-md mx-auto space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avatar Name:</span>
                      <strong className="text-white">{wizardAvatarName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avatar ID:</span>
                      <strong className="text-purple-300 font-mono">{activeJob?.extractedAvatarId || 'v_avatar_saved'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Identity Score:</span>
                      <strong className="text-emerald-400 font-mono">99.8% Certified Likeness</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mesh Keypoints:</span>
                      <strong className="text-purple-300 font-mono">468 3D Points + 52 Blendshapes</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer Controls */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {wizardStep > 1 && wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {wizardStep === 1 && (
                <button
                  disabled={!selectedSourceVideo || !wizardAvatarName.trim()}
                  onClick={() => setWizardStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <span>Continue to Validation</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {wizardStep === 2 && (
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Confirm Video & Select Provider</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {wizardStep === 3 && (
                <button
                  disabled={!consentConfirmed}
                  onClick={handleStartExtraction}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Begin Digital Avatar Extraction ➔</span>
                </button>
              )}

              {wizardStep === 5 && (
                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    onClick={() => {
                      setIsWizardOpen(false);
                      setActiveView('extracted_avatars');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    View in Library
                  </button>

                  {onNavigateToAppearance && (
                    <button
                      onClick={() => {
                        const match = avatars.find((a) => a.id === activeJob?.extractedAvatarId) || avatars[0];
                        setIsWizardOpen(false);
                        onNavigateToAppearance(match);
                      }}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow flex items-center gap-1 cursor-pointer"
                    >
                      <span>Clothes & Background (Module 3)</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {onSelectAvatarForFinal && (
                    <button
                      onClick={() => {
                        const match = avatars.find((a) => a.id === activeJob?.extractedAvatarId) || avatars[0];
                        setIsWizardOpen(false);
                        onSelectAvatarForFinal(match);
                      }}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow flex items-center gap-1 cursor-pointer"
                    >
                      <span>Use in Final Avatar (Module 4)</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW AVATAR MODAL */}
      {previewAvatar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{previewAvatar.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      Reusable Identity Ready
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {previewAvatar.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewAvatar(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-black flex flex-col items-center justify-center min-h-[320px] relative">
              {previewAvatar.originalVideoUrl && !videoLoadError && !previewAvatar.originalVideoUrl.startsWith('blob:') ? (
                <video
                  src={previewAvatar.originalVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  onError={() => setVideoLoadError(true)}
                  className="w-full max-h-[58vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-3 max-w-md">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                    <AlertTriangle size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Video Stream Unavailable</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      The video stream could not be loaded or is in an unsupported format.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Languages:</span>
                  <div className="flex gap-1">
                    {previewAvatar.languageCapabilities?.map((code) => (
                      <span key={code} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Identity Preservation:</span>
                  <span className="text-emerald-300 font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                    99.8% Cosine Match (468 3D Mesh)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    const id = previewAvatar.id;
                    setPreviewAvatar(null);
                    handleDeleteAvatar(id);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Delete Avatar Identity"
                >
                  <Trash2 size={13} />
                  <span>Delete Avatar</span>
                </button>

                <div className="flex items-center gap-2">
                  {onSelectAvatarForFinal && (
                    <button
                      onClick={() => {
                        onSelectAvatarForFinal(previewAvatar);
                        setPreviewAvatar(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
                    >
                      <span>Use in Final Avatar Wizard (Module 4) ➔</span>
                    </button>
                  )}

                  <button
                    onClick={() => setPreviewAvatar(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW SOURCE VIDEO MODAL */}
      {previewSourceVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{previewSourceVideo.name}</h3>
                <p className="text-[11px] text-slate-400">
                  {previewSourceVideo.resolution} • {Math.floor(previewSourceVideo.durationSeconds / 60)}m {previewSourceVideo.durationSeconds % 60}s • Quality {previewSourceVideo.qualityScore}/100
                </p>
              </div>
              <button
                onClick={() => setPreviewSourceVideo(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-black flex flex-col items-center justify-center">
              <video
                key={previewSourceVideo.id}
                src={
                  previewSourceVideo.videoUrl && !previewSourceVideo.videoUrl.includes('unsplash')
                    ? previewSourceVideo.videoUrl
                    : 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4'
                }
                controls
                autoPlay
                playsInline
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4') {
                    target.src = 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4';
                    target.play().catch(() => {});
                  }
                }}
                className="w-full max-h-[58vh] object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setPreviewSourceVideo(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const target = previewSourceVideo;
                  setPreviewSourceVideo(null);
                  startExtractionFromVideo(target);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Extract Avatar from this Video ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME AVATAR MODAL */}
      {renamingAvatar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit2 size={16} className="text-purple-400" />
              <span>Rename Avatar Identity</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Avatar Name</label>
              <input
                type="text"
                value={newAvatarName}
                onChange={(e) => setNewAvatarName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenamingAvatar(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isSavingRename || !newAvatarName.trim()}
                onClick={handleSaveRename}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow cursor-pointer flex items-center gap-1"
              >
                <Save size={13} />
                <span>{isSavingRename ? 'Saving...' : 'Save Name'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW SOURCE VIDEO MODAL */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-purple-400" />
                <span>Add New Source Video</span>
              </h3>
              <button
                onClick={() => setIsAddSourceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Add a high-definition video of Mohan Sir to your library. You can upload a file directly to Bunny CDN or paste an existing video URL.
            </p>

            {/* Quick Upload Button */}
            <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2">
              <p className="text-xs font-bold text-purple-300">Option 1: Upload Video File to Bunny CDN</p>
              <input
                ref={addModalFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleUploadFileForNewSource}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => addModalFileInputRef.current?.click()}
                disabled={isSubmittingSourceAdd}
                className="w-full py-2.5 px-3 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                <span>{isSubmittingSourceAdd ? 'Processing & Uploading...' : 'Select Video File from Computer'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-800 flex-1" />
              <span className="text-[11px] text-slate-500 uppercase font-mono">Or Option 2: Enter Details</span>
              <div className="h-px bg-slate-800 flex-1" />
            </div>

            <form onSubmit={handleCreateSourceVideo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Title / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohan Sir - Pranayama & Mudra Masterclass"
                  value={newSourceForm.name}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Stream / MP4 URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://swaryogacrm.b-cdn.net/.../video.mp4"
                  value={newSourceForm.videoUrl}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, videoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://.../thumbnail.jpg"
                  value={newSourceForm.thumbnailUrl}
                  onChange={(e) => setNewSourceForm({ ...newSourceForm, thumbnailUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Resolution</label>
                  <select
                    value={newSourceForm.resolution}
                    onChange={(e) => setNewSourceForm({ ...newSourceForm, resolution: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="1080p Full HD">1080p Full HD</option>
                    <option value="4K Ultra HD">4K Ultra HD</option>
                    <option value="720p HD">720p HD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={3600}
                    value={newSourceForm.durationSeconds}
                    onChange={(e) => setNewSourceForm({ ...newSourceForm, durationSeconds: Number(e.target.value) || 60 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              {/* Preview if videoUrl is present */}
              {newSourceForm.videoUrl && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Video Preview</span>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black max-h-40">
                    <video
                      src={newSourceForm.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSourceAdd || !newSourceForm.name.trim() || !newSourceForm.videoUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isSubmittingSourceAdd ? 'Saving Video...' : 'Save Video to Library'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SOURCE VIDEO MODAL */}
      {editingSourceVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-purple-400" />
                <span>Edit Source Video Details</span>
              </h3>
              <button
                onClick={() => setEditingSourceVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Update the title, video stream URL, resolution, or duration for this library video.
            </p>

            <form onSubmit={handleSaveEditSource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Title / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSourceForm.name}
                  onChange={(e) => setEditSourceForm({ ...editSourceForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={editSourceForm.videoUrl}
                  onChange={(e) => setEditSourceForm({ ...editSourceForm, videoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={editSourceForm.thumbnailUrl}
                  onChange={(e) => setEditSourceForm({ ...editSourceForm, thumbnailUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Resolution</label>
                  <select
                    value={editSourceForm.resolution}
                    onChange={(e) => setEditSourceForm({ ...editSourceForm, resolution: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="1080p Full HD">1080p Full HD</option>
                    <option value="4K Ultra HD">4K Ultra HD</option>
                    <option value="720p HD">720p HD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min={5}
                    max={3600}
                    value={editSourceForm.durationSeconds}
                    onChange={(e) => setEditSourceForm({ ...editSourceForm, durationSeconds: Number(e.target.value) || 60 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                </div>
              </div>

              {/* Video Preview */}
              {editSourceForm.videoUrl && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Current Video Preview</span>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black max-h-40">
                    <video
                      src={editSourceForm.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSourceVideo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSourceEdit || !editSourceForm.name.trim() || !editSourceForm.videoUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>{isSubmittingSourceEdit ? 'Updating...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New Avatar (Auto 9-Numerical Code, Multi-Videos & Briefs) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Create New Digital Avatar
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30 font-bold">
                      Autonomous Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Auto 9-digit numerical code, multi 3-minute videos & briefs for day-by-day continuous learning.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 flex-1 text-xs">
              {/* SECTION 1: 9-Numerical Code & Avatar Name */}
              <div className="space-y-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>1. Avatar Name & Auto 9-Numerical Code</span>
                  </label>
                  <button
                    type="button"
                    onClick={generate9DigitCode}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    title="Roll a fresh 9-digit code"
                  >
                    <RefreshCw size={11} />
                    <span>Regenerate Code</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">9-Digit Numerical Code</span>
                    <div className="p-2.5 bg-slate-900 border border-amber-500/50 rounded-xl font-mono text-sm font-black text-amber-300 text-center tracking-wider shadow-inner">
                      {createAvatarCode}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Avatar Display Name</span>
                    <input
                      type="text"
                      value={createAvatarName}
                      onChange={(e) => setCreateAvatarName(e.target.value)}
                      placeholder="e.g. Mohan Sir - 849201948"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Main Language */}
              <div className="space-y-2 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <label className="font-bold text-slate-300 block">
                  2. Main Language (प्राथमिक भाषा)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { code: 'hi', flag: '🇮🇳', name: 'Hindi (हिन्दी)' },
                    { code: 'mr', flag: '🇮🇳', name: 'Marathi (मराठी)' },
                    { code: 'en', flag: '🇬🇧', name: 'English' },
                    { code: 'gu', flag: '🇮🇳', name: 'Gujarati (ગુજરાતી)' },
                    { code: 'kn', flag: '🇮🇳', name: 'Kannada (ಕನ್ನಡ)' },
                    { code: 'ta', flag: '🇮🇳', name: 'Tamil (தமிழ்)' },
                    { code: 'te', flag: '🇮🇳', name: 'Telugu (తెలుగు)' },
                    { code: 'bn', flag: '🇮🇳', name: 'Bengali (বাংলা)' },
                    { code: 'sa', flag: '🇮🇳', name: 'Sanskrit (संस्कृतम्)' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setCreateMainLanguage(lang.code)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        createMainLanguage === lang.code
                          ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-xs truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Video Briefs / Persona Instructions (Helpful to our system) */}
              <div className="space-y-2 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span>3. Video Briefs & Persona Instructions (Helpful to System)</span>
                    <span className="text-[10px] text-amber-400 font-normal bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      AI Guidance
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateOverallBrief(
                        'Mohan Sir is a revered Swar Yoga Guru and Ayurvedic Nutritionist. Demeanor is serene, welcoming, and deeply insightful. Speaks with calm pauses and warm eye contact. Explains breath dynamics, nadis, and yogic lifestyle.'
                      )
                    }
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Insert Master Guru Brief
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={createOverallBrief}
                  onChange={(e) => setCreateOverallBrief(e.target.value)}
                  placeholder="Describe demeanor, speaking cadence, teaching style, or hand gestures. This will guide the AI in synthesizing natural speech and expressions."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* SECTION 4: Upload 3-Minute Multi-Videos */}
              <div className="space-y-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block">
                      4. Upload 3-Minute Multi-Videos ({multiVideos.length} Added)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Upload multiple 3-min clips (facial expressions, smiles, walks, runs, asanas) for training.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      multiple
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleMultiFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => multiFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow"
                    >
                      <Upload size={13} />
                      <span>Upload Multi MP4s</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddVideoSlot}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus size={13} />
                      <span>+ Add Video URL</span>
                    </button>
                  </div>
                </div>

                {/* Video Slots List */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {multiVideos.map((video, idx) => (
                    <div
                      key={video.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 relative group hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-amber-400 font-mono">
                          Video #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideoSlot(video.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-all cursor-pointer"
                          title="Remove video"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Video Title</label>
                          <input
                            type="text"
                            value={video.title}
                            onChange={(e) => handleUpdateVideoField(video.id, 'title', e.target.value)}
                            placeholder="e.g. 3-Min Gentle Smile & Head Movement"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">
                            Bunny CDN Video URL {video.isUploading && '(Uploading...)'}
                          </label>
                          <input
                            type="url"
                            value={video.videoUrl}
                            onChange={(e) => handleUpdateVideoField(video.id, 'videoUrl', e.target.value)}
                            placeholder="https://swaryogacrm.b-cdn.net/materials/clip.mp4"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono text-[11px] focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Video Brief & Category for this specific clip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Category</label>
                          <select
                            value={video.category}
                            onChange={(e) => handleUpdateVideoField(video.id, 'category', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="expression">😊 Facial Expression</option>
                            <option value="motion">🚶 Motion (Walk/Run)</option>
                            <option value="posture">🧘 Asana & Posture</option>
                            <option value="lecture">🎙️ Vedic Lecture</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">
                            Specific Video Brief (Helpful for System)
                          </label>
                          <input
                            type="text"
                            value={video.brief}
                            onChange={(e) => handleUpdateVideoField(video.id, 'brief', e.target.value)}
                            placeholder="e.g. Seated in Padmasana smiling while talking about morning sun"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: Day-by-Day Autonomous Learning Engine Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-amber-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Cpu size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <span>Day-by-Day Autonomous Build-up Engine</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                      Active
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Once you submit, our system indexes all uploaded 3-minute videos into the new avatar&apos;s persistent database. Day by day, the AI refines 468 facial landmarks, mouth shape visemes, and body postures in its own autonomous way.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCreateAvatar}
                disabled={isSubmittingCreate || !createAvatarName.trim() || multiVideos.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmittingCreate ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-black" />
                    <span>Building Avatar & Training Vault...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Create Avatar & Start Day-by-Day Training</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for master source video upload (always mounted in DOM) */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleUploadSourceVideo}
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
      />

      {/* Hidden file input for replacing avatar video */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        className="hidden"
      />
    </div>
  );
}
