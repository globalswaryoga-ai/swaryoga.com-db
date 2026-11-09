/**
 * Swar Yoga In-House AI Avatar - Yogic Hand Gestures & Mudras Engine
 * ===================================================================
 * Generates biologically and yogically authentic hand and finger skeletal
 * keyframe rotations for Mohan Sir's 3D Digital Twin and Motion Engine.
 * 
 * Signature Swar Yoga Mudras:
 * 1. Gyan Mudra (ज्ञान मुद्रा):
 *    - Thumb and index finger tips joined, remaining 3 fingers straight.
 *    - Default meditative posture resting on knees in Padmasana.
 * 
 * 2. Nasagra / Vishnu Mudra (नासाग्र / विष्णु मुद्रा):
 *    - Signature Swar Yoga gesture: Index and middle fingers folded down.
 *    - Right thumb touches right nostril (Pingala / Surya Nadi).
 *    - Ring finger touches left nostril (Ida / Chandra Nadi).
 *    - Essential for checking active nostril breath flow.
 * 
 * 3. Namaste / Anjali Mudra (नमस्ते मुद्रा):
 *    - Both palms joined at heart center (Anahata Chakra), fingers upward.
 *    - Opening and closing greeting for lectures.
 * 
 * 4. Teaching Expository Gestures (व्याख्यान मुद्रा):
 *    - Natural conversational hand emphasis: chest level, open palm,
 *      synchronized with speech pauses.
 */

export interface FingerJointRotation {
  proximalDeg: number;   // Base knuckle curl (0 = flat, 90 = 90-degree bend)
  intermediateDeg: number; // Mid-joint bend
  distalDeg: number;     // Fingertip bend
}

export interface HandMudraKeyframe {
  mudraName: 'gyan_mudra' | 'nasagra_mudra' | 'namaste_mudra' | 'teaching_open' | 'nadi_pointing';
  hand: 'left' | 'right' | 'both';
  wristEulerDeg: { pitch: number; yaw: number; roll: number };
  thumb: FingerJointRotation & { abductionDeg: number };
  indexFinger: FingerJointRotation;
  middleFinger: FingerJointRotation;
  ringFinger: FingerJointRotation;
  pinkyFinger: FingerJointRotation;
  description: string;
}

export class YogicMudraEngine {
  /**
   * Generates skeletal joint angles for Gyan Mudra (Wisdom / Meditation Gesture).
   */
  public static getGyanMudra(hand: 'left' | 'right' = 'right'): HandMudraKeyframe {
    return {
      mudraName: 'gyan_mudra',
      hand,
      wristEulerDeg: { pitch: 10, yaw: hand === 'right' ? -15 : 15, roll: 0 },
      thumb: {
        proximalDeg: 35,
        intermediateDeg: 25,
        distalDeg: 20,
        abductionDeg: 45, // Angled toward index fingertip
      },
      indexFinger: {
        proximalDeg: 55,
        intermediateDeg: 50,
        distalDeg: 30, // Curled to meet thumb tip
      },
      middleFinger: {
        proximalDeg: 5,
        intermediateDeg: 5,
        distalDeg: 0, // Extended relaxed
      },
      ringFinger: {
        proximalDeg: 8,
        intermediateDeg: 6,
        distalDeg: 0, // Extended relaxed
      },
      pinkyFinger: {
        proximalDeg: 10,
        intermediateDeg: 8,
        distalDeg: 0, // Extended relaxed
      },
      description: 'Thumb tip and index fingertip touch in a circle; middle, ring, pinky gently extended.',
    };
  }

  /**
   * Generates skeletal joint angles for Nasagra Mudra (Swar Yoga Nostril Flow Check).
   * Essential for demonstrating Ida (Left) and Pingala (Right) nadi breathing.
   */
  public static getNasagraMudra(activeNostril: 'surya_right' | 'chandra_left' = 'surya_right'): HandMudraKeyframe {
    const isSurya = activeNostril === 'surya_right';

    return {
      mudraName: 'nasagra_mudra',
      hand: 'right', // Nasagra Mudra is traditionally performed with the right hand
      wristEulerDeg: { pitch: -25, yaw: 10, roll: 40 }, // Lifted near nose level
      thumb: {
        proximalDeg: isSurya ? 20 : 40,
        intermediateDeg: isSurya ? 15 : 30,
        distalDeg: isSurya ? 10 : 25,
        abductionDeg: 35,
      },
      indexFinger: {
        proximalDeg: 85,
        intermediateDeg: 90,
        distalDeg: 80, // Tightly folded into palm
      },
      middleFinger: {
        proximalDeg: 85,
        intermediateDeg: 90,
        distalDeg: 80, // Tightly folded into palm
      },
      ringFinger: {
        proximalDeg: isSurya ? 15 : 45, // Extended or touching left nostril
        intermediateDeg: isSurya ? 10 : 40,
        distalDeg: isSurya ? 5 : 25,
      },
      pinkyFinger: {
        proximalDeg: 20,
        intermediateDeg: 15,
        distalDeg: 10, // Rests along ring finger
      },
      description: `Nasagra Mudra: Index & middle folded; thumb / ring fingers positioned to regulate ${activeNostril === 'surya_right' ? 'Surya Nadi (Right Nostril)' : 'Chandra Nadi (Left Nostril)'}.`,
    };
  }

  /**
   * Generates skeletal joint angles for Namaste / Anjali Mudra.
   */
  public static getNamasteMudra(): HandMudraKeyframe {
    return {
      mudraName: 'namaste_mudra',
      hand: 'both',
      wristEulerDeg: { pitch: 75, yaw: 0, roll: 0 }, // Both wrists bent 75° upward at heart center
      thumb: {
        proximalDeg: 10,
        intermediateDeg: 5,
        distalDeg: 0,
        abductionDeg: 20,
      },
      indexFinger: { proximalDeg: 5, intermediateDeg: 0, distalDeg: 0 },
      middleFinger: { proximalDeg: 0, intermediateDeg: 0, distalDeg: 0 },
      ringFinger: { proximalDeg: 5, intermediateDeg: 0, distalDeg: 0 },
      pinkyFinger: { proximalDeg: 10, intermediateDeg: 5, distalDeg: 0 },
      description: 'Both palms and fingers pressed flat together at heart center (Anahata Chakra).',
    };
  }

  /**
   * Generates skeletal joint angles for Teaching Conversational Gestures.
   */
  public static getTeachingOpenGesture(hand: 'left' | 'right' = 'right'): HandMudraKeyframe {
    return {
      mudraName: 'teaching_open',
      hand,
      wristEulerDeg: { pitch: -15, yaw: hand === 'right' ? 20 : -20, roll: 10 },
      thumb: { proximalDeg: 15, intermediateDeg: 10, distalDeg: 5, abductionDeg: 40 },
      indexFinger: { proximalDeg: 25, intermediateDeg: 15, distalDeg: 10 },
      middleFinger: { proximalDeg: 30, intermediateDeg: 20, distalDeg: 10 },
      ringFinger: { proximalDeg: 35, intermediateDeg: 25, distalDeg: 15 },
      pinkyFinger: { proximalDeg: 40, intermediateDeg: 30, distalDeg: 20 },
      description: 'Gentle open hand with tiered finger curvature for conversational emphasis.',
    };
  }
}

