/** @jest-environment node */
import { isChatbotOfficeOpen } from '@/lib/chatbotOfficeHours';
describe('Chatbot office hours', () => {
  it('handles workshop timezone and exact end boundary', () => {
    const settings = { officeHoursEnabled: true, officeHoursStart: '09:00', officeHoursEnd: '18:00', officeHoursTimezone: 'Asia/Kolkata' };
    expect(isChatbotOfficeOpen(settings, new Date('2026-10-11T03:30:00Z'))).toBe(true);
    expect(isChatbotOfficeOpen(settings, new Date('2026-10-11T12:30:00Z'))).toBe(false);
  });
  it('handles overnight office hours and invalid settings explicitly', () => {
    const settings = { officeHoursEnabled: true, officeHoursStart: '22:00', officeHoursEnd: '06:00', officeHoursTimezone: 'UTC' };
    expect(isChatbotOfficeOpen(settings, new Date('2026-10-11T23:00:00Z'))).toBe(true);
    expect(isChatbotOfficeOpen(settings, new Date('2026-10-11T12:00:00Z'))).toBe(false);
    expect(() => isChatbotOfficeOpen({ ...settings, officeHoursStart: '25:00' })).toThrow();
  });
});
