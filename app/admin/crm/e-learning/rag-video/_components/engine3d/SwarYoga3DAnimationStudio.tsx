'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Download,
  Layers,
  Sparkles,
  Camera,
  Activity,
  Heart,
  Save,
  FolderOpen,
  Sliders,
  CheckCircle2,
  Eye,
  Maximize2,
  Trash2,
  Clock,
  Zap,
  Info,
  BookOpen,
  Sun,
  Flame,
  Globe,
  Feather,
  Compass,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AnimationProject3D } from '@/lib/bunny3DAnimationRepository';

interface SwarYoga3DStudioProps {
  token?: string | null;
  onSendToVideoStudio?: (animationClip: any) => void;
}

export type CoreDemonstration = 'breathing' | 'yoga_asana' | 'seven_chakras';

export default function SwarYoga3DAnimationStudio({
  token,
  onSendToVideoStudio,
}: SwarYoga3DStudioProps) {
  // 1. Primary Engine Demonstration (The 3 Core Demonstrations)
  const [activeDemo, setActiveDemo] = useState<CoreDemonstration>('breathing');
  const [projectTitle, setProjectTitle] = useState('Deep Yogic Respiration: Lungs & Diaphragm Mechanics');
  const [duration, setDuration] = useState<10 | 15 | 20>(15);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [cameraPreset, setCameraPreset] = useState<'front_cinematic' | 'macro_organ' | 'side_cross' | 'orbit_360' | 'top_down'>('front_cinematic');
  const [environment, setEnvironment] = useState<'medical_dark' | 'vedic_ashram' | 'himalayan_dawn' | 'transparent_studio'>('medical_dark');
  const [language, setLanguage] = useState<'hi' | 'mr' | 'en'>('hi');

  // --- DEMO 1: BREATHING & PRANAYAMA ENGINE STATE ---
  const [breathingPreset, setBreathingPreset] = useState<'dirgha' | 'kapalabhati' | 'anulom_vilom' | 'custom'>('dirgha');
  const [inhaleDuration, setInhaleDuration] = useState<number>(4); // seconds
  const [holdDuration, setHoldDuration] = useState<number>(2); // seconds
  const [exhaleDuration, setExhaleDuration] = useState<number>(6); // seconds
  const [restDuration, setRestDuration] = useState<number>(2); // seconds
  const [diaphragmTension, setDiaphragmTension] = useState<number>(1.2);
  const [airflowSpeed, setAirflowSpeed] = useState<number>(1.0);

  // --- DEMO 2: YOGA ASANA & SKELETON/MUSCLE ENGINE STATE ---
  const [selectedAsana, setSelectedAsana] = useState<'bhujangasana' | 'padmasana' | 'tadasana' | 'trikonasana' | 'vajrasana'>('bhujangasana');
  const [showMuscleHeatmap, setShowMuscleHeatmap] = useState<boolean>(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState<boolean>(true);
  const [skeletonRiggingMode, setSkeletonRiggingMode] = useState<'musculoskeletal' | 'skeleton_only' | 'transparent_surface'>('musculoskeletal');

  // --- DEMO 3: SEVEN CHAKRAS & NADIS ENGINE STATE ---
  const [selectedChakraFocus, setSelectedChakraFocus] = useState<string>('all_chakras');
  const [energyRotationSpeed, setEnergyRotationSpeed] = useState<number>(1.0);
  const [showNadis, setShowNadis] = useState<boolean>(true);
  const [kundaliniParticleDensity, setKundaliniParticleDensity] = useState<number>(1.2);

  // Visual & Educational Toggles (Clean 3D Mode by default: NO text/words on canvas)
  const [scientificMode, setScientificMode] = useState<boolean>(true);
  const [labelsEnabled, setLabelsEnabled] = useState<boolean>(false);
  const [glowIntensity, setGlowIntensity] = useState<number>(1.2);

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Saved Projects Drawer
  const [savedProjects, setSavedProjects] = useState<AnimationProject3D[]>([]);
  const [showProjectsDrawer, setShowProjectsDrawer] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Three.js References
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stageGroupRef = useRef<THREE.Group | null>(null);

  // Mesh Hierarchy References
  const meshesRef = useRef<{
    torso?: THREE.Mesh;
    spine?: THREE.Group;
    ribs?: THREE.Group;
    trachea?: THREE.Mesh;
    bronchialTree?: THREE.Group;
    leftLung?: THREE.Mesh;
    rightLung?: THREE.Mesh;
    diaphragm?: THREE.Mesh;
    heart?: THREE.Mesh;
    chakras?: THREE.Group;
    nadisGroup?: THREE.Group;
    humanSkeletonGroup?: THREE.Group;
    humanMusclesGroup?: THREE.Group;
    alignmentLaser?: THREE.Line;
    particles?: THREE.Points;
  }>({});

  // Mouse Orbital State
  const mouseState = useRef({
    isDown: false,
    prevX: 0,
    prevY: 0,
    rotY: 0,
    rotX: 0,
    dist: 3.5,
    targetY: 0.2,
  });

  // MediaRecorder References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // -------------------------------------------------------------
  // 1. Fetch Saved Projects from Bunny Database API
  // -------------------------------------------------------------
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/avatar/3d-animation');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSavedProjects(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch 3D projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle Demonstration Switch
  const handleSelectDemo = (demo: CoreDemonstration) => {
    setActiveDemo(demo);
    setCurrentTime(0);
    setIsPlaying(false);
    if (demo === 'breathing') {
      setProjectTitle('Deep Yogic Respiration: Lungs, Diaphragm & Respiration Cycles');
    } else if (demo === 'yoga_asana') {
      setProjectTitle('Yoga Asana Biomechanics: Human Skeleton, Muscles & Alignment');
    } else if (demo === 'seven_chakras') {
      setProjectTitle('Seven Chakras & Nadis: Geometry, Colors, Rotations & Energy Waves');
    }
  };

  // -------------------------------------------------------------
  // 2. Three.js Scene Setup & Geometry Generation
  // -------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. Scene & Environment Backgrounds
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (environment === 'vedic_ashram') {
      scene.background = new THREE.Color(0x19110b);
      scene.fog = new THREE.FogExp2(0x19110b, 0.04);
    } else if (environment === 'himalayan_dawn') {
      scene.background = new THREE.Color(0x2a1409);
      scene.fog = new THREE.FogExp2(0x2a1409, 0.035);
    } else if (environment === 'transparent_studio') {
      scene.background = null;
    } else {
      scene.background = new THREE.Color(0x040814);
      scene.fog = new THREE.FogExp2(0x040814, 0.035);
    }

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 3.5);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 2.5, 10);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const goldAccent = new THREE.PointLight(0xf59e0b, 1.4, 8);
    goldAccent.position.set(0, -2, 1);
    scene.add(goldAccent);

    // 5. Stage Master Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);
    stageGroupRef.current = stageGroup;

    // 6. Floor Disc
    const floorGeo = new THREE.CircleGeometry(4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060b17,
      roughness: 0.5,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    stageGroup.add(floor);

    // =============================================================
    // BUILD 3D GEOMETRIES FOR THE 3 FOUNDATIONAL DEMONSTRATIONS
    // =============================================================

    // --- A. COMMON BASE: TRANSPARENT TORSO SILHOUETTE ---
    const torsoGeo = new THREE.CylinderGeometry(0.72, 0.62, 2.2, 32, 16, true);
    const torsoMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      roughness: 0.2,
      transmission: 0.8,
      thickness: 0.5,
      side: THREE.DoubleSide,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.2;
    stageGroup.add(torso);
    meshesRef.current.torso = torso;

    // Spine Column
    const spineGroup = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const vertGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16);
      const vertMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const vertebra = new THREE.Mesh(vertGeo, vertMat);
      vertebra.position.set(0, -0.6 + i * 0.12, -0.3);
      vertebra.castShadow = true;
      spineGroup.add(vertebra);
    }
    stageGroup.add(spineGroup);
    meshesRef.current.spine = spineGroup;

    // Ribcage
    const ribsGroup = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const ringY = -0.4 + i * 0.14;
      const radius = 0.56 - Math.abs(i - 4) * 0.04;
      const ribGeo = new THREE.TorusGeometry(radius, 0.02, 12, 32, Math.PI * 1.5);
      const ribMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.35,
        transparent: true,
        opacity: 0.45,
      });
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = Math.PI * 0.75;
      rib.position.set(0, ringY, -0.05);
      ribsGroup.add(rib);
    }
    stageGroup.add(ribsGroup);
    meshesRef.current.ribs = ribsGroup;

    // --- DEMO 1: RESPIRATORY APPARATUS (LUNGS & DIAPHRAGM) ---
    // Trachea
    const tracheaGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.65, 24);
    const tracheaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const trachea = new THREE.Mesh(tracheaGeo, tracheaMat);
    trachea.position.set(0, 0.85, 0.02);
    stageGroup.add(trachea);
    meshesRef.current.trachea = trachea;

    // Bronchi
    const bronchialGroup = new THREE.Group();
    const bronchGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.35, 16);
    const bronchMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 });
    const leftBronch = new THREE.Mesh(bronchGeo, bronchMat);
    leftBronch.position.set(-0.12, 0.5, 0.02);
    leftBronch.rotation.z = 0.55;
    bronchialGroup.add(leftBronch);

    const rightBronch = new THREE.Mesh(bronchGeo, bronchMat);
    rightBronch.position.set(0.12, 0.5, 0.02);
    rightBronch.rotation.z = -0.55;
    bronchialGroup.add(rightBronch);
    stageGroup.add(bronchialGroup);
    meshesRef.current.bronchialTree = bronchialGroup;

    // Right Lung (3 Lobes)
    const lungGeo = new THREE.SphereGeometry(0.38, 32, 24);
    lungGeo.scale(0.85, 1.45, 0.8);
    const lungMat = new THREE.MeshPhysicalMaterial({
      color: 0xf472b6,
      emissive: 0x9d174d,
      emissiveIntensity: 0.22,
      roughness: 0.35,
      transmission: 0.25,
      thickness: 0.8,
    });
    const rightLung = new THREE.Mesh(lungGeo, lungMat);
    rightLung.position.set(0.32, 0.22, 0.04);
    stageGroup.add(rightLung);
    meshesRef.current.rightLung = rightLung;

    // Left Lung (2 Lobes + Cardiac notch)
    const leftLungGeo = new THREE.SphereGeometry(0.36, 32, 24);
    leftLungGeo.scale(0.82, 1.4, 0.78);
    const leftLung = new THREE.Mesh(leftLungGeo, lungMat.clone());
    leftLung.position.set(-0.32, 0.22, 0.04);
    stageGroup.add(leftLung);
    meshesRef.current.leftLung = leftLung;

    // Diaphragm (Dynamic Muscular Dome)
    const diaphragmGeo = new THREE.SphereGeometry(0.65, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const diaphragmMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      emissiveIntensity: 0.4,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const diaphragm = new THREE.Mesh(diaphragmGeo, diaphragmMat);
    diaphragm.rotation.x = Math.PI; // Inverted dome
    diaphragm.position.set(0, -0.32, 0.02);
    stageGroup.add(diaphragm);
    meshesRef.current.diaphragm = diaphragm;

    // Beating Heart
    const heartGeo = new THREE.DodecahedronGeometry(0.16, 2);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0xef4444,
      emissiveIntensity: 0.3,
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.set(-0.06, 0.18, 0.12);
    stageGroup.add(heart);
    meshesRef.current.heart = heart;

    // --- DEMO 2: YOGA ASANA SKELETAL RIG & MUSCLE HEATMAP ---
    const skeletonGroup = new THREE.Group();
    const bonesMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });

    // Cranium
    const skullGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const skull = new THREE.Mesh(skullGeo, bonesMat);
    skull.position.set(0, 1.35, 0.02);
    skeletonGroup.add(skull);

    // Clavicles & Pelvis
    const clavicleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 16);
    const clavicles = new THREE.Mesh(clavicleGeo, bonesMat);
    clavicles.rotation.z = Math.PI / 2;
    clavicles.position.set(0, 0.9, 0);
    skeletonGroup.add(clavicles);

    const pelvisGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.25, 16);
    const pelvis = new THREE.Mesh(pelvisGeo, bonesMat);
    pelvis.position.set(0, -0.65, 0);
    skeletonGroup.add(pelvis);

    // Limbs (Arms & Legs with Rigging pivots)
    const boneGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.7, 16);
    const leftArmBone = new THREE.Mesh(boneGeo, bonesMat);
    leftArmBone.position.set(-0.65, 0.5, 0);
    leftArmBone.rotation.z = 0.25;
    skeletonGroup.add(leftArmBone);

    const rightArmBone = new THREE.Mesh(boneGeo, bonesMat);
    rightArmBone.position.set(0.65, 0.5, 0);
    rightArmBone.rotation.z = -0.25;
    skeletonGroup.add(rightArmBone);

    const legBoneGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.85, 16);
    const leftLegBone = new THREE.Mesh(legBoneGeo, bonesMat);
    leftLegBone.position.set(-0.28, -1.05, 0);
    skeletonGroup.add(leftLegBone);

    const rightLegBone = new THREE.Mesh(legBoneGeo, bonesMat);
    rightLegBone.position.set(0.28, -1.05, 0);
    skeletonGroup.add(rightLegBone);

    stageGroup.add(skeletonGroup);
    meshesRef.current.humanSkeletonGroup = skeletonGroup;

    // Musculoskeletal Heatmap Overlay (Contracting Red vs Stretching Green)
    const muscleGroup = new THREE.Group();
    const muscleContractMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    const muscleStretchMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
    });

    // Pectorals & Abs (Stretching in Cobra, Contracting in forward bend)
    const chestMuscleGeo = new THREE.BoxGeometry(0.65, 0.35, 0.12);
    const chestMuscle = new THREE.Mesh(chestMuscleGeo, muscleStretchMat);
    chestMuscle.position.set(0, 0.55, 0.14);
    muscleGroup.add(chestMuscle);

    // Erector Spinae (Contracting back muscle)
    const backMuscleGeo = new THREE.BoxGeometry(0.45, 0.9, 0.1);
    const backMuscle = new THREE.Mesh(backMuscleGeo, muscleContractMat);
    backMuscle.position.set(0, 0.1, -0.25);
    muscleGroup.add(backMuscle);

    stageGroup.add(muscleGroup);
    meshesRef.current.humanMusclesGroup = muscleGroup;

    // Posture Alignment Laser Vector
    const laserMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 1.8, 0),
      new THREE.Vector3(0, -1.5, 0),
    ]);
    const laser = new THREE.Line(laserGeo, laserMat);
    stageGroup.add(laser);
    meshesRef.current.alignmentLaser = laser;

    // --- DEMO 3: SEVEN CHAKRAS & NADIS ENERGY ENGINE ---
    const chakrasGroup = new THREE.Group();
    const chakraDefs = [
      { id: 'sahasrara', name: 'सहस्रार (Sahasrara - Crown)', color: 0xa855f7, y: 1.15, size: 0.16, bija: 'ॐ' },
      { id: 'ajna', name: 'आज्ञा (Ajna - Third Eye)', color: 0x6366f1, y: 0.9, size: 0.12, bija: 'ॐ' },
      { id: 'vishuddha', name: 'विशुद्धि (Vishuddha - Throat)', color: 0x06b6d4, y: 0.65, size: 0.13, bija: 'हं' },
      { id: 'anahata', name: 'अनाहत (Anahata - Heart)', color: 0x22c55e, y: 0.25, size: 0.15, bija: 'यं' },
      { id: 'manipura', name: 'मणिपुर (Manipura - Solar Plexus)', color: 0xeab308, y: -0.15, size: 0.14, bija: 'रं' },
      { id: 'swadhisthana', name: 'स्वाधिष्ठान (Swadhisthana - Sacral)', color: 0xf97316, y: -0.5, size: 0.13, bija: 'वं' },
      { id: 'muladhara', name: 'मूलाधार (Muladhara - Root)', color: 0xef4444, y: -0.85, size: 0.14, bija: 'लं' },
    ];

    chakraDefs.forEach((c) => {
      // Rotating Outer Lotus Petal Torus
      const chMeshGeo = new THREE.TorusGeometry(c.size, 0.024, 16, 32);
      const chMeshMat = new THREE.MeshStandardMaterial({
        color: c.color,
        emissive: c.color,
        emissiveIntensity: 0.7,
      });
      const chakraRing = new THREE.Mesh(chMeshGeo, chMeshMat);
      chakraRing.position.set(0, c.y, 0.02);
      chakraRing.rotation.x = Math.PI / 2;
      chakraRing.name = c.id;
      chakrasGroup.add(chakraRing);

      // Inner Core Luminous Sphere
      const coreGeo = new THREE.SphereGeometry(c.size * 0.45, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({ color: c.color });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, c.y, 0.02);
      chakrasGroup.add(core);
    });
    stageGroup.add(chakrasGroup);
    meshesRef.current.chakras = chakrasGroup;

    // The 3 Nadis (Sushumna, Ida, Pingala)
    const nadisGroup = new THREE.Group();
    // Central Sushumna Spine Column
    const sushumnaGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 16);
    const sushumnaMat = new THREE.MeshBasicMaterial({ color: 0xf3e8ff });
    const sushumnaMesh = new THREE.Mesh(sushumnaGeo, sushumnaMat);
    sushumnaMesh.position.set(0, 0.15, 0.02);
    nadisGroup.add(sushumnaMesh);

    // Ida (Lunar Blue) & Pingala (Solar Gold) Dual Sinusoidal Helices
    const idaPoints: THREE.Vector3[] = [];
    const pingalaPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const y = -0.85 + t * 2.0;
      const angle = t * Math.PI * 6;
      const xIda = Math.sin(angle) * 0.28;
      const xPing = -Math.sin(angle) * 0.28;
      idaPoints.push(new THREE.Vector3(xIda, y, Math.cos(angle) * 0.08 + 0.02));
      pingalaPoints.push(new THREE.Vector3(xPing, y, -Math.cos(angle) * 0.08 + 0.02));
    }
    const idaGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(idaPoints), 64, 0.018, 8, false);
    const idaMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
    const idaMesh = new THREE.Mesh(idaGeo, idaMat);
    nadisGroup.add(idaMesh);

    const pingGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pingalaPoints), 64, 0.018, 8, false);
    const pingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.6 });
    const pingMesh = new THREE.Mesh(pingGeo, pingMat);
    nadisGroup.add(pingMesh);

    stageGroup.add(nadisGroup);
    meshesRef.current.nadisGroup = nadisGroup;

    // --- AIRFLOW & KUNDALINI ENERGY PARTICLES ---
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 0.7;
      particlePositions[i * 3 + 1] = 0.9 - Math.random() * 1.6;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    stageGroup.add(particles);
    meshesRef.current.particles = particles;

    // -------------------------------------------------------------
    // Mouse Drag Orbital Controls
    // -------------------------------------------------------------
    const handleMouseDown = (e: MouseEvent) => {
      mouseState.current.isDown = true;
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseState.current.isDown) return;
      const dx = e.clientX - mouseState.current.prevX;
      const dy = e.clientY - mouseState.current.prevY;
      mouseState.current.rotY += dx * 0.008;
      mouseState.current.rotX = Math.max(-0.6, Math.min(0.6, mouseState.current.rotX + dy * 0.008));
      mouseState.current.prevX = e.clientX;
      mouseState.current.prevY = e.clientY;
    };
    const handleMouseUp = () => {
      mouseState.current.isDown = false;
    };
    const handleWheel = (e: WheelEvent) => {
      mouseState.current.dist = Math.max(1.8, Math.min(6.5, mouseState.current.dist + e.deltaY * 0.003));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('wheel', handleWheel, { passive: true });

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [environment]);

  // -------------------------------------------------------------
  // 3. Dynamic Demonstration Render Loop & Kinematics
  // -------------------------------------------------------------
  useEffect(() => {
    const renderLoop = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      const t = currentTime;
      const dur = duration;
      const {
        torso,
        spine,
        ribs,
        trachea,
        bronchialTree,
        leftLung,
        rightLung,
        diaphragm,
        heart,
        chakras,
        nadisGroup,
        humanSkeletonGroup,
        humanMusclesGroup,
        alignmentLaser,
        particles,
      } = meshesRef.current;

      // 1. Visibility Matrix for the 3 Core Demonstrations
      const isBreathing = activeDemo === 'breathing';
      const isAsana = activeDemo === 'yoga_asana';
      const isChakras = activeDemo === 'seven_chakras';

      if (leftLung) leftLung.visible = isBreathing;
      if (rightLung) rightLung.visible = isBreathing;
      if (diaphragm) diaphragm.visible = isBreathing;
      if (trachea) trachea.visible = isBreathing;
      if (bronchialTree) bronchialTree.visible = isBreathing;
      if (heart) heart.visible = isBreathing;

      if (humanSkeletonGroup) humanSkeletonGroup.visible = isAsana;
      if (humanMusclesGroup) humanMusclesGroup.visible = isAsana && showMuscleHeatmap;
      if (alignmentLaser) alignmentLaser.visible = isAsana && showAlignmentGuides;

      if (chakras) chakras.visible = isChakras;
      if (nadisGroup) nadisGroup.visible = isChakras && showNadis;

      // 2. DEMO 1: BREATHING & DIAPHRAGM KINEMATICS
      if (isBreathing) {
        // Calculate customizable cycle: Inhale, Hold, Exhale, Rest
        const totalCycle = inhaleDuration + holdDuration + exhaleDuration + restDuration;
        const cycleT = t % totalCycle;

        let breathPhase = 0; // 0 to 1
        if (cycleT < inhaleDuration) {
          // Inhalation: diaphragm flattens down, lungs inflate
          const p = cycleT / inhaleDuration;
          breathPhase = Math.sin((p * Math.PI) / 2);
        } else if (cycleT < inhaleDuration + holdDuration) {
          // Retention: stable full
          breathPhase = 1.0;
        } else if (cycleT < inhaleDuration + holdDuration + exhaleDuration) {
          // Exhalation: diaphragm domes upward, lungs deflate
          const p = (cycleT - (inhaleDuration + holdDuration)) / exhaleDuration;
          breathPhase = Math.cos((p * Math.PI) / 2);
        } else {
          // Rest / Shunyak: baseline empty
          breathPhase = 0.0;
        }

        // Volumetric Lung Expansion
        if (leftLung && rightLung) {
          const lx = 0.82 + breathPhase * 0.18;
          const ly = 1.4 + breathPhase * 0.16;
          const lz = 0.78 + breathPhase * 0.18;
          leftLung.scale.set(lx, ly, lz);
          rightLung.scale.set(lx * 1.03, ly * 1.03, lz * 1.03);

          const lMat = leftLung.material as THREE.MeshPhysicalMaterial;
          if (lMat) {
            lMat.emissiveIntensity = 0.25 * glowIntensity + (breathPhase > 0.8 ? 0.25 : 0);
          }
        }

        // Diaphragm Downward Contraction & Dome Flattening
        if (diaphragm) {
          const dy = -0.32 - breathPhase * 0.16 * diaphragmTension;
          const dFlatten = 1.0 - breathPhase * 0.3 * diaphragmTension;
          diaphragm.position.y = dy;
          diaphragm.scale.set(1.0 + breathPhase * 0.12, dFlatten, 1.0 + breathPhase * 0.12);
        }

        if (ribs) {
          const rScale = 1.0 + breathPhase * 0.09;
          ribs.scale.set(rScale, 1.0, rScale);
        }

        if (heart) {
          const hPulse = 1.0 + Math.sin(t * 8) * 0.08;
          heart.scale.set(hPulse, hPulse, hPulse);
        }

        // Airflow Particles (Inhale down, Exhale up)
        if (particles) {
          const pos = particles.geometry.attributes.position.array as Float32Array;
          const count = pos.length / 3;
          for (let i = 0; i < count; i++) {
            if (breathPhase > 0.1) {
              pos[i * 3 + 1] -= 0.015 * airflowSpeed;
              if (pos[i * 3 + 1] < -0.45) pos[i * 3 + 1] = 0.9;
            } else {
              pos[i * 3 + 1] += 0.012 * airflowSpeed;
              if (pos[i * 3 + 1] > 0.9) pos[i * 3 + 1] = -0.45;
            }
          }
          particles.geometry.attributes.position.needsUpdate = true;
        }
      }

      // 3. DEMO 2: YOGA ASANA SKELETAL RIGGING & MUSCLE HEATMAP
      if (isAsana && humanSkeletonGroup) {
        if (selectedAsana === 'bhujangasana') {
          // Cobra: Backward Arch
          humanSkeletonGroup.rotation.x = -0.42;
          if (torso) torso.rotation.x = -0.32;
        } else if (selectedAsana === 'padmasana') {
          // Lotus: Crossed knees, erect spine
          humanSkeletonGroup.rotation.x = 0;
          if (torso) torso.rotation.x = 0;
        } else if (selectedAsana === 'trikonasana') {
          // Triangle: Lateral bend
          humanSkeletonGroup.rotation.z = 0.35;
          if (torso) torso.rotation.z = 0.35;
        } else {
          humanSkeletonGroup.rotation.x = 0;
          humanSkeletonGroup.rotation.z = 0;
          if (torso) {
            torso.rotation.x = 0;
            torso.rotation.z = 0;
          }
        }
      }

      // 4. DEMO 3: SEVEN CHAKRAS ROTATIONS & NADIS
      if (isChakras && chakras) {
        chakras.children.forEach((ch, idx) => {
          if (ch instanceof THREE.Mesh && ch.geometry instanceof THREE.TorusGeometry) {
            ch.rotation.z += 0.02 * energyRotationSpeed * (idx % 2 === 0 ? 1 : -1);
          }
        });

        // Ascending Kundalini Prana Particles
        if (particles) {
          const pos = particles.geometry.attributes.position.array as Float32Array;
          const count = pos.length / 3;
          for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] += 0.015 * kundaliniParticleDensity;
            if (pos[i * 3 + 1] > 1.3) pos[i * 3 + 1] = -0.85;
          }
          particles.geometry.attributes.position.needsUpdate = true;
        }
      }

      // 5. Camera Kinematics
      const cam = cameraRef.current;
      const ms = mouseState.current;

      if (!ms.isDown) {
        if (cameraPreset === 'orbit_360') {
          ms.rotY += 0.006;
        } else if (cameraPreset === 'macro_organ') {
          ms.dist = 2.1;
          ms.targetY = isBreathing ? 0.0 : isChakras ? 0.3 : 0.1;
        } else if (cameraPreset === 'side_cross') {
          ms.rotY = Math.PI / 2;
          ms.dist = 3.2;
          ms.targetY = 0.1;
        } else if (cameraPreset === 'top_down') {
          ms.rotX = -0.55;
          ms.dist = 3.8;
          ms.targetY = 0.1;
        } else {
          ms.dist = 3.5;
          ms.targetY = 0.2;
        }
      }

      const camX = Math.sin(ms.rotY) * ms.dist * Math.cos(ms.rotX);
      const camZ = Math.cos(ms.rotY) * ms.dist * Math.cos(ms.rotX);
      const camY = Math.sin(ms.rotX) * ms.dist + ms.targetY;

      cam.position.set(camX, camY, camZ);
      cam.lookAt(0, ms.targetY, 0);

      rendererRef.current.render(sceneRef.current, cam);
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    currentTime,
    duration,
    activeDemo,
    breathingPreset,
    inhaleDuration,
    holdDuration,
    exhaleDuration,
    restDuration,
    diaphragmTension,
    airflowSpeed,
    selectedAsana,
    showMuscleHeatmap,
    showAlignmentGuides,
    selectedChakraFocus,
    energyRotationSpeed,
    showNadis,
    kundaliniParticleDensity,
    cameraPreset,
    glowIntensity,
  ]);

  // -------------------------------------------------------------
  // 4. Playback Timer Loop (60FPS Scrubber)
  // -------------------------------------------------------------
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration - 0.1) {
            setIsPlaying(false);
            return duration;
          }
          return parseFloat((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    if (currentTime >= duration) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // -------------------------------------------------------------
  // 5. 60FPS WebGL Canvas MP4 / WebM Video Export Engine
  // -------------------------------------------------------------
  const handleRenderAndExportMP4 = async () => {
    if (!canvasRef.current || isRecording) return;

    setIsRecording(true);
    setRecordingProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);

    try {
      const stream = canvasRef.current.captureStream(60);
      recordedChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm;codecs=vp9';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        setRenderedVideoUrl(videoUrl);
        setIsRecording(false);
      };

      recorder.start(100);

      const recordInterval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = parseFloat((prev + 0.1).toFixed(1));
          setRecordingProgress(Math.min(100, Math.round((next / duration) * 100)));
          if (next >= duration) {
            clearInterval(recordInterval);
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
            return duration;
          }
          return next;
        });
      }, 100);
    } catch (err) {
      console.error('Recording failed:', err);
      setIsRecording(false);
    }
  };

  // -------------------------------------------------------------
  // 6. Save Project to Bunny Database
  // -------------------------------------------------------------
  const handleSaveProject = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/avatar/3d-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          category: activeDemo,
          durationSeconds: duration,
          aspectRatio,
          modelType: activeDemo,
          activeOrganId:
            activeDemo === 'yoga_asana'
              ? selectedAsana
              : activeDemo === 'seven_chakras'
              ? selectedChakraFocus
              : 'lungs_diaphragm',
          cameraPreset,
          animationPreset: breathingPreset,
          timelineJson: JSON.stringify({
            duration,
            currentTime,
            inhaleDuration,
            holdDuration,
            exhaleDuration,
            restDuration,
          }),
          effectsJson: JSON.stringify({ showMuscleHeatmap, showAlignmentGuides, glowIntensity }),
          labelsEnabled,
          scientificMode,
          renderedVideoUrl: renderedVideoUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchProjects();
      }
    } catch (err) {
      console.error('Save project error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadProject = (proj: AnimationProject3D) => {
    setProjectTitle(proj.title);
    setActiveDemo(proj.category as any);
    setDuration((proj.durationSeconds as any) || 15);
    setAspectRatio(proj.aspectRatio || '16:9');
    setCameraPreset((proj.cameraPreset as any) || 'front_cinematic');
    setLabelsEnabled(proj.labelsEnabled !== false);
    setScientificMode(proj.scientificMode !== false);
    if (proj.renderedVideoUrl) setRenderedVideoUrl(proj.renderedVideoUrl);
    setShowProjectsDrawer(false);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Subtitle Narration Generator
  const getCurrentSubtitle = () => {
    const t = currentTime;
    if (activeDemo === 'breathing') {
      const totalCycle = inhaleDuration + holdDuration + exhaleDuration + restDuration;
      const cycleT = t % totalCycle;

      if (cycleT < inhaleDuration) {
        return language === 'hi'
          ? `पूरक (${inhaleDuration}s): डायफ्राम नीचे संकुचित होता है और फेफड़े पूर्ण फैलते हैं।`
          : language === 'mr'
          ? `पूरक (${inhaleDuration}s): मध्यपट खाली आकुंचन पावतो व फुफ्फुसे पूर्ण विस्तारतात.`
          : `Inhalation (${inhaleDuration}s): Diaphragm contracts downwards and lungs expand volumetrically.`;
      } else if (cycleT < inhaleDuration + holdDuration) {
        return language === 'hi'
          ? `कुम्भक (${holdDuration}s): वायुकोष्ठिकाओं (Alveoli) में प्राण वायु का अवशोषण।`
          : language === 'mr'
          ? `कुंभक (${holdDuration}s): वायुकोशांमध्ये प्राण वायूचे संपूर्ण शरीरात शोषण.`
          : `Retention (${holdDuration}s): Prana and oxygen absorption in the pulmonary alveoli.`;
      } else if (cycleT < inhaleDuration + holdDuration + exhaleDuration) {
        return language === 'hi'
          ? `रेचक (${exhaleDuration}s): डायफ्राम ऊपर गुंबद के रूप में विश्राम करता है।`
          : language === 'mr'
          ? `रेचक (${exhaleDuration}s): मध्यपट वर डोम आकारात विश्रांती घेतो.`
          : `Exhalation (${exhaleDuration}s): Diaphragm relaxes upward into an inverted dome shape.`;
      } else {
        return language === 'hi'
          ? `शून्यक (${restDuration}s): शांत स्थिति • नवचेतना संचय।`
          : language === 'mr'
          ? `शून्यक (${restDuration}s): शांत स्थिती • नवचेतना संचय.`
          : `Rest (${restDuration}s): Grounding pause before next respiratory wave.`;
      }
    } else if (activeDemo === 'yoga_asana') {
      return language === 'hi'
        ? `${selectedAsana.toUpperCase()}: मेरुदंड लचीलापन, लाल रंग = संकुचित मांसपेशी, हरा रंग = खिंचाव।`
        : language === 'mr'
        ? `${selectedAsana.toUpperCase()}: पाठीचा कणा संतुलन, लाल = आकुंचन, हिरवा = स्नायू ताण.`
        : `${selectedAsana.toUpperCase()}: Spinal flexion & posture alignment; Red = Contracting, Green = Lengthening.`;
    } else {
      return language === 'hi'
        ? 'सुषुम्ना मध्य नाड़ी के साथ 7 चक्रों का ऊर्जा संरेखण, घूर्णन व कुंडलिनी स्पंदन।'
        : language === 'mr'
        ? 'सुषुम्ना नाडीसह ७ चक्रांचे ऊर्जा संतुलन, घूर्णन व कुंडलिनी स्पंदन.'
        : '7 Chakras counter-rotating along Sushumna Nadi with vibrant Kundalini energy waves.';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20">
            <Layers size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Swar Yoga 3D/4D Animation Engine
              </h2>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                Foundational Demonstrations
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Build one powerful animation engine first, then create hundreds of reusable educational animations.
            </p>
          </div>
        </div>

        {/* Global Studio Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aspect Ratio Toggle (16:9 Landscape vs 9:16 Shorts/Reels) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                aspectRatio === '16:9' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              16:9 Land
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                aspectRatio === '9:16' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              9:16 Reel
            </button>
          </div>

          <button
            onClick={() => setShowProjectsDrawer(!showProjectsDrawer)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen size={14} />
            <span>Saved Projects ({savedProjects.length})</span>
          </button>

          <button
            onClick={handleSaveProject}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} className={saveSuccess ? 'text-emerald-400' : 'text-slate-300'} />
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved to DB!' : 'Save Project'}</span>
          </button>

          <button
            onClick={handleRenderAndExportMP4}
            disabled={isRecording}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 text-black font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Video size={14} />
            <span>{isRecording ? `Rendering ${recordingProgress}%` : 'Render & Export MP4'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE THREE FOUNDATIONAL DEMONSTRATION TABS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            id: 'breathing' as CoreDemonstration,
            num: '1',
            title: 'Breathing and Pranayama',
            subtitle: 'Lungs, diaphragm, airflow and breathing cycles',
            icon: '🫁',
            badge: 'Diaphragm 4D',
            activeClass: 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/50 shadow-lg',
          },
          {
            id: 'yoga_asana' as CoreDemonstration,
            num: '2',
            title: 'Yoga Asanas',
            subtitle: 'Human skeleton, muscles and posture movements',
            icon: '🧘',
            badge: 'Musculoskeletal Rig',
            activeClass: 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/50 shadow-lg',
          },
          {
            id: 'seven_chakras' as CoreDemonstration,
            num: '3',
            title: 'Seven Chakras',
            subtitle: 'Chakra positions, colors, rotations and visual effects',
            icon: '⚡',
            badge: '7 Lotus Rings & Nadis',
            activeClass: 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500/50 shadow-lg',
          },
        ].map((tab) => {
          const isSelected = activeDemo === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectDemo(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? tab.activeClass
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{tab.icon}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                  isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
                }`}>
                  Demo {tab.num} • {tab.badge}
                </span>
              </div>
              <div className="mt-2">
                <h3 className="text-white font-extrabold text-sm">{tab.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{tab.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Main Studio Workspace (12 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Viewport & Multi-Track Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className={`relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[600px] mx-auto'} rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col justify-between p-4 group transition-all`}>
            {/* The Three.js WebGL Mount */}
            <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Top Bar HUD: Title & Duration Selector */}
            <div className="relative z-10 flex items-center justify-between text-xs pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="px-2.5 py-1 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] shadow">
                  3D/4D Engine
                </span>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-white font-bold text-xs max-w-xs truncate focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Timecode & Duration */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 flex items-center gap-1">
                  {([10, 15, 20] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDuration(d);
                        if (currentTime > d) setCurrentTime(0);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        duration === d ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 font-mono text-cyan-400 font-bold text-xs">
                  <Clock size={12} />
                  <span>00:{currentTime.toFixed(1).padStart(4, '0')}s / 00:{duration}.0s</span>
                </div>
              </div>
            </div>

            {/* Floating 3D Educational Labels Overlay */}
            {labelsEnabled && (
              <div className="relative z-10 self-start pointer-events-none space-y-1.5 text-xs max-w-sm">
                {activeDemo === 'breathing' && (
                  <>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Trachea & Bronchi (श्वासनली व प्राथमिक शाखाएं)</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-rose-500/40 text-rose-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Volumetric Lungs (फेफड़े प्रसरण/संकुचन)</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/40 text-amber-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Phrenic Diaphragm (डायफ्राम संकुचन व गुंबद आकार)</span>
                    </div>
                  </>
                )}

                {activeDemo === 'yoga_asana' && (
                  <>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Spine Plumb-Line Alignment (मेरुदंड संरेखण)</span>
                    </div>
                    {showMuscleHeatmap && (
                      <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/40 text-amber-300 font-mono text-[10px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span>लाल = संकुचित मांसपेशी • हरा = खिंचाव (Heatmap)</span>
                      </div>
                    )}
                  </>
                )}

                {activeDemo === 'seven_chakras' && (
                  <>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-purple-500/40 text-purple-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span>Sushumna Nadi (सुषुम्ना मध्य रीढ़ ऊर्जा अक्ष)</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-mono text-[10px] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>इड़ा (Ida Chandra) व पिंगला (Pingala Surya)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bottom Subtitle Narration Bar */}
            <div className="relative z-10 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none">
              <div>
                <span className="text-[10px] font-bold font-mono text-cyan-400 uppercase tracking-wider block">
                  {activeDemo.replace('_', ' ').toUpperCase()} • 4D Synchronized Narration
                </span>
                <span className="text-white text-xs sm:text-sm font-semibold">
                  {getCurrentSubtitle()}
                </span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto shrink-0">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-bold"
                >
                  <option value="hi">🇮🇳 हिंदी</option>
                  <option value="mr">🚩 मराठी</option>
                  <option value="en">🇬🇧 English</option>
                </select>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] font-mono">
                  60 FPS
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Multi-Track Timeline & Camera Controls */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <div className="space-y-1.5">
              {/* Scrubbable Progress Bar */}
              <div
                className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentTime(parseFloat((pct * duration).toFixed(1)));
                }}
                title="Click anywhere to scrub timeline"
              >
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 transition-all duration-75 relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Milestones */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>00:00s (Phase 1)</span>
                <span>{`00:${(duration * 0.4).toFixed(0).padStart(2, '0')}s (Peak / Hold)`}</span>
                <span>{`00:${(duration * 0.6).toFixed(0).padStart(2, '0')}s (Action / Release)`}</span>
                <span>{`00:${duration}.0s (End)`}</span>
              </div>
            </div>

            {/* Playback Controls & Camera Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black font-extrabold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-black" />}
                  <span>{isPlaying ? 'Pause' : currentTime >= duration ? 'Replay' : 'Play 4D Timeline'}</span>
                </button>

                <button
                  onClick={handleRestart}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Restart timeline to 0s"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Camera Presets */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <Camera size={12} className="text-slate-400 ml-1.5 mr-0.5" />
                {[
                  { id: 'front_cinematic', label: 'Front' },
                  { id: 'macro_organ', label: 'Macro' },
                  { id: 'side_cross', label: 'Side 90°' },
                  { id: 'orbit_360', label: '360°' },
                  { id: 'top_down', label: 'Top' },
                ].map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setCameraPreset(cam.id as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rendered Video Export Modal / Preview */}
          {renderedVideoUrl && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <video
                  src={renderedVideoUrl}
                  className="w-24 aspect-video rounded-lg object-cover border border-emerald-400/50"
                  autoPlay
                  loop
                  muted
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    ✓ 3D Animation Video Rendered (60 FPS MP4)
                  </span>
                  <span className="text-[11px] text-emerald-300">
                    Ready for class presentation, video production studio, or social sharing.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={renderedVideoUrl}
                  download={`${projectTitle.toLowerCase().replace(/\s+/g, '_')}.mp4`}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs shadow flex items-center gap-1.5"
                >
                  <Download size={13} />
                  <span>Download MP4</span>
                </a>

                {onSendToVideoStudio && (
                  <button
                    onClick={() => onSendToVideoStudio({ videoUrl: renderedVideoUrl, title: projectTitle })}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  >
                    Send to Master Studio ➔
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Specialized Demonstration Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* ========================================================
              DEMO 1: BREATHING & PRANAYAMA CONTROLLER
             ======================================================== */}
          {activeDemo === 'breathing' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Activity size={13} className="text-cyan-400" />
                <span>Breathing-Cycle 4-Phase Controller</span>
              </span>

              {/* Timing Sliders */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>1. Inhalation (पूरक):</span>
                    <span className="text-cyan-400 font-mono">{inhaleDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={inhaleDuration}
                    onChange={(e) => setInhaleDuration(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>2. Retention / Hold (कुम्भक):</span>
                    <span className="text-amber-400 font-mono">{holdDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={holdDuration}
                    onChange={(e) => setHoldDuration(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>3. Exhalation (रेचक):</span>
                    <span className="text-rose-400 font-mono">{exhaleDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    value={exhaleDuration}
                    onChange={(e) => setExhaleDuration(parseInt(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 font-bold mb-1">
                    <span>4. Rest / Pause (शून्यक):</span>
                    <span className="text-purple-400 font-mono">{restDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={restDuration}
                    onChange={(e) => setRestDuration(parseInt(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] text-slate-400 font-bold block">Quick Breathing Presets:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'dirgha', label: 'Dirgha (4-2-6-2)' },
                    { id: 'kapalabhati', label: 'Kapalabhati' },
                    { id: 'anulom_vilom', label: 'Anulom Vilom' },
                    { id: 'bhastrika', label: 'Bhastrika' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setBreathingPreset(p.id as any);
                        if (p.id === 'dirgha') {
                          setInhaleDuration(4);
                          setHoldDuration(2);
                          setExhaleDuration(6);
                          setRestDuration(2);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-white font-bold text-center cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              DEMO 2: YOGA ASANA SKELETON & MUSCLE CONTROLLER
             ======================================================== */}
          {activeDemo === 'yoga_asana' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Compass size={13} className="text-emerald-400" />
                <span>Asana & Musculoskeletal Biomechanics</span>
              </span>

              {/* Asana Selector */}
              <div className="space-y-1.5">
                {[
                  { id: 'bhujangasana', label: 'Bhujangasana (भुजंगासन - Cobra)', desc: 'Lumbar spine arch & thoracic expansion' },
                  { id: 'padmasana', label: 'Padmasana (पद्मासन - Lotus)', desc: 'Hip external rotation & straight spine' },
                  { id: 'tadasana', label: 'Tadasana (ताड़ासन - Mountain)', desc: 'Plumb-line gravity alignment' },
                  { id: 'trikonasana', label: 'Trikonasana (त्रिकोणासन - Triangle)', desc: 'Lateral oblique stretch & balance' },
                  { id: 'vajrasana', label: 'Vajrasana (वज्रासन - Thunderbolt)', desc: 'Knee flexion & digestive erect spine' },
                ].map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => setSelectedAsana(pose.id as any)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      selectedAsana === pose.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold block text-white text-[11px]">{pose.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{pose.desc}</span>
                  </button>
                ))}
              </div>

              {/* Biomechanical Toggles */}
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="text-slate-300">Muscle Tension Heatmap (Red/Green)</span>
                  <input
                    type="checkbox"
                    checked={showMuscleHeatmap}
                    onChange={(e) => setShowMuscleHeatmap(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="text-slate-300">Posture Alignment Laser Guide</span>
                  <input
                    type="checkbox"
                    checked={showAlignmentGuides}
                    onChange={(e) => setShowAlignmentGuides(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ========================================================
              DEMO 3: SEVEN CHAKRAS & NADIS CONTROLLER
             ======================================================== */}
          {activeDemo === 'seven_chakras' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Zap size={13} className="text-purple-400" />
                <span>Chakra Sacred Geometry & Nadis</span>
              </span>

              {/* 7 Chakras Focus Selector */}
              <div className="space-y-1">
                {[
                  { id: 'all_chakras', label: 'All 7 Chakras & Kundalini Axis', color: '#a855f7' },
                  { id: 'sahasrara', label: '7. Sahasrara (सहस्रार - Crown)', color: '#a855f7' },
                  { id: 'ajna', label: '6. Ajna (आज्ञा - Third Eye)', color: '#6366f1' },
                  { id: 'vishuddha', label: '5. Vishuddha (विशुद्धि - Throat)', color: '#06b6d4' },
                  { id: 'anahata', label: '4. Anahata (अनाहत - Heart)', color: '#22c55e' },
                  { id: 'manipura', label: '3. Manipura (मणिपुर - Solar Plexus)', color: '#eab308' },
                  { id: 'swadhisthana', label: '2. Swadhisthana (स्वाधिष्ठान - Sacral)', color: '#f97316' },
                  { id: 'muladhara', label: '1. Muladhara (मूलाधार - Root)', color: '#ef4444' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChakraFocus(ch.id)}
                    className={`w-full p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                      selectedChakraFocus === ch.id
                        ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span className="font-bold text-[11px] truncate">{ch.label}</span>
                    </div>
                    <ArrowRight size={12} className="opacity-50" />
                  </button>
                ))}
              </div>

              {/* Energy Controls */}
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1">
                  <span className="text-slate-300">Show Ida, Pingala & Sushumna</span>
                  <input
                    type="checkbox"
                    checked={showNadis}
                    onChange={(e) => setShowNadis(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                </label>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Lotus Ring Rotation Speed:</span>
                    <span>{energyRotationSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={energyRotationSpeed}
                    onChange={(e) => setEnergyRotationSpeed(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Environment & Lighting Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Sun size={13} className="text-amber-400" />
              <span>Studio Lighting & Glow</span>
            </span>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-bold">Environment:</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
              >
                <option value="medical_dark">🌌 Medical Dark Diagnostic (High Contrast)</option>
                <option value="vedic_ashram">🏛️ Vedic Ashram Studio (Warm Candlelit)</option>
                <option value="himalayan_dawn">🌄 Himalayan Dawn (Golden Sunrise)</option>
                <option value="transparent_studio">✨ Transparent Studio (Alpha Overlay)</option>
              </select>
            </div>

            <div className="pt-1">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Organ & Aura Glow Intensity:</span>
                <span>{glowIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Saved Projects Drawer Modal */}
      {showProjectsDrawer && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-cyan-400" />
              <span>Saved 3D/4D Animation Projects in Bunny Database</span>
            </span>
            <button
              onClick={() => setShowProjectsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {savedProjects.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 text-xs">
                No saved projects yet. Click "Save Project" above to save your first 3D animation.
              </div>
            ) : (
              savedProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono font-bold">
                      <span>{proj.category}</span>
                      <span>{proj.durationSeconds}s</span>
                    </div>
                    <h4 className="text-white font-bold text-xs mt-1 truncate">{proj.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Organ: {proj.activeOrganId} • Preset: {proj.animationPreset}
                    </p>
                  </div>

                  <button
                    onClick={() => handleLoadProject(proj)}
                    className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs cursor-pointer text-center"
                  >
                    Open in Studio ➔
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
