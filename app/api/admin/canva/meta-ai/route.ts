import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadToBunnyStorage } from '@/lib/bunny-storage';
import { registrationViewer } from '@/lib/registrationAuth';
import { requestsImage, boundedCreativeHistory } from '@/lib/creativeRequest';
import { generateAIText, generateAITextWithProvider } from '@/lib/ai/generateWithFallback';

export const dynamic = 'force-dynamic';

// Call Replicate and poll until done
async function runReplicate(payload: Record<string, any>): Promise<any> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN environment variable is missing.');
  }

  let endpoint = 'https://api.replicate.com/v1/predictions';
  if (payload.model) {
    endpoint = `https://api.replicate.com/v1/models/${payload.model}/predictions`;
    delete payload.model;
  }

  let createRes;
  let prediction;
  
  // Retry loop for rate limits (429)
  for (let attempt = 1; attempt <= 3; attempt++) {
    createRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60',
      },
      body: JSON.stringify(payload),
    });

    prediction = await createRes.json();
    
    if (createRes.status === 429 && attempt < 3) {
      console.log('Replicate rate limited. Waiting 10 seconds before retry...');
      await new Promise(r => setTimeout(r, 10000));
      continue;
    }
    
    break;
  }

  if (!createRes || !createRes.ok) {
    throw new Error(prediction?.detail || JSON.stringify(prediction) || 'Replicate API error');
  }

  if (prediction.status === 'succeeded') return prediction.output;

  // Poll (up to 5 minutes)
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
    });
    const data = await pollRes.json();
    if (data.status === 'succeeded') return data.output;
    if (data.status === 'failed') throw new Error(data.error || 'Replicate prediction failed');
  }
  throw new Error('Replicate timed out');
}

// Multi-provider Image Generator with Auto-Switching
async function generateImageWithFallback(prompt: string, aspectRatio: string, preferredEngine = 'auto'): Promise<{ imageUrl: string; provider: string }> {
  const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
  const height = aspectRatio === '16:9' ? 768 : aspectRatio === '9:16' ? 1344 : 1024;
  const errors: string[] = [];

  // Provider 1: Replicate Flux 1.1 Pro
  const tryReplicate = async () => {
    if (!process.env.REPLICATE_API_TOKEN) throw new Error('REPLICATE_API_TOKEN missing');
    console.log('[Image AI] Attempting Replicate Flux 1.1 Pro...');
    const output = await runReplicate({
      model: 'black-forest-labs/flux-1.1-pro',
      input: {
        prompt,
        width,
        height,
        output_format: 'webp',
        output_quality: 100,
      }
    });
    const url = Array.isArray(output) ? output[0] : output;
    if (typeof url !== 'string' || !url.startsWith('http')) throw new Error('Replicate returned invalid URL');
    
    const imgRes = await fetch(url);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const bunnyUrl = await uploadToBunnyStorage(imgBuffer, `meta-ai-replicate-${Date.now()}.webp`, { contentType: 'image/webp' });
    return { imageUrl: bunnyUrl, provider: 'Replicate Flux' };
  };

  // Provider 2: OpenAI DALL-E 3
  const tryOpenAI = async () => {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
    console.log('[Image AI] Attempting OpenAI DALL-E 3...');
    const dSize = aspectRatio === '16:9' ? '1792x1024' : aspectRatio === '9:16' ? '1024x1792' : '1024x1024';
    const oRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: dSize,
        quality: 'standard',
      })
    });
    const oData = await oRes.json();
    if (!oRes.ok || !oData.data?.[0]?.url) {
      throw new Error(oData.error?.message || oRes.statusText);
    }
    const oUrl = oData.data[0].url;
    const imgRes = await fetch(oUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const bunnyUrl = await uploadToBunnyStorage(imgBuffer, `meta-ai-dalle-${Date.now()}.png`, { contentType: 'image/png' });
    return { imageUrl: bunnyUrl, provider: 'OpenAI DALL-E 3' };
  };

  // Provider 3: Ultra-reliable Free Flux Fallback (Pollinations.ai)
  const tryPollinations = async () => {
    console.log('[Image AI] Auto-switching to High-Res Flux Fallback...');
    const safePrompt = encodeURIComponent(prompt.slice(0, 800));
    const seed = Math.floor(Math.random() * 10000000);
    const pollUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
    const pRes = await fetch(pollUrl, { signal: AbortSignal.timeout(45000) });
    if (!pRes.ok) throw new Error(`Pollinations HTTP ${pRes.status}`);
    const buffer = Buffer.from(await pRes.arrayBuffer());
    if (buffer.byteLength < 3000) throw new Error('Pollinations image too small');
    const bunnyUrl = await uploadToBunnyStorage(buffer, `meta-ai-flux-${Date.now()}.jpg`, { contentType: 'image/jpeg' });
    return { imageUrl: bunnyUrl, provider: 'Flux High-Res' };
  };

  const queue = preferredEngine === 'openai' 
    ? [tryOpenAI, tryReplicate, tryPollinations] 
    : [tryReplicate, tryOpenAI, tryPollinations];

  for (const fn of queue) {
    try {
      return await fn();
    } catch (e: any) {
      console.warn(`[Image AI Step Failed]: ${e.message}`);
      errors.push(e.message);
    }
  }

  throw new Error(`All image generation options failed: ${errors.join(' | ')}`);
}

// Detect if the user is asking for an image
function wantsImage(prompt: string): boolean {
  if (requestsImage(prompt)) return true;
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
  const lower = prompt.toLowerCase();
  if (lower.includes('thumbnail') || lower.includes('thumbline')) {
    return false;
  }
  const keywords = ['video', 'animate', 'animation', 'motion', 'mp4', 'movie', 'clip', 'reels', 'reel'];
  return keywords.some(k => lower.includes(k));
}

async function uploadImageToCanva(imageUrl: string, accessToken: string) {
  try {
    console.log('Downloading image for Canva upload...', imageUrl);
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();

    console.log('Initiating Canva asset upload...');
    const initRes = await fetch('https://api.canva.com/rest/v1/asset-uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const initData = await initRes.json();
    if (!initData.job || !initData.job.upload_url) {
      console.error('Failed to init Canva upload:', initData);
      return null;
    }

    const { id: jobId, upload_url: uploadUrl } = initData.job;

    console.log('Uploading binary to Canva...', jobId);
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Length': imgBuffer.byteLength.toString(), 'Content-Type': 'image/webp' },
      body: imgBuffer
    });

    console.log('Polling Canva upload status...');
    let assetId = null;
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.canva.com/rest/v1/asset-uploads/${jobId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const statusData = await statusRes.json();
      if (statusData.job && statusData.job.status === 'success') {
        assetId = statusData.job.asset.id;
        break;
      } else if (statusData.job && statusData.job.status === 'failed') {
        console.error('Canva upload failed:', statusData);
        break;
      }
    }
    return assetId;
  } catch (e) {
    console.error('Error uploading image to Canva:', e);
    return null;
  }
}

export async function POST(request: Request) {
  if (!registrationViewer(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

    const body = await request.json();
    const { prompt, templateId, messages, engine = 'auto' } = body;

    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) {
      return NextResponse.json({ error: 'Provide a prompt of at most 4,000 characters' }, { status: 400 });
    }
    if (Array.isArray(messages) && messages.some(message => message?.role === 'user' && message.imageUrl)) {
      return NextResponse.json({ error: 'This legacy generator cannot edit reference photos. Uploaded photos would be ignored. Use the CRM native studio for layout editing; reference-photo AI editing is not yet connected.' }, { status: 422 });
    }

    const shouldGenerateImage = wantsImage(prompt);
    const shouldGenerateAdCopy = wantsAdCopy(prompt);

    let aspectRatio = "1:1";
    if (prompt.includes("Platform: YouTube(16:9)") || prompt.includes("Platform: FB(16:9)") || prompt.includes("Platform: LinkedIn(16:9)")) { aspectRatio = "16:9"; }
    else if (prompt.includes("Platform: Insta(size)") || prompt.includes("Platform: FB(size)")) { aspectRatio = "1:1"; }
    else if (prompt.includes("Platform: TikTok") || prompt.includes("Platform: Reels")) { aspectRatio = "9:16"; }
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('16:9') || lowerPrompt.includes('youtube')) { aspectRatio = "16:9"; } 
    else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('story') || lowerPrompt.includes('reels') || lowerPrompt.includes('tiktok')) { aspectRatio = "9:16"; }

    // Build Provider Order with Auto-Switching between Replicate and OpenAI
    const chosenEngine = String(engine).toLowerCase();
    const providerOrder = chosenEngine === 'openai'
      ? ['OpenAI', 'Replicate', 'Gemini']
      : chosenEngine === 'replicate'
        ? ['Replicate', 'OpenAI', 'Gemini']
        : chosenEngine === 'gemini'
          ? ['Gemini', 'Replicate', 'OpenAI']
          : ['Replicate', 'OpenAI', 'Gemini']; // Auto-switch default

    // Format history for generateAIText (mapping 'ai' -> 'assistant')
    const historyTurns: { role: 'user' | 'assistant'; content: string }[] = boundedCreativeHistory(messages).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

    // 1. Generate Chat / Ad Copy Response with Auto-Switching
    let aiText = '';
    let aiData: any = null;
    let activeProvider = '';

    if (shouldGenerateAdCopy) {
      const systemPrompt = `You are a world-class social media copywriter and ad strategist. When the user provides a topic, prompt, or idea, you MUST brainstorm and generate exactly 3 highly engaging elements: a catchy Headline, a compelling Subheading, and a strong Call-to-Action (CTA). \n\nReturn them STRICTLY as a valid JSON object with keys: "Headline", "Subheading", "CTA". \n\nDo not include markdown blocks, just the raw JSON object.`;
      
      const { text: rawText, provider, switchedFrom } = await generateAITextWithProvider({
        systemPrompt,
        history: historyTurns,
        message: prompt,
        maxOutputTokens: 400,
        temperature: 0.7,
        providerOrder,
      });

      activeProvider = provider;
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

      if (switchedFrom) {
        aiText += `\n\n*(⚡ Auto-switched to ${provider} because ${switchedFrom} account had insufficient credit)*`;
      }
    } else {
      const systemPrompt = `You are a world-class creative AI assistant, highly trained in social media marketing, image generation, video creation, and design strategy.
You help users create ads, posters, YouTube thumbnails, and any creative content they need.
IMPORTANT INSTRUCTIONS: 
1. Never claim an image has been generated or invent an image attachment. Only describe the requested creative briefly; actual image generation is handled separately.
2. DO NOT make assumptions about the platform (e.g., Facebook) unless the user specifically mentions it. If they ask for a YouTube thumbnail, acknowledge it is for YouTube.
3. Keep responses concise, engaging, and professional. Act like a high-end agency partner.
4. Always explicitly acknowledge the requested aspect ratio or platform size if the user mentions one (e.g. 16:9, square, reels).`;

      const { text, provider, switchedFrom } = await generateAITextWithProvider({
        systemPrompt,
        history: historyTurns,
        message: prompt,
        maxOutputTokens: 600,
        temperature: 0.7,
        providerOrder,
      });

      activeProvider = provider;
      aiText = text;

      if (switchedFrom) {
        aiText += `\n\n*(⚡ Auto-switched to ${provider} because ${switchedFrom} credit was exhausted)*`;
      }
    }

    // 2. Generate Image via Auto-Switching Image Pipeline
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    const shouldGenerateVideo = wantsVideo(prompt);
    const aiDecidedToGenerate = aiText.toLowerCase().includes('generate this image') || aiText.toLowerCase().includes('generate this video');
    
    if (shouldGenerateImage || shouldGenerateAdCopy || shouldGenerateVideo || aiDecidedToGenerate) {
      try {
        let finalImagePrompt = `A highly detailed, professional YouTube thumbnail or poster based on this request: "${prompt}". IMPORTANT: If the user asked for specific text (e.g. "Hindi Swar Yoga"), you MUST write it exactly as provided using English Alphabet characters. Do not invent fake languages or use Devanagari script. Make the text big, bold, and perfectly spelled. Ensure high-quality, modern design.`;
        
        if (!shouldGenerateAdCopy || !aiData) {
          try {
            const optimized = await generateAIText({
              systemPrompt: 'You are an expert prompt engineer for text-to-image AI models like Midjourney and Flux.',
              message: `Optimize this user request into a highly detailed image generation prompt. \nUser Request: "${prompt}"\n\nCRITICAL RULES:\n1. If the user included any Hindi/Devanagari text, TRANSLATE it to English or write it in Hinglish (English alphabet). The AI model CANNOT generate Hindi fonts.\n2. Keep it under 500 characters.\n3. Force MAXIMUM PROFESSIONAL quality: add terms like "ultra-realistic, highly detailed, high-end commercial design, cinematic studio lighting, 8k resolution, premium corporate layout". Provide ONLY the final optimized prompt text, nothing else.`,
              maxOutputTokens: 300,
              temperature: 0.6,
              providerOrder,
            });
            if (optimized && optimized.length > 20) {
              finalImagePrompt = optimized;
            }
          } catch(optErr) {
            console.warn('Prompt optimization fallback:', optErr);
          }
        } else {
          finalImagePrompt = `A beautiful, clean, modern social media background image. Theme: ${prompt}`;
        }

        console.log("Generating image with multi-engine fallback. Optimized Prompt:", finalImagePrompt);
        const imgResult = await generateImageWithFallback(finalImagePrompt, aspectRatio, chosenEngine);
        imageUrl = imgResult.imageUrl;
        console.log(`Image generated successfully via ${imgResult.provider}:`, imageUrl);

        // 3. Generate Video if requested
        if (shouldGenerateVideo && imageUrl) {
          if (process.env.REPLICATE_API_TOKEN) {
            try {
              console.log("Generating video with Minimax Video-01...");
              const videoOutput = await runReplicate({
                model: 'minimax/video-01',
                input: {
                  prompt: `Cinematic, highly detailed, ultra-realistic motion. ${prompt}`,
                  first_frame_image: imageUrl,
                }
              });
              
              videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput;
              if (typeof videoOutput === 'string' && videoOutput.endsWith('.mp4')) {
                videoUrl = videoOutput;
              }
              
              if (videoUrl) {
                console.log("Uploading generated video to Bunny Storage...");
                const vidRes = await fetch(videoUrl);
                const vidBuffer = Buffer.from(await vidRes.arrayBuffer());
                videoUrl = await uploadToBunnyStorage(vidBuffer, 'meta-ai-video-' + Date.now() + '.mp4', { contentType: 'video/mp4' });
                console.log("Bunny Storage Video URL:", videoUrl);
              }
            } catch (vErr: any) {
              console.warn("Video generation failed:", vErr.message);
              aiText += `\n\n*(Note: Video motion requires active Replicate GPU credits. The high-resolution image has been generated above).*`;
            }
          } else {
            aiText += `\n\n*(Note: Video motion requires REPLICATE_API_TOKEN with GPU credits).*`;
          }
        }
        
      } catch (e: any) {
        console.error('Multi-engine image generation failed:', e.message);
        return NextResponse.json({ error: `Image generation failed: ${e.message}` }, { status: 502 });
      }
    }

    // 4. Canva Integration (Autofill OR Create from Asset)
    let job = null;
    let designUrl = null;

    if (accessToken && (templateId || imageUrl)) {
      let assetId = null;
      if (imageUrl) {
        assetId = await uploadImageToCanva(imageUrl, accessToken);
      }

      if (templateId && aiData) {
        const dataToFill: any = {
          Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
          Subheading: { type: 'text', text: aiData.Subheading || "Don't miss out." },
          CTA: { type: 'text', text: aiData.CTA || 'Learn More' }
        };

        if (assetId) {
          dataToFill['Image'] = { type: 'image', asset_id: assetId };
          dataToFill['Background'] = { type: 'image', asset_id: assetId };
        }

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
      } else if (assetId) {
        const presetName = aspectRatio === '9:16' ? 'instagram_story' : (aspectRatio === '16:9' ? 'youtube_thumbnail' : 'instagram_post');
        
        const response = await fetch('https://api.canva.com/rest/v1/designs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            design_type: { type: 'preset', name: presetName },
            title: 'AI Generated Ad',
            asset_id: assetId
          })
        });

        const responseData = await response.json();
        if (response.ok && responseData.design) {
          designUrl = responseData.design.url;
          aiText += `\n\n✨ **[Click here to edit your design in Canva](${designUrl})**`;
        }
      }
    }

    return NextResponse.json({
      aiText,
      job,
      imageUrl,
      videoUrl,
      designUrl,
      generatedText: aiData,
      provider: activeProvider,
    });

  } catch (error: any) {
    console.error('Error in meta-ai route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
