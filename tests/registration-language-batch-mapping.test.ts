import { getBaseLanguage, canonicalLanguage, getBatchBaseLanguage, matchesLanguage } from '../app/admin/crm/new-registration/_LeadsManagementTab';

describe('Language and Batch 100% Strict Mapping', () => {
  it('correctly extracts base language from language strings and forms', () => {
    expect(getBaseLanguage('Hindi')).toBe('hindi');
    expect(getBaseLanguage('Hindi Workshop')).toBe('hindi');
    expect(getBaseLanguage('hindi')).toBe('hindi');
    expect(getBaseLanguage('English')).toBe('english');
    expect(getBaseLanguage('English Workshop')).toBe('english');
    expect(getBaseLanguage('english')).toBe('english');
    expect(getBaseLanguage('Marathi Workshop')).toBe('marathi');
    expect(getBaseLanguage('Kannada Workshop')).toBe('kannada');
    expect(getBaseLanguage('')).toBe('english');
  });

  it('correctly maps to canonical dashboard language names', () => {
    expect(canonicalLanguage('hindi')).toBe('Hindi Workshop');
    expect(canonicalLanguage('Hindi')).toBe('Hindi Workshop');
    expect(canonicalLanguage('Hindi Workshop')).toBe('Hindi Workshop');
    expect(canonicalLanguage('english')).toBe('English Workshop');
    expect(canonicalLanguage('English')).toBe('English Workshop');
    expect(canonicalLanguage('marathi')).toBe('Marathi Workshop');
    expect(canonicalLanguage('kannada')).toBe('Kannada Workshop');
  });

  it('detects batch base language accurately even from name or id', () => {
    const hindiBatch1 = { id: 'master_hindi_workshop', name: 'Master List - Hindi Workshop' };
    const hindiBatch2 = { id: 'batch_hindi_123', name: 'Hindi Workshop - 12th Oct - Morning at 7 AM' };
    const englishBatch1 = { id: 'w_english_swar_yoga', name: 'English swar yoga', language: 'English' };
    const englishBatch2 = { id: 'batch_english_456', name: 'English Workshop - 10th Nov' };

    expect(getBatchBaseLanguage(hindiBatch1)).toBe('hindi');
    expect(getBatchBaseLanguage(hindiBatch2)).toBe('hindi');
    expect(getBatchBaseLanguage(englishBatch1)).toBe('english');
    expect(getBatchBaseLanguage(englishBatch2)).toBe('english');
  });

  it('strictly isolates English batches from Hindi batches and vice versa', () => {
    const hindiBatch = {
      id: 'batch_hindi_123',
      name: 'Hindi Workshop - 12th Oct -26- Morning at 7 AM',
      language: 'Hindi Workshop',
    };
    const hindiMaster = {
      id: 'master_hindi_workshop',
      name: 'Master List - Hindi Workshop',
      language: 'Hindi Workshop',
    };
    const englishBatch = {
      id: 'batch_english_456',
      name: 'English Workshop - 15th Oct - Evening 7 PM',
      language: 'English Workshop',
    };

    // When language is English: Hindi batches MUST NOT match (100% isolation)
    expect(matchesLanguage(hindiBatch, 'English')).toBe(false);
    expect(matchesLanguage(hindiBatch, 'English Workshop')).toBe(false);
    expect(matchesLanguage(hindiMaster, 'English')).toBe(false);
    expect(matchesLanguage(hindiMaster, 'English Workshop')).toBe(false);
    expect(matchesLanguage(englishBatch, 'English Workshop')).toBe(true);

    // When language is Hindi: English batches MUST NOT match (100% isolation)
    expect(matchesLanguage(englishBatch, 'Hindi')).toBe(false);
    expect(matchesLanguage(englishBatch, 'Hindi Workshop')).toBe(false);
    expect(matchesLanguage(hindiBatch, 'Hindi Workshop')).toBe(true);
    expect(matchesLanguage(hindiMaster, 'Hindi Workshop')).toBe(true);
  });
});
