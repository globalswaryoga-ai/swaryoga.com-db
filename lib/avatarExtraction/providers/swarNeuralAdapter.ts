import { VideoValidationInput, VideoValidationResult } from '../types';

export class SwarNeuralAdapter {
  public isConfigured(): boolean {
    return false;
  }

  public validateSourceVideo(_input: VideoValidationInput): VideoValidationResult {
    return {
      valid: false,
      errors: ['In-house facial analysis is not implemented or configured.'],
      warnings: [],
      qualityScore: null,
      resolutionLabel: 'Not analyzed',
    };
  }

  public extractBiometrics(_seedName: string): never {
    throw new Error('In-house facial biometrics are unavailable: no inference pipeline is configured.');
  }
}

export const swarNeuralAdapter = new SwarNeuralAdapter();
