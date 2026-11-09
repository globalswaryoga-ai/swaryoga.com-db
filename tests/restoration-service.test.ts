import { BeardLipRestorationEngine } from '@/lib/avatarEngine/restorationService';

describe('Beard & Lip restoration planning diagnostics', () => {
  it('computes target crop and resolution without claiming unimplemented inference', () => {
    const faceBox = { x: 500, y: 300, width: 400, height: 500 };

    const plan1080p = BeardLipRestorationEngine.computeRestorationPlan(faceBox, {
      targetResolution: '1080p',
    });

    expect(plan1080p.outputDimensions).toEqual({ width: 1920, height: 1080 });
    expect(plan1080p.implementationStatus).toBe('not_implemented');
    expect(plan1080p.plannedCropPaddingPx).toBe(16);
    expect(plan1080p.plannedCropRegion).toEqual({
      x: 484,
      y: 292,
      width: 432,
      height: 532,
    });
    expect(plan1080p.plannedMitigations).toEqual({
      faceOcclusionMask: 'not_implemented',
      temporalSeamDetection: 'not_implemented',
      faceRestoration: 'not_implemented',
      headPoseStabilization: 'not_implemented',
    });

    const plan4k = BeardLipRestorationEngine.computeRestorationPlan(faceBox, {
      targetResolution: '4k',
    });

    expect(plan4k.outputDimensions).toEqual({ width: 3840, height: 2160 });
    expect(plan4k.plannedCropPaddingPx).toBe(24);
  });

  it('generates optional FFmpeg resize/sharpen filters without claiming neural restoration', () => {
    const filters1080 = BeardLipRestorationEngine.generateFfmpegPreviewFilters('1080p');
    expect(filters1080).toContain('scale=1920:1080:flags=lanczos');
    expect(filters1080).toContain('unsharp=5:5:0.8:5:5:0.0');

    const filters4k = BeardLipRestorationEngine.generateFfmpegPreviewFilters('4k');
    expect(filters4k).toContain('scale=3840:2160:flags=lanczos');
  });

  it('reports supplied diagnostic metrics without treating them as acceptance evidence', () => {
    const goodResult = BeardLipRestorationEngine.validateRestoration(1920, 1080, 92.5, 0.01);
    expect(goodResult.diagnosticsPassed).toBe(true);
    expect(goodResult.productionAcceptanceEligible).toBe(false);
    expect(goodResult.seamThresholdExceeded).toBe(false);
    expect(goodResult.reasons.length).toBe(0);

    const blurryResult = BeardLipRestorationEngine.validateRestoration(1920, 1080, 60.0, 0.01);
    expect(blurryResult.diagnosticsPassed).toBe(false);
    expect(blurryResult.reasons.some(r => r.includes('Reported sharpness score'))).toBe(true);

    const seamResult = BeardLipRestorationEngine.validateRestoration(1920, 1080, 90.0, 0.08);
    expect(seamResult.diagnosticsPassed).toBe(false);
    expect(seamResult.seamThresholdExceeded).toBe(true);
    expect(seamResult.reasons.some(r => r.includes('Reported seam intensity'))).toBe(true);
  });
});
