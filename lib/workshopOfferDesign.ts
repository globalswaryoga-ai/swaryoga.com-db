export interface OfferDesign {
  id: string;
  kind: 'ad' | 'receipt' | 'certificate';
  title: string;
  headline: string;
  subtitle: string;
  footer: string;
  accent: string;
  background: string;
  textColor: string;
  fontFamily: 'sans' | 'serif';
  width: number;
  height: number;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  leadId?: string;
  documentNumber?: string;
  status: 'draft' | 'final';
  canvaDesignId?: string;
}

export function validateOfferDesign(input: unknown): OfferDesign {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid design');
  const design = input as OfferDesign;
  if (!['ad', 'receipt', 'certificate'].includes(design.kind) || typeof design.id !== 'string' || !/^[\w-]{1,120}$/.test(design.id)) throw new Error('Invalid design identity');
  for (const key of ['title', 'headline', 'subtitle', 'footer'] as const) {
    if (typeof design[key] !== 'string' || design[key].length > 3000) throw new Error(`Invalid ${key}`);
  }
  for (const key of ['accent', 'background', 'textColor'] as const) {
    if (!/^#[\da-f]{6}$/i.test(design[key])) throw new Error('Choose a valid six-digit color');
  }
  if (![design.width, design.height].every(value => Number.isInteger(value) && value >= 400 && value <= 2400)) throw new Error('Design dimensions must be between 400 and 2400 pixels');
  if (!['sans', 'serif'].includes(design.fontFamily) || !['draft', 'final'].includes(design.status)) throw new Error('Invalid design settings');
  for (const key of ['imageUrl', 'videoUrl'] as const) {
    if (design[key] && (!/^https:\/\//.test(design[key]!) || design[key]!.length > 2000)) throw new Error('Media must use a saved HTTPS URL');
  }
  return {
    id: design.id, kind: design.kind, title: design.title, headline: design.headline, subtitle: design.subtitle, footer: design.footer,
    accent: design.accent, background: design.background, textColor: design.textColor, fontFamily: design.fontFamily,
    width: design.width, height: design.height, status: design.status,
    ...(typeof design.imageUrl === 'string' ? { imageUrl: design.imageUrl } : {}),
    ...(typeof design.videoUrl === 'string' ? { videoUrl: design.videoUrl } : {}),
    ...(typeof design.leadId === 'string' ? { leadId: design.leadId } : {}),
    ...(typeof design.documentNumber === 'string' ? { documentNumber: design.documentNumber } : {}),
  };
}
