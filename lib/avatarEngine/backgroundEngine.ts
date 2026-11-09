import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface AvatarEnvironmentScene {
  id: string;
  name: string;
  category: 'transparent' | 'green_screen' | 'studio' | 'office' | 'classroom' | 'outdoor';
  thumbnailUrl: string;
  backgroundUrl: string;
  cssFilter?: string;
  isSystem: boolean;
}

export async function getAllBackgroundEnvironments(): Promise<AvatarEnvironmentScene[]> {
  try {
    const res = await bunnyExecute('SELECT * FROM avatar_backgrounds_sql ORDER BY is_system DESC, category ASC');
    return (res.rows || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      thumbnailUrl: row.thumbnail_url,
      backgroundUrl: row.background_url,
      cssFilter: row.css_filter,
      isSystem: Boolean(row.is_system)
    }));
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    return [];
  }
}

export async function addCustomBackgroundEnvironment(params: {
  id: string;
  name: string;
  category: AvatarEnvironmentScene['category'];
  thumbnailUrl: string;
  backgroundUrl: string;
  cssFilter?: string;
}): Promise<AvatarEnvironmentScene> {
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO avatar_backgrounds_sql (
      id, name, category, thumbnail_url, background_url, css_filter, is_system, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      params.id,
      params.name,
      params.category,
      params.thumbnailUrl,
      params.backgroundUrl,
      params.cssFilter || 'none',
      now
    ]
  });

  return {
    id: params.id,
    name: params.name,
    category: params.category,
    thumbnailUrl: params.thumbnailUrl,
    backgroundUrl: params.backgroundUrl,
    cssFilter: params.cssFilter,
    isSystem: false
  };
}

