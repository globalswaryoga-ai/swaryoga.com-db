/**
 * SWAR YOGA AI AVATAR ENGINE - OUTFIT & BACKGROUND GENERATOR
 * Final Development Blueprint - Module 3
 * Handles natural language outfit prompts, custom backgrounds, and scene composition.
 */

import { ALL_PROFESSION_ROLES, ProfessionRoleConfig } from '../allProfessionRolesConfig';
import { MASTER_BACKGROUNDS } from '../avatarStudioMasterConfig';

export interface OutfitSpec {
  roleId?: string;
  customPrompt?: string;
  presetId?: string;
  colorTheme?: string;
  accessories?: string[]; // e.g. ['stethoscope', 'safety_helmet', 'spectacles', 'mic']
}

export interface BackgroundSpec {
  roleId?: string;
  customPrompt?: string;
  presetId?: string;
  lighting?: 'vedic_warm' | '5600k_daylight' | 'cinematic' | 'tv_studio' | 'industrial_bright';
  customImageUrl?: string;
}

export interface ResolvedScene {
  roleName: string;
  outfitPrompt: string;
  backgroundPrompt: string;
  backgroundImageUrl: string;
  framing: 'close_up' | 'chest_up' | 'torso' | 'wide_classroom';
  lightingStyle: string;
  fullDiffusionPrompt: string;
}

export class OutfitBackgroundGenerator {
  /**
   * Resolves the full visual scene prompt from role, custom outfit, and custom background inputs.
   */
  public static resolveScene(
    roleId: string,
    outfitOverride?: OutfitSpec,
    backgroundOverride?: BackgroundSpec
  ): ResolvedScene {
    const role: ProfessionRoleConfig =
      ALL_PROFESSION_ROLES.find((r) => r.id === roleId) || ALL_PROFESSION_ROLES[0];

    // 1. Resolve Outfit
    let outfitPrompt = role.defaultOutfit.promptText;
    if (outfitOverride?.customPrompt && outfitOverride.customPrompt.trim()) {
      outfitPrompt = outfitOverride.customPrompt.trim();
    } else if (outfitOverride?.colorTheme) {
      outfitPrompt += ` in rich ${outfitOverride.colorTheme} fabric`;
    }

    if (outfitOverride?.accessories && outfitOverride.accessories.length > 0) {
      outfitPrompt += `, accessorized with ${outfitOverride.accessories.join(', ')}`;
    }

    // 2. Resolve Background
    let backgroundPrompt = role.defaultBackground.promptText;
    let backgroundImageUrl = role.defaultBackground.imageUrl;

    if (backgroundOverride?.customImageUrl && backgroundOverride.customImageUrl.startsWith('http')) {
      backgroundImageUrl = backgroundOverride.customImageUrl;
      backgroundPrompt = 'Custom high-resolution environment backdrop';
    } else if (backgroundOverride?.presetId) {
      const presetBg = MASTER_BACKGROUNDS.find((b) => b.id === backgroundOverride.presetId);
      if (presetBg) {
        backgroundImageUrl = presetBg.imageUrl;
        backgroundPrompt = presetBg.description;
      }
    } else if (backgroundOverride?.customPrompt && backgroundOverride.customPrompt.trim()) {
      backgroundPrompt = backgroundOverride.customPrompt.trim();
    }

    // 3. Compose Full Master Prompt
    const fullDiffusionPrompt = [
      `A photorealistic, 8k cinematic shot of Mohan Sir (${role.nameEn}), authentic facial features preserved, natural mature skin texture, subtle beard, dignified presence.`,
      `Attire: ${outfitPrompt}, perfect tailoring and fabric folds.`,
      `Environment: ${backgroundPrompt}, photorealistic architectural depth and authentic interior props.`,
      `Lighting: ${role.lightingPreset.replace('_', ' ')} lighting with gentle rim highlight on shoulders.`,
      `Framing: ${role.cameraFraming.replace('_', ' ')} shot, ultra-crisp focus, professional master photography.`,
    ].join(' ');

    return {
      roleName: role.nameHi,
      outfitPrompt,
      backgroundPrompt,
      backgroundImageUrl,
      framing: role.cameraFraming,
      lightingStyle: role.lightingPreset,
      fullDiffusionPrompt,
    };
  }

  /**
   * Pre-packaged outfit presets
   */
  public static getPresetOutfits() {
    return [
      { id: 'white_khadi_kurta', name: 'पवित्र श्वेत खादी कुर्ता', icon: '⚪', category: 'traditional', prompt: 'Pure white khadi cotton kurta with mandarin collar and subtle embroidery' },
      { id: 'saffron_silk_kurta', name: 'केसरिया वैदिक रेशमी कुर्ता', icon: '🟠', category: 'traditional', prompt: 'Auspicious saffron ochre silk kurta with sacred tilak' },
      { id: 'black_bandhgala', name: 'रॉयल ब्लैक बंदगला जोधपुरी', icon: '🕴️', category: 'formal', prompt: 'Regal black bandhgala Jodhpuri suit with golden buttons' },
      { id: 'navy_business_suit', name: 'नेवी-ब्लू कॉर्पोरेट सूट व टाई', icon: '👔', category: 'formal', prompt: 'Tailored navy-blue two-piece wool business suit with crisp white shirt and silk tie' },
      { id: 'academic_tweed_blazer', name: 'प्रोफेसर ट्वीड ब्लेज़र', icon: '🧥', category: 'academic', prompt: 'Academic tweed blazer with elbow patches and button-down shirt' },
      { id: 'doctor_lab_coat', name: 'डॉक्टर कोट व स्टेथोस्कोप', icon: '🥼', category: 'health', prompt: 'Pristine white clinical doctor coat with stethoscope around collar' },
      { id: 'industrial_safety_gear', name: 'फैक्ट्री सेफ्टी हेलमेट व जैकेट', icon: '🦺', category: 'industry', prompt: 'Industrial yellow safety hardhat helmet and high-visibility neon reflective vest' },
      { id: 'modern_dark_crewneck', name: 'स्टूडियो क्रूनेक व हेडफोन', icon: '🎧', category: 'studio', prompt: 'Minimalist charcoal dark crewneck sweater with studio monitoring headphones' },
      { id: 'formal_chef_jacket', name: 'मास्टर शेफ जैकेट व एप्रन', icon: '👨‍🍳', category: 'culinary', prompt: 'Double-breasted black artisan chef jacket with golden crest' },
    ];
  }
}
