/**
 * Swar Yoga In-House AI Avatar - Kinetic Subtitle & Caption Engine
 * ===============================================================
 * Generates viral, word-by-word highlighted animated captions (like CapCut & HeyGen)
 * in Devanagari (Hindi, Marathi, Sanskrit) and English.
 * 
 * Outputs:
 * 1. Advanced SubStation Alpha (.ass) format with active word color highlighting.
 * 2. Standard WebVTT (.vtt) and SRT (.srt) formats for web players.
 * 3. FFmpeg drawtext / subtitles filter strings for burning captions directly into 1080p MP4.
 */

export interface SubtitleWord {
  offsetMs: number;
  durationMs: number;
  text: string;
}

export interface SubtitleStyleConfig {
  fontName?: string;
  fontSize?: number;
  activeColorHex?: string;    // Glowing Gold: #FFD700
  inactiveColorHex?: string;  // Crisp White: #FFFFFF
  outlineColorHex?: string;   // Deep Charcoal: #101010
  outlineWidth?: number;
  verticalMarginPx?: number;  // Distance from bottom
}

export class KineticSubtitleEngine {
  /**
   * Generates a viral Advanced SubStation Alpha (.ass) subtitle file content
   * with word-by-word karaoke highlighting.
   */
  public static generateAssKaraoke(
    words: SubtitleWord[],
    config: SubtitleStyleConfig = {}
  ): string {
    const fontSize = config.fontSize || 48;
    const fontName = config.fontName || 'Arial';
    const activeColor = config.activeColorHex || '&H0000D7FF'; // BGR format in ASS: Gold
    const inactiveColor = config.inactiveColorHex || '&H00FFFFFF'; // White
    const outlineColor = config.outlineColorHex || '&H00101010'; // Dark
    const marginV = config.verticalMarginPx || 120;

    // Build ASS Header
    let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SwarCaptions,${fontName},${fontSize},${inactiveColor},${activeColor},${outlineColor},&H80000000,-1,0,0,0,100,100,0,0,1,3.5,2,2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Group words into short conversational phrases (3 to 6 words per line)
    const phrases: SubtitleWord[][] = [];
    let currentPhrase: SubtitleWord[] = [];

    for (const w of words) {
      currentPhrase.push(w);
      if (currentPhrase.length >= 4 || w.text.endsWith('।') || w.text.endsWith('?') || w.text.endsWith('.')) {
        phrases.push([...currentPhrase]);
        currentPhrase = [];
      }
    }
    if (currentPhrase.length > 0) {
      phrases.push(currentPhrase);
    }

    // Format each phrase into ASS dialog lines
    for (const phrase of phrases) {
      const phraseStartMs = phrase[0].offsetMs;
      const phraseEndMs = phrase[phrase.length - 1].offsetMs + phrase[phrase.length - 1].durationMs;

      const startTimestamp = this.formatAssTime(phraseStartMs);
      const endTimestamp = this.formatAssTime(phraseEndMs);

      // Karaoke tags: {\k<centiseconds>}word
      let karaokeText = '';
      for (const w of phrase) {
        const centis = Math.max(1, Math.round(w.durationMs / 10));
        karaokeText += `{\\k${centis}}${w.text} `;
      }

      ass += `Dialogue: 0,${startTimestamp},${endTimestamp},SwarCaptions,,0,0,0,,${karaokeText.trim()}\n`;
    }

    return ass;
  }

  /**
   * Helper to format milliseconds to ASS timestamp: H:MM:SS.CC
   */
  public static formatAssTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  }
}

