'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Eye,
  SunMedium,
  Layers,
  Volume2,
  Video,
  Play,
  Pause,
} from 'lucide-react';
import { VisemeFrame } from '@/lib/avatarEngine/visemeMapper';

interface Inhouse3DCanvasProps {
  backgroundUrl?: string;
  clothingName?: string;
  clothingId?: string;
  audioUrl?: string | null;
  visemeFrames?: VisemeFrame[];
  avatarCutoutUrl?: string | null;
  posture?: 'sitting' | 'standing' | 'walking';
  onAudioEnded?: () => void;
}

export default function Inhouse3DAvatarCanvas({
  backgroundUrl = 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80',
  clothingName = 'Pure White Khadi Kurta',
  clothingId = 'cloth_white_kurta',
  audioUrl,
  visemeFrames = [],
  avatarCutoutUrl,
  posture = 'sitting',
  onAudioEnded,
}: Inhouse3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [cameraMode, setCameraMode] = useState<'front' | 'close' | 'wide'>('front');
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeVisemeShape, setActiveVisemeShape] = useState<string>('Neutral');

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  const mouthMeshRef = useRef<THREE.Mesh | null>(null);
  const eyeLeftMeshRef = useRef<THREE.Mesh | null>(null);
  const eyeRightMeshRef = useRef<THREE.Mesh | null>(null);

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

  // Fallback cutout for 2.5D projection
  const cleanCutoutUrl =
    avatarCutoutUrl ||
    'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png';

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

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.035);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 3.2);
    cameraRef.current = camera;

    // 3. WebGL Renderer
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

    // 4. Studio Lighting (PBR 3-Point Vedic Illumination)
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0x0f172a, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    keyLight.position.set(2.5, 4.5, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.4, 10);
    rimLight.position.set(-2.2, 2.8, -1.8);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 0.8, 8);
    fillLight.position.set(1.8, 1.2, 1.5);
    scene.add(fillLight);

    // 5. Curved 3D Background Backdrop (Cyclorama)
    const bgGeometry = new THREE.CylinderGeometry(8.5, 8.5, 5.2, 48, 1, true, Math.PI * 0.7, Math.PI * 0.6);
    const textureLoader = new THREE.TextureLoader();

    const bgTexture = textureLoader.load(backgroundUrl, () => {
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

    // 6. Stage Floor Group
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

    // Glowing stage rim ring (Emerald for healing & sadhana)
    const ringGeo = new THREE.RingGeometry(2.45, 2.55, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    floorGroup.add(ring);

    // 7. Avatar Rig Group (Humanoid Rig with 3D Lip-Sync Overlay)
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;

    // Mohan Sir Primary Rigged Billboard Card
    const avatarGeo = new THREE.PlaneGeometry(1.65, 2.25);
    const avatarTexture = textureLoader.load(cleanCutoutUrl, () => {
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

    // Dynamic 3D Mouth Viseme Aperture Mesh
    // Positioned over mouth area to deform in 3D according to speech visemes
    const mouthGeo = new THREE.RingGeometry(0.015, 0.045, 16);
    const mouthMat = new THREE.MeshBasicMaterial({
      color: 0x3d0c0c,
      transparent: true,
      opacity: 0.0, // hidden when neutral, dynamically blends during speech
      side: THREE.DoubleSide,
    });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, 1.48, 0.02); // calibrated over mouth anchor
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

    // 8. Animation & Viseme Synchronizer Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Breathing idle micro-movement
      if (avatarMesh) {
        avatarMesh.position.y = 1.08 + Math.sin(elapsed * 1.6) * 0.007;
      }

      // Auto rotation if active
      if (autoRotate && avatarGroupRef.current) {
        mouseState.current.rotY += 0.006;
      }

      // Live Viseme Evaluation from Audio Playhead
      if (audioRef.current && !audioRef.current.paused && visemeFrames.length > 0) {
        const currentMs = audioRef.current.currentTime * 1000;
        // Find closest viseme frame
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
          if (avatarMesh) {
            avatarMesh.rotation.z = Math.sin(elapsed * 2.5) * 0.015 * (jaw > 0.2 ? 1.5 : 0.5);
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

    // 9. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Pointer Drag Handlers
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

  // Update Background Texture when prop changes
  useEffect(() => {
    if (!bgMeshRef.current || !backgroundUrl) return;
    const loader = new THREE.TextureLoader();
    loader.load(backgroundUrl, (tex) => {
      if (bgMeshRef.current) {
        const mat = bgMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }, [backgroundUrl]);

  // Handle Camera Presets
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

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Hidden Audio Player for Speech Playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentWord('');
            setActiveVisemeShape('Neutral');
            if (onAudioEnded) onAudioEnded();
          }}
          onError={() => setIsPlaying(false)}
        />
      )}

      {/* Top Overlay Bar */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            3D WebGL Viseme Engine ($0 Expense)
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/80 text-slate-300 border border-slate-800 backdrop-blur-md">
            {clothingName}
          </span>
        </div>

        {/* Camera Views Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-lg pointer-events-auto">
          <button
            onClick={() => setCameraPreset('close')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              cameraMode === 'close' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Close-Up
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              cameraMode === 'front' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => setCameraPreset('wide')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              cameraMode === 'wide' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Full Stage
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              autoRotate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Auto Orbit Rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-[460px] sm:h-[520px] cursor-grab active:cursor-grabbing select-none"
      />

      {/* Bottom Live Speech Telemetry Bar */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
        {/* Active Spoken Word & Viseme Indicator */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md pointer-events-auto shadow-xl">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <div className="text-xs">
            <span className="text-slate-400">Live Word: </span>
            <span className="font-bold text-amber-300">{currentWord || '—'}</span>
          </div>
          <div className="h-3.5 w-px bg-slate-700 mx-1" />
          <div className="text-xs text-slate-400">
            Mouth Viseme: <span className="text-emerald-300 font-medium">{activeVisemeShape}</span>
          </div>
        </div>

        {/* Play / Pause Voice Audio Trigger */}
        {audioUrl && (
          <button
            onClick={handleTogglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all pointer-events-auto"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" /> Pause Speech
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Test 3D Lip-Sync
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
