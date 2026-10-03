import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Call Replicate and poll until done
async function runReplicate(payload: Record<string, any>): Promise<any> {
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60',
    },
    body: JSON.stringify(payload),
  });

  const prediction = await createRes.json();
  if (!createRes.ok) throw new Error(prediction?.detail || JSON.stringify(prediction) || 'Replicate API error');

  // If already done (with Prefer: wait)
  if (prediction.status === 'succeeded') return prediction.output;

  // Poll (up to 5 minutes for video generation)
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` }
    });
    const data = await pollRes.json();
    if (data.status === 'succeeded') return data.output;
    if (data.status === 'failed') throw new Error(data.error || 'Replicate prediction failed');
  }
  throw new Error('Replicate timed out');
}

// Llama 3 8B Instruct version ID
const LLAMA3_VERSION = '5a6809ca6288247d06daf6365557e5e429063f32a21146b2a807c682652136b8';

// Detect if the user is asking for an image
function wantsImage(prompt: string): boolean {
  const keywords = [
    'create image', 'generate image', 'make image', 'create a image',
    'generate a image', 'make an image', 'create an image', 'draw',
    'create poster', 'generate poster', 'make poster', 'design poster',
    'create ad', 'generate ad', 'make ad', 'create advertisement',
    'create banner', 'generate banner', 'create graphic', 'create visual',
    'image banao', 'photo banao', 'poster banao', 'thumbnail', 'picture', 'background'
  ];
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Detect if the user is asking for ad copy specifically
function wantsAdCopy(prompt: string): boolean {
  const keywords = [
    'headline', 'subheading', 'cta', 'call to action',
    'ad copy', 'advertisement', 'social media ad',
    'instagram ad', 'facebook ad', 'meta ad', 'canva ad'
  ];
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// Detect if the user is asking for a video
function wantsVideo(prompt: string): boolean {
  const keywords = ['video', 'animate', 'animation', 'motion', 'mp4', 'movie', 'clip', 'reels', 'reel'];
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

    const body = await request.json();
    const { prompt, templateId, messages } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const shouldGenerateImage = wantsImage(prompt);
    const shouldGenerateAdCopy = wantsAdCopy(prompt);

    // Build conversation history
    const historyText = (messages || []).map((m: any) =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');

    // 1. Generate Chat Response via Llama 3 on Replicate
    let aiText = '';
    let aiData: any = null;

    if (shouldGenerateAdCopy) {
      const systemPrompt = `You are an expert social media copywriter. Given a prompt for an ad, generate exactly 3 things: a catchy Headline, a Subheading, and a Call-to-Action (CTA). Return them strictly as a JSON object with keys: "Headline", "Subheading", "CTA". Return ONLY the JSON, no extra text.`;
      const llmOutput = await runReplicate({
        version: LLAMA3_VERSION,
        input: {
          prompt: `${historyText}\nUser: ${prompt}\nAssistant:`,
          system_prompt: systemPrompt,
          max_new_tokens: 300,
          temperature: 0.7,
        }
      });
      const rawText = Array.isArray(llmOutput) ? llmOutput.join('') : String(llmOutput);
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (aiData) {
          aiText = `Headline: ${aiData.Headline}\nSubheading: ${aiData.Subheading}\nCTA: ${aiData.CTA}`;
        } else {
          aiText = rawText;
        }
      } catch {
        aiText = rawText;
      }
    } else {
      const systemPrompt = `You are a helpful AI assistant specialized in social media marketing, image creation, content writing, and creative design.
You help users create ads, posters, book content, and any creative content they need.
IMPORTANT INSTRUCTION: If the user asks for an image, a poster, or a thumbnail, DO NOT say you cannot generate images. The system WILL automatically generate and attach the image to your response. You should simply say: "I will generate this image for you now." and briefly describe the style or elements you are incorporating.
Respond naturally and conversationally. Keep responses concise and helpful.`;

      const llmOutput = await runReplicate({
        version: LLAMA3_VERSION,
        input: {
          prompt: `${historyText}\nUser: ${prompt}\nAssistant:`,
          system_prompt: systemPrompt,
          max_new_tokens: 500,
          temperature: 0.7,
        }
      });
      aiText = Array.isArray(llmOutput) ? llmOutput.join('') : String(llmOutput);
    }

    // 2. Generate Image via Flux Schnell on Replicate
    let imageUrl = null;
    let videoUrl = null;
    const shouldGenerateVideo = wantsVideo(prompt);
    const aiDecidedToGenerate = aiText.toLowerCase().includes('generate this image') || aiText.toLowerCase().includes('generate this video');
    
    if (shouldGenerateImage || shouldGenerateAdCopy || shouldGenerateVideo || aiDecidedToGenerate) {
      try {
        const imagePrompt = shouldGenerateAdCopy && aiData
          ? `A beautiful, clean, modern social media background image. Theme: ${prompt}`
          : `Create a high-quality image based on this request: ${prompt}. If the request includes text or is for a thumbnail, make sure to beautifully integrate that text into the design.`;

        let width = 1024;
        let height = 1024;
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('16:9') || lowerPrompt.includes('youtube')) {
          width = 1344; height = 768;
        } else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('story') || lowerPrompt.includes('reels') || lowerPrompt.includes('tiktok')) {
          width = 768; height = 1344;
        }

        const output = await runReplicate({
          model: 'black-forest-labs/flux-schnell',
          input: {
            prompt: imagePrompt,
            width,
            height,
            num_outputs: 1,
            output_format: 'webp',
            output_quality: 90,
          }
        });

        imageUrl = Array.isArray(output) ? output[0] : output;

        // 3. Generate Video if requested
        if (shouldGenerateVideo && imageUrl) {
           const videoOutput = await runReplicate({
             model: 'prunaai/p-video-2-pro',
             input: {
               mode: "speed",
               image: imageUrl,
               prompt: `Use the provided image as the exact first frame. ${prompt}`,
               duration: 5,
               resolution: "768p",
               aspect_ratio: width > height ? "16:9" : width < height ? "9:16" : "1:1",
               prompt_upsampler: "turbo"
             }
           });
           
           videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput;
           // If it returns a string URL directly (some models return just the URL, some return an array)
           if (typeof videoOutput === 'string' && videoOutput.endsWith('.mp4')) {
               videoUrl = videoOutput;
           }
        }
        
      } catch (e: any) {
        console.error('Replicate image/video generation failed:', e.message);
        aiText += `\n\n[System Error: Generation failed: ${e.message}]`;
      }
    }

    // 3. Send to Canva Autofill (only if templateId provided AND ad copy generated)
    let job = null;
    if (templateId && aiData) {
      if (!accessToken) {
        return NextResponse.json({
          aiText,
          imageUrl,
          generatedText: aiData,
          error: 'Not connected to Canva. Text and image generated successfully.'
        });
      }

      const dataToFill = {
        Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
        Subheading: { type: 'text', text: aiData.Subheading || "Don't miss out." },
        CTA: { type: 'text', text: aiData.CTA || 'Learn More' }
      };

      const response = await fetch('https://api.canva.com/rest/v1/autofills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_template_id: templateId,
          title: `AI Ad - ${aiData.Headline || 'Generated'}`,
          data: dataToFill
        })
      });

      const responseData = await response.json();
      if (response.ok) {
        job = responseData.job;
      }
    }

    return NextResponse.json({
      aiText,
      job,
      imageUrl,
      videoUrl,
      generatedText: aiData,
    });

  } catch (error: any) {
    console.error('Error in meta-ai route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
