'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, RotateCcw, Video, Eye, Maximize2, ShieldCheck, SunMedium } from 'lucide-react';

interface Avatar3DCanvasProps {
  avatarCutoutUrl?: string | null;
  postureId?: string;
  backgroundUrl?: string;
  clothingName?: string;
  clothingId?: string;
  blur?: number;
  tilakEnabled?: boolean;
  glassesEnabled?: boolean;
}

export default function Avatar3DCanvas({
  avatarCutoutUrl,
  postureId = 'posture_standing',
  backgroundUrl = 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80',
  clothingName = 'Pure White Khadi Cotton Kurta',
  clothingId = 'cloth_white_kurta',
  blur = 0,
  tilakEnabled = true,
  glassesEnabled = false,
}: Avatar3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraView, setCameraView] = useState<'front' | 'full' | 'close' | 'dynamic'>('front');
  const [lightingWarmth, setLightingWarmth] = useState<'vedic' | 'cool' | 'cinematic'>('vedic');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Fallback to verified master digital human portrait of Mohan Sir
  const cleanCutoutUrl =
    avatarCutoutUrl && !avatarCutoutUrl.includes('d99f90faf07d38394e0662fc419db063')
      ? avatarCutoutUrl
      : 'https://swaryogacrm.b-cdn.net/mohan.jpg';

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const propsGroupRef = useRef<THREE.Group | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.PointLight | null>(null);

  // Mouse interaction state
  const mouseState = useRef({
    isDown: false,
    prevX: 0,
    prevY: 0,
    rotY: 0,
    rotX: 0,
    dist: 3.5,
    targetY: 1.15,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.04);

    // 2. Camera - Chest-up perspective with proper headroom
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.15, 3.5);
    camera.lookAt(0, 1.15, 0);
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
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights Setup (PBR 3-Point Vedic Illumination)
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0x0f172a, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    keyLight.position.set(2.5, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.PointLight(0x38bdf8, 1.2, 10);
    rimLight.position.set(-2, 2.5, -1.5);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // 5. Curved 3D Background Backdrop (Cyclorama)
    const bgGeometry = new THREE.CylinderGeometry(8, 8, 5, 48, 1, true, Math.PI * 0.7, Math.PI * 0.6);
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
    bgMesh.position.set(0, 1.2, -0.5);
    scene.add(bgMesh);
    bgMeshRef.current = bgMesh;

    // 6. Stage Floor Group
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);
    floorGroupRef.current = floorGroup;

    // Circular Stage Dais
    const daisGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.08, 64);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.2,
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = -0.04;
    dais.receiveShadow = true;
    floorGroup.add(dais);

    // Glowing stage rim ring
    const ringGeo = new THREE.RingGeometry(2.35, 2.45, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    floorGroup.add(ring);

    // 7. Props Group (Yoga Mat, Meditation Zafu, Cooking Counter)
    const propsGroup = new THREE.Group();
    scene.add(propsGroup);
    propsGroupRef.current = propsGroup;

    // 8. Avatar Rig Group
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;

    // Mohan Sir Rigged Card Mesh
    const avatarGeo = new THREE.PlaneGeometry(1.6, 2.2);
    const avatarTexture = textureLoader.load(cleanCutoutUrl, () => {
      renderer.render(scene, camera);
    });
    avatarTexture.generateMipmaps = true;
    avatarTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const avatarMat = new THREE.MeshStandardMaterial({
      map: avatarTexture,
      transparent: true,
      roughness: 0.4,
      metalness: 0.05,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
    });
    const avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
    avatarMesh.position.y = 1.05;
    avatarMesh.castShadow = true;
    avatarGroup.add(avatarMesh);

    // Soft Contact Shadow on stage floor
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.6);
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
      opacity: 0.8,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    avatarGroup.add(shadowMesh);

    // 9. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle natural breathing & posture micro-movement
      if (avatarMesh) {
        avatarMesh.position.y = 1.05 + Math.sin(elapsed * 1.6) * 0.008;
      }

      // Auto rotation if active
      if (autoRotate && avatarGroupRef.current) {
        mouseState.current.rotY += 0.008;
      }

      // Camera position from spherical coords
      const dist = mouseState.current.dist;
      const rotY = mouseState.current.rotY;
      const rotX = Math.max(-0.4, Math.min(0.5, mouseState.current.rotX));
      const targetY = mouseState.current.targetY;

      camera.position.x = Math.sin(rotY) * dist * Math.cos(rotX);
      camera.position.z = Math.cos(rotY) * dist * Math.cos(rotX);
      camera.position.y = targetY + Math.sin(rotX) * dist;
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      avatarGeo.dispose();
      avatarMat.dispose();
      daisGeo.dispose();
      daisMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
    };
  }, []);

  // Update Background Texture when backgroundUrl changes
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

  // Update Avatar Texture when cutout changes
  useEffect(() => {
    if (!avatarGroupRef.current) return;
    const mesh = avatarGroupRef.current.children[0] as THREE.Mesh;
    if (mesh) {
      const loader = new THREE.TextureLoader();
      loader.load(cleanCutoutUrl, (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.map = tex;
        mat.needsUpdate = true;
      });
    }
  }, [cleanCutoutUrl]);

  // Update Posture Props & Rig Transforms
  useEffect(() => {
    if (!avatarGroupRef.current || !propsGroupRef.current) return;

    // Clear existing dynamic props
    while (propsGroupRef.current.children.length > 0) {
      const obj = propsGroupRef.current.children[0];
      propsGroupRef.current.remove(obj);
    }

    const isYoga =
      postureId === 'posture_sukhasana' ||
      postureId === 'posture_padmasana' ||
      postureId === 'posture_vajrasana' ||
      postureId === 'posture_tadasana' ||
      postureId === 'posture_vrikshasana';

    const isCooking = postureId === 'posture_cooking';

    if (isYoga && (postureId === 'posture_sukhasana' || postureId === 'posture_padmasana' || postureId === 'posture_vajrasana')) {
      // 1. Add 3D Meditation Mat & Cushion
      const matGeo = new THREE.BoxGeometry(1.6, 0.02, 1.2);
      const matMaterial = new THREE.MeshStandardMaterial({
        color: 0x991b1b, // Saffron-maroon yoga mat
        roughness: 0.8,
      });
      const matMesh = new THREE.Mesh(matGeo, matMaterial);
      matMesh.position.set(0, 0.01, 0);
      propsGroupRef.current.add(matMesh);

      // Round Zafu meditation cushion
      const zafuGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 32);
      const zafuMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // Amber golden velvet
        roughness: 0.7,
      });
      const zafu = new THREE.Mesh(zafuGeo, zafuMat);
      zafu.position.set(0, 0.07, 0);
      propsGroupRef.current.add(zafu);

      // Position Avatar lowered in seated posture
      avatarGroupRef.current.position.set(0, -0.35, 0);
      mouseState.current.targetY = 0.55;
      mouseState.current.dist = 2.4;
    } else if (isCooking) {
      // 2. Add Luxury 3D Kitchen Cooking Counter
      const counterGeo = new THREE.BoxGeometry(2.0, 0.75, 0.6);
      const counterMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.25,
        metalness: 0.3,
      });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(0, 0.375, 0.5);
      propsGroupRef.current.add(counter);

      // Granite countertop slab
      const topGeo = new THREE.BoxGeometry(2.08, 0.04, 0.68);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
        metalness: 0.1,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(0, 0.77, 0.5);
      propsGroupRef.current.add(top);

      // Position Avatar slightly behind counter in presenter pose
      avatarGroupRef.current.position.set(0, 0.0, 0.1);
      mouseState.current.targetY = 0.95;
      mouseState.current.dist = 2.8;
    } else {
      // Professional Presenter Chest-Up Framing
      avatarGroupRef.current.position.set(0, 0, 0);
      mouseState.current.targetY = 1.15;
      mouseState.current.dist = 3.5;
    }
  }, [postureId]);

  // Lighting Warmth presets
  useEffect(() => {
    if (!keyLightRef.current || !rimLightRef.current) return;
    if (lightingWarmth === 'vedic') {
      keyLightRef.current.color.setHex(0xffecd2); // Vedic golden
      keyLightRef.current.intensity = 1.4;
      rimLightRef.current.color.setHex(0x10b981); // Emerald aura
    } else if (lightingWarmth === 'cool') {
      keyLightRef.current.color.setHex(0xe0f2fe);
      keyLightRef.current.intensity = 1.3;
      rimLightRef.current.color.setHex(0x38bdf8);
    } else {
      keyLightRef.current.color.setHex(0xfef08a);
      keyLightRef.current.intensity = 1.6;
      rimLightRef.current.color.setHex(0xf43f5e); // Sunset rim
    }
  }, [lightingWarmth]);

  // Camera Presets
  const setPreset = (preset: 'front' | 'full' | 'close' | 'dynamic') => {
    setCameraView(preset);
    if (preset === 'front') {
      mouseState.current.rotY = 0;
      mouseState.current.rotX = 0;
      mouseState.current.dist = 3.5;
      mouseState.current.targetY = 1.15; // Chest-up with full head visible
    } else if (preset === 'close') {
      mouseState.current.rotY = 0;
      mouseState.current.rotX = 0.02;
      mouseState.current.dist = 2.0;
      mouseState.current.targetY = 1.45; // Focused on face & eyes
    } else if (preset === 'full') {
      mouseState.current.rotY = 0;
      mouseState.current.rotX = 0.05;
      mouseState.current.dist = 4.2;
      mouseState.current.targetY = 1.05; // Full presenter view
    } else if (preset === 'dynamic') {
      mouseState.current.rotY = 0.35; // 3/4 professional angle
      mouseState.current.rotX = 0;
      mouseState.current.dist = 3.5;
      mouseState.current.targetY = 1.15;
    }
  };

  // Mouse / Touch Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseState.current.isDown = true;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseState.current.isDown) return;
    const deltaX = e.clientX - mouseState.current.prevX;
    const deltaY = e.clientY - mouseState.current.prevY;
    mouseState.current.prevX = e.clientX;
    mouseState.current.prevY = e.clientY;

    mouseState.current.rotY -= deltaX * 0.007;
    mouseState.current.rotX += deltaY * 0.005;
  };

  const handleMouseUp = () => {
    mouseState.current.isDown = false;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    mouseState.current.dist = Math.max(1.2, Math.min(6.0, mouseState.current.dist + e.deltaY * 0.003));
  };

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none group">
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      />

      {/* Top Floating Telemetry & Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Identity & Status */}
        <div className="flex flex-col gap-1 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur border border-emerald-500/40 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-white tracking-wide">
              Mohan Sir (Vedic Twin 3D Rig)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              v_avatar_d6cc0dea-a
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-300 bg-black/70 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800">
            <span>Attire: <strong className="text-amber-400">{clothingName}</strong></span>
            <span>•</span>
            <span>Tilt: <strong className="text-teal-300">{postureId.replace('posture_', '').toUpperCase()}</strong></span>
          </div>
        </div>

        {/* Camera Views Quick Switch */}
        <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur p-1 rounded-xl border border-slate-800 pointer-events-auto shadow-xl text-xs">
          <button
            onClick={() => setPreset('front')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              cameraView === 'front' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setPreset('close')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              cameraView === 'close' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Face Shot
          </button>
          <button
            onClick={() => setPreset('dynamic')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              cameraView === 'dynamic' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            3/4 Hero
          </button>
          <button
            onClick={() => setPreset('full')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              cameraView === 'full' ? 'bg-emerald-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Full Stage
          </button>
        </div>
      </div>

      {/* Bottom Floating Controls: 3D Orbit, Reset, Warmth */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Auto Rotate Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur transition-all border cursor-pointer ${
              autoRotate
                ? 'bg-emerald-500/90 text-black border-emerald-400 shadow-lg'
                : 'bg-black/80 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <RotateCcw size={13} className={autoRotate ? 'animate-spin' : ''} />
            <span>360° Turntable</span>
          </button>

          {/* Reset Camera Button */}
          <button
            onClick={() => setPreset('front')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-black/80 text-slate-400 hover:text-white border border-slate-800 backdrop-blur transition-all cursor-pointer"
          >
            Reset Camera
          </button>

          {/* Warmth Lighting Selector */}
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur p-1 rounded-xl border border-slate-800 text-[10px]">
            <SunMedium size={12} className="text-amber-400 ml-1" />
            <button
              onClick={() => setLightingWarmth('vedic')}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                lightingWarmth === 'vedic' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vedic Gold
            </button>
            <button
              onClick={() => setLightingWarmth('cool')}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                lightingWarmth === 'cool' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Studio Cool
            </button>
          </div>
        </div>

        {/* WebGL Interaction Tip */}
        <div className="bg-black/75 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1.5 pointer-events-none">
          <Sparkles size={13} className="text-emerald-400" />
          <span>Click & Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
}
