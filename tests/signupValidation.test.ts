import { evaluateSignupQuality } from '../lib/signupValidation';

describe('Signup Validation & Bot Detection', () => {
  const sampleBots = [
    { name: 'Fxdekrou Ycjhzol', email: 'futbollr@yahoo.com', phone: '8509153035', country: 'United States', state: 'California' },
    { name: 'Vewiji Aqvdus', email: 'mfkneidinger@aol.com', phone: '2146805051', country: 'United States', state: 'Texas' },
    { name: 'Uqty Spezgzzu', email: 'm.arkljo.n.e.s5.59@gmail.com', phone: '3762750757', country: 'Andorra', state: 'Canillo' },
    { name: 'Yxqsg Nrppa', email: 'matt@landscapeconnection.com', phone: '8069855745', country: 'United States', state: 'Texas' },
    { name: 'Miraxtx Zniybe', email: 'ujel.u.y.ugaq3.9.3@gmail.com', phone: '3376313443', country: 'United States', state: 'Louisiana' },
    { name: 'Rbzgfzg Rtrfazr', email: 'rachel@racheljames.com', phone: '2025550143', country: 'United States', state: 'DC' },
  ];

  const legitimateUsers = [
    { name: 'Ramesh Sharma', email: 'ramesh.sharma@gmail.com', phone: '+91 9820123456', country: 'India', state: 'Maharashtra' },
    { name: 'Pooja Patel', email: 'pooja.patel@yahoo.com', phone: '9823451234', country: 'India', state: 'Gujarat' },
    { name: 'Mohan Kalburgi', email: 'swaryoga@gmail.com', phone: '+91 9988776655', country: 'India', state: 'Karnataka' },
    { name: 'John Smith', email: 'john.smith@outlook.com', phone: '+1 415 555 2671', country: 'United States', state: 'California' },
  ];

  test('Flags all bot patterns as non-legitimate', () => {
    for (const bot of sampleBots) {
      const result = evaluateSignupQuality(bot);
      expect(result.isLikelyLegitimate).toBe(false);
      expect(result.suggestedStatus).toBe('pending');
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  test('Approves real legitimate users with proper details', () => {
    for (const user of legitimateUsers) {
      const result = evaluateSignupQuality(user);
      expect(result.isLikelyLegitimate).toBe(true);
      expect(result.suggestedStatus).toBe('active');
    }
  });

  test('Marks signups with missing country/state as pending', () => {
    const result = evaluateSignupQuality({
      name: 'Ramesh Sharma',
      email: 'ramesh.sharma@gmail.com',
      phone: '+91 9820123456',
    });
    expect(result.isLikelyLegitimate).toBe(false);
    expect(result.suggestedStatus).toBe('pending');
    expect(result.reasons).toEqual(
      expect.arrayContaining(['Missing or invalid country', 'Missing or invalid state'])
    );
  });

  test('Catches honeypot trap submissions', () => {
    const result = evaluateSignupQuality({
      name: 'Ramesh Sharma',
      email: 'ramesh.sharma@gmail.com',
      phone: '9820123456',
      country: 'India',
      state: 'Maharashtra',
      honeypot: 'spam-bot-input',
    });
    expect(result.isLikelyLegitimate).toBe(false);
    expect(result.reasons).toContain('Automated bot form submission detected (honeypot triggered)');
  });

  test('Catches excessive dots in email username', () => {
    const result = evaluateSignupQuality({
      name: 'Amit Kumar',
      email: 'a.m.i.t.k.u.m.a.r@gmail.com',
      phone: '9820123456',
      country: 'India',
      state: 'Delhi',
    });
    expect(result.isLikelyLegitimate).toBe(false);
  });
});
