import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'both';

    let wardrobe: any[] = [];
    let scenes: any[] = [];

    if (type === 'wardrobe' || type === 'both') {
      const wRes = await bunnyExecute(`SELECT * FROM mohan_wardrobe_library_sql WHERE is_active = 1 ORDER BY created_at DESC`);
      wardrobe = wRes.rows || [];
    }

    if (type === 'scenes' || type === 'both') {
      const sRes = await bunnyExecute(`SELECT * FROM mohan_scene_library_sql WHERE is_active = 1 ORDER BY created_at DESC`);
      scenes = sRes.rows || [];
    }

    return NextResponse.json({ success: true, wardrobe, scenes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item_type = 'wardrobe', ...data } = body;
    const now = new Date().toISOString();

    if (item_type === 'wardrobe') {
      const id = data.id || `ward_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_wardrobe_library_sql
              (id, clothing_name, category, color_hex, fabric_description, front_image_key,
               back_image_key, side_image_key, fabric_texture_key, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                clothing_name = excluded.clothing_name,
                category = excluded.category,
                color_hex = excluded.color_hex,
                fabric_description = excluded.fabric_description,
                front_image_key = excluded.front_image_key,
                updated_at = excluded.updated_at`,
        args: [
          id,
          data.clothing_name || 'Vedic Khadi Kurta',
          data.category || 'indian',
          data.color_hex || '#a3e635',
          data.fabric_description || 'Pure handwoven khadi cotton',
          data.front_image_key || 'mohan-avatar/wardrobe/kurta_lime_front.png',
          data.back_image_key || null,
          data.side_image_key || null,
          data.fabric_texture_key || null,
          now,
          now,
        ],
      });
      return NextResponse.json({ success: true, message: 'Wardrobe item saved', id });
    }

    if (item_type === 'scene') {
      const id = data.id || `scene_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await bunnyExecute({
        sql: `INSERT INTO mohan_scene_library_sql
              (id, scene_name, category, background_type, storage_object_key, preview_url,
               lighting_preset, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(id) DO UPDATE SET
                scene_name = excluded.scene_name,
                category = excluded.category,
                preview_url = excluded.preview_url,
                lighting_preset = excluded.lighting_preset`,
        args: [
          id,
          data.scene_name || 'Himalayan Sunrise Ashram',
          data.category || 'ashram',
          data.background_type || 'image',
          data.storage_object_key || 'mohan-avatar/scenes/himalayas.jpg',
          data.preview_url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
          data.lighting_preset || 'warm_natural',
          now,
        ],
      });
      return NextResponse.json({ success: true, message: 'Scene saved', id });
    }

    return NextResponse.json({ success: false, error: 'item_type must be wardrobe or scene' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

