import { isTechnicalCrmField, isQuestionMatchingLanguage } from '@/lib/registrationAiConfig';
import { render, screen } from '@testing-library/react';
import { QuestionRulesEditor } from '@/app/admin/crm/new-registration/_QuestionRulesEditor';

describe('AI Question language isolation and CRM technical field exclusion', () => {
  it('identifies and filters all internal CRM database fields from question dropdowns', () => {
    const screenshotFields = [
      'leadNumber', 'title', 'phoneNumber', 'source', 'workshopName', 'country', 'countryCode',
      'region', 'state', 'city', 'languageCode', 'funnelStage', 'chatStatus', 'lastMessageAt',
      'googleFormId', 'workshopId', 'formSource', 'lastInboundAt', 'leadId', 'gender',
      'paymentStatus', 'currency', 'formData', 'responseId', 'submittedAt', 'firstTouchedBy',
      'chatStatusClosedAt', 'chatStatusClosedBy', 'address', 'waLastFailCode', 'Timestamp', 'Email Address'
    ];

    screenshotFields.forEach(field => {
      expect(isTechnicalCrmField(field)).toBe(true);
    });

    // Real questions must NOT be marked as technical fields
    expect(isTechnicalCrmField('लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?')).toBe(false);
    expect(isTechnicalCrmField('हा वर्कशॉप पूर्णपणे विनामूल्य आहे. वर्कशॉपच्या शेवटी आपण स्वेच्छेने देणगी देण्यास तयार आहात का ?')).toBe(false);
    expect(isTechnicalCrmField('क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?')).toBe(false);
    expect(isTechnicalCrmField('If you are a repeater, when did you attend the workshop, and how many days was it?')).toBe(false);
  });

  it('strictly isolates Marathi questions and rejects English, Kannada, and Hindi questions in Marathi section', () => {
    const marathiQ1 = 'लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?';
    const marathiQ2 = 'हा वर्कशॉप पूर्णपणे विनामूल्य आहे. वर्कशॉपच्या शेवटी आपण स्वेच्छेने देणगी देण्यास तयार आहात का ? 🙏';
    const hindiQ = 'क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?';
    const englishQ1 = 'If you are a repeater, when did you attend the workshop, and how many days was it?';
    const englishQ2 = 'There is no fee for this 14 days class, but the knowledge is not free.';
    const kannadaQ = 'ಲೈವ್ ಕ್ಲಾಸ್ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ವಿಡಿಯೋ ಆನ್ ಇರುತ್ತದೆಯೇ?';

    // Marathi section
    expect(isQuestionMatchingLanguage(marathiQ1, 'Marathi Workshop')).toBe(true);
    expect(isQuestionMatchingLanguage(marathiQ2, 'Marathi')).toBe(true);
    expect(isQuestionMatchingLanguage(hindiQ, 'Marathi')).toBe(false);
    expect(isQuestionMatchingLanguage(englishQ1, 'Marathi')).toBe(false);
    expect(isQuestionMatchingLanguage(englishQ2, 'Marathi')).toBe(false);
    expect(isQuestionMatchingLanguage(kannadaQ, 'Marathi')).toBe(false);
  });

  it('strictly isolates Hindi questions and rejects Marathi, Kannada, and English questions in Hindi section', () => {
    const marathiQ = 'लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?';
    const hindiQ = 'क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?';
    const englishQ = 'If you are a repeater, when did you attend the workshop, and how many days was it?';
    const kannadaQ = 'ಲೈವ್ ಕ್ಲಾಸ್ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ವಿಡಿಯೋ ಆನ್ ಇರುತ್ತದೆಯೇ?';

    // Hindi section
    expect(isQuestionMatchingLanguage(hindiQ, 'Hindi Workshop')).toBe(true);
    expect(isQuestionMatchingLanguage(marathiQ, 'Hindi')).toBe(false);
    expect(isQuestionMatchingLanguage(englishQ, 'Hindi')).toBe(false);
    expect(isQuestionMatchingLanguage(kannadaQ, 'Hindi')).toBe(false);
  });

  it('strictly isolates English questions and rejects Devanagari and Kannada questions in English section', () => {
    const marathiQ = 'लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?';
    const hindiQ = 'क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?';
    const englishQ = 'If you are a repeater, when did you attend the workshop, and how many days was it?';
    const kannadaQ = 'ಲೈವ್ ಕ್ಲಾಸ್ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ವಿಡಿಯೋ ಆನ್ ಇರುತ್ತದೆಯೇ?';

    // English section
    expect(isQuestionMatchingLanguage(englishQ, 'English Workshop')).toBe(true);
    expect(isQuestionMatchingLanguage(marathiQ, 'English')).toBe(false);
    expect(isQuestionMatchingLanguage(hindiQ, 'English')).toBe(false);
    expect(isQuestionMatchingLanguage(kannadaQ, 'English')).toBe(false);
  });

  it('strictly isolates Kannada questions in Kannada section', () => {
    const marathiQ = 'लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?';
    const hindiQ = 'क्या आप लाइव क्लास के दौरान अपना वीडियो चालू रखेंगे?';
    const englishQ = 'If you are a repeater, when did you attend the workshop, and how many days was it?';
    const kannadaQ = 'ಲೈವ್ ಕ್ಲಾಸ್ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ವಿಡಿಯೋ ಆನ್ ಇರುತ್ತದೆಯೇ?';

    // Kannada section
    expect(isQuestionMatchingLanguage(kannadaQ, 'Kannada Workshop')).toBe(true);
    expect(isQuestionMatchingLanguage(marathiQ, 'Kannada')).toBe(false);
    expect(isQuestionMatchingLanguage(hindiQ, 'Kannada')).toBe(false);
    expect(isQuestionMatchingLanguage(englishQ, 'Kannada')).toBe(false);
  });

  it('strips formData and technical fields in QuestionRulesEditor options', () => {
    const conditions = [{ question: 'formData', keyword: 'Yes', successCategory: 'approval_1' }];
    const questions = [
      'formData',
      'leadNumber',
      'phoneNumber',
      'लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?'
    ];

    render(
      <QuestionRulesEditor
        conditions={conditions}
        onChange={jest.fn()}
        questions={questions}
        categories={[{ id: 'approval_1', label: 'Approval-1' }]}
      />
    );

    // formData, leadNumber, phoneNumber must NOT be present in options
    const select = screen.getByRole('combobox', { name: /Question 1/ });
    const optionTexts = Array.from(select.querySelectorAll('option')).map(opt => opt.textContent);

    expect(optionTexts).not.toContain('formData');
    expect(optionTexts).not.toContain('leadNumber');
    expect(optionTexts).not.toContain('phoneNumber');
    expect(optionTexts).toContain('लाईव्ह क्लासच्या वेळी तुम्ही तुमचा व्हिडिओ चालू ठेवणार आहात का?');
    expect(optionTexts).toContain('-- Select saved form question / column --');
  });
});
