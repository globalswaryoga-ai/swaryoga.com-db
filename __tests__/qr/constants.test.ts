/**
 * Tests for QR WhatsApp page constants
 * Validates data integrity of all exported constant arrays
 * @module app/admin/crm/qr/constants
 */
import {
  FUNNEL_COLORS,
  LABEL_COLORS,
  EMOJI_LIST,
  QUICK_REPLIES,
  TEMPLATES,
  DEFAULT_FUNNEL_STAGES,
  DEFAULT_LABEL_PRESETS,
  REACTION_EMOJIS,
} from '@/app/admin/crm/qr/constants';

describe('FUNNEL_COLORS', () => {
  it('has at least 5 color options', () => {
    expect(FUNNEL_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it('each color contains bg-, text-, and border- classes', () => {
    for (const color of FUNNEL_COLORS) {
      expect(color).toMatch(/bg-/);
      expect(color).toMatch(/text-/);
      expect(color).toMatch(/border-/);
    }
  });
});

describe('LABEL_COLORS', () => {
  it('has at least 5 color options', () => {
    expect(LABEL_COLORS.length).toBeGreaterThanOrEqual(5);
  });

  it('each color contains bg- and text- classes', () => {
    for (const color of LABEL_COLORS) {
      expect(color).toMatch(/bg-/);
      expect(color).toMatch(/text-/);
    }
  });
});

describe('EMOJI_LIST', () => {
  it('has at least 30 emojis', () => {
    expect(EMOJI_LIST.length).toBeGreaterThanOrEqual(30);
  });

  it('each emoji is a non-empty string', () => {
    for (const emoji of EMOJI_LIST) {
      expect(typeof emoji).toBe('string');
      expect(emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('QUICK_REPLIES', () => {
  it('has at least 5 replies', () => {
    expect(QUICK_REPLIES.length).toBeGreaterThanOrEqual(5);
  });

  it('each reply is a non-empty string', () => {
    for (const reply of QUICK_REPLIES) {
      expect(typeof reply).toBe('string');
      expect(reply.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('TEMPLATES', () => {
  it('has at least 3 templates', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('each template has name and text', () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.name).toBeDefined();
      expect(tpl.name.trim().length).toBeGreaterThan(0);
      expect(tpl.text).toBeDefined();
      expect(tpl.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('template names are unique', () => {
    const names = TEMPLATES.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('DEFAULT_FUNNEL_STAGES', () => {
  it('has "all" as the first stage', () => {
    expect(DEFAULT_FUNNEL_STAGES[0].key).toBe('all');
    expect(DEFAULT_FUNNEL_STAGES[0].label).toBe('All');
  });

  it('has at least 5 stages including "all"', () => {
    expect(DEFAULT_FUNNEL_STAGES.length).toBeGreaterThanOrEqual(5);
  });

  it('all stages have unique keys', () => {
    const keys = DEFAULT_FUNNEL_STAGES.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('each stage has key, label, and color', () => {
    for (const stage of DEFAULT_FUNNEL_STAGES) {
      expect(stage.key).toBeDefined();
      expect(stage.label).toBeDefined();
      expect(stage.color).toBeDefined();
      expect(stage.key.length).toBeGreaterThan(0);
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.color.length).toBeGreaterThan(0);
    }
  });

  it('non-"all" stages use lowercase snake_case keys', () => {
    for (const stage of DEFAULT_FUNNEL_STAGES) {
      if (stage.key === 'all') continue;
      expect(stage.key).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

describe('DEFAULT_LABEL_PRESETS', () => {
  it('has at least 3 presets', () => {
    expect(DEFAULT_LABEL_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it('all presets have unique keys', () => {
    const keys = DEFAULT_LABEL_PRESETS.map(l => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('each preset has key, label, and color', () => {
    for (const preset of DEFAULT_LABEL_PRESETS) {
      expect(preset.key).toBeDefined();
      expect(preset.label).toBeDefined();
      expect(preset.color).toBeDefined();
    }
  });
});

describe('REACTION_EMOJIS', () => {
  it('has at least 5 reaction emojis', () => {
    expect(REACTION_EMOJIS.length).toBeGreaterThanOrEqual(5);
  });

  it('each reaction is a non-empty string', () => {
    for (const emoji of REACTION_EMOJIS) {
      expect(typeof emoji).toBe('string');
      expect(emoji.length).toBeGreaterThan(0);
    }
  });

  it('includes common reactions (thumbs up, heart)', () => {
    expect(REACTION_EMOJIS).toContain('👍');
    expect(REACTION_EMOJIS).toContain('❤️');
  });
});
