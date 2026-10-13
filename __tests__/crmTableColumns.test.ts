import { describe, it, expect } from 'vitest';
import {
  isStandardCrmField,
  isInformationalNotice,
  normalizeQuestionKey,
  getCleanDynamicColumns,
  getLeadPhone,
  getLeadName,
  getLeadEmail,
  getLeadGender,
  getLeadAge,
  getLeadCity,
  getLeadCountry,
  getLeadTimestamp,
  getLeadAnswer,
} from '../lib/crmTableColumns';

describe('crmTableColumns helper functions', () => {
  it('correctly identifies standard CRM fields', () => {
    expect(isStandardCrmField('Name')).toBe(true);
    expect(isStandardCrmField('Full Name')).toBe(true);
    expect(isStandardCrmField('Email')).toBe(true);
    expect(isStandardCrmField('WhatsApp Number -add before country code')).toBe(true);
    expect(isStandardCrmField('Gender')).toBe(true);
    expect(isStandardCrmField('Age')).toBe(true);
    expect(isStandardCrmField('City Name')).toBe(true);
    expect(isStandardCrmField('Country and State-Name')).toBe(true);
    expect(isStandardCrmField('Timestamp')).toBe(true);
    expect(isStandardCrmField('I am')).toBe(true);

    // Dynamic workshop questions should NOT be identified as standard CRM fields
    expect(isStandardCrmField('Are you ready to do 14 days workshop?')).toBe(false);
    expect(isStandardCrmField('Which month workshop you want to attend?')).toBe(false);
    expect(isStandardCrmField('Video in all sessions?')).toBe(false);
  });

  it('filters out multi-line informational notices', () => {
    expect(isInformationalNotice('धन्यवाद!\nकृपया वर्कशॉप के लिए तभी पंजीकरण करें...')).toBe(true);
    expect(isInformationalNotice('Are you ready?')).toBe(false);
  });

  it('normalizes question keys to eliminate whitespace variants', () => {
    expect(normalizeQuestionKey('video  in   all')).toBe('video in all');
    expect(normalizeQuestionKey('video in all?')).toBe('video in all');
  });

  it('extracts clean dynamic columns without standard field duplicates', () => {
    const mockLeads = [
      {
        id: '1',
        dynamicAnswers: {
          'Full Name': 'Narendra Sharma',
          'Whatsapp Number -add before country code': '9876543210',
          'City Name': 'Tonk',
          'Gender': 'Male',
          'Are you ready for 14-day workshop?': 'Yes',
          'video in  all': 'Yes',
        },
      },
      {
        id: '2',
        _rawRecord: {
          'Timestamp': '12/10/2026 10:00:00',
          'Are you ready for 14-day workshop?': 'Yes',
          'video in all': 'Yes',
          'Email Address': 'test@example.com',
        },
      },
    ];

    const cleanCols = getCleanDynamicColumns(mockLeads as any);
    expect(cleanCols).toContain('Are you ready for 14-day workshop?');
    // Notice that 'video in  all' and 'video in all' are merged!
    expect(cleanCols.filter(c => c.toLowerCase().includes('video')).length).toBe(1);
    // Standard fields are NOT present in dynamic columns
    expect(cleanCols).not.toContain('Full Name');
    expect(cleanCols).not.toContain('Whatsapp Number -add before country code');
    expect(cleanCols).not.toContain('City Name');
    expect(cleanCols).not.toContain('Timestamp');
  });

  it('extracts lead values reliably even when fields are swapped or in raw records', () => {
    const lead = {
      id: 'lead-1',
      name: 'Narendra Sharma',
      mobile: '',
      phoneNumber: '',
      gender: 'I studied with you before, but I left in between', // Corrupted/misaligned gender in DB
      city: 'Tonk',
      answers: {
        'I am': 'Male',
        'Whatsapp Number -add before country code': '+91 9876543210',
        'Age': '45',
        'Are you ready?': 'Yes, ready',
      },
    };

    expect(getLeadName(lead)).toBe('Narendra Sharma');
    // Resolves phone from raw/answers
    expect(getLeadPhone(lead)).toBe('+91 9876543210');
    // Ignores repeater questionnaire string and extracts real gender
    expect(getLeadGender(lead)).toBe('Male');
    // Extracts age from answers
    expect(getLeadAge(lead)).toBe('45');
    expect(getLeadCity(lead)).toBe('Tonk');
    expect(getLeadAnswer(lead, 'Are you ready?')).toBe('Yes, ready');
  });
});
