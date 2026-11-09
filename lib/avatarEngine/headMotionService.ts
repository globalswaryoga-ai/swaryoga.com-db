/** Procedural preview cues only; this does not drive a rig or neural renderer. */

export interface HeadMotionFrame {
  timestampMs: number;
  frameIndex: number;
  // 6DoF Head Rotation (Degrees)
  headPitchDeg: number;  // Up / Down nodding
  headYawDeg: number;    // Left / Right turning
  headRollDeg: number;   // Lateral tilting
  // Eye Eyelid Aperture (0.0 = fully open, 1.0 = fully closed)
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  // Pupil Gaze Offset (-1.0 to +1.0)
  gazeX: number;
  gazeY: number;
  // Upper Torso & Shoulder Sway (mm)
  shoulderBreatheMm: number;
  // Facial Muscle Micro-Dynamics
  eyebrowRaise: number;
  cheekSmileSlight: number;
}

export interface HeadMotionConfig {
  fps?: number;                      // Default: 25 or 30 fps
  durationSeconds: number;           // Total duration matching audio
  blinkRateBpm?: number;             // Default: 18 blinks per minute
  noddingIntensity?: number;         // 0.0 (static) to 1.5 (expressive), default: 0.8
  gazeMode?: 'direct' | 'classroom' | 'meditative';
  wordTimings?: Array<{ offsetMs: number; durationMs: number; text: string }>;
}

export class HeadMotionEngine {
  public static readonly status = 'procedural_preview_only' as const;

  public static generateTrajectory(config: HeadMotionConfig): HeadMotionFrame[] {
    const fps = config.fps || 25;
    const totalFrames = Math.max(1, Math.round(config.durationSeconds * fps));
    const blinkBpm = config.blinkRateBpm || 18;
    const nodScale = config.noddingIntensity ?? 0.8;
    const frameIntervalMs = 1000 / fps;

    // Generate deterministic preview timing; this is not a physiological model.
    const blinkIntervalSec = 60 / blinkBpm;
    const blinkEvents: Array<{ startMs: number; durationMs: number }> = [];
    let currentBlinkTime = 1.2; // First blink around 1.2s

    while (currentBlinkTime < config.durationSeconds) {
      // Jitter blink intervals between -0.7s and +0.9s
      const jitter = (Math.sin(currentBlinkTime * 1.7) * 0.5) + (Math.cos(currentBlinkTime * 2.3) * 0.3);
      const blinkDuration = 220 + Math.abs(Math.sin(currentBlinkTime * 3.1)) * 60; // 220ms - 280ms
      blinkEvents.push({
        startMs: currentBlinkTime * 1000,
        durationMs: blinkDuration,
      });
      currentBlinkTime += Math.max(2.0, blinkIntervalSec + jitter);
    }

    const frames: HeadMotionFrame[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const timestampMs = Math.round(i * frameIntervalMs);
      const t = timestampMs / 1000;

      // 1. 6DoF Continuous Head Motion Curves (Harmonic multi-frequency synthesis)
      // Pitch: Conversational nods (0.8 Hz) + breathing pitch (0.25 Hz)
      const basePitch = (Math.sin(t * 2.1) * 1.8 * nodScale) + (Math.sin(t * 5.2) * 0.7 * nodScale);
      
      // Yaw: Gentle lateral conversational sway (-3.5° to +3.5°)
      const baseYaw = (Math.sin(t * 1.1) * 3.2 * nodScale) + (Math.cos(t * 0.4) * 1.5 * nodScale);
      
      // Roll: Subtle equilibrium stabilization (-1.2° to +1.2°)
      const baseRoll = Math.sin(t * 0.8) * 1.1 * nodScale;

      // Add speech emphasis if word timings are provided
      let speechEmphasisPitch = 0;
      let speechEyebrowRaise = 0;
      if (config.wordTimings && config.wordTimings.length > 0) {
        for (const w of config.wordTimings) {
          const dt = timestampMs - w.offsetMs;
          if (dt >= 0 && dt <= w.durationMs) {
            // Emphasize head nod at start of important word
            const wordPhase = dt / w.durationMs;
            if (wordPhase < 0.4) {
              speechEmphasisPitch = Math.sin(wordPhase * Math.PI) * 1.4 * nodScale;
              speechEyebrowRaise = Math.sin(wordPhase * Math.PI) * 0.25;
            }
            break;
          }
        }
      }

      // 2. Natural Eyelid Closure (Cosine Window to prevent eyelid swelling/warping)
      let blinkAmount = 0;
      for (const b of blinkEvents) {
        if (timestampMs >= b.startMs && timestampMs <= b.startMs + b.durationMs) {
          const progress = (timestampMs - b.startMs) / b.durationMs;
          // Smooth rise and fall: 0 -> 1 -> 0
          blinkAmount = Math.sin(progress * Math.PI);
          break;
        }
      }

      // Meditative mode has gentle partial eye-droop
      const baseEyeDroop = config.gazeMode === 'meditative' ? 0.35 : 0.0;
      const finalBlink = Math.min(1.0, baseEyeDroop + blinkAmount);

      // 3. Micro-Saccade Gaze Movements (Subtle natural eye saccades)
      const gazeX = Math.sin(t * 1.7) * 0.08 + (config.gazeMode === 'classroom' ? 0.25 * Math.sin(t * 0.3) : 0);
      const gazeY = Math.cos(t * 2.3) * 0.05;

      // 4. Subtle Respiratory Shoulder Sway (0.25 Hz yogic breathing)
      const shoulderBreatheMm = Math.sin(t * 1.5) * 1.8;

      frames.push({
        timestampMs,
        frameIndex: i,
        headPitchDeg: Number((basePitch + speechEmphasisPitch).toFixed(2)),
        headYawDeg: Number(baseYaw.toFixed(2)),
        headRollDeg: Number(baseRoll.toFixed(2)),
        eyeBlinkLeft: Number(finalBlink.toFixed(3)),
        eyeBlinkRight: Number(finalBlink.toFixed(3)),
        gazeX: Number(gazeX.toFixed(3)),
        gazeY: Number(gazeY.toFixed(3)),
        shoulderBreatheMm: Number(shoulderBreatheMm.toFixed(2)),
        eyebrowRaise: Number(speechEyebrowRaise.toFixed(2)),
        cheekSmileSlight: Number((0.08 + 0.04 * Math.sin(t * 0.9)).toFixed(2)),
      });
    }

    return frames;
  }
}
