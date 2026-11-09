import { HeadMotionEngine } from '@/lib/avatarEngine/headMotionService';

describe('Procedural head-motion preview tests', () => {
  it('identifies generated cues as an unintegrated procedural preview', () => {
    expect(HeadMotionEngine.status).toBe('procedural_preview_only');
  });

  it('generates frame-accurate trajectory matching duration and FPS', () => {
    const trajectory = HeadMotionEngine.generateTrajectory({
      durationSeconds: 5.0,
      fps: 25,
      blinkRateBpm: 18,
    });

    expect(trajectory.length).toBe(125); // 5.0s * 25 fps
    expect(trajectory[0].timestampMs).toBe(0);
    expect(trajectory[trajectory.length - 1].timestampMs).toBe(4960);
  });

  it('keeps generated head-angle cues within configured bounds', () => {
    const trajectory = HeadMotionEngine.generateTrajectory({
      durationSeconds: 10.0,
      fps: 30,
      noddingIntensity: 1.0,
    });

    for (const frame of trajectory) {
      expect(frame.headYawDeg).toBeGreaterThanOrEqual(-15);
      expect(frame.headYawDeg).toBeLessThanOrEqual(15);
      expect(frame.headPitchDeg).toBeGreaterThanOrEqual(-12);
      expect(frame.headPitchDeg).toBeLessThanOrEqual(12);
      expect(frame.headRollDeg).toBeGreaterThanOrEqual(-6);
      expect(frame.headRollDeg).toBeLessThanOrEqual(6);
    }
  });

  it('generates bounded eyelid-aperture cues', () => {
    const trajectory = HeadMotionEngine.generateTrajectory({
      durationSeconds: 10.0,
      fps: 25,
      blinkRateBpm: 18,
    });

    // Verify blinks occur and return to open state
    let maxBlink = 0;
    let minBlink = 1;
    let blinkClosedFrames = 0;

    for (const frame of trajectory) {
      expect(frame.eyeBlinkLeft).toBeGreaterThanOrEqual(0.0);
      expect(frame.eyeBlinkLeft).toBeLessThanOrEqual(1.0);
      expect(frame.eyeBlinkRight).toBe(frame.eyeBlinkLeft); // Symmetrical natural blinking

      if (frame.eyeBlinkLeft > maxBlink) maxBlink = frame.eyeBlinkLeft;
      if (frame.eyeBlinkLeft < minBlink) minBlink = frame.eyeBlinkLeft;
      if (frame.eyeBlinkLeft > 0.8) blinkClosedFrames++;
    }

    expect(maxBlink).toBeGreaterThan(0.9); // Eye closes fully during blink
    expect(minBlink).toBe(0.0);           // Eye opens fully between blinks
    expect(blinkClosedFrames).toBeGreaterThan(0); // Multiple blinks occurred
  });

  it('modulates head nod on speech word boundaries', () => {
    const wordTimings = [
      { offsetMs: 1000, durationMs: 400, text: 'नमस्ते' },
      { offsetMs: 2500, durationMs: 500, text: 'स्वर' },
    ];

    const withSpeech = HeadMotionEngine.generateTrajectory({
      durationSeconds: 4.0,
      fps: 25,
      wordTimings,
    });

    // Check frame during word onset has speech nod
    const wordFrame = withSpeech.find(f => f.timestampMs >= 1050 && f.timestampMs <= 1150);
    expect(wordFrame).toBeDefined();
    expect(wordFrame!.eyebrowRaise).toBeGreaterThan(0);
  });
});
