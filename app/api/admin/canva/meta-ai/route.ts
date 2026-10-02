import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Build conversation history for context
    const conversationHistory = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // 1. Generate Chat Response
    let aiText = '';
    let aiData: any = null;

    if (shouldGenerateAdCopy) {
      // Generate structured Ad Copy (JSON)
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media copywriter. Given a prompt for an ad, generate exactly 3 things: a catchy Headline, a Subheading, and a Call-to-Action (CTA). Return them strictly as a JSON object with keys: "Headline", "Subheading", "CTA".'
          },
          ...conversationHistory,
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4o',
        response_format: { type: 'json_object' }
      });

      const content = chatCompletion.choices[0].message.content || '{}';
      aiData = JSON.parse(content);
      aiText = `Headline: ${aiData.Headline}\nSubheading: ${aiData.Subheading}\nCTA: ${aiData.CTA}`;

    } else {
      // General conversational chat
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant specialized in social media marketing, image creation, content writing, and creative design. 
You help users create ads, posters, book content, and any creative content they need.
IMPORTANT INSTRUCTION: If the user asks for an image, a poster, or a thumbnail, DO NOT say you cannot generate images. The system WILL automatically generate and attach the image to your response. You should simply say: "I will generate this image for you now." and briefly describe the style or elements you are incorporating.
Respond naturally and conversationally. Keep responses concise and helpful.`
          },
          ...conversationHistory,
          { role: 'user', content: prompt }
        ],
        model: 'gpt-4o',
      });

      aiText = chatCompletion.choices[0].message.content || '';
    }

    // 2. Generate Image if requested
    let imageUrl = null;
    const aiDecidedToGenerate = aiText.toLowerCase().includes('generate this image');
    if (shouldGenerateImage || shouldGenerateAdCopy || aiDecidedToGenerate) {
      try {
        const imagePrompt = shouldGenerateAdCopy && aiData
          ? `A beautiful, clean, modern social media background image. Theme: ${prompt}`
          : `Create a high-quality image based on this request: ${prompt}. If the request includes text or is for a thumbnail, make sure to beautifully integrate that text into the design.`;

        let targetSize: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('16:9') || lowerPrompt.includes('youtube')) {
          targetSize = '1792x1024';
        } else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('story') || lowerPrompt.includes('reels')) {
          targetSize = '1024x1792';
        }

        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: targetSize,
        });
        
        const imgData = imageResponse.data[0];
        if (imgData.b64_json) {
          imageUrl = `data:image/png;base64,${imgData.b64_json}`;
        } else if (imgData.url) {
          imageUrl = imgData.url;
        }
      } catch (e: any) {
        console.error('Image generation failed with error:', e.name, e.message);
        if (e.response) {
          console.error('Response data:', e.response.data);
        }
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
      generatedText: aiData,
    });

  } catch (error: any) {
    console.error('Error in meta-ai route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
