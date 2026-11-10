export type AvatarProviderType = 'heygen' | 'replicate' | 'swar_neural';

export type ExtractionJobStatus =
  | 'queued'
  | 'validating'
  | 'extracting_landmarks'
  | 'training'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface VideoValidationInput {
  format?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  hasAudio?: boolean;
}

export interface VideoValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number | null; // null when no inference or measurement was performed
  resolutionLabel: string; // e.g. "1080p Full HD"
}

export interface FaceBiometrics {
  landmarksCount: number; // typically 468 points
  blendshapesCount: number; // 52 ARKit blendshapes
  identityMatchScore: number; // e.g. 99.4%
  skinTone: string;
  symmetryScore: number;
  neutralPoseCalibrated: boolean;
  eyeGazeVector: [number, number, number];
  headPoseEulerAngles: { pitch: number; yaw: number; roll: number };
  faceBoundingBox: { x: number; y: number; width: number; height: number };
}

export interface AvatarExtractionJob {
  id: string;
  avatarName: string;
  sourceVideoId?: string;
  sourceVideoUrl: string;
  provider: AvatarProviderType;
  providerJobId?: string;
  status: ExtractionJobStatus;
  progressPercent: number;
  currentStepText: string;
  extractedFaceUrl?: string;
  cutoutUrl?: string;
  extractedAvatarId?: string;
  faceLandmarks?: FaceBiometrics;
  errorMessage?: string;
  consentConfirmed: boolean;
  consentText?: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceVideoItem {
  id: string;
  name: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  resolution: string;
  fileSizeBytes: number;
  format: string;
  qualityScore: number;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderStatusInfo {
  provider: AvatarProviderType;
  name: string;
  isConfigured: boolean;
  description: string;
  requiredEnvVars: string[];
  setupGuideUrl?: string;
  existingAvatarsCount?: number;
  notes?: string;
}
