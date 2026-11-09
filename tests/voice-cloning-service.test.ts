import { VoiceCloningService, SACRED_TERMINOLOGY_PRONUNCIATION } from '@/lib/avatarEngine/voiceCloningService';

describe('Voice Cloning Service Tests', () => {
  it('retrieves Mohan Sir master vocal profile with 125 Hz baritone pitch', async () => {
    const profile = await VoiceCloningService.getMohanSirMasterVoice();
    expect(profile.fundamentalPitchHz).toBe(125);
    expect(profile.speakingRateWpm).toBe(115);
    expect(profile.language).toBe('hi');
    expect(profile.isMasterIdentity).toBe(true);
  });

  it('preserves sacred yogic terminology pronunciations', () => {
    expect(SACRED_TERMINOLOGY_PRONUNCIATION['स्वर योग']).toBe('Swar Yoga');
    expect(SACRED_TERMINOLOGY_PRONUNCIATION['सूर्य नाड़ी']).toBe('Surya Nadi');
    expect(SACRED_TERMINOLOGY_PRONUNCIATION['चंद्र नाड़ी']).toBe('Chandra Nadi');
    expect(SACRED_TERMINOLOGY_PRONUNCIATION['सुषुम्ना']).toBe('Sushumna');
  });

  it('normalizes script with natural breathing pauses', () => {
    const raw = 'नमस्ते मैं मोहन सर हूँ। आज हम स्वर योग सीखेंगे।';
    const normalized = VoiceCloningService.normalizeScriptForCloning(raw);
    expect(normalized).toContain('नमस्ते, ');
    expect(normalized).toContain('। ');
  });
});

