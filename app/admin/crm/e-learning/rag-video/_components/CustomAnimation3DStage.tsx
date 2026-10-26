'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SceneObject3D, StoryboardChunk } from '@/lib/bunnyCustomAnimationRepository';

interface CustomAnimation3DStageProps {
  currentChunk: StoryboardChunk | null;
  currentTime: number;
  totalDuration: number;
  topic: string;
  objects: SceneObject3D[];
  selectedObject: SceneObject3D | null;
  onSelectObject?: (obj: SceneObject3D) => void;
}

// ─── CINEMATIC 4-PART TRIPHALA WATER STORY ───────────────────────────────────
//
//  PART 1 (0–7.5s):   Empty crystal glass placed on teakwood table (establishing)
//  PART 2 (7.5–15s):  Clear water poured in, glass fills from bottom to top
//  PART 3 (15–22.5s): Wooden spoon brings Triphala powder, stirs into glass
//  PART 4 (22.5–30s): Time-lapse: midnight → dawn, water slowly turns golden yellow
//
//  Record button → MediaRecorder captures WebGL canvas as WebM/MP4 @ 30fps
// ─────────────────────────────────────────────────────────────────────────────

export function CustomAnimation3DStage({
  currentChunk,
  currentTime,
  totalDuration,
  topic,
  objects,
  selectedObject,
  onSelectObject,
}: CustomAnimation3DStageProps) {
  const mountRef        = useRef<HTMLDivElement | null>(null);
  const sceneRef        = useRef<THREE.Scene | null>(null);
  const cameraRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef     = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef    = useRef<number>(0);

  // Persistent scene objects (built once, animated via currentTime)
  const waterMeshRef    = useRef<THREE.Mesh | null>(null);
  const waterMatRef     = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const glassBodyRef    = useRef<THREE.Mesh | null>(null);
  const jugGroupRef     = useRef<THREE.Group | null>(null);
  const waterStreamRef  = useRef<THREE.Mesh | null>(null);
  const spoonGroupRef   = useRef<THREE.Group | null>(null);
  const powderInGlassRef = useRef<THREE.Mesh | null>(null);
  const ambientRef      = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef     = useRef<THREE.DirectionalLight | null>(null);
  const moonLightRef    = useRef<THREE.PointLight | null>(null);
  const trifalaGlowRef  = useRef<THREE.PointLight | null>(null);
  const particlesRef    = useRef<THREE.Points | null>(null);
  const powderOnSpoonMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Recording state
  const [isRecording, setIsRecording]     = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoUrl, setVideoUrl]           = useState<string | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const recordTimeRef  = useRef<number>(0);
  const recordRafRef   = useRef<number>(0);

  // ── Helper ──────────────────────────────────────────────────────────────────
  const lerp = (a: number, b: number, f: number) =>
    a + (b - a) * Math.max(0, Math.min(1, f));

  // ── Scene builder (runs once on mount) ──────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth  || 854;
    const h = container.clientHeight || 480;

    // Scene & renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060d1a);
    scene.fog = new THREE.FogExp2(0x060d1a, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.05, 80);
    camera.position.set(0, 1.0, 4.2);
    camera.lookAt(0, -0.05, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // ── LIGHTS ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xddeeff, 0.95);
    scene.add(ambient);
    ambientRef.current = ambient;

    const key = new THREE.DirectionalLight(0xfff5e0, 2.2);
    key.position.set(3, 5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.width  = 1024;
    key.shadow.mapSize.height = 1024;
    scene.add(key);
    keyLightRef.current = key;

    const fill = new THREE.PointLight(0x38bdf8, 1.4, 14);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const moon = new THREE.PointLight(0x8ab4f8, 0, 20);
    moon.position.set(-2, 6, -4);
    scene.add(moon);
    moonLightRef.current = moon;

    const trifalaGlow = new THREE.PointLight(0xe09020, 0, 7);
    trifalaGlow.position.set(0, -0.35, 0.6);
    scene.add(trifalaGlow);
    trifalaGlowRef.current = trifalaGlow;

    // ── FLOOR PLATFORM ──────────────────────────────────────────────────────
    const floorMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.5, 0.07, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.7 })
    );
    floorMesh.position.y = -1.4;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // ── TABLE ───────────────────────────────────────────────────────────────
    const tMat = new THREE.MeshStandardMaterial({ color: 0x5c2e0a, roughness: 0.38, metalness: 0.04 });

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.10, 52), tMat);
    tableTop.position.y = -0.60;
    tableTop.castShadow  = true;
    tableTop.receiveShadow = true;
    scene.add(tableTop);

    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.72, 14), tMat);
    tableLeg.position.y = -1.0;
    scene.add(tableLeg);

    // Subtle tablecloth disc
    const cloth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 0.005, 52),
      new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.9 })
    );
    cloth.position.y = -0.545;
    scene.add(cloth);

    // ── CRYSTAL GLASS (PERMANENT — always on table) ─────────────────────────
    const glassGroup = new THREE.Group();
    glassGroup.position.set(0, -0.22, 0);

    // Glass walls – open-top cylinder, double-sided for realism
    const glassBodyGeo = new THREE.CylinderGeometry(0.285, 0.215, 0.82, 52, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd6eeff,
      transparent: true,
      opacity: 0.50,
      roughness: 0.04,
      transmission: 0.92,
      thickness: 0.22,
      ior: 1.52,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
    });
    const glassBody = new THREE.Mesh(glassBodyGeo, glassMat);
    glassBody.position.y = 0.07;
    glassBody.castShadow = true;
    glassGroup.add(glassBody);
    glassBodyRef.current = glassBody;

    // Glass base
    const glassBotMat = new THREE.MeshPhysicalMaterial({
      color: 0xbcd8f5,
      transparent: true,
      opacity: 0.88,
      roughness: 0.03,
      ior: 1.52,
    });
    const glassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 36), glassBotMat);
    glassBase.position.y = -0.36;
    glassGroup.add(glassBase);

    // Water column inside glass — starts invisible, fills up in Part 2
    const waterGeo = new THREE.CylinderGeometry(0.245, 0.195, 0.68, 36);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x7ecff0),
      transparent: true,
      opacity: 0.0,
      roughness: 0.04,
      transmission: 0.65,
      ior: 1.333,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.02;
    waterMesh.scale.y = 0.01;
    glassGroup.add(waterMesh);
    waterMeshRef.current = waterMesh;
    waterMatRef.current  = waterMat;

    // Powder cloud inside glass — visible Part 3 only, dissolves away
    const powderGeo = new THREE.SphereGeometry(0.11, 14, 14);
    const powderInMat = new THREE.MeshStandardMaterial({
      color: 0xb05c10,
      transparent: true,
      opacity: 0.0,
    });
    const powderInGlass = new THREE.Mesh(powderGeo, powderInMat);
    powderInGlass.position.y = 0.14;
    glassGroup.add(powderInGlass);
    powderInGlassRef.current = powderInGlass;

    scene.add(glassGroup);

    // ── VEDIC COPPER JUG (enters from top-right in Part 2, pours water, exits) ──
    const jugGroup = new THREE.Group();
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xc86428, // rich Vedic copper
      metalness: 0.85,
      roughness: 0.28,
    });

    // Jug body (belly)
    const jugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.48, 32), copperMat);
    jugBody.position.y = 0;
    jugBody.castShadow = true;
    jugGroup.add(jugBody);

    // Jug neck
    const jugNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 28), copperMat);
    jugNeck.position.y = 0.32;
    jugGroup.add(jugNeck);

    // Jug spout
    const jugSpout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 16), copperMat);
    jugSpout.rotation.z = Math.PI * 0.65;
    jugSpout.position.set(-0.16, 0.40, 0);
    jugGroup.add(jugSpout);

    // Jug handle
    const jugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 12, 24, Math.PI), copperMat);
    jugHandle.rotation.z = -Math.PI * 0.5;
    jugHandle.position.set(0.20, 0.14, 0);
    jugGroup.add(jugHandle);

    jugGroup.position.set(1.4, 1.2, 0);
    jugGroup.visible = false;
    scene.add(jugGroup);
    jugGroupRef.current = jugGroup;

    // Pouring water stream (flowing cylinder from jug spout into glass)
    const streamGeo = new THREE.CylinderGeometry(0.022, 0.035, 0.65, 16);
    const streamMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8e5ff,
      transparent: true,
      opacity: 0.0,
      roughness: 0.05,
      transmission: 0.9,
      ior: 1.333,
    });
    const waterStream = new THREE.Mesh(streamGeo, streamMat);
    waterStream.position.set(0, 0.38, 0);
    waterStream.visible = false;
    scene.add(waterStream);
    waterStreamRef.current = waterStream;

    // ── WOODEN SPOON (Hidden by default, only appears and moves in Part 3) ──────
    const spoonGroup = new THREE.Group();
    const spoonMat = new THREE.MeshStandardMaterial({ color: 0x7c3a0e, roughness: 0.55 });

    // Handle
    const spoonHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.016, 0.82, 14),
      spoonMat
    );
    spoonHandle.rotation.z = Math.PI / 2;
    spoonHandle.position.set(-0.32, 0, 0);
    spoonGroup.add(spoonHandle);

    // Bowl
    const spoonBowl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 18), spoonMat);
    spoonBowl.scale.set(1, 0.5, 1);
    spoonBowl.position.set(0.10, -0.018, 0);
    spoonGroup.add(spoonBowl);

    // Powder on spoon (golden-brown, appears just before descent)
    const powderOnSpoonMat = new THREE.MeshStandardMaterial({
      color: 0xd48c12,
      roughness: 0.68,
      transparent: true,
      opacity: 0.0,
    });
    const powderOnSpoon = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), powderOnSpoonMat);
    powderOnSpoon.scale.set(1.3, 0.7, 1.3);
    powderOnSpoon.position.set(0.10, 0.055, 0);
    spoonGroup.add(powderOnSpoon);
    powderOnSpoonMatRef.current = powderOnSpoonMat;

    // Initially hidden out of sight
    spoonGroup.position.set(1.5, 1.2, 0.0);
    spoonGroup.rotation.z = -0.4;
    spoonGroup.visible = false;
    scene.add(spoonGroup);
    spoonGroupRef.current = spoonGroup;

    // ── STAR/PARTICLE FIELD ─────────────────────────────────────────────────
    const pCount = 160;
    const pGeo   = new THREE.BufferGeometry();
    const pPos   = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i]     = (Math.random() - 0.5) * 8;
      pPos[i + 1] = (Math.random() - 0.5) * 6;
      pPos[i + 2] = (Math.random() - 0.5) * 8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x70b8e8,
      size: 0.032,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);
    particlesRef.current = particles;

    // ── RENDER LOOP ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      const et = clock.getElapsedTime();
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0006;
        particlesRef.current.rotation.x = Math.sin(et * 0.08) * 0.035;
      }
      // Subtle glass shimmer
      if (glassBodyRef.current) {
        (glassBodyRef.current.material as THREE.MeshPhysicalMaterial).roughness =
          0.04 + Math.sin(et * 1.4) * 0.01;
      }
      renderer.render(scene, camera);
    };
    loop();

    // Resize handler
    const onResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ── TIMELINE → SCENE UPDATES (every currentTime change) ───────────────────
  useEffect(() => {
    applyTime(currentTime, Math.max(1, totalDuration));
  }, [currentTime, totalDuration]);

  // Central function: apply all cinematic state for a given time
  const applyTime = useCallback((t: number, dur: number) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const pct = t / dur;

    // Part boundaries
    const P1 = 0.25;  // 0–25%  → Part 1: empty glass
    const P2 = 0.50;  // 25–50% → Part 2: water pours in
    const P3 = 0.75;  // 50–75% → Part 3: spoon + powder
    // P4: 75–100% → overnight soak, golden water, dawn

    // ── CAMERA (slow cinematic dolly) ──────────────────────────────────────
    camera.position.z = lerp(4.2, 2.8, pct);
    camera.position.y = lerp(1.0, 0.75, pct);
    camera.position.x = Math.sin(pct * Math.PI * 0.5) * 0.18; // subtle arc
    camera.lookAt(0, lerp(-0.05, 0.05, pct), 0);

    // ── WATER & JUG MOTION ────────────────────────────────────────────────
    const water       = waterMeshRef.current;
    const waterMat    = waterMatRef.current;
    const jug         = jugGroupRef.current;
    const waterStream = waterStreamRef.current;
    const trifalaGlow = trifalaGlowRef.current;

    // Part 1 (0 to 25%): Only Table & Clean Crystal Glass. NO WATER. NO JUG. NO SPOON.
    if (pct < P1) {
      if (water && waterMat) {
        water.scale.y = 0.01;
        waterMat.opacity = 0.0;
      }
      if (jug) {
        jug.visible = false;
        jug.position.set(1.4, 1.2, 0);
      }
      if (waterStream) {
        waterStream.visible = false;
        (waterStream.material as THREE.MeshPhysicalMaterial).opacity = 0;
      }
      if (trifalaGlow) trifalaGlow.intensity = 0;
    } 
    // Part 2 (25% to 50%): Copper Jug enters, tilts, pours crystal water, glass fills, jug exits
    else if (pct < P2) {
      const fill = (pct - P1) / (P2 - P1); // 0.0 to 1.0

      if (jug) {
        jug.visible = true;
        if (fill < 0.25) {
          // Jug enters smoothly from upper right
          const enterT = fill / 0.25;
          jug.position.set(lerp(1.4, 0.45, enterT), lerp(1.2, 0.65, enterT), 0);
          jug.rotation.z = lerp(0, -0.45, enterT); // starts tilting
        } else if (fill <= 0.80) {
          // Jug holding tilt and pouring stream
          jug.position.set(0.45, 0.65, 0);
          jug.rotation.z = -0.45;
        } else {
          // Jug exits back after pouring
          const exitT = (fill - 0.80) / 0.20;
          jug.position.set(lerp(0.45, 1.4, exitT), lerp(0.65, 1.2, exitT), 0);
          jug.rotation.z = lerp(-0.45, 0, exitT);
        }
      }

      // Stream flows while jug is tilted (fill 0.20 to 0.80)
      if (waterStream) {
        const streamMat = waterStream.material as THREE.MeshPhysicalMaterial;
        if (fill >= 0.20 && fill <= 0.80) {
          waterStream.visible = true;
          streamMat.opacity = 0.85;
          waterStream.position.set(0.18, 0.28, 0);
          waterStream.rotation.z = 0.15;
        } else {
          waterStream.visible = false;
          streamMat.opacity = 0.0;
        }
      }

      // Glass fills with water from bottom to top
      if (water && waterMat) {
        const waterRise = Math.max(0, (fill - 0.20) / 0.60);
        water.scale.y = lerp(0.01, 0.96, Math.min(1, waterRise));
        waterMat.opacity = lerp(0.0, 0.82, Math.min(1, waterRise * 1.5));
        waterMat.color.setHex(0x7ecff0);
      }
      if (trifalaGlow) trifalaGlow.intensity = 0;
    } 
    // Part 3 (50% to 75%): Water full. Spoon with Trifala enters, dips, stirs, exits.
    else if (pct < P3) {
      if (jug) {
        jug.visible = false;
      }
      if (waterStream) {
        waterStream.visible = false;
      }
      if (water && waterMat) {
        water.scale.y = 0.96;
        waterMat.opacity = 0.82;
        waterMat.color.setHex(0x7ecff0);
      }
      if (trifalaGlow) trifalaGlow.intensity = 0;
    } 
    // Part 4 (75% to 100%): Soaked whole night (Day -> Night -> Dawn), water turns light yellow
    else {
      if (jug) jug.visible = false;
      if (waterStream) waterStream.visible = false;

      const soakPct = (pct - P3) / (1 - P3);
      if (water && waterMat) {
        // Clear sky-blue (#7ecff0) to light golden Ayurvedic yellow (#e8bf38)
        const r = lerp(0x7e / 255, 0xe8 / 255, soakPct);
        const g = lerp(0xcf / 255, 0xbf / 255, soakPct);
        const b = lerp(0xf0 / 255, 0x38 / 255, soakPct);
        waterMat.color.setRGB(r, g, b);
        waterMat.opacity = lerp(0.82, 0.92, soakPct);
        water.scale.y = 0.96;
      }
      if (trifalaGlow) trifalaGlow.intensity = lerp(0, 3.5, soakPct);
    }

    // ── POWDER IN GLASS ─────────────────────────────────────────────────────
    const powderIn = powderInGlassRef.current;
    if (powderIn) {
      const pm = powderIn.material as THREE.MeshStandardMaterial;
      if (pct < P3) {
        pm.opacity = 0;
        powderIn.scale.setScalar(1);
      } else {
        const soakPct = (pct - P3) / (1 - P3);
        // Quickly appears when spoon dips, then slowly dissolves as water turns yellow
        const appear  = Math.min(1, soakPct * 4);
        const dissolve = Math.max(0, soakPct - 0.25) / 0.75;
        pm.opacity = lerp(0.88, 0.0, dissolve) * appear;
        powderIn.scale.setScalar(lerp(0.85, 2.2, dissolve));
        powderIn.rotation.y += 0.035;
      }
    }

    // ── SPOON MOTION (Appears ONLY in Part 3, absent in 1, 2, and 4) ────────
    const spoon = spoonGroupRef.current;
    const powderOnSpoonMat = powderOnSpoonMatRef.current;

    if (spoon) {
      if (pct < P2) {
        // Parts 1 & 2: Completely hidden!
        spoon.visible = false;
        if (powderOnSpoonMat) powderOnSpoonMat.opacity = 0;
      } else if (pct < P3) {
        // Part 3: Spoon enters from upper right with spoon of Trifala powder
        spoon.visible = true;
        const spoonT = (pct - P2) / (P3 - P2); // 0.0 to 1.0

        if (spoonT < 0.35) {
          // Spoon descends with spoonful of Trifala
          const desc = spoonT / 0.35;
          if (powderOnSpoonMat) powderOnSpoonMat.opacity = 1.0;
          spoon.position.set(lerp(1.2, 0.12, desc), lerp(1.0, 0.22, desc), 0);
          spoon.rotation.z = lerp(-0.40, 0.15, desc);
        } else if (spoonT < 0.70) {
          // Spoon dips and tilts into glass to release Trifala powder
          const stirT = (spoonT - 0.35) / 0.35;
          spoon.position.set(0.12 + Math.sin(stirT * Math.PI * 4) * 0.04, 0.16, 0);
          spoon.rotation.z = lerp(0.15, 0.45, stirT);
          // Powder leaves spoon and drops into glass
          if (powderOnSpoonMat) powderOnSpoonMat.opacity = lerp(1.0, 0.0, stirT * 2);
        } else {
          // Spoon retracts and leaves the scene
          const exitT = (spoonT - 0.70) / 0.30;
          spoon.position.set(lerp(0.12, 1.4, exitT), lerp(0.16, 1.2, exitT), 0);
          spoon.rotation.z = lerp(0.45, -0.30, exitT);
          if (powderOnSpoonMat) powderOnSpoonMat.opacity = 0;
        }
      } else {
        // Part 4: Spoon has left, completely hidden during overnight soak
        spoon.visible = false;
        if (powderOnSpoonMat) powderOnSpoonMat.opacity = 0;
      }
    }

    // ── LIGHTING: Day → Night → Dawn ────────────────────────────────────────
    const ambient   = ambientRef.current;
    const keyLight  = keyLightRef.current;
    const moonLight = moonLightRef.current;

    if (ambient && keyLight && moonLight) {
      if (pct < P3) {
        // Parts 1–3: warm daylight studio
        ambient.intensity  = 0.95;
        ambient.color.setHex(0xddeeff);
        keyLight.intensity = 2.2;
        keyLight.color.setHex(0xfff5e0);
        moonLight.intensity = 0;
      } else {
        // Part 4: dusk → midnight → golden dawn
        const soakPct = (pct - P3) / (1 - P3);

        // 0–0.4 of Part4: day fades to night
        const toNight = Math.min(1, soakPct / 0.4);
        // 0.4–0.7: full night
        // 0.7–1.0: dawn breaks
        const toDawn  = Math.max(0, (soakPct - 0.7) / 0.3);

        ambient.intensity  = lerp(lerp(0.95, 0.12, toNight), 1.3, toDawn);
        ambient.color.setHex(soakPct < 0.7 ? 0x0d1b3e : 0xffeecc);
        keyLight.intensity = lerp(lerp(2.2, 0.08, toNight), 2.6, toDawn);
        keyLight.color.setHex(soakPct > 0.7 ? 0xffbb66 : 0xfff5e0);
        moonLight.intensity = lerp(lerp(0, 2.4, toNight), 0, toDawn);
      }
    }
  }, []);

  // ── MOVIE RECORDER (30-second frame-by-frame capture) ────────────────────
  const startRecording = useCallback(async () => {
    const renderer = rendererRef.current;
    if (!renderer || isRecording) return;

    const canvas = renderer.domElement;
    let stream: MediaStream;
    try {
      stream = (canvas as any).captureStream(30); // 30 fps
    } catch {
      alert('Your browser does not support canvas recording. Please try Chrome or Edge.');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRecording(false);
      setRecordProgress(100);
    };

    recorderRef.current = recorder;
    recorder.start(100); // collect every 100ms

    setIsRecording(true);
    setRecordProgress(0);
    setVideoUrl(null);

    const DURATION   = 30;   // seconds
    const FPS        = 30;
    const TOTAL_FRAMES = DURATION * FPS;
    let   frame      = 0;

    const tick = () => {
      if (frame >= TOTAL_FRAMES) {
        recorder.stop();
        cancelAnimationFrame(recordRafRef.current);
        return;
      }

      const t = (frame / TOTAL_FRAMES) * DURATION;
      applyTime(t, DURATION);

      // Force render this frame
      renderer.render(sceneRef.current!, cameraRef.current!);

      setRecordProgress(Math.round((frame / TOTAL_FRAMES) * 100));
      frame++;
      recordRafRef.current = requestAnimationFrame(tick);
    };

    recordRafRef.current = requestAnimationFrame(tick);
  }, [isRecording, applyTime]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    cancelAnimationFrame(recordRafRef.current);
    setIsRecording(false);
  }, []);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full relative select-none flex flex-col">
      {/* 3D Viewport */}
      <div ref={mountRef} className="flex-1 cursor-grab active:cursor-grabbing" />

      {/* ── CINEMATIC CONTROLS BAR ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm border-t border-white/10 px-4 py-2 flex items-center gap-3 z-10">
        {/* Part indicator */}
        <div className="flex gap-1.5 flex-1">
          {[
            { label: 'Part 1', sub: 'Empty Glass', color: '#38bdf8', end: 0.25 },
            { label: 'Part 2', sub: 'Water Pours', color: '#22d3ee', end: 0.50 },
            { label: 'Part 3', sub: 'Triphala Added', color: '#d97706', end: 0.75 },
            { label: 'Part 4', sub: 'Golden Soak', color: '#e8a820', end: 1.00 },
          ].map((part, i) => {
            const dur = Math.max(1, totalDuration);
            const pct = currentTime / dur;
            const prevEnd = i === 0 ? 0 : [0, 0.25, 0.50, 0.75][i];
            const isActive = pct >= prevEnd && pct < part.end;
            const isDone   = pct >= part.end;
            return (
              <div
                key={i}
                className="flex-1 rounded px-2 py-1 text-center transition-all duration-300"
                style={{
                  background: isActive
                    ? `${part.color}30`
                    : isDone
                    ? '#ffffff0a'
                    : 'transparent',
                  border: `1px solid ${isActive ? part.color : '#ffffff15'}`,
                }}
              >
                <div
                  className="text-xs font-bold"
                  style={{ color: isActive ? part.color : isDone ? '#ffffff55' : '#ffffff33' }}
                >
                  {part.label}
                </div>
                <div className="text-[10px] text-white/40 truncate">{part.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Record / Download button */}
        <div className="flex items-center gap-2 shrink-0">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white/70">Recording {recordProgress}%</span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${recordProgress}%` }}
                />
              </div>
              <button
                onClick={stopRecording}
                className="text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold text-white
                         bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400
                         transition-all shadow-lg shadow-red-900/40"
            >
              <span>⏺</span> Record 30s Movie
            </button>
          )}

          {videoUrl && !isRecording && (
            <a
              href={videoUrl}
              download="triphala_water_animation.webm"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white
                         bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400
                         transition-all shadow-lg shadow-emerald-900/40"
            >
              ⬇ Download Video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
