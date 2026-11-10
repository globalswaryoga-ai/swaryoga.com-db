'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  Sliders,
  Eye,
  Camera,
  Shirt,
  Layers,
  Wand2,
  CheckCircle2,
  Loader2,
  Send,
  Film,
} from 'lucide-react';
import { VisemeFrame } from '@/lib/avatarEngine/visemeMapper';

// Authentic Mohan Sir Wardrobes available in the 3D Stage
export interface AvatarOutfit {
  id: string;
  nameEn: string;
  nameHi: string;
  colorDot: string;
  cutoutUrl: string;
  description: string;
}

export const MOHAN_SIR_OUTFITS: AvatarOutfit[] = [
  {
    id: 'outfit_white_khadi',
    nameEn: 'Pure White Khadi Kurta',
    nameHi: 'शुद्ध श्वेत खादी कुर्ता (साधना)',
    colorDot: '#f8fafc',
    cutoutUrl: '/avatar-studio/looks/mohan_white_khadi_1080p.jpg',
    description: 'Vedic meditation & authentic pranayama teaching attire.',
  },
  {
    id: 'outfit_khadi_sadhana',
    nameEn: 'Sadhana Khadi Classic',
    nameHi: 'शास्त्रीय खादी साधना कुर्ता',
    colorDot: '#e2e8f0',
    cutoutUrl: '/avatar-studio/looks/mohan_khadi_sadhana_1080p.jpg',
    description: 'Serene teaching look with natural fiber textures.',
  },
  {
    id: 'outfit_lime_green',
    nameEn: 'Paret-Popat Lime Kurta',
    nameHi: 'पारेट-पोपट तोतिया कुर्ता',
    colorDot: '#84cc16',
    cutoutUrl: '/avatar-studio/looks/mohan_lime_green_diet.jpg',
    description: 'Vibrant workshop look for Swar Yoga diet & lifestyle lectures.',
  },
  {
    id: 'outfit_aqua_mudra',
    nameEn: 'Oceanic Aqua Mudra Kurta',
    nameHi: 'समुद्री आकाशीय मुद्रा कुर्ता',
    colorDot: '#06b6d4',
    cutoutUrl: '/avatar-studio/looks/mohan_aqua_mudra.jpg',
    description: 'Dynamic mudra and breathing demonstrations.',
  },
  {
    id: 'outfit_sand_heart',
    nameEn: 'Sand Gold Heart Chakra',
    nameHi: 'रेत-स्वर्ण हृदय चक्र कुर्ता',
    colorDot: '#f59e0b',
    cutoutUrl: '/avatar-studio/looks/mohan_sand_heart_chakra.jpg',
    description: 'Warm golden energy for heart chakra and yoga philosophy.',
  },
  {
    id: 'outfit_cutout_clean',
    nameEn: 'Master Frontal Twin',
    nameHi: 'मास्टर डिजिटल ट्विन (पारदर्शी)',
    colorDot: '#38bdf8',
    cutoutUrl: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
    description: 'Calibrated 2.5D transparency cutout on 3D dais.',
  },
];

// Stage Backdrops
export interface StageBackdrop {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const STAGE_BACKDROPS: StageBackdrop[] = [
  {
    id: 'bg_classroom',
    name: 'Smart Yoga Classroom & Whiteboard',
    category: 'Classroom',
    url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'bg_ashram',
    name: 'Himalayan Ashram Sanctum',
    category: 'Ashram',
    url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'bg_amphitheater',
    name: 'University Lecture Amphitheater',
    category: 'Academic',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
  },
];

interface MohanSir3DAvatarStageProps {
  onTransferScript?: (script: string) => void;
  onGoToRenderQueue?: (script: string, outfitId: string) => void;
}

export default function MohanSir3DAvatarStage({
  onTransferScript,
  onGoToRenderQueue,
}: MohanSir3DAvatarStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Selected Outfit & Backdrop
  const [selectedOutfit, setSelectedOutfit] = useState<AvatarOutfit>(MOHAN_SIR_OUTFITS[0]);
  const [selectedBackdrop, setSelectedBackdrop] = useState<StageBackdrop>(STAGE_BACKDROPS[0]);

  // Audio & Visemes State
  const [speechScript, setSpeechScript] = useState<string>(
    'नमस्ते साधकों! मैं मोहन कलबुर्गी हूँ। स्वर योग संस्थान में आपका हार्दिक स्वागत है। अपने श्वास, इड़ा और पिंगला नाड़ी को संतुलित करना ही संपूर्ण स्वास्थ्य का रहस्य है।'
  );
  const [speechLang, setSpeechLang] = useState<'hi' | 'mr' | 'en'>('hi');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visemeFrames, setVisemeFrames] = useState<VisemeFrame[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [activeVisemeShape, setActiveVisemeShape] = useState<string>('Neutral');

  // Camera & Orbit Controls
  const [cameraMode, setCameraMode] = useState<'front' | 'close' | 'wide'>('front');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const avatarMeshRef = useRef<THREE.Mesh | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  const mouthMeshRef = useRef<THREE.Mesh | null>(null);

  // Mouse drag orbital control state
  const mouseState = useRef({
    isDown: false,
    prevX: 0,
    prevY: 0,
    rotY: 0,
    rotX: 0,
    dist: 3.2,
    targetY: 1.1,
  });

  // Toggle Audio Playback
  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // 1. Initialize Three.js Stage Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 3.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Lighting (Vedic Warm PBR 3-Point Illumination)
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x0f172a, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.6);
    keyLight.position.set(2.5, 4.5, 3.2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.5, 10);
    rimLight.position.set(-2.2, 2.8, -1.8);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 0.9, 8);
    fillLight.position.set(1.8, 1.2, 1.5);
    scene.add(fillLight);

    // Curved Cyclorama Backdrop
    const bgGeometry = new THREE.CylinderGeometry(8.5, 8.5, 5.2, 48, 1, true, Math.PI * 0.7, Math.PI * 0.6);
    const textureLoader = new THREE.TextureLoader();

    const bgTexture = textureLoader.load(selectedBackdrop.url, () => {
      renderer.render(scene, camera);
    });
    bgTexture.wrapS = THREE.ClampToEdgeWrapping;
    bgTexture.wrapT = THREE.ClampToEdgeWrapping;

    const bgMaterial = new THREE.MeshBasicMaterial({
      map: bgTexture,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.set(0, 1.3, -0.6);
    scene.add(bgMesh);
    bgMeshRef.current = bgMesh;

    // Stage Floor Group
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    // Circular Stage Dais
    const daisGeo = new THREE.CylinderGeometry(2.5, 2.7, 0.1, 64);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25,
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = -0.05;
    dais.receiveShadow = true;
    floorGroup.add(dais);

    // Glowing stage rim ring (Golden Amber for Vedic Swar Yoga)
    const ringGeo = new THREE.RingGeometry(2.45, 2.55, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    floorGroup.add(ring);

    // Avatar Rig Group (Mohan Sir 3D Avatar)
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;

    // Mohan Sir Primary Rigged Billboard Card
    const avatarGeo = new THREE.PlaneGeometry(1.65, 2.25);
    const avatarTexture = textureLoader.load(selectedOutfit.cutoutUrl, () => {
      renderer.render(scene, camera);
    });
    avatarTexture.generateMipmaps = true;
    avatarTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const avatarMat = new THREE.MeshStandardMaterial({
      map: avatarTexture,
      transparent: true,
      roughness: 0.45,
      metalness: 0.05,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
    });
    const avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
    avatarMesh.position.y = 1.08;
    avatarMesh.castShadow = true;
    avatarGroup.add(avatarMesh);
    avatarMeshRef.current = avatarMesh;

    // Dynamic 3D Mouth Viseme Aperture Mesh for Real-time Lip-Sync
    const mouthGeo = new THREE.RingGeometry(0.015, 0.045, 16);
    const mouthMat = new THREE.MeshBasicMaterial({
      color: 0x3d0c0c,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, 1.48, 0.02);
    avatarGroup.add(mouthMesh);
    mouthMeshRef.current = mouthMesh;

    // Contact Floor Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.3, 0.7);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 60);
      grad.addColorStop(0, 'rgba(0,0,0,0.85)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    avatarGroup.add(shadowMesh);

    // Animation & Viseme Synchronizer Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Breathing idle micro-movement (natural yogic breathing)
      if (avatarMeshRef.current) {
        avatarMeshRef.current.position.y = 1.08 + Math.sin(elapsed * 1.5) * 0.007;
      }

      // Auto rotation if enabled
      if (autoRotate && avatarGroupRef.current) {
        mouseState.current.rotY += 0.005;
      }

      // Live Viseme Evaluation from Audio Playhead
      if (audioRef.current && !audioRef.current.paused && visemeFrames.length > 0) {
        const currentMs = audioRef.current.currentTime * 1000;
        const frame = visemeFrames.find(
          (f) => Math.abs(f.timestampMs - currentMs) < 35
        ) || visemeFrames[Math.min(visemeFrames.length - 1, Math.floor((currentMs / (audioRef.current.duration * 1000 || 1)) * visemeFrames.length))];

        if (frame) {
          const jaw = frame.blendshapes.jawOpen || 0.0;
          const funnel = frame.blendshapes.mouthFunnel || 0.0;
          const smile = frame.blendshapes.mouthSmileLeft || 0.1;

          // Scale mouth mesh to represent 3D lip-sync
          if (mouthMeshRef.current) {
            const scaleY = Math.max(0.2, jaw * 2.2);
            const scaleX = Math.max(0.5, 1.0 + funnel * 0.8);
            mouthMeshRef.current.scale.set(scaleX, scaleY, 1);
            (mouthMeshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.min(0.65, jaw * 0.8);
          }

          // Subtle head tilt during speech
          if (avatarMeshRef.current) {
            avatarMeshRef.current.rotation.z = Math.sin(elapsed * 2.5) * 0.015 * (jaw > 0.2 ? 1.5 : 0.5);
          }

          if (frame.word) {
            setCurrentWord(frame.word);
          }

          if (jaw > 0.5) setActiveVisemeShape('Open Mouth (Ah/Ha)');
          else if (funnel > 0.4) setActiveVisemeShape('Rounded (Oh/U)');
          else if (smile > 0.3) setActiveVisemeShape('Smile (Ee/Ay)');
          else setActiveVisemeShape('Neutral');
        }
      } else {
        if (mouthMeshRef.current) {
          (mouthMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.0;
        }
      }

      // Camera position from spherical orbital coords
      const dist = mouseState.current.dist;
      const rotY = mouseState.current.rotY;
      const rotX = Math.max(-0.35, Math.min(0.45, mouseState.current.rotX));
      const targetY = mouseState.current.targetY;

      camera.position.x = Math.sin(rotY) * dist * Math.cos(rotX);
      camera.position.z = Math.cos(rotY) * dist * Math.cos(rotX);
      camera.position.y = targetY + Math.sin(rotX) * dist;
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Mouse / Touch Drag Orbit Handlers
    const onMouseDown = (e: MouseEvent) => {
      mouseState.current.isDown = true;
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouseState.current.isDown) return;
      const dx = e.clientX - mouseState.current.prevX;
      const dy = e.clientY - mouseState.current.prevY;
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;
      mouseState.current.rotY -= dx * 0.008;
      mouseState.current.rotX += dy * 0.008;
    };
    const onMouseUp = () => {
      mouseState.current.isDown = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      mouseState.current.dist = Math.max(1.5, Math.min(5.5, mouseState.current.dist + e.deltaY * 0.003));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      avatarGeo.dispose();
      avatarMat.dispose();
      mouthGeo.dispose();
      mouthMat.dispose();
      daisGeo.dispose();
      daisMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    };
  }, []);

  // Update Avatar Texture when Outfit Changes
  useEffect(() => {
    if (!avatarMeshRef.current || !selectedOutfit.cutoutUrl) return;
    const loader = new THREE.TextureLoader();
    loader.load(selectedOutfit.cutoutUrl, (tex) => {
      if (avatarMeshRef.current) {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const mat = avatarMeshRef.current.material as THREE.MeshStandardMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }, [selectedOutfit]);

  // Update Background Texture when Prop Changes
  useEffect(() => {
    if (!bgMeshRef.current || !selectedBackdrop.url) return;
    const loader = new THREE.TextureLoader();
    loader.load(selectedBackdrop.url, (tex) => {
      if (bgMeshRef.current) {
        const mat = bgMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }, [selectedBackdrop]);

  // Camera Presets
  const setCameraPreset = (mode: 'front' | 'close' | 'wide') => {
    setCameraMode(mode);
    if (mode === 'front') {
      mouseState.current.dist = 3.2;
      mouseState.current.targetY = 1.1;
      mouseState.current.rotY = 0;
      mouseState.current.rotX = 0;
    } else if (mode === 'close') {
      mouseState.current.dist = 1.8;
      mouseState.current.targetY = 1.45;
      mouseState.current.rotY = 0;
      mouseState.current.rotX = 0.05;
    } else if (mode === 'wide') {
      mouseState.current.dist = 4.4;
      mouseState.current.targetY = 1.0;
      mouseState.current.rotY = 0.15;
      mouseState.current.rotX = 0;
    }
  };

  // Generate Speech & Live Visemes via API
  const handleSynthesizeAndSpeak = async () => {
    if (!speechScript.trim()) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/avatar/inhouse/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          script: speechScript.trim(),
          voiceId: {
            hi: 'hi-IN-MadhurNeural',
            mr: 'mr-IN-ManoharNeural',
            en: 'en-IN-PrabhatNeural',
          }[speechLang],
          language: speechLang,
          speed: 1,
          pitchHz: 0,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.audioUrl) {
        throw new Error(json.error || 'Failed to synthesize speech for 3D Avatar.');
      }

      setAudioUrl(json.audioUrl);
      setVisemeFrames(json.visemeFrames || []);

      if (audioRef.current) {
        audioRef.current.src = json.audioUrl;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } catch (err: any) {
      alert('Speech synthesis error: ' + err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden Audio Player for Speech Playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentWord('');
            setActiveVisemeShape('Neutral');
          }}
          onError={() => setIsPlaying(false)}
        />
      )}

      {/* 3D Stage Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3 fill-current" />
                MOHAN SIR 3D DIGITAL TWIN (INTERACTIVE AVATAR)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                WebGL 3D Real-Time Stage
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Interactive 3D Digital Twin Stage
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Interact directly with Mohan Sir&apos;s 3D digital twin avatar. Test real-time speech lip-sync, change authentic Vedic yogic attires, and preview gestures with 360° mouse rotation before queuing to Colab GPU.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onGoToRenderQueue && (
              <button
                type="button"
                onClick={() => onGoToRenderQueue(speechScript, selectedOutfit.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                Queue to Colab GPU 🚀
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 3D Stage & Controls Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): 3D Canvas Stage */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
            {/* Top Stage Bar: Outfit Badge & Camera View Presets */}
            <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/90 text-amber-300 border border-amber-400/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <Shirt className="w-3.5 h-3.5 text-amber-400" />
                  {selectedOutfit.nameEn}
                </span>
              </div>

              {/* Camera Views Controls */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-lg pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setCameraPreset('close')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    cameraMode === 'close' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Close-Up
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('front')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    cameraMode === 'front' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('wide')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    cameraMode === 'wide' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Full Stage
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    autoRotate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Auto 360° Orbit Rotation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* WebGL Canvas Container */}
            <div
              ref={mountRef}
              className="w-full h-[480px] sm:h-[540px] cursor-grab active:cursor-grabbing select-none"
            />

            {/* Bottom Live Speech Telemetry Bar */}
            <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md pointer-events-auto shadow-xl">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <div className="text-xs">
                  <span className="text-slate-400">Live Word: </span>
                  <span className="font-bold text-amber-300">{currentWord || '—'}</span>
                </div>
                <div className="h-3.5 w-px bg-slate-700 mx-1" />
                <div className="text-xs text-slate-400">
                  Viseme: <span className="text-emerald-300 font-medium">{activeVisemeShape}</span>
                </div>
              </div>

              {audioUrl && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all pointer-events-auto cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> Pause Speech
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Replay Lip-Sync
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Instructions Pill */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <span>💡 <strong>Tip:</strong> Click & drag anywhere on the 3D stage to rotate Mohan Sir 360°. Scroll wheel to zoom in/out.</span>
            <span className="font-mono text-amber-400/80">3D Stage v2.5</span>
          </div>
        </div>

        {/* Right Column (4 cols): Live Speech Tester & Outfit Chooser */}
        <div className="lg:col-span-4 space-y-4">
          {/* Box 1: Live Speech & Lip-Sync Synthesizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
              <Volume2 className="w-4 h-4 text-amber-400" />
              LIVE SPEECH & 3D LIP-SYNC TESTER
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Lecture Script to Speak</span>
                <div className="flex items-center gap-1">
                  {(['hi', 'mr', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSpeechLang(lang)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        speechLang === lang ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </label>
              <textarea
                value={speechScript}
                onChange={(e) => setSpeechScript(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none"
                placeholder="Enter what Mohan Sir should say..."
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Sample Scripts:</span>
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    lang: 'hi' as const,
                    label: '🇮🇳 Hindi: Swar Yoga Intro',
                    text: 'नमस्ते साधकों! मैं मोहन कलबुर्गी हूँ। स्वर योग संस्थान में आपका हार्दिक स्वागत है। अपने श्वास, इड़ा और पिंगला नाड़ी को संतुलित करना ही संपूर्ण स्वास्थ्य का रहस्य है।',
                  },
                  {
                    lang: 'mr' as const,
                    label: '🚩 Marathi: Swar Sadhana',
                    text: 'नमस्कार! मी मोहन कलबुर्गी आहे. स्वर योगाच्या या पवित्र सत्रात आपले स्वागत. आपल्या डाव्या व उजव्या नाकपुडीचा समतोल साधा.',
                  },
                  {
                    lang: 'en' as const,
                    label: '🌍 English: Pranic Balance',
                    text: 'Greetings seekers! I am Mohan Kalburgi. Welcome to the sacred science of Swar Yoga. Master the natural flow of your vital breath.',
                  },
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSpeechScript(sample.text);
                      setSpeechLang(sample.lang);
                    }}
                    className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 hover:text-amber-300 transition truncate"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animate & Speak Button */}
            <button
              type="button"
              onClick={handleSynthesizeAndSpeak}
              disabled={isSynthesizing || !speechScript.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating 3D Lip-Sync & Audio...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  ⚡ Speak Now (3D Live Lip-Sync)
                </>
              )}
            </button>
          </div>

          {/* Box 2: Outfit Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
              <Shirt className="w-4 h-4 text-amber-400" />
              MOHAN SIR 3D ATTIRE
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {MOHAN_SIR_OUTFITS.map((outfit) => {
                const isSelected = selectedOutfit.id === outfit.id;
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => setSelectedOutfit(outfit)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                        style={{ backgroundColor: outfit.colorDot }}
                      />
                      <span className="text-xs font-bold text-white truncate">{outfit.nameEn}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-semibold truncate">{outfit.nameHi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Box 3: Stage Backdrop Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
              <Layers className="w-4 h-4 text-amber-400" />
              STAGE BACKDROP
            </h3>

            <div className="space-y-2">
              {STAGE_BACKDROPS.map((bg) => {
                const isSelected = selectedBackdrop.id === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setSelectedBackdrop(bg)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-slate-800/50 border-slate-700/70 hover:border-slate-500'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{bg.name}</div>
                      <div className="text-[10px] text-slate-400">{bg.category}</div>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-amber-400">✓ Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
