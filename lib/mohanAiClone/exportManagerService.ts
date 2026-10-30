import type { IntelligenceSegment } from './videoIntelligenceService';

export interface ExportManifest {
  projectName: string;
  avatarVersion: string;
  sourceLanguage: string;
  targetLanguages: string[];
  aspectRatios: Array<'16:9' | '9:16' | '1:1'>;
  generationDate: string;
  approvalStatus: 'pending' | 'admin_approved' | 'published';
  formatsIncluded: string[];
  bunnyStorageFolder: string;
  files: Array<{
    fileName: string;
    relativePath: string;
    contentType: string;
    fileSizeEstimate: string;
  }>;
}

/**
 * Format milliseconds into SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Format milliseconds into WebVTT timestamp format: HH:MM:SS.mmm
 */
export function formatVttTimestamp(ms: number): string {
  return formatSrtTimestamp(ms).replace(',', '.');
}

/**
 * Generates standard SRT subtitle text from segments
 */
export function generateSrtContent(segments: IntelligenceSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatSrtTimestamp(seg.startMs);
      const end = formatSrtTimestamp(seg.endMs);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

/**
 * Generates standard WebVTT subtitle text from segments
 */
export function generateVttContent(segments: IntelligenceSegment[]): string {
  let vtt = 'WEBVTT - Mohan AI Clone Subtitles\n\n';
  vtt += segments
    .map((seg, idx) => {
      const start = formatVttTimestamp(seg.startMs);
      const end = formatVttTimestamp(seg.endMs);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
  return vtt;
}

/**
 * Generates organized folder structure and manifest for Mohan AI Videos export
 */
export function buildExportManifest(
  projectName: string,
  targetLanguages: string[] = ['hi', 'en', 'mr', 'sa', 'ne'],
  aspectRatios: Array<'16:9' | '9:16' | '1:1'> = ['16:9', '9:16', '1:1'],
): ExportManifest {
  const safeProject = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseFolder = `Mohan AI Videos/${safeProject}/`;

  const files: ExportManifest['files'] = [
    {
      fileName: 'transcript.txt',
      relativePath: 'Transcripts/transcript.txt',
      contentType: 'text/plain',
      fileSizeEstimate: '12 KB',
    },
    {
      fileName: 'performance_dna.json',
      relativePath: 'Performance Data/performance_dna.json',
      contentType: 'application/json',
      fileSizeEstimate: '45 KB',
    },
  ];

  for (const lang of targetLanguages) {
    files.push({
      fileName: `subtitles_${lang}.srt`,
      relativePath: `Subtitles/subtitles_${lang}.srt`,
      contentType: 'application/x-subrip',
      fileSizeEstimate: '18 KB',
    });
    files.push({
      fileName: `subtitles_${lang}.vtt`,
      relativePath: `Subtitles/subtitles_${lang}.vtt`,
      contentType: 'text/vtt',
      fileSizeEstimate: '18 KB',
    });

    for (const ratio of aspectRatios) {
      const ratioFolder = ratio.replace(':', 'x');
      files.push({
        fileName: `mohan_${safeProject}_${lang}_${ratioFolder}.mp4`,
        relativePath: `Generated Videos/${lang.toUpperCase()}/${ratioFolder}/video.mp4`,
        contentType: 'video/mp4',
        fileSizeEstimate: '48 MB',
      });
    }
  }

  return {
    projectName,
    avatarVersion: 'Mohan AI Clone v1.0 Master',
    sourceLanguage: 'Hindi',
    targetLanguages,
    aspectRatios,
    generationDate: new Date().toISOString(),
    approvalStatus: 'admin_approved',
    formatsIncluded: ['MP4', 'SRT', 'VTT', 'TXT', 'JSON'],
    bunnyStorageFolder: baseFolder,
    files,
  };
}

