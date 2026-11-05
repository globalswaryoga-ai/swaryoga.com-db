/**
 * Pure TypeScript avatar cue annotator that maps spoken sentences to Mohan Sir's authentic
 * Avatar DNA (facial expressions + vocal intensity) based on shastric and conversational context.
 * 100% preserves every original spoken character (verbatim guarantee).
 * Safe for both Client and Server execution.
 */
export function annotateYogicAvatarCues(transcript: string): string {
  if (!transcript || !transcript.trim()) return '';

  const lines = transcript.split('\n');
  const annotatedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Minute ')) {
      annotatedLines.push(line);
      continue;
    }

    // If line already has tags, preserve
    if (/\[face:[a-z_]+\]/i.test(trimmed) || /\[[a-z_]+:\d{1,3}\]/i.test(trimmed)) {
      annotatedLines.push(line);
      continue;
    }

    // Extract timestamp if present: e.g. [00:00–00:02]
    const tsMatch = trimmed.match(/^(\[[0-9]{2}:[0-9]{2}[–\-][0-9]{2}:[0-9]{2}\]\s*)(.*)$/);
    const prefix = tsMatch ? tsMatch[1] : '';
    const speech = tsMatch ? tsMatch[2] : trimmed;

    // Detect appropriate cues based on Mohan Sir's Avatar DNA
    let emotionCue = '';
    let faceCue = '';

    // 1. Inquisitive Questions (Eyebrow Wonder)
    if (speech.includes('?') || /का\?|कधी\?|कसे\?|काय\?|सांगा|सांगाल|विचार करा|बताओ|याद है क्या|मालूम है|बरोबर आहे का/i.test(speech)) {
      emotionCue = '[question:85]';
      faceCue = '[face:eyebrow_wonder]';
    }
    // 2. Meditative Focus & Pranayama (Deep Meditative Concentration)
    else if (/ओम|ॐ|शांति|शांत|ध्यान|डोळे बंद|आंखें बंद|श्वास|सांस|प्राणायाम|कुंभक|रेचक|पूरक|नाडी|स्थिर|शांतता/i.test(speech)) {
      emotionCue = '[calm:90]';
      faceCue = '[face:focus_meditation]';
    }
    // 3. Native Punchline Humor & Laughter (Hearty Native Laugh)
    else if (/मस्ती|लग्न|बायको|नवरा|भांडण|हसणे|हंसना|मजाक|विनोद|मद|मोह|मत्सर|दंभ|अहंकार मानतो|फणफण|राग येतो/i.test(speech)) {
      emotionCue = '[playful:85]';
      faceCue = '[face:humor_laugh]';
    }
    // 4. Shastric Authority & Strict Dietary / Lifestyle Rules (Decisive Shastric Authority)
    else if (/नियम|शास्त्र|सूर्य नाडी|चंद्र नाडी|सुषुम्ना|जठराग्नी|पित्त|कफ|वात|अन्न|भोजन|खाणे|जेवण|वर्ज्य|सावधान|महत्त्वाचे|लक्षात ठेवा|आयुष्य/i.test(speech)) {
      emotionCue = '[authoritative:85]';
      faceCue = '[face:teaching_authority]';
    }
    // 5. Affectionate Guru Smile / Welcome (Affectionate Guru Smile)
    else if (/चला|स्वागत|सुरुवात|स्टार्ट|बघा|ऐका|नमस्ते|हरि ॐ|प्रसन्न|आनंद/i.test(speech)) {
      emotionCue = '[smile:80]';
      faceCue = '[face:smile_warm]';
    }
    // 6. Conversational Delivery
    else if (speech.length > 20) {
      emotionCue = '[conversational:75]';
      faceCue = '[face:smile_warm]';
    }

    if (faceCue || emotionCue) {
      const cueStr = [emotionCue, faceCue].filter(Boolean).join(' ');
      annotatedLines.push(`${prefix}${cueStr} ${speech}`);
    } else {
      annotatedLines.push(line);
    }
  }

  return annotatedLines.join('\n');
}

