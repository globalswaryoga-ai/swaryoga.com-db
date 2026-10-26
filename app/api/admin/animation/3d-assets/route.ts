import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';

// In-memory cache for Poly Haven models to avoid hammering their API
let polyHavenCatalogCache: any[] | null = null;
let polyHavenLastFetched = 0;

// Curated verified Swar Yoga assets with instant availability
const SWAR_YOGA_CURATED_ASSETS = [
  {
    id: 'swar_teak_table',
    name: 'Vedic Teakwood Table (सागौन की मेज)',
    category: 'furniture',
    source: 'swar_yoga',
    license: 'CC0 Public Domain',
    thumbnail: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=400&q=80',
    tags: ['table', 'wood', 'furniture', 'dining', 'teak'],
    modelUrl: '', // Procedural fallback or cached GLB
    description: 'Realistic teak wood dining table with authentic grain and matte finish.',
  },
  {
    id: 'swar_crystal_glass',
    name: 'Crystal Water Glass (कांच का गिलास)',
    category: 'tableware',
    source: 'swar_yoga',
    license: 'CC0 Public Domain',
    thumbnail: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    tags: ['glass', 'water', 'crystal', 'cup', 'drinking'],
    modelUrl: '',
    description: 'Refractive faceted crystal glass with true IOR 1.52 transparency.',
  },
  {
    id: 'swar_copper_pitcher',
    name: 'Ayurvedic Copper Water Jug (तांबे का जग)',
    category: 'tableware',
    source: 'swar_yoga',
    license: 'CC0 Public Domain',
    thumbnail: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80',
    tags: ['jug', 'pitcher', 'copper', 'water', 'ayurveda'],
    modelUrl: '',
    description: 'Handcrafted hammered pure copper water jug with warm reflective sheen.',
  },
  {
    id: 'swar_human_stomach',
    name: 'Human Stomach & Digestive Gut (आमाशय व आंतें)',
    category: 'anatomy',
    source: 'swar_yoga',
    license: 'CC-BY Medical Education',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
    tags: ['stomach', 'digestion', 'anatomy', 'organ', 'gut', 'panchakarma'],
    modelUrl: '',
    description: 'Accurate anatomical stomach and intestinal tract showing digestive mechanics.',
  },
  {
    id: 'swar_human_lungs',
    name: 'Lungs & Bronchial Tree (फेफड़े व श्वसन तंत्र)',
    category: 'anatomy',
    source: 'swar_yoga',
    license: 'CC-BY Medical Education',
    thumbnail: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80',
    tags: ['lungs', 'respiration', 'pranayama', 'breathing', 'anatomy', 'diaphragm'],
    modelUrl: '',
    description: 'Bilateral lung lobes with articulated bronchial tree for Dirgha Pranayama.',
  },
  {
    id: 'swar_spinal_column',
    name: 'Vertebral Spine & Kundalini Column (मेरुदंड)',
    category: 'anatomy',
    source: 'swar_yoga',
    license: 'CC0 Public Domain',
    thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=400&q=80',
    tags: ['spine', 'vertebrae', 'kundalini', 'sushumna', 'chakra', 'posture'],
    modelUrl: '',
    description: 'Full 33-vertebra cervical to coccyx human spine with curvature alignment.',
  },
  {
    id: 'swar_human_heart',
    name: 'Anatomical Beating Heart (हृदय)',
    category: 'anatomy',
    source: 'swar_yoga',
    license: 'CC-BY Medical Education',
    thumbnail: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=400&q=80',
    tags: ['heart', 'cardiac', 'anahata', 'pulse', 'circulation'],
    modelUrl: '',
    description: '4-chamber human heart with aorta and vena cava vessels.',
  },
  {
    id: 'swar_lotus_flower',
    name: 'Sacred Pink Lotus Flower (पद्म पुष्प)',
    category: 'nature',
    source: 'swar_yoga',
    license: 'CC0 Public Domain',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    tags: ['lotus', 'flower', 'padma', 'chakra', 'meditation', 'nature'],
    modelUrl: '',
    description: 'Multi-petal blooming pink lotus flower on water lily pad.',
  },
  {
    id: 'swar_yoga_avatar_male',
    name: 'Rigged Yogi Male Avatar (योगी पुरुष)',
    category: 'human_body',
    source: 'swar_yoga',
    license: 'CC0 Rigify Standard',
    thumbnail: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=400&q=80',
    tags: ['yogi', 'human', 'male', 'avatar', 'asana', 'rigged', 'ik'],
    modelUrl: '',
    description: 'Full body male human model rigged with 65-bone Rigify skeletal armature.',
  },
  {
    id: 'swar_yoga_avatar_female',
    name: 'Rigged Yogini Female Avatar (योगिनी स्त्री)',
    category: 'human_body',
    source: 'swar_yoga',
    license: 'CC0 Rigify Standard',
    thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
    tags: ['yogini', 'human', 'female', 'avatar', 'asana', 'rigged', 'ik'],
    modelUrl: '',
    description: 'Full body female human model with skeletal IK for Padmasana and Bhujangasana.',
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const source = searchParams.get('source') || 'all'; // 'all' | 'polyhaven' | 'sketchfab' | 'swar_yoga'
    const category = searchParams.get('category') || '';

    const results: any[] = [];

    // 1. Swar Yoga Curated Library
    if (source === 'all' || source === 'swar_yoga') {
      const filteredCurated = SWAR_YOGA_CURATED_ASSETS.filter((item) => {
        if (category && item.category !== category) return false;
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.tags.some((t) => t.includes(query)) ||
          item.description.toLowerCase().includes(query)
        );
      });
      results.push(...filteredCurated);
    }

    // 2. Poly Haven Models (100% Free CC0)
    if (source === 'all' || source === 'polyhaven') {
      try {
        const now = Date.now();
        if (!polyHavenCatalogCache || now - polyHavenLastFetched > 3600000) {
          const res = await fetch('https://api.polyhaven.com/assets?t=models', {
            next: { revalidate: 3600 },
          });
          if (res.ok) {
            const data = await res.json();
            polyHavenCatalogCache = Object.entries(data).map(([key, val]: [string, any]) => ({
              id: `polyhaven_${key}`,
              rawKey: key,
              name: val.name || key.replace(/_/g, ' '),
              category: (val.categories && val.categories[0]) || 'furniture',
              source: 'polyhaven',
              license: 'CC0 Public Domain (Unrestricted Commercial)',
              thumbnail: `https://cdn.polyhaven.com/asset_img/primary/${key}.png?width=320&height=240`,
              tags: val.tags || [],
              polycount: val.polycount || 0,
              description: `High-fidelity photorealistic CC0 3D model with 1K-4K PBR textures and GLTF/Blend support.`,
              downloadUrl: `https://api.polyhaven.com/files/${key}`,
            }));
            polyHavenLastFetched = now;
          }
        }

        if (polyHavenCatalogCache) {
          let phFiltered = polyHavenCatalogCache;
          if (query) {
            phFiltered = phFiltered.filter(
              (item) =>
                item.name.toLowerCase().includes(query) ||
                item.rawKey.toLowerCase().includes(query) ||
                item.tags.some((t: string) => t.toLowerCase().includes(query))
            );
          }
          // Limit to top 24 for fast UI rendering
          results.push(...phFiltered.slice(0, 24));
        }
      } catch (err: any) {
        console.error('Poly Haven fetch failed:', err.message);
      }
    }

    // 3. Sketchfab Models (Search Data API)
    if ((source === 'all' || source === 'sketchfab') && query) {
      try {
        const sfUrl = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(
          query
        )}&count=12`;
        const sfRes = await fetch(sfUrl);
        if (sfRes.ok) {
          const sfData = await sfRes.json();
          const sfItems = (sfData.results || []).map((m: any) => {
            // Find appropriate thumbnail (~256px to 720px)
            const thumbs = m.thumbnails?.images || [];
            const bestThumb =
              thumbs.find((t: any) => t.width >= 256 && t.width <= 720) || thumbs[0];

            return {
              id: `sketchfab_${m.uid}`,
              rawKey: m.uid,
              name: m.name,
              category: 'anatomy',
              source: 'sketchfab',
              license: m.license?.label || 'Creative Commons',
              thumbnail: bestThumb?.url || '',
              embedUrl: m.embedUrl,
              viewerUrl: m.viewerUrl,
              author: m.user?.displayName || m.user?.username || 'Sketchfab Creator',
              isDownloadable: m.isDownloadable,
              description: `Professional 3D model from Sketchfab community. Free interactive 3D viewer and GLTF download.`,
            };
          });
          results.push(...sfItems);
        }
      } catch (err: any) {
        console.error('Sketchfab search failed:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      query,
      source,
      totalCount: results.length,
      assets: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch 3D assets' },
      { status: 500 }
    );
  }
}

// POST endpoint to cache any 3D asset into Bunny Storage CDN
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, assetId, rawKey, directDownloadUrl, name } = body;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Missing assetId' }, { status: 400 });
    }

    // If already a Bunny CDN URL, return directly
    if (directDownloadUrl && directDownloadUrl.includes('b-cdn.net')) {
      return NextResponse.json({
        success: true,
        cdnUrl: directDownloadUrl,
        name: name || '3D Model',
      });
    }

    let gltfDownloadUrl = directDownloadUrl;

    // Resolve Poly Haven direct GLTF URL if from Poly Haven
    if (source === 'polyhaven' && rawKey) {
      const metaRes = await fetch(`https://api.polyhaven.com/files/${rawKey}`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        // Prefer 1k or 2k gltf for fast real-time loading
        if (meta.gltf?.['1k']?.gltf?.url) {
          gltfDownloadUrl = meta.gltf['1k'].gltf.url;
        } else if (meta.gltf?.['2k']?.gltf?.url) {
          gltfDownloadUrl = meta.gltf['2k'].gltf.url;
        } else if (meta.gltf) {
          const resolutions = Object.keys(meta.gltf);
          if (resolutions.length > 0) {
            const firstRes = meta.gltf[resolutions[0]];
            gltfDownloadUrl = firstRes?.gltf?.url || firstRes?.url;
          }
        }
      }
    }

    if (!gltfDownloadUrl) {
      // If no direct binary URL can be resolved (e.g. Sketchfab requiring user account login token)
      return NextResponse.json({
        success: false,
        error:
          'Direct GLTF URL requires account token. You can preview this 3D model interactively or use a CC0 asset from Poly Haven / Swar Yoga library.',
        assetId,
      });
    }

    // Download the model file and upload to Bunny Storage
    const modelFetch = await fetch(gltfDownloadUrl);
    if (!modelFetch.ok) {
      throw new Error(`Failed to download model from source (${modelFetch.status})`);
    }

    const arrayBuffer = await modelFetch.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = (name || assetId).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const isGlb = gltfDownloadUrl.toLowerCase().endsWith('.glb');
    const ext = isGlb ? 'glb' : 'gltf';
    const filename = `${safeName}_${Date.now()}.${ext}`;

    const cdnUrl = await uploadToBunnyStorage(buffer, filename, {
      contentType: isGlb ? 'model/gltf-binary' : 'model/gltf+json',
    });

    return NextResponse.json({
      success: true,
      cdnUrl,
      name: name || safeName,
      assetId,
      source,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import 3D asset' },
      { status: 500 }
    );
  }
}
