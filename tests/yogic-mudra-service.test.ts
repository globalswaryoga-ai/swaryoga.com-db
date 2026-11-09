import { YogicMudraEngine } from '@/lib/avatarEngine/yogicMudraService';

describe('Yogic Hand Gestures & Mudras Engine Tests', () => {
  it('generates anatomically accurate Gyan Mudra with thumb-index circle and extended fingers', () => {
    const mudra = YogicMudraEngine.getGyanMudra('right');

    expect(mudra.mudraName).toBe('gyan_mudra');
    expect(mudra.hand).toBe('right');
    // Index finger curled to meet thumb
    expect(mudra.indexFinger.proximalDeg).toBeGreaterThan(40);
    // Middle, ring, and pinky relaxed and extended
    expect(mudra.middleFinger.proximalDeg).toBeLessThanOrEqual(10);
    expect(mudra.ringFinger.proximalDeg).toBeLessThanOrEqual(10);
    expect(mudra.pinkyFinger.proximalDeg).toBeLessThanOrEqual(10);
  });

  it('generates Nasagra Mudra with folded index & middle fingers for Swar Yoga nostril checking', () => {
    const mudraSurya = YogicMudraEngine.getNasagraMudra('surya_right');

    expect(mudraSurya.mudraName).toBe('nasagra_mudra');
    expect(mudraSurya.hand).toBe('right');
    // Index and middle fingers are tightly curled into palm
    expect(mudraSurya.indexFinger.proximalDeg).toBeGreaterThanOrEqual(80);
    expect(mudraSurya.middleFinger.proximalDeg).toBeGreaterThanOrEqual(80);

    const mudraChandra = YogicMudraEngine.getNasagraMudra('chandra_left');
    expect(mudraChandra.mudraName).toBe('nasagra_mudra');
    expect(mudraChandra.ringFinger.proximalDeg).toBeGreaterThan(mudraSurya.ringFinger.proximalDeg);
  });

  it('generates Namaste / Anjali Mudra with palms pressed at heart center', () => {
    const mudra = YogicMudraEngine.getNamasteMudra();

    expect(mudra.mudraName).toBe('namaste_mudra');
    expect(mudra.hand).toBe('both');
    expect(mudra.wristEulerDeg.pitch).toBe(75); // Wrists angled 75 degrees up
    // Fingers extended flat
    expect(mudra.middleFinger.proximalDeg).toBe(0);
  });

  it('generates natural teaching conversational gesture', () => {
    const gesture = YogicMudraEngine.getTeachingOpenGesture('right');

    expect(gesture.mudraName).toBe('teaching_open');
    expect(gesture.wristEulerDeg.yaw).toBe(20);
    // Gradual tiered finger curl for natural human appearance
    expect(gesture.indexFinger.proximalDeg).toBeLessThan(gesture.pinkyFinger.proximalDeg);
  });
});

