import { WordBoundaryEvent } from './edgeTtsClient';

export interface ARKitBlendshapes {
  jawOpen: number; // 0.0 - 1.0
  mouthFunnel: number;
  mouthPucker: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthClose: number;
  mouthDimpleLeft: number;
  mouthDimpleRight: number;
  mouthLowerDownLeft: number;
  mouthLowerDownRight: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  browInnerUp: number;
}

export interface VisemeFrame {
  timestampMs: number;
  blendshapes: ARKitBlendshapes;
  word?: string;
}

const DEFAULT_NEUTRAL_BLENDSHAPES: ARKitBlendshapes = {
  jawOpen: 0.0,
  mouthFunnel: 0.0,
  mouthPucker: 0.0,
  mouthSmileLeft: 0.1, // subtle natural resting smile
  mouthSmileRight: 0.1,
  mouthClose: 0.85,
  mouthDimpleLeft: 0.0,
  mouthDimpleRight: 0.0,
  mouthLowerDownLeft: 0.0,
  mouthLowerDownRight: 0.0,
  eyeBlinkLeft: 0.0,
  eyeBlinkRight: 0.0,
  browInnerUp: 0.0,
};

/**
 * Maps word text and character distributions to phoneme mouth shapes (visemes)
 */
function estimateWordVisemes(word: string): Array<{ relativeFraction: number; shapes: Partial<ARKitBlendshapes> }> {
  const clean = word.toLowerCase().trim();
  if (!clean) return [{ relativeFraction: 1, shapes: DEFAULT_NEUTRAL_BLENDSHAPES }];

  const steps: Array<{ relativeFraction: number; shapes: Partial<ARKitBlendshapes> }> = [];
  const chars = clean.split('');
  const total = chars.length;

  for (let i = 0; i < total; i++) {
    const ch = chars[i];
    const fraction = 1 / total;

    // Vowel & Consonant Viseme Rules (compatible with Indian phonetics & English)
    if (['a', 'आ', 'ा', 'अ'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.8, mouthClose: 0.0, mouthFunnel: 0.2, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
      });
    } else if (['o', 'ओ', 'ो', 'औ'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.65, mouthFunnel: 0.8, mouthPucker: 0.6, mouthClose: 0.0 },
      });
    } else if (['u', 'oo', 'उ', 'ू', 'ु'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.35, mouthPucker: 0.9, mouthFunnel: 0.65, mouthClose: 0.0 },
      });
    } else if (['e', 'i', 'ee', 'इ', 'ई', 'ि', 'ी', 'ए', 'े', 'ै'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.4, mouthSmileLeft: 0.6, mouthSmileRight: 0.6, mouthClose: 0.0 },
      });
    } else if (['m', 'p', 'b', 'म', 'प', 'ब', 'भ'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.05, mouthClose: 0.95, mouthPucker: 0.1 },
      });
    } else if (['f', 'v', 'फ', 'व'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.25, mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4, mouthClose: 0.2 },
      });
    } else if (['s', 'z', 'sh', 'स', 'श', 'ष', 'ज़'].includes(ch)) {
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.2, mouthSmileLeft: 0.35, mouthSmileRight: 0.35, mouthClose: 0.1 },
      });
    } else {
      // General consonant opening
      steps.push({
        relativeFraction: fraction,
        shapes: { jawOpen: 0.35, mouthClose: 0.15, mouthDimpleLeft: 0.1, mouthDimpleRight: 0.1 },
      });
    }
  }

  return steps;
}

/**
 * Builds continuous 60FPS or 30FPS viseme animation keyframes from Edge-TTS word boundary timestamps.
 */
export function generateVisemeTimeline(
  wordBoundaries: WordBoundaryEvent[],
  totalDurationMs: number,
  fps: number = 30
): VisemeFrame[] {
  const frameIntervalMs = 1000 / fps;
  const frames: VisemeFrame[] = [];
  const totalFrames = Math.ceil(totalDurationMs / frameIntervalMs);

  // Pre-generate word lookup by time
  const wordWindows = wordBoundaries.map((wb) => ({
    start: wb.offsetMs,
    end: wb.offsetMs + wb.durationMs,
    word: wb.text,
    visemes: estimateWordVisemes(wb.text),
  }));

  for (let f = 0; f <= totalFrames; f++) {
    const timeMs = f * frameIntervalMs;

    // Find if a word is being spoken at this exact millisecond
    const active = wordWindows.find((w) => timeMs >= w.start && timeMs <= w.end);

    let activeShapes: ARKitBlendshapes = { ...DEFAULT_NEUTRAL_BLENDSHAPES };
    let currentWord: string | undefined;

    if (active && active.visemes.length > 0) {
      currentWord = active.word;
      const progressInWord = (timeMs - active.start) / Math.max(1, active.end - active.start);

      // Interpolate through sub-visemes in the word
      let accumulated = 0;
      let matchedViseme = active.visemes[0];
      for (const step of active.visemes) {
        accumulated += step.relativeFraction;
        if (progressInWord <= accumulated) {
          matchedViseme = step;
          break;
        }
      }

      activeShapes = {
        ...DEFAULT_NEUTRAL_BLENDSHAPES,
        ...matchedViseme.shapes,
      };

      // Add gentle dynamic speech cadence
      const cadence = Math.sin(timeMs * 0.02) * 0.08;
      activeShapes.jawOpen = Math.min(1.0, Math.max(0.05, activeShapes.jawOpen + cadence));
    }

    // Natural Eye Blinking Logic (every 3.5 to 4.5 seconds for ~150ms)
    const blinkCycle = timeMs % 3800;
    if (blinkCycle >= 3650 && blinkCycle <= 3800) {
      const blinkProgress = Math.sin(((blinkCycle - 3650) / 150) * Math.PI);
      activeShapes.eyeBlinkLeft = Number(blinkProgress.toFixed(2));
      activeShapes.eyeBlinkRight = Number(blinkProgress.toFixed(2));
    } else {
      activeShapes.eyeBlinkLeft = 0;
      activeShapes.eyeBlinkRight = 0;
    }

    // Micro brow expressiveness
    if (currentWord && currentWord.length > 4) {
      activeShapes.browInnerUp = 0.25;
    }

    frames.push({
      timestampMs: Math.round(timeMs),
      blendshapes: activeShapes,
      word: currentWord,
    });
  }

  return frames;
}
