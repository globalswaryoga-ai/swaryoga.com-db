import {
  completeGoogleFormMapping,
  suggestGoogleFormMapping,
  unmappedCrmFields,
} from '@/lib/googleFormFieldMapping';

const CRM_FIELDS = [
  { id: 'Name', label: 'NAME' },
  { id: 'Email', label: 'EMAIL' },
  { id: 'Mobile', label: 'MOBILE' },
  { id: 'City', label: 'CITY' },
  { id: 'Country', label: 'COUNTRY' },
  { id: 'Gender', label: 'GENDER' },
  { id: 'AI-7', label: 'AI-7' },
];

const QUESTION_MAP = {
  q1: 'Full Name',
  q2: 'Email Address',
  q3: 'WhatsApp Number',
  q4: 'City',
  q5: 'Country',
  q6: 'Which workshop date do you want to join?',
};

describe('suggestGoogleFormMapping', () => {
  it('maps the standard CRM fields from the form questions', () => {
    const mapping = suggestGoogleFormMapping(CRM_FIELDS, QUESTION_MAP);

    expect(mapping.Name).toBe('Full Name');
    expect(mapping.Email).toBe('Email Address');
    expect(mapping.Mobile).toBe('WhatsApp Number');
    expect(mapping.City).toBe('City');
    expect(mapping.Country).toBe('Country');
    expect(mapping['AI-7']).toBe('Which workshop date do you want to join?');
  });

  it('never reuses one question for two CRM fields', () => {
    const mapping = suggestGoogleFormMapping(CRM_FIELDS, QUESTION_MAP);
    const values = Object.values(mapping);
    expect(new Set(values).size).toBe(values.length);
  });

  it('leaves a field unmapped when the form has no matching question', () => {
    const mapping = suggestGoogleFormMapping(CRM_FIELDS, QUESTION_MAP);

    // This form never asks for gender, so nothing is invented for it.
    expect(mapping.Gender).toBeUndefined();
    expect(unmappedCrmFields(CRM_FIELDS, mapping).map(field => field.id)).toEqual(['Gender']);
  });

  it('returns nothing when the form has no questions yet', () => {
    expect(suggestGoogleFormMapping(CRM_FIELDS, {})).toEqual({});
  });
});

describe('completeGoogleFormMapping', () => {
  it('keeps a manual choice and fills the remaining fields', () => {
    const mapping = completeGoogleFormMapping(CRM_FIELDS, QUESTION_MAP, { Name: 'Some Other Column' });

    expect(mapping.Name).toBe('Some Other Column');
    expect(mapping.Email).toBe('Email Address');
  });

  it('does not assign a question that a manual choice already uses', () => {
    const mapping = completeGoogleFormMapping(CRM_FIELDS, { q1: 'Name', q2: 'City' }, { Email: 'Name' });

    expect(mapping.Email).toBe('Name');
    expect(mapping.Name).toBeUndefined();
  });

  it('produces a non-empty mapping when the form has standard questions', () => {
    const mapping = completeGoogleFormMapping(CRM_FIELDS, QUESTION_MAP);
    expect(Object.keys(mapping).length).toBeGreaterThan(0);
  });

  it('never stores a blank value', () => {
    const mapping = completeGoogleFormMapping(CRM_FIELDS, QUESTION_MAP, { Gender: '   ' });
    expect(Object.values(mapping).every(value => value.trim() !== '')).toBe(true);
    expect(mapping.Gender).toBeUndefined();
  });
});

describe('unmappedCrmFields', () => {
  it('treats a blank mapping entry as unmapped', () => {
    const unmapped = unmappedCrmFields(CRM_FIELDS, { Name: 'Full Name', Email: '   ' });
    expect(unmapped.map(field => field.id)).toEqual(['Email', 'Mobile', 'City', 'Country', 'Gender', 'AI-7']);
  });

  it('returns every field when there is no mapping', () => {
    expect(unmappedCrmFields(CRM_FIELDS, null)).toHaveLength(CRM_FIELDS.length);
  });
});
