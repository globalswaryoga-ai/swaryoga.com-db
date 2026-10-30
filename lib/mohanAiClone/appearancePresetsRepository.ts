import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface AppearancePresetRecord {
  id: string;
  preset_name: string;
  hairstyle_id: string;
  hair_length: 'bald' | 'buzz' | 'short' | 'medium' | 'shoulder' | 'long';
  hair_texture: 'straight' | 'wavy' | 'curly' | 'coily';
  hair_density: number; // 0.2 to 1.5
  hair_color_hex: string;
  grey_percentage: number; // 0 to 100
  hairline_style: 'natural' | 'receding' | 'straight' | 'widows_peak';
  parting_style: 'none' | 'left' | 'right' | 'center';
  eyebrow_style: 'natural' | 'thick' | 'groomed' | 'vedic_arched';
  facial_hair_id: 'clean_shaven' | 'stubble' | 'guru_beard' | 'full_vedic_beard' | 'french_beard';
  beard_length: 'stubble' | 'short' | 'medium' | 'long' | 'flowing';
  beard_color_hex: string;
  moustache_style: 'clean' | 'classic' | 'thick' | 'royal_curled';
  spectacles_id: 'none' | 'classic-black' | 'gold-rimless' | 'round-scholar' | 'transparent-modern';
  clothing_id: string;
  default_background_id: string;
  default_camera_view: 'full' | 'waist' | 'face';
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_APPEARANCE_PRESETS: Partial<AppearancePresetRecord>[] = [
  {
    id: 'preset_vedic_guru_authentic',
    preset_name: 'Vedic Master Guru (Authentic Mohanji)',
    hairstyle_id: 'wavy_natural_black',
    hair_length: 'medium',
    hair_texture: 'wavy',
    hair_density: 1.0,
    hair_color_hex: '#181512',
    grey_percentage: 15,
    hairline_style: 'natural',
    parting_style: 'side',
    eyebrow_style: 'natural',
    facial_hair_id: 'guru_beard',
    beard_length: 'medium',
    beard_color_hex: '#1f1b17',
    moustache_style: 'classic',
    spectacles_id: 'none',
    clothing_id: 'lime_green_kurta',
    default_background_id: 'none',
    default_camera_view: 'waist',
    is_favorite: true,
  },
  {
    id: 'preset_sacred_sadhana_flowing',
    preset_name: 'Sacred Sadhana & Dhyana (Flowing Beard & Tripundra)',
    hairstyle_id: 'traditional_knot',
    hair_length: 'shoulder',
    hair_texture: 'wavy',
    hair_density: 1.1,
    hair_color_hex: '#12100e',
    grey_percentage: 25,
    hairline_style: 'natural',
    parting_style: 'none',
    eyebrow_style: 'vedic_arched',
    facial_hair_id: 'full_vedic_beard',
    beard_length: 'long',
    beard_color_hex: '#1c1815',
    moustache_style: 'thick',
    spectacles_id: 'none',
    clothing_id: 'white_khadi_kurta',
    default_background_id: 'temple',
    default_camera_view: 'full',
    is_favorite: true,
  },
  {
    id: 'preset_corporate_authority',
    preset_name: 'Global Authority & Boardroom (Trimmed & Rimless Spectacles)',
    hairstyle_id: 'executive_short',
    hair_length: 'short',
    hair_texture: 'straight',
    hair_density: 0.95,
    hair_color_hex: '#1a1a1a',
    grey_percentage: 10,
    hairline_style: 'straight',
    parting_style: 'left',
    eyebrow_style: 'groomed',
    facial_hair_id: 'stubble',
    beard_length: 'short',
    beard_color_hex: '#1a1a1a',
    moustache_style: 'classic',
    spectacles_id: 'gold-rimless',
    clothing_id: 'formal_nehru_jacket',
    default_background_id: 'studio',
    default_camera_view: 'waist',
    is_favorite: false,
  },
];

/**
 * Get all appearance presets from Bunny Edge SQL
 */
export async function getAllAppearancePresets(): Promise<AppearancePresetRecord[]> {
  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_appearance_presets_sql ORDER BY is_favorite DESC, created_at DESC`,
  });

  const list = (res.rows || []) as unknown as AppearancePresetRecord[];
  if (list.length === 0) {
    // Seed default presets
    for (const p of DEFAULT_APPEARANCE_PRESETS) {
      await saveAppearancePreset(p);
    }
    return (await getAllAppearancePresets());
  }
  return list;
}

/**
 * Save or update an appearance preset
 */
export async function saveAppearancePreset(p: Partial<AppearancePresetRecord>): Promise<AppearancePresetRecord> {
  const now = new Date().toISOString();
  const id = p.id || `preset_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  await bunnyExecute({
    sql: `INSERT INTO mohan_appearance_presets_sql
          (id, preset_name, hairstyle_id, hair_length, hair_texture, hair_density, hair_color_hex,
           grey_percentage, hairline_style, parting_style, eyebrow_style, facial_hair_id, beard_length,
           beard_color_hex, moustache_style, spectacles_id, clothing_id, default_background_id,
           default_camera_view, is_favorite, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            preset_name = excluded.preset_name,
            hairstyle_id = excluded.hairstyle_id,
            hair_length = excluded.hair_length,
            hair_texture = excluded.hair_texture,
            hair_density = excluded.hair_density,
            hair_color_hex = excluded.hair_color_hex,
            grey_percentage = excluded.grey_percentage,
            hairline_style = excluded.hairline_style,
            parting_style = excluded.parting_style,
            eyebrow_style = excluded.eyebrow_style,
            facial_hair_id = excluded.facial_hair_id,
            beard_length = excluded.beard_length,
            beard_color_hex = excluded.beard_color_hex,
            moustache_style = excluded.moustache_style,
            spectacles_id = excluded.spectacles_id,
            clothing_id = excluded.clothing_id,
            default_background_id = excluded.default_background_id,
            default_camera_view = excluded.default_camera_view,
            is_favorite = excluded.is_favorite,
            updated_at = excluded.updated_at`,
    args: [
      id,
      p.preset_name || 'My Custom Look',
      p.hairstyle_id || 'wavy_natural_black',
      p.hair_length || 'medium',
      p.hair_texture || 'wavy',
      p.hair_density ?? 1.0,
      p.hair_color_hex || '#181512',
      p.grey_percentage ?? 15,
      p.hairline_style || 'natural',
      p.parting_style || 'side',
      p.eyebrow_style || 'natural',
      p.facial_hair_id || 'guru_beard',
      p.beard_length || 'medium',
      p.beard_color_hex || '#1f1b17',
      p.moustache_style || 'classic',
      p.spectacles_id || 'none',
      p.clothing_id || 'lime_green_kurta',
      p.default_background_id || 'none',
      p.default_camera_view || 'waist',
      p.is_favorite ? 1 : 0,
      p.created_at || now,
      now,
    ],
  });

  const res = await bunnyExecute({
    sql: `SELECT * FROM mohan_appearance_presets_sql WHERE id = ? LIMIT 1`,
    args: [id],
  });
  return res.rows[0] as unknown as AppearancePresetRecord;
}

