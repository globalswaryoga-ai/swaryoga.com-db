'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Check,
  Film,
  Presentation,
  Video,
  Layers,
  ArrowRight,
  Eye,
  Sliders,
  Send,
  Upload,
  Info,
  XCircle,
  RefreshCw,
  Search,
  Move,
  Maximize2,
  Minimize2,
  Volume2,
  Image as ImageIcon,
  Compass,
  Sun,
  ShieldCheck,
  CheckSquare,
  Square,
  Copy,
  FolderOpen,
  Download,
  AlertTriangle,
  FileText,
  Music,
  Globe,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import {
  CustomAnimationProject,
  StoryboardChunk,
  SceneObject3D,
  MediaTrackItem,
  ApprovalChecklist,
  RenderJob,
} from '@/lib/bunnyCustomAnimationRepository';
import { ASSET_LIBRARY_CATALOG } from '@/app/api/avatar/custom-animation/route';
import { CustomAnimation3DStage } from './CustomAnimation3DStage';

const DEFAULT_WATER_PROJECT: CustomAnimationProject = {
  id: 'proj_water_drinking_30s_master',
  title: 'पानी पीने की क्रिया (Water Drinking 30s Master)',
  topic: 'पानी पीने की क्रिया (Water Drinking Animation)',
  category: 'daily_health',
  durationSeconds: 30,
  fps: 60,
  resolution: '1080p',
  aspectRatio: '16:9',
  format: 'mp4',
  needfulThings: [
    'Crystal Glass (कांच का गिलास)',
    'Pure Water (स्वच्छ जल)',
    'Water Jug (पानी का जग)',
    'Wooden Table (मेज)',
  ],
  chunks: [
    {
      chunkIndex: 1,
      timeRange: '00:00s - 00:05s',
      startSecond: 0,
      endSecond: 5,
      actionText: 'एक टेबल दिखाई देगी, उस पर खाली स्वच्छ कांच का गिलास रखा होगा।',
      movementStartToEnd: 'कैमरा सामने से धीरे-धीरे आगे बढ़ता है। खाली गिलास स्थिर केंद्र में है। 0s पर टेबल की लकड़ी की सतह और कांच की शुद्धता दिखती है, 5s पर जग का छायांकन आरंभ होता है।',
      cameraDirection: 'Front eye-level slow tracking in 10%',
      lightingEnvironment: 'Warm Vedic dawn sunlight with sparkling reflections on crystal glass',
      endStateDescription: 'कांच का गिलास टेबल पर स्थिर, पूर्ण तैयार अवस्था में।',
      visualPrompt: 'Cinematic 4K empty crystal glass sitting on rustic teakwood table, radiant morning sunbeams, Octane Render 3D.',
      objects: [
        { id: 'obj_1_1', name: 'Wooden Table (मेज)', category: 'daily_objects', posX: 0, posY: -0.6, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 2.0, speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade', startSec: 0, endSec: 5 },
        { id: 'obj_1_2', name: 'Crystal Glass (कांच का गिलास)', category: 'daily_objects', posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0, speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade', startSec: 0, endSec: 5 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
    {
      chunkIndex: 2,
      timeRange: '00:06s - 00:10s',
      startSecond: 6,
      endSecond: 10,
      actionText: 'पानी का जग स्क्रीन में आएगा और गिलास में अमृत समान शुद्ध जल भरेगा।',
      movementStartToEnd: 'पानी का जग दाईं ओर से 30° झुकाव के साथ अंदर आता है। पानी की धारा गिलास में गिरती है, सूक्ष्म बुलबुले बनते हैं। 6s पर जल प्रवाह आरंभ ➔ 10s पर गिलास 80% जल से भरा, जग वापस बाहर जाता है।',
      cameraDirection: 'Slight high-angle 45° macro zoom on the glass opening',
      lightingEnvironment: 'Morning sunlight refracting through cascading crystal water stream',
      endStateDescription: 'कांच का गिलास शुद्ध जल से भरा हुआ, सतह पर शांत रिपल्स।',
      visualPrompt: 'Cinematic 4K macro shot of water jug pouring sparkling mineral water into crystal glass, glowing sunlit caustics.',
      objects: [
        { id: 'obj_2_1', name: 'Water Jug (पानी का जग)', category: 'daily_objects', posX: 1.2, posY: 0.8, posZ: 0, rotX: 0, rotY: 0, rotZ: -30, scale: 1.2, speed: 'normal', direction: 'left', path: 'curved', entry: 'move', exit: 'move', startSec: 6, endSec: 10 },
        { id: 'obj_2_2', name: 'Pure Water (स्वच्छ जल)', category: 'daily_objects', posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0, speed: 'normal', direction: 'down', path: 'straight', entry: 'fade', exit: 'fade', startSec: 6, endSec: 10 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
    {
      chunkIndex: 3,
      timeRange: '00:11s - 00:15s',
      startSecond: 11,
      endSecond: 15,
      actionText: 'एक हाथ गिलास की तरफ बढ़ेगा और उसे कोमलता से पकड़ेगा।',
      movementStartToEnd: 'मानव हाथ बाईं ओर से आगे बढ़ता है, उंगलियां गिलास के चारों ओर संतुलित पकड़ बनाती हैं। 11s पर हाथ का प्रवेश ➔ 15s पर अंगूठा और उंगलियां गिलास को सुरक्षित उठाना आरंभ करती हैं।',
      cameraDirection: 'Side angle close-up focusing on yogic hand grip and fingertips',
      lightingEnvironment: 'Soft natural daylight emphasizing peaceful mindfulness',
      endStateDescription: 'हाथ ने गिलास को पूर्ण रूप से पकड़ लिया है, उठने के लिए तैयार।',
      visualPrompt: 'Cinematic 4K side angle of a yogic hand gently gripping crystal glass filled with water, serene focus.',
      objects: [
        { id: 'obj_3_1', name: 'Human Yogi Avatar (मानव हाथ)', category: 'human_body', posX: -0.8, posY: 0.1, posZ: 0, rotX: 0, rotY: 30, rotZ: 0, scale: 1.0, speed: 'slow', direction: 'right', path: 'straight', entry: 'move', exit: 'fade', startSec: 11, endSec: 15 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
    {
      chunkIndex: 4,
      timeRange: '00:16s - 00:20s',
      startSecond: 16,
      endSecond: 20,
      actionText: 'हाथ गिलास को धीरे-धीरे ऊपर उठाकर मुंह तक लेकर जाएगा।',
      movementStartToEnd: 'गिलास टेबल से ऊपर उठता है (Y-अक्ष गति), हाथ धीरे-धीरे ऊपर उठता है। 16s पर टेबल छूटती है ➔ 20s पर गिलास मुंह के निकट पहुंचता है।',
      cameraDirection: 'Vertical crane tilt up from table to face profile',
      lightingEnvironment: 'Warm contemplative glow on face and water surface',
      endStateDescription: 'गिलास होठों के समीप 45° झुकाव की मुद्रा में स्थित।',
      visualPrompt: 'Cinematic 4K medium profile shot of hand raising water glass toward serene peaceful mouth, soft dawn rim light.',
      objects: [
        { id: 'obj_4_1', name: 'Crystal Glass (कांच का गिलास)', category: 'daily_objects', posX: 0, posY: 0.5, posZ: 0, rotX: 15, rotY: 0, rotZ: 0, scale: 1.0, speed: 'slow', direction: 'up', path: 'curved', entry: 'move', exit: 'fade', startSec: 16, endSec: 20 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
    {
      chunkIndex: 5,
      timeRange: '00:21s - 00:25s',
      startSecond: 21,
      endSecond: 25,
      actionText: 'व्यक्ति घूंट-घूंट कर जल पीता हुआ दिखाई देगा, आंतरिक ऊर्जा सक्रिय होगी।',
      movementStartToEnd: 'गिलास थोड़ा और झुकता है, जल की बूंदें अंदर प्रवेश करती हैं। व्यक्ति के गले में निगलने की कोमल गति होती है। 21s पर प्रथम घूंट ➔ 25s पर जल स्तर आधा घटता है।',
      cameraDirection: 'Intimate profile close-up with subtle internal bioluminescent glow',
      lightingEnvironment: 'Ethereal pranic glow spreading through throat and chest',
      endStateDescription: 'जल का संतोषजनक सेवन संपन्न, मुख पर शांति व कृतज्ञता।',
      visualPrompt: 'Cinematic 4K mindful water drinking, refreshing vitality and gentle golden light aura illuminating the throat and chest.',
      objects: [
        { id: 'obj_5_1', name: 'Pure Water (स्वच्छ जल)', category: 'daily_objects', posX: 0, posY: 0.4, posZ: 0, rotX: 30, rotY: 0, rotZ: 0, scale: 0.8, speed: 'slow', direction: 'down', path: 'straight', entry: 'fade', exit: 'fade', startSec: 21, endSec: 25 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
    {
      chunkIndex: 6,
      timeRange: '00:26s - 00:30s',
      startSecond: 26,
      endSecond: 30,
      actionText: 'गिलास वापस टेबल पर रखा जाएगा और कैमरा धीरे-धीरे पीछे जाएगा (समापन)।',
      movementStartToEnd: 'हाथ गिलास को नीचे टेबल पर वापस लाता है। टेबल पर कोमलता से रखने का स्पर्श। 26s पर गिलास टेबल पर स्थिर ➔ 30s पर कैमरा वाइड शॉट में पीछे जाता है।',
      cameraDirection: 'Slow pull back wide reveal shot',
      lightingEnvironment: 'Bright expansive morning sunshine filling the serene room',
      endStateDescription: 'टेबल पर रखा आधा गिलास, पृष्ठभूमि में शांत ध्यानमय वातावरण।',
      visualPrompt: 'Cinematic 4K wide pull back shot of peaceful morning tea table with water glass, expansive tranquil atmosphere, masterpiece.',
      objects: [
        { id: 'obj_6_1', name: 'Wooden Table (मेज)', category: 'daily_objects', posX: 0, posY: -0.6, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 2.0, speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade', startSec: 26, endSec: 30 },
        { id: 'obj_6_2', name: 'Crystal Glass (कांच का गिलास)', category: 'daily_objects', posX: 0, posY: 0, posZ: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1.0, speed: 'normal', direction: 'forward', path: 'straight', entry: 'appear', exit: 'fade', startSec: 26, endSec: 30 },
      ],
      needfulThings: ['Crystal Glass', 'Pure Water', 'Water Jug', 'Wooden Table'],
      assetType: 'ai_4k',
      status: 'draft',
    },
  ],
  mediaTracks: [
    {
      id: 'track_3d_main',
      type: '3d_animation',
      title: 'Primary 3D & 4K Animation Layer',
      url: '',
      startSec: 0,
      endSec: 30,
      layerIndex: 1,
    },
  ],
  approvalChecklist: {
    script: 'pending',
    objects: 'pending',
    motion: 'pending',
    timeline: 'pending',
    camera: 'pending',
    audio: 'pending',
    adminNotes: 'AI draft generated. Awaiting Admin review and formal approval.',
  },
  approvalStatus: 'ready_for_approval',
  approvalHistory: [],
  renderJob: {
    jobId: 'job_init',
    status: 'idle',
    progress: 0,
    durationSeconds: 30,
    resolution: '1080p',
    aspectRatio: '16:9',
    format: 'mp4',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function CustomAnimationStudio() {
  // --- PHASE 1: CREATE ANIMATION & PROJECT STATE ---
  const [topicInput, setTopicInput] = useState<string>(
    'पानी पीने की क्रिया (Water Drinking Animation)'
  );
  const [viewportMode, setViewportMode] = useState<'3d_webgl' | '4k_master'>('3d_webgl');
  const [projectCategory, setProjectCategory] = useState<'daily_health' | 'yoga_pranayama' | 'human_anatomy' | 'panchakarma' | 'general'>('daily_health');
  const [durationSeconds, setDurationSeconds] = useState<number>(30); // 1 to 30
  const [selectedFps, setSelectedFps] = useState<number>(60);
  const [selectedResolution, setSelectedResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm'>('mp4');

  const [needfulThings, setNeedfulThings] = useState<string[]>([
    'Crystal Glass (कांच का गिलास)',
    'Pure Water (स्वच्छ जल)',
    'Water Jug (पानी का जग)',
    'Wooden Table (मेज)',
  ]);
  const [newPropInput, setNewPropInput] = useState<string>('');
  const [editingPropIdx, setEditingPropIdx] = useState<number | null>(null);
  const [editingPropValue, setEditingPropValue] = useState<string>('');

  // Active Storyboard Project (Pre-seeded with default water drinking project for instant load)
  const [activeProject, setActiveProject] = useState<CustomAnimationProject | null>(DEFAULT_WATER_PROJECT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderCountdown, setRenderCountdown] = useState<number>(20);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // AI Generation Progress & Pending Time Countdown
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationCountdown, setGenerationCountdown] = useState<number>(6.5);
  const [generationStep, setGenerationStep] = useState<string>('Analyzing narrative & props...');

  // Active UI View Tab (Phase 11: Modular Zones)
  const [activeTab, setActiveTab] = useState<'scenes' | 'objects' | 'timeline' | 'media' | 'approval' | 'render'>('scenes');
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);

  // --- PHASE 3 & 4: 3D OBJECTS & MOVEMENT ENGINE ---
  const [objectSearch, setObjectSearch] = useState<string>('');
  const [selectedObjectCategory, setSelectedObjectCategory] = useState<string>('daily_objects');
  const [editingObject, setEditingObject] = useState<SceneObject3D | null>(null);

  // --- ONLINE 3D ASSETS ENGINE (POLY HAVEN & SKETCHFAB) ---
  const [assetSource, setAssetSource] = useState<'all' | 'swar_yoga' | 'polyhaven' | 'sketchfab'>('all');
  const [online3DAssets, setOnline3DAssets] = useState<any[]>([]);
  const [isSearching3D, setIsSearching3D] = useState<boolean>(false);
  const [importingAssetId, setImportingAssetId] = useState<string | null>(null);
  const [preview3DAsset, setPreview3DAsset] = useState<any | null>(null);

  // Fetch online 3D assets with debounce
  useEffect(() => {
    let isCancelled = false;
    const fetchAssets = async () => {
      setIsSearching3D(true);
      try {
        const q = objectSearch.trim();
        const res = await fetch(`/api/avatar/custom-animation/assets?q=${encodeURIComponent(q)}&source=${assetSource}`);
        const data = await res.json();
        if (!isCancelled && data.success) {
          setOnline3DAssets(data.assets || []);
        }
      } catch (err) {
        console.error('Error fetching 3D assets:', err);
      } finally {
        if (!isCancelled) setIsSearching3D(false);
      }
    };

    const timer = setTimeout(fetchAssets, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [objectSearch, assetSource]);

  // --- PHASE 6: MEDIA IMPORT (VIDEO, PPT, IMAGE, AUDIO) ---
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [uploadMediaType, setUploadMediaType] = useState<'video' | 'ppt' | 'image' | 'audio'>('video');
  const [uploadStartSec, setUploadStartSec] = useState<number>(0);
  const [uploadEndSec, setUploadEndSec] = useState<number>(10);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [customMediaUrl, setCustomMediaUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PHASE 7: PLAYBACK & TIMELINE PREVIEW ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // 60 FPS simulation loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          const maxDur = activeProject?.durationSeconds || durationSeconds;
          if (prev >= maxDur - 0.2) {
            setIsPlaying(false);
            return maxDur;
          }
          return parseFloat((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeProject, durationSeconds]);

  // Handle Add Prop
  const handleAddProp = () => {
    if (!newPropInput.trim()) return;
    if (!needfulThings.includes(newPropInput.trim())) {
      setNeedfulThings([...needfulThings, newPropInput.trim()]);
    }
    setNewPropInput('');
  };

  const handleRemoveProp = (prop: string) => {
    setNeedfulThings(needfulThings.filter((p) => p !== prop));
  };

  const handleStartEditProp = (idx: number, propText: string) => {
    setEditingPropIdx(idx);
    setEditingPropValue(propText);
  };

  const handleSaveEditProp = (idx: number) => {
    if (!editingPropValue.trim()) return;
    const updated = [...needfulThings];
    updated[idx] = editingPropValue.trim();
    setNeedfulThings(updated);
    setEditingPropIdx(null);
    setEditingPropValue('');
  };

  const handleCancelEditProp = () => {
    setEditingPropIdx(null);
    setEditingPropValue('');
  };

  const handleClearProject = () => {
    if (confirm('Are you sure you want to delete or reset this animation project?')) {
      setActiveProject(null);
      setRenderedUrl(null);
      setCurrentTime(0);
      setActiveChunkIndex(0);
    }
  };

  // --- PHASE 2: AI SCRIPT & STORYBOARD GENERATION ---
  const handleCreateAnimation = async () => {
    if (!topicInput.trim()) return;
    setIsGenerating(true);
    setGenerationProgress(8);
    setGenerationCountdown(6.5);
    setGenerationStep('1/4 Analyzing topic narrative & props...');
    setRenderError(null);

    const startTime = Date.now();
    const estDurationMs = 6500; // estimated 6.5 seconds

    const genTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / estDurationMs) * 92) + 5);
      const remainingSec = Math.max(0.4, Number(((estDurationMs - elapsed) / 1000).toFixed(1)));
      setGenerationProgress(pct);
      setGenerationCountdown(remainingSec);

      if (elapsed < 1800) {
        setGenerationStep('1/4 Analyzing topic narrative & props...');
      } else if (elapsed < 3600) {
        setGenerationStep('2/4 Calculating 3D camera kinematics & angles...');
      } else if (elapsed < 5200) {
        setGenerationStep('3/4 Sequencing 5-second scene choreography...');
      } else {
        setGenerationStep('4/4 Finalizing 3D objects & timeline breakdown...');
      }
    }, 100);

    try {
      const res = await fetch('/api/avatar/custom-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          category: projectCategory,
          durationSeconds,
          fps: selectedFps,
          resolution: selectedResolution,
          aspectRatio: selectedAspectRatio,
          format: selectedFormat,
          needfulThings,
        }),
      });
      const data = await res.json();
      clearInterval(genTimer);

      if (data.success && data.data) {
        setGenerationProgress(100);
        setGenerationCountdown(0);
        setGenerationStep('✅ Storyboard Generated! Loading 3D Studio...');
        setActiveProject(data.data);
        setCurrentTime(0);
        setIsPlaying(false);
        setActiveChunkIndex(0);
        setRenderedUrl(null);
      } else {
        setRenderError(data.error || 'Failed to generate animation script.');
      }
    } catch (err: any) {
      clearInterval(genTimer);
      console.error('Failed to create animation storyboard:', err);
      setRenderError(err?.message || 'Error creating animation storyboard');
    } finally {
      clearInterval(genTimer);
      setTimeout(() => {
        setIsGenerating(false);
      }, 400);
    }
  };

  // Add a New Chunk (Scene)
  const handleAddChunk = () => {
    if (!activeProject) return;
    const currentChunks = activeProject.chunks || [];
    const newIdx = currentChunks.length + 1;
    const startSec = currentChunks.length * 5;
    const endSec = (currentChunks.length + 1) * 5;
    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
    };

    const newChunk: StoryboardChunk = {
      chunkIndex: newIdx,
      startSecond: startSec,
      endSecond: endSec,
      timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
      actionText: `Scene ${newIdx}: Action choreography and object interaction.`,
      movementStartToEnd: `Camera smooth transition into Scene ${newIdx}.`,
      cameraDirection: 'Front center eye-level smooth pan',
      lightingEnvironment: 'Warm cinematic studio 3-point key lighting with soft fill and rim highlights',
      endStateDescription: `End state of scene ${newIdx}`,
      objects: [],
      needfulThings: [...needfulThings],
      visualPrompt: `Ultra-high-definition cinematic 3D render of scene ${newIdx}`,
      assetType: 'ai_4k',
      status: 'draft',
    };

    const updatedChunks = [...currentChunks, newChunk];
    const newDuration = updatedChunks.length * 5;
    setDurationSeconds(newDuration);

    const wasApproved = activeProject.approvalStatus === 'approved';
    const updatedProject: CustomAnimationProject = {
      ...activeProject,
      durationSeconds: newDuration,
      chunks: updatedChunks,
      approvalStatus: wasApproved ? 'ready_for_approval' : activeProject.approvalStatus,
      approvalHistory: wasApproved
        ? [
            ...activeProject.approvalHistory,
            {
              action: 'invalidated',
              timestamp: new Date().toISOString(),
              notes: `New Scene ${newIdx} added. Re-approval required.`,
            },
          ]
        : activeProject.approvalHistory,
    };

    setActiveProject(updatedProject);
    setActiveChunkIndex(updatedChunks.length - 1);
    saveProjectToServer(updatedProject, false);
  };

  // Delete a Chunk (Scene)
  const handleDeleteChunk = (chunkIdx: number) => {
    if (!activeProject) return;
    if (activeProject.chunks.length <= 1) {
      alert('At least one scene is required in the animation.');
      return;
    }

    const filtered = activeProject.chunks.filter((_, idx) => idx !== chunkIdx);
    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
    };

    const reindexedChunks: StoryboardChunk[] = filtered.map((c, idx) => {
      const startSec = idx * 5;
      const endSec = (idx + 1) * 5;
      return {
        ...c,
        chunkIndex: idx + 1,
        startSecond: startSec,
        endSecond: endSec,
        timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
      };
    });

    const newDuration = reindexedChunks.length * 5;
    setDurationSeconds(newDuration);

    const wasApproved = activeProject.approvalStatus === 'approved';
    const updatedProject: CustomAnimationProject = {
      ...activeProject,
      durationSeconds: newDuration,
      chunks: reindexedChunks,
      approvalStatus: wasApproved ? 'ready_for_approval' : activeProject.approvalStatus,
      approvalHistory: wasApproved
        ? [
            ...activeProject.approvalHistory,
            {
              action: 'invalidated',
              timestamp: new Date().toISOString(),
              notes: `Scene ${chunkIdx + 1} deleted. Re-approval required.`,
            },
          ]
        : activeProject.approvalHistory,
    };

    setActiveProject(updatedProject);
    if (activeChunkIndex >= reindexedChunks.length) {
      setActiveChunkIndex(Math.max(0, reindexedChunks.length - 1));
    }
    saveProjectToServer(updatedProject, false);
  };

  // Duplicate a Chunk (Scene)
  const handleDuplicateChunk = (chunkIdx: number) => {
    if (!activeProject) return;
    const sourceChunk = activeProject.chunks[chunkIdx];
    if (!sourceChunk) return;

    const clonedObjects = (sourceChunk.objects || []).map((o) => ({
      ...o,
      id: `${o.id}_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    const clonedChunk: StoryboardChunk = {
      ...sourceChunk,
      actionText: `${sourceChunk.actionText} (Copy)`,
      objects: clonedObjects,
    };

    const newChunks = [...activeProject.chunks];
    newChunks.splice(chunkIdx + 1, 0, clonedChunk);

    const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
    };

    const reindexedChunks: StoryboardChunk[] = newChunks.map((c, idx) => {
      const startSec = idx * 5;
      const endSec = (idx + 1) * 5;
      return {
        ...c,
        chunkIndex: idx + 1,
        startSecond: startSec,
        endSecond: endSec,
        timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
      };
    });

    const newDuration = reindexedChunks.length * 5;
    setDurationSeconds(newDuration);

    const wasApproved = activeProject.approvalStatus === 'approved';
    const updatedProject: CustomAnimationProject = {
      ...activeProject,
      durationSeconds: newDuration,
      chunks: reindexedChunks,
      approvalStatus: wasApproved ? 'ready_for_approval' : activeProject.approvalStatus,
      approvalHistory: wasApproved
        ? [
            ...activeProject.approvalHistory,
            {
              action: 'invalidated',
              timestamp: new Date().toISOString(),
              notes: `Scene ${chunkIdx + 1} duplicated. Re-approval required.`,
            },
          ]
        : activeProject.approvalHistory,
    };

    setActiveProject(updatedProject);
    setActiveChunkIndex(chunkIdx + 1);
    saveProjectToServer(updatedProject, false);
  };

  // Update a Chunk (With automatic approval invalidation warning if previously approved)
  const handleUpdateChunk = (chunkIdx: number, patch: Partial<StoryboardChunk>) => {
    if (!activeProject) return;
    const wasApproved = activeProject.approvalStatus === 'approved';

    const updatedChunks = activeProject.chunks.map((c, idx) => {
      if (idx === chunkIdx) {
        return { ...c, ...patch };
      }
      return c;
    });

    const updatedProject: CustomAnimationProject = {
      ...activeProject,
      chunks: updatedChunks,
      approvalStatus: wasApproved ? 'ready_for_approval' : activeProject.approvalStatus,
      approvalHistory: wasApproved
        ? [
            ...activeProject.approvalHistory,
            {
              action: 'invalidated',
              timestamp: new Date().toISOString(),
              notes: `Scene ${chunkIdx + 1} edited. Approval has been invalidated. Re-approval required.`,
            },
          ]
        : activeProject.approvalHistory,
    };

    setActiveProject(updatedProject);
    // Background sync to Edge SQL
    saveProjectToServer(updatedProject, false);
  };

  // --- PHASE 3 & 4: ADD & MANAGE 3D OBJECTS ---
  const handleAddObjectToChunk = (objName: string, category: any, modelUrl?: string) => {
    if (!activeProject) return;
    const targetChunk = activeProject.chunks[activeChunkIndex];
    if (!targetChunk) return;

    const newObj: SceneObject3D = {
      id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: objName,
      category,
      modelUrl: modelUrl || undefined,
      posX: 0,
      posY: 0,
      posZ: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      scale: 1.0,
      speed: 'normal',
      direction: 'forward',
      path: 'straight',
      entry: 'fade',
      exit: 'fade',
      startSec: targetChunk.startSecond,
      endSec: targetChunk.endSecond,
    };

    const updatedObjects = [...(targetChunk.objects || []), newObj];
    handleUpdateChunk(activeChunkIndex, { objects: updatedObjects });
    setEditingObject(newObj);
  };

  const handleImportOnline3DAsset = async (asset: any) => {
    setImportingAssetId(asset.id);
    try {
      const res = await fetch('/api/avatar/custom-animation/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: asset.source,
          assetId: asset.id,
          rawKey: asset.rawKey,
          name: asset.name,
          directDownloadUrl: asset.modelUrl || asset.downloadUrl,
        }),
      });
      const data = await res.json();
      if (data.success && data.cdnUrl) {
        handleAddObjectToChunk(asset.name, 'custom_glb', data.cdnUrl);
      } else {
        handleAddObjectToChunk(asset.name, asset.category || 'daily_objects', asset.modelUrl || '');
      }
    } catch (err: any) {
      console.error('Import 3D asset error:', err);
      handleAddObjectToChunk(asset.name, asset.category || 'daily_objects', '');
    } finally {
      setImportingAssetId(null);
    }
  };

  const handleUpdateObject = (objId: string, patch: Partial<SceneObject3D>) => {
    if (!activeProject) return;
    const targetChunk = activeProject.chunks[activeChunkIndex];
    if (!targetChunk) return;

    const updatedObjects = (targetChunk.objects || []).map((o) => {
      if (o.id === objId) {
        const mod = { ...o, ...patch };
        if (editingObject?.id === objId) setEditingObject(mod);
        return mod;
      }
      return o;
    });

    handleUpdateChunk(activeChunkIndex, { objects: updatedObjects });
  };

  const handleDeleteObject = (objId: string) => {
    if (!activeProject) return;
    const targetChunk = activeProject.chunks[activeChunkIndex];
    if (!targetChunk) return;

    const filtered = (targetChunk.objects || []).filter((o) => o.id !== objId);
    handleUpdateChunk(activeChunkIndex, { objects: filtered });
    if (editingObject?.id === objId) setEditingObject(null);
  };

  const handleDuplicateObject = (obj: SceneObject3D) => {
    if (!activeProject) return;
    const targetChunk = activeProject.chunks[activeChunkIndex];
    if (!targetChunk) return;

    const duplicated: SceneObject3D = {
      ...obj,
      id: `obj_${Date.now()}_dup`,
      name: `${obj.name} (Copy)`,
      posX: obj.posX + 0.3,
      posY: obj.posY + 0.3,
    };

    const updatedObjects = [...(targetChunk.objects || []), duplicated];
    handleUpdateChunk(activeChunkIndex, { objects: updatedObjects });
    setEditingObject(duplicated);
  };

  // --- PHASE 6: MEDIA FILE UPLOAD TO BUNNY STORAGE ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', uploadMediaType);

      const res = await fetch('/api/avatar/custom-animation/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.fileUrl) {
        const newTrack: MediaTrackItem = {
          id: `track_${Date.now()}`,
          type: uploadMediaType,
          title: uploadTitle.trim() || file.name,
          url: data.fileUrl,
          startSec: Number(uploadStartSec),
          endSec: Number(uploadEndSec),
          layerIndex: (activeProject.mediaTracks?.length || 0) + 1,
        };

        const updatedTracks = [...(activeProject.mediaTracks || []), newTrack];
        const updatedProject = { ...activeProject, mediaTracks: updatedTracks };
        setActiveProject(updatedProject);
        saveProjectToServer(updatedProject, false);
        setUploadTitle('');
        setCustomMediaUrl('');
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add Manual URL Media Track
  const handleAddManualMediaTrack = () => {
    if (!activeProject || !customMediaUrl.trim()) return;
    const newTrack: MediaTrackItem = {
      id: `track_${Date.now()}`,
      type: uploadMediaType,
      title: uploadTitle.trim() || `${uploadMediaType.toUpperCase()} Layer (${uploadStartSec}s-${uploadEndSec}s)`,
      url: customMediaUrl.trim(),
      startSec: Number(uploadStartSec),
      endSec: Number(uploadEndSec),
      layerIndex: (activeProject.mediaTracks?.length || 0) + 1,
    };

    const updatedTracks = [...(activeProject.mediaTracks || []), newTrack];
    const updatedProject = { ...activeProject, mediaTracks: updatedTracks };
    setActiveProject(updatedProject);
    saveProjectToServer(updatedProject, false);
    setUploadTitle('');
    setCustomMediaUrl('');
  };

  const handleDeleteMediaTrack = (trackId: string) => {
    if (!activeProject) return;
    const filtered = (activeProject.mediaTracks || []).filter((t) => t.id !== trackId);
    const updatedProject = { ...activeProject, mediaTracks: filtered };
    setActiveProject(updatedProject);
    saveProjectToServer(updatedProject, false);
  };

  // --- PHASE 8: MANDATORY ADMIN APPROVAL SYSTEM ---
  const handleToggleChecklist = (key: keyof ApprovalChecklist) => {
    if (!activeProject) return;
    const current = activeProject.approvalChecklist[key];
    const next = current === 'approved' ? 'pending' : 'approved';
    const updatedChecklist = { ...activeProject.approvalChecklist, [key]: next };
    const updatedProject = { ...activeProject, approvalChecklist: updatedChecklist };
    setActiveProject(updatedProject);
    saveProjectToServer(updatedProject, false);
  };

  const handleAdminAction = async (action: 'approve' | 'reject' | 'regenerate') => {
    if (!activeProject) return;
    setIsSaving(true);
    setRenderError(null);
    try {
      const res = await fetch('/api/avatar/custom-animation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activeProject,
          adminAction: action,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActiveProject(data.data);
      }
    } catch (err) {
      console.error(`Failed to perform ${action}:`, err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProjectToServer = async (project: CustomAnimationProject, isExplicitApproval: boolean) => {
    try {
      await fetch('/api/avatar/custom-animation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          approvalStatus: project.approvalStatus,
        }),
      });
    } catch (err) {
      console.error('Error saving project to Edge SQL:', err);
    }
  };

  // --- PHASE 9: FINAL RENDERING PIPELINE ---
  const handleStartFinalRender = async () => {
    if (!activeProject) return;
    if (activeProject.approvalStatus !== 'approved') {
      setRenderError('MANDATORY APPROVAL REQUIRED: You must review and click "Approve & Submit" in the Approval Dashboard before final rendering can start.');
      setActiveTab('approval');
      return;
    }

    setIsRendering(true);
    setRenderProgress(10);
    setRenderError(null);

    // Progressive simulated rendering pipeline
    const interval = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 400);

    try {
      const res = await fetch('/api/avatar/custom-animation/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          resolution: selectedResolution,
          aspectRatio: selectedAspectRatio,
          format: selectedFormat,
        }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (data.success && data.data) {
        setRenderProgress(100);
        setActiveProject(data.data);
        setRenderedUrl(data.outputUrl || data.data.renderedVideoUrl);
      } else {
        setRenderError(data.error || 'Rendering pipeline failed');
      }
    } catch (err: any) {
      clearInterval(interval);
      setRenderError(err.message || 'Network error while executing render pipeline');
    } finally {
      setIsRendering(false);
    }
  };

  // Active Chunk & Media Track at CurrentTime
  const currentChunk =
    activeProject?.chunks.find((c) => currentTime >= c.startSecond && currentTime <= c.endSecond) ||
    activeProject?.chunks[0] ||
    null;

  const activeMediaOverlay = activeProject?.mediaTracks?.find(
    (t) => currentTime >= t.startSec && currentTime <= t.endSec
  );

  return (
    <div className="space-y-6">
      {/* PHASE 11: ZONE 1 - TOP PROJECT HEADER & NEW ANIMATION BUTTON */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-extrabold text-[10px] tracking-wider uppercase">
              AI Animation Production Engine
            </span>
            <span className="text-slate-400 text-xs">Production Pipeline • 1–30 Seconds</span>
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>Swar Yoga 3D/4D Animation Studio</span>
          </h2>
          <p className="text-xs text-slate-400">
            Cinema-grade 3D educational animations with multi-track timeline, object physics, and mandatory Admin approval.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setTopicInput('पानी पीने की क्रिया (Water Drinking Animation)');
              setDurationSeconds(30);
              handleCreateAnimation();
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Create New Animation</span>
          </button>

          {activeProject && (
            <button
              onClick={handleClearProject}
              className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Delete or reset this storyboard project"
            >
              <Trash2 size={13} />
              <span>Reset Project</span>
            </button>
          )}

          {activeProject && (
            <div
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                activeProject.approvalStatus === 'approved' || activeProject.approvalStatus === 'rendered'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : activeProject.approvalStatus === 'rejected'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}
            >
              {activeProject.approvalStatus === 'approved' ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Approved (Ready to Render)</span>
                </>
              ) : activeProject.approvalStatus === 'rendered' ? (
                <>
                  <Film size={14} />
                  <span>Rendered & Saved</span>
                </>
              ) : activeProject.approvalStatus === 'rejected' ? (
                <>
                  <XCircle size={14} />
                  <span>Rejected (Editing)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Pending Admin Approval</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PHASE 8: APPROVAL INVALIDATION WARNING BANNER */}
      {activeProject && activeProject.approvalHistory.length > 0 && activeProject.approvalHistory[activeProject.approvalHistory.length - 1].action === 'invalidated' && (
        <div className="p-3.5 bg-amber-950/60 border border-amber-500/60 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <div>
              <strong className="font-extrabold text-amber-300 block">Approval Invalidated Due to Content Edits</strong>
              <span>Changes were made after prior approval. You must review and click "Approve & Submit" in the Approval Dashboard before final rendering.</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('approval')}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] shrink-0 cursor-pointer"
          >
            Review Approval ➔
          </button>
        </div>
      )}

      {/* PHASE 11: ZONE 2 - PROJECT PARAMETERS & PROPS MANAGER */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Topic Input (5 cols) */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              1. Animation Topic & Narrative:
            </label>
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="e.g. पानी पीने की क्रिया या नासिकाग्र मुद्रा प्राणायाम"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          {/* Category (2 cols) */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">Category:</label>
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="daily_health">Daily Health & Water</option>
              <option value="yoga_pranayama">Yoga & Pranayama</option>
              <option value="human_anatomy">Human Anatomy</option>
              <option value="panchakarma">Panchakarma & Detox</option>
              <option value="general">General Vedic</option>
            </select>
          </div>

          {/* Duration Selector: 1 to 30s (3 cols) */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Duration:</span>
              <span className="text-cyan-400 font-mono font-extrabold">{durationSeconds}s Total</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={30}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 w-12 text-center">
                {durationSeconds}s
              </span>
            </div>
            {/* Quick Segment Presets */}
            <div className="flex items-center gap-1">
              {[5, 10, 15, 20, 25, 30].map((s) => (
                <button
                  key={s}
                  onClick={() => setDurationSeconds(s)}
                  className={`flex-1 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    durationSeconds === s
                      ? 'bg-cyan-500 text-black'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          {/* AI Generator Button (2 cols) */}
          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={handleCreateAnimation}
              disabled={isGenerating}
              className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Generate AI Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Needful Things (Props & Elements) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <span>Required Objects & Essential Props (आवश्यक वस्तुएं):</span>
            <span className="text-[10px] text-slate-500 font-normal">
              e.g. water, glass, spoon, table, jug
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {needfulThings.map((prop, idx) => {
              const isEditing = editingPropIdx === idx;
              if (isEditing) {
                return (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-xl bg-slate-950 border border-cyan-500 text-xs text-white flex items-center gap-1.5 shadow"
                  >
                    <input
                      type="text"
                      value={editingPropValue}
                      onChange={(e) => setEditingPropValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditProp(idx);
                        if (e.key === 'Escape') handleCancelEditProp();
                      }}
                      autoFocus
                      className="bg-transparent border-none text-xs text-cyan-200 outline-none w-36"
                    />
                    <button
                      onClick={() => handleSaveEditProp(idx)}
                      className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                      title="Save prop name"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={handleCancelEditProp}
                      className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              }

              return (
                <span
                  key={idx}
                  className="group px-3 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs text-cyan-300 font-medium flex items-center gap-2 shadow"
                >
                  <span>{prop}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditProp(idx, prop)}
                      className="text-slate-500 hover:text-cyan-300 cursor-pointer p-0.5 transition-colors"
                      title="Edit prop name"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => handleRemoveProp(prop)}
                      className="text-slate-500 hover:text-red-400 cursor-pointer p-0.5 transition-colors"
                      title="Delete prop"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </span>
              );
            })}

            {/* Quick Suggestions */}
            {['Glass', 'Water', 'Spoon', 'Jug', 'Table', 'Lungs', 'Chakras', 'Fire'].map(
              (sug) =>
                !needfulThings.includes(sug) && (
                  <button
                    key={sug}
                    onClick={() => setNeedfulThings([...needfulThings, sug])}
                    className="px-2.5 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-white border border-dashed border-slate-700 cursor-pointer"
                  >
                    + {sug}
                  </button>
                )
            )}

            {/* Write-in Input */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newPropInput}
                onChange={(e) => setNewPropInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProp()}
                placeholder="+ Add prop..."
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-28"
              />
              <button
                onClick={handleAddProp}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 11: MAIN STUDIO WORKSPACE (12 COLS) */}
      {activeProject && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: 16:9 4K PREVIEW WINDOW & MULTI-TRACK SCRUBBER (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Bar Outside Canvas */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500 text-black font-extrabold text-[10px]">
                  Scene {activeChunkIndex + 1}
                </span>
                <span className="text-white font-bold truncate max-w-sm">
                  {currentChunk?.timeRange} • {currentChunk?.actionText}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Viewport Mode Switcher */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setViewportMode('3d_webgl')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      viewportMode === '3d_webgl'
                        ? 'bg-cyan-500 text-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌟 3D WebGL Real Movement
                  </button>
                  <button
                    onClick={() => setViewportMode('4k_master')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      viewportMode === '4k_master'
                        ? 'bg-cyan-500 text-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🖼️ 4K Master Cinema
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl font-mono text-cyan-400 font-bold text-xs">
                  <Clock size={12} />
                  <span>
                    00:{currentTime.toFixed(1).padStart(4, '0')}s / 00:
                    {activeProject.durationSeconds.toFixed(1).padStart(4, '0')}s
                  </span>
                </div>
              </div>
            </div>

            {/* 16:9 PREVIEW VIEWPORT (ZERO TEXT OVERLAYS) */}
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
              {/* Layer 1: Rendered Video Output (if rendered) */}
              {renderedUrl ? (
                <video
                  src={renderedUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  controls
                  playsInline
                />
              ) : activeMediaOverlay && activeMediaOverlay.type === 'video' ? (
                /* Layer 2: Attached Video Clip */
                <video
                  src={activeMediaOverlay.url}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : activeMediaOverlay && (activeMediaOverlay.type === 'ppt' || activeMediaOverlay.type === 'image') ? (
                /* Layer 3: PPT / Image Overlay */
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${activeMediaOverlay.url}')` }}
                />
              ) : viewportMode === '3d_webgl' ? (
                /* Layer 4: Real Three.js 3D WebGL Stage with Dynamic Physical Meshes & Movement */
                <CustomAnimation3DStage
                  currentChunk={currentChunk || null}
                  currentTime={currentTime}
                  totalDuration={activeProject.durationSeconds}
                  topic={topicInput}
                  objects={currentChunk?.objects || []}
                  selectedObject={editingObject}
                  onSelectObject={(obj) => setEditingObject(obj)}
                />
              ) : (
                /* Layer 5: 4K Master Visual with Camera Motion */
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-300"
                  style={{
                    backgroundImage: topicInput.includes('जल') || topicInput.includes('water')
                      ? "url('/images/animation-4k/triphala_cosmic_4k.jpg')"
                      : topicInput.includes('फेफड़े') || topicInput.includes('Lungs')
                      ? "url('/images/animation-4k/pranayama_lungs_4k.jpg')"
                      : topicInput.includes('चक्र') || topicInput.includes('Chakra')
                      ? "url('/images/animation-4k/chakras_kundalini_4k.jpg')"
                      : "url('/images/animation-4k/brain_hemispheres_4k.jpg')",
                    transform: `scale(${1.0 + (currentTime / activeProject.durationSeconds) * 0.06})`,
                  }}
                />
              )}
            </div>

            {/* TIMELINE SCRUBBER WITH 5-SECOND SEGMENTS */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              {/* Scrub Track */}
              <div
                className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentTime(parseFloat((pct * activeProject.durationSeconds).toFixed(1)));
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 transition-all duration-75 relative"
                  style={{ width: `${(currentTime / activeProject.durationSeconds) * 100}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* 5-Second Segment Selector Cards */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeProject.chunks.map((chunk, idx) => {
                  const isCurrent = currentTime >= chunk.startSecond && currentTime <= chunk.endSecond;
                  return (
                    <div
                      key={chunk.chunkIndex}
                      onClick={() => {
                        setActiveChunkIndex(idx);
                        setCurrentTime(chunk.startSecond);
                      }}
                      className={`group relative p-2 rounded-xl text-left border transition-all cursor-pointer flex-1 min-w-[95px] ${
                        isCurrent
                          ? 'bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/50 text-white'
                          : activeChunkIndex === idx
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                        <span>Scene {chunk.chunkIndex}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-cyan-400">{chunk.timeRange.split(' - ')[0]}</span>
                          {activeProject.chunks.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChunk(idx);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                              title={`Delete Scene ${chunk.chunkIndex}`}
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] truncate text-slate-300 mt-1">
                        {chunk.actionText.slice(0, 18)}...
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Scene Card Button */}
                <button
                  onClick={handleAddChunk}
                  className="p-2 rounded-xl text-center border border-dashed border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 text-[10px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all min-w-[80px]"
                  title="Add a new 5s scene"
                >
                  <Plus size={13} className="stroke-[2.5]" />
                  <span>+ Scene</span>
                </button>
              </div>

              {/* Playback Controls & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-black" />}
                    <span>{isPlaying ? 'Pause' : currentTime >= activeProject.durationSeconds ? 'Replay' : `Play Full ${activeProject.durationSeconds}s`}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Restart to 0s"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Camera: <strong className="text-cyan-300">{currentChunk?.cameraDirection}</strong>
                </div>
              </div>
            </div>

            {/* PHASE 2: 8-QUESTION SCRIPT BREAKDOWN FOR ACTIVE SEGMENT */}
            {currentChunk && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Info size={14} className="text-cyan-400" />
                    <span>Scene {currentChunk.chunkIndex} AI Script Proposal ({currentChunk.timeRange})</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentChunk.objects?.length || 0} 3D Objects Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      1. क्या दिखाई देगा? (Visual Action):
                    </span>
                    <p className="text-slate-200 font-medium">{currentChunk.actionText}</p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      3 & 4. Objects Movement (Start to End Kinematics):
                    </span>
                    <p className="text-cyan-200">{currentChunk.movementStartToEnd}</p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      6. Camera दिशा व गति (Camera Motion):
                    </span>
                    <p className="text-amber-200">{currentChunk.cameraDirection}</p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      7 & 8. Background & End State:
                    </span>
                    <p className="text-emerald-200">{currentChunk.lightingEnvironment} ➔ {currentChunk.endStateDescription}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: 6 MODULAR CONTROL PANELS (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Zone Switcher Tabs */}
            <div className="grid grid-cols-6 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              {[
                { id: 'scenes', label: 'Scene', icon: Film },
                { id: 'objects', label: '3D Obj', icon: Compass },
                { id: 'timeline', label: 'Tracks', icon: Layers },
                { id: 'media', label: 'Media', icon: Presentation },
                { id: 'approval', label: 'Review', icon: ShieldCheck },
                { id: 'render', label: 'Export', icon: Download },
              ].map((t) => {
                const Icon = t.icon;
                const isSel = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSel
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ZONE 1: SCENE & CHOREOGRAPHY EDITOR */}
            {activeTab === 'scenes' && activeProject.chunks[activeChunkIndex] && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white">
                      Edit Scene {activeProject.chunks[activeChunkIndex].chunkIndex} ({activeProject.chunks[activeChunkIndex].timeRange})
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      Duration: 5s
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleAddChunk}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title="Add a new 5-second scene to the animation"
                    >
                      <Plus size={12} className="stroke-[2.5]" />
                      <span>Add Scene</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateChunk(activeChunkIndex)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title="Duplicate current scene"
                    >
                      <Copy size={11} />
                      <span>Duplicate</span>
                    </button>

                    <button
                      onClick={() => handleDeleteChunk(activeChunkIndex)}
                      disabled={activeProject.chunks.length <= 1}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={activeProject.chunks.length <= 1 ? "At least 1 scene required" : "Delete current scene"}
                    >
                      <Trash2 size={11} />
                      <span>Delete Scene</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Scene Action Text (क्या दिखाई देगा):
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.chunks[activeChunkIndex].actionText}
                    onChange={(e) =>
                      handleUpdateChunk(activeChunkIndex, { actionText: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Movement from Start to End (वस्तुओं व कैमरे की पूरी गति):
                  </label>
                  <textarea
                    rows={3}
                    value={activeProject.chunks[activeChunkIndex].movementStartToEnd}
                    onChange={(e) =>
                      handleUpdateChunk(activeChunkIndex, { movementStartToEnd: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Camera Movement Direction (कैमरा गति):
                  </label>
                  <input
                    type="text"
                    value={activeProject.chunks[activeChunkIndex].cameraDirection}
                    onChange={(e) =>
                      handleUpdateChunk(activeChunkIndex, { cameraDirection: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    End State Description (अंत में क्या दिखाई देगा):
                  </label>
                  <input
                    type="text"
                    value={activeProject.chunks[activeChunkIndex].endStateDescription}
                    onChange={(e) =>
                      handleUpdateChunk(activeChunkIndex, { endStateDescription: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-200"
                  />
                </div>
              </div>
            )}

            {/* ZONE 2: 3D OBJECTS & ASSET LIBRARY (PHASE 3 & 4) */}
            {activeTab === 'objects' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-extrabold text-white">
                    3D Library & Scene {activeChunkIndex + 1} Objects
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {activeProject.chunks[activeChunkIndex]?.objects?.length || 0} in Scene
                  </span>
                </div>

                {/* Online 3D Repository & Asset Explorer */}
                <div className="space-y-3">
                  {/* Source Switcher */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {[
                      { id: 'all', label: '🌐 All Sources' },
                      { id: 'swar_yoga', label: '🧘 Swar Yoga' },
                      { id: 'polyhaven', label: '🌿 Poly Haven (CC0)' },
                      { id: 'sketchfab', label: '🎨 Sketchfab 3D' },
                    ].map((src) => (
                      <button
                        key={src.id}
                        onClick={() => setAssetSource(src.id as any)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-center text-[10px] font-bold cursor-pointer transition-all ${
                          assetSource === src.id
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {src.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar + Quick Filter Chips */}
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={objectSearch}
                        onChange={(e) => setObjectSearch(e.target.value)}
                        placeholder="Search 3D models (stomach, spine, glass, table, lungs, lotus)..."
                        className="w-full pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                      {objectSearch && (
                        <button
                          onClick={() => setObjectSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Quick Query Pills */}
                    <div className="flex flex-wrap gap-1">
                      {['Stomach', 'Spine', 'Lungs', 'Heart', 'Table', 'Water Glass', 'Jug', 'Lotus'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setObjectSearch(tag)}
                          className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-cyan-300 cursor-pointer transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3D Asset Cards Grid */}
                  <div className="max-h-56 overflow-y-auto pr-1 space-y-2">
                    {isSearching3D ? (
                      <div className="p-6 bg-slate-950 rounded-xl text-center space-y-2 border border-slate-800/80">
                        <Loader2 size={18} className="animate-spin text-cyan-400 mx-auto" />
                        <span className="text-[11px] text-slate-400 block font-medium">
                          Searching Poly Haven & Sketchfab repositories...
                        </span>
                      </div>
                    ) : online3DAssets.length === 0 ? (
                      <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500 border border-slate-800">
                        No 3D models found for "{objectSearch}". Try searching for generic items like table, chair, glass, heart, or stomach.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {online3DAssets.map((asset) => {
                          const isImporting = importingAssetId === asset.id;
                          return (
                            <div
                              key={asset.id}
                              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all group"
                            >
                              <div className="space-y-1.5">
                                {/* Thumbnail */}
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                                  {asset.thumbnail ? (
                                    <img
                                      src={asset.thumbnail}
                                      alt={asset.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                                      <Globe size={24} />
                                    </div>
                                  )}
                                  {/* Source Badge */}
                                  <span
                                    className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                      asset.source === 'polyhaven'
                                        ? 'bg-emerald-500 text-black'
                                        : asset.source === 'sketchfab'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-purple-500 text-white'
                                    }`}
                                  >
                                    {asset.source === 'polyhaven'
                                      ? 'CC0 PolyHaven'
                                      : asset.source === 'sketchfab'
                                      ? 'Sketchfab 3D'
                                      : 'Swar Yoga'}
                                  </span>
                                </div>

                                {/* Title & License */}
                                <div>
                                  <div className="text-xs font-bold text-white truncate" title={asset.name}>
                                    {asset.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 truncate">
                                    {asset.license || 'Commercial License'}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 flex items-center gap-1.5 border-t border-slate-900 mt-2">
                                {(asset.embedUrl || asset.thumbnail) && (
                                  <button
                                    onClick={() => setPreview3DAsset(asset)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer text-[10px]"
                                    title="3D Preview"
                                  >
                                    <Eye size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleImportOnline3DAsset(asset)}
                                  disabled={isImporting}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-extrabold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  {isImporting ? (
                                    <>
                                      <Loader2 size={11} className="animate-spin" />
                                      <span>Importing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={11} />
                                      <span>+ Add to Scene</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Objects in Scene with Transform Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-white block">
                    Active Objects in Scene {activeChunkIndex + 1}:
                  </span>

                  {(activeProject.chunks[activeChunkIndex]?.objects || []).length === 0 ? (
                    <div className="p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-500">
                      No 3D objects added yet. Click any asset above to insert.
                    </div>
                  ) : (
                    (activeProject.chunks[activeChunkIndex]?.objects || []).map((obj) => (
                      <div
                        key={obj.id}
                        className={`p-3 rounded-xl border space-y-2 cursor-pointer transition-all ${
                          editingObject?.id === obj.id
                            ? 'bg-cyan-950/30 border-cyan-500/60'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                        onClick={() => setEditingObject(obj)}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                          <span>{obj.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateObject(obj);
                              }}
                              className="text-slate-500 hover:text-cyan-300 cursor-pointer"
                              title="Duplicate object"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteObject(obj.id);
                              }}
                              className="text-slate-500 hover:text-red-400 cursor-pointer"
                              title="Delete object"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Transform Sliders (Position X/Y/Z, Scale, Speed, Path) */}
                        {editingObject?.id === obj.id && (
                          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-slate-400 block text-[9px]">Pos X: {obj.posX}</label>
                                <input
                                  type="range"
                                  min={-3}
                                  max={3}
                                  step={0.1}
                                  value={obj.posX}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { posX: parseFloat(e.target.value) })
                                  }
                                  className="w-full accent-cyan-500"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block text-[9px]">Pos Y: {obj.posY}</label>
                                <input
                                  type="range"
                                  min={-3}
                                  max={3}
                                  step={0.1}
                                  value={obj.posY}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { posY: parseFloat(e.target.value) })
                                  }
                                  className="w-full accent-cyan-500"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block text-[9px]">Scale: {obj.scale}</label>
                                <input
                                  type="range"
                                  min={0.2}
                                  max={3}
                                  step={0.1}
                                  value={obj.scale}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { scale: parseFloat(e.target.value) })
                                  }
                                  className="w-full accent-cyan-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-slate-400 block text-[9px]">Speed</label>
                                <select
                                  value={obj.speed}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { speed: e.target.value as any })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[10px] text-white"
                                >
                                  <option value="slow">Slow</option>
                                  <option value="normal">Normal</option>
                                  <option value="fast">Fast</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-slate-400 block text-[9px]">Direction</label>
                                <select
                                  value={obj.direction}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { direction: e.target.value as any })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[10px] text-white"
                                >
                                  <option value="forward">Forward</option>
                                  <option value="backward">Backward</option>
                                  <option value="left">Left</option>
                                  <option value="right">Right</option>
                                  <option value="up">Up</option>
                                  <option value="down">Down</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-slate-400 block text-[9px]">Path</label>
                                <select
                                  value={obj.path}
                                  onChange={(e) =>
                                    handleUpdateObject(obj.id, { path: e.target.value as any })
                                  }
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[10px] text-white"
                                >
                                  <option value="straight">Straight</option>
                                  <option value="curved">Curved</option>
                                  <option value="circular">Circular</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ZONE 3: MULTI-TRACK TIMELINE INSPECTOR (PHASE 5) */}
            {activeTab === 'timeline' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-extrabold text-white">
                    Multi-Track Timeline View
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {activeProject.durationSeconds}s Total
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Track 1: 3D Animation Base */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} />
                        <span>Track 1: 3D Master Scene</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">0s - {activeProject.durationSeconds}s</span>
                    </div>
                    <div className="h-4 bg-cyan-950/40 rounded-lg border border-cyan-500/30 overflow-hidden relative">
                      <div className="h-full bg-cyan-500/30 w-full flex items-center justify-center text-[9px] text-cyan-200 font-mono">
                        Active 3D Animation & 4K Master Visuals
                      </div>
                    </div>
                  </div>

                  {/* Track 2: External Media Overlays */}
                  {(activeProject.mediaTracks || []).map((t, idx) => (
                    <div key={t.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          {t.type === 'video' ? <Video size={13} /> : t.type === 'ppt' ? <Presentation size={13} /> : <FileText size={13} />}
                          <span>Track {idx + 2}: {t.title}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">{t.startSec}s - {t.endSec}s</span>
                          <button
                            onClick={() => handleDeleteMediaTrack(t.id)}
                            className="text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="h-4 bg-slate-900 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-amber-500/40 border border-amber-400/50 rounded flex items-center justify-center text-[9px] text-amber-100 font-mono absolute"
                          style={{
                            left: `${(t.startSec / activeProject.durationSeconds) * 100}%`,
                            width: `${((t.endSec - t.startSec) / activeProject.durationSeconds) * 100}%`,
                          }}
                        >
                          {t.type.toUpperCase()} ({t.startSec}s-{t.endSec}s)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ZONE 4: IMPORT MEDIA & PPT / VIDEO (PHASE 6) */}
            {activeTab === 'media' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-extrabold text-white">
                    Import Media (Video, PPT, Audio & Images)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Direct Upload
                  </span>
                </div>

                {/* Media Uploader Form */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">Media Type</label>
                      <select
                        value={uploadMediaType}
                        onChange={(e) => setUploadMediaType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="video">🎥 Video (MP4, MOV, WebM)</option>
                        <option value="ppt">📊 Presentation (PPT, PPTX, PDF)</option>
                        <option value="image">🖼️ Image (PNG, JPG, WebP)</option>
                        <option value="audio">🎵 Audio (MP3, WAV, AAC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">Layer Title</label>
                      <input
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. Slide 1 or Mohan Sir Clip"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">Start Time (X sec)</label>
                      <input
                        type="number"
                        min={0}
                        max={activeProject.durationSeconds}
                        value={uploadStartSec}
                        onChange={(e) => setUploadStartSec(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">End Time (Y sec)</label>
                      <input
                        type="number"
                        min={uploadStartSec}
                        max={activeProject.durationSeconds}
                        value={uploadEndSec}
                        onChange={(e) => setUploadEndSec(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Upload File Input */}
                  <div>
                    <label className="text-[10px] text-slate-400 block font-bold">Upload Local File</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept={
                        uploadMediaType === 'video'
                          ? 'video/mp4,video/webm,video/quicktime'
                          : uploadMediaType === 'ppt'
                          ? '.ppt,.pptx,.pdf'
                          : uploadMediaType === 'image'
                          ? 'image/png,image/jpeg,image/webp'
                          : 'audio/mp3,audio/wav,audio/aac'
                      }
                      className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-black cursor-pointer"
                    />
                  </div>

                  {/* Or Paste URL */}
                  <div>
                    <label className="text-[10px] text-slate-400 block font-bold">Or Paste CDN / Remote URL</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={customMediaUrl}
                        onChange={(e) => setCustomMediaUrl(e.target.value)}
                        placeholder="https://.../media.mp4 or /images/slide.jpg"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                      />
                      <button
                        onClick={handleAddManualMediaTrack}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ZONE 5: MANDATORY ADMIN APPROVAL DASHBOARD (PHASE 8) */}
            {activeTab === 'approval' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-black text-white block">
                      Admin Review & Approval Dashboard
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Mandatory verification before final rendering
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      activeProject.approvalStatus === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {activeProject.approvalStatus}
                  </span>
                </div>

                {/* 6-Point Functional Review Checklist */}
                <div className="space-y-2">
                  {[
                    { key: 'script', label: 'Script / Text (Review full description)' },
                    { key: 'objects', label: 'Images / Objects (Check all visual assets)' },
                    { key: 'motion', label: 'Motion (Check start-to-end movement)' },
                    { key: 'timeline', label: 'Timeline (Check every time segment)' },
                    { key: 'camera', label: 'Camera & Background (Check scene & camera)' },
                    { key: 'audio', label: 'Audio / Voice (Check if included)' },
                  ].map((item) => {
                    const status = (activeProject.approvalChecklist as any)[item.key] || 'pending';
                    const isApproved = status === 'approved';
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleToggleChecklist(item.key as any)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isApproved
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <CheckSquare size={16} className="text-emerald-400" />
                          ) : (
                            <Square size={16} className="text-slate-600" />
                          )}
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            isApproved
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Functional Admin Actions */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAdminAction('approve')}
                      disabled={isSaving}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve & Lock</span>
                    </button>

                    <button
                      onClick={() => handleAdminAction('reject')}
                      disabled={isSaving}
                      className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>Reject Proposal</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('scenes')}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>Edit Storyboard</span>
                    </button>

                    <button
                      onClick={handleCreateAnimation}
                      disabled={isGenerating}
                      className="py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>Regenerate AI</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ZONE 6: RENDER & EXPORT PIPELINE (PHASE 9) */}
            {activeTab === 'render' && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-extrabold text-white">
                    Final Animation Rendering & Export
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Dedicated Pipeline
                  </span>
                </div>

                {/* Render Configuration */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">Resolution</label>
                    <select
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                    >
                      <option value="720p">720p HD</option>
                      <option value="1080p">1080p Full HD</option>
                      <option value="4k">4K Cinema Master</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">Aspect Ratio</label>
                    <select
                      value={selectedAspectRatio}
                      onChange={(e) => setSelectedAspectRatio(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="9:16">9:16 Reels/Shorts</option>
                      <option value="1:1">1:1 Square</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold">Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                    >
                      <option value="mp4">MP4 Video</option>
                      <option value="webm">WebM Video</option>
                    </select>
                  </div>
                </div>

                {/* Error Banner */}
                {renderError && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <span>{renderError}</span>
                  </div>
                )}

                {/* Render Progress Bar */}
                {isRendering && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span>Rendering 3D Keyframes & Video Layers...</span>
                      <span>{renderProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Render Trigger Button */}
                <button
                  onClick={handleStartFinalRender}
                  disabled={isRendering}
                  className={`w-full py-3 rounded-xl font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeProject.approvalStatus === 'approved'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:opacity-90'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Film size={15} />
                  <span>
                    {isRendering
                      ? 'Rendering In Progress...'
                      : activeProject.approvalStatus === 'approved'
                      ? 'Start Final Rendering & Save'
                      : 'Approval Required to Render'}
                  </span>
                </button>

                {/* Download Button if Rendered */}
                {renderedUrl && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-2 text-center animate-in fade-in duration-300">
                    <span className="text-xs font-bold text-emerald-300 block">
                      🎉 Final Video Rendered & Saved to Bunny Storage!
                    </span>
                    <a
                      href={renderedUrl}
                      download={`swaryoga_animation_${activeProject.durationSeconds}s.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download Video ({selectedResolution.toUpperCase()})</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Interactive 3D Model Preview Modal */}
      {preview3DAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>{preview3DAsset.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {preview3DAsset.source.toUpperCase()}
                  </span>
                </h3>
                <span className="text-xs text-slate-400">{preview3DAsset.license}</span>
              </div>
              <button
                onClick={() => setPreview3DAsset(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Interactive 3D Viewer or High-Res Inspection */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              {preview3DAsset.embedUrl ? (
                <iframe
                  title={preview3DAsset.name}
                  src={`${preview3DAsset.embedUrl}?autostart=1&ui_controls=1&ui_infos=0`}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; xr-spatial-tracking"
                />
              ) : preview3DAsset.thumbnail ? (
                <div className="w-full h-full relative">
                  <img
                    src={preview3DAsset.thumbnail}
                    alt={preview3DAsset.name}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur border border-white/10 text-xs text-slate-300">
                    Photorealistic PBR 3D asset ready for Three.js & Blender render
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Globe size={48} />
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {preview3DAsset.description || 'Verified 3D asset ready to insert into active scene.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview3DAsset(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleImportOnline3DAsset(preview3DAsset);
                    setPreview3DAsset(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-xs shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Insert into Scene {activeChunkIndex + 1}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

