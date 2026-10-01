import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, templateId } = body;

    if (!prompt || !templateId) {
      return NextResponse.json({ error: 'Missing prompt or templateId' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. Generate Text (Headline, Subheading, CTA)
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert social media copywriter. Given a prompt for an ad, you will generate exactly 3 things: a catchy Headline, a Subheading, and a Call-to-Action (CTA). Return them strictly as a JSON object with keys: "Headline", "Subheading", "CTA".'
        },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' }
    });

    const aiTextContent = chatCompletion.choices[0].message.content;
    const aiData = JSON.parse(aiTextContent || '{}');

    // 2. Generate Background Image via DALL-E 3
    let imageUrl = null;
    try {
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `A beautiful, clean, modern social media background image without any text for this topic: ${prompt}`,
        n: 1,
        size: "1024x1024",
      });
      imageUrl = imageResponse.data[0].url;
    } catch(e) {
      console.error("DALL-E generation failed:", e);
      // We continue even if image generation fails
    }

    // 3. Send Text to Canva Autofill (Only if templateId exists)
    let job = null;
    if (templateId) {
      const dataToFill = {
        Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
        Subheading: { type: 'text', text: aiData.Subheading || 'Don\'t miss out on this.' },
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

      if (!response.ok) {
        console.error('Canva Autofill Error:', responseData);
        return NextResponse.json({ error: responseData.message || 'Failed to autofill template' }, { status: response.status });
      }
      job = responseData.job;
    }

    // Return the autofill job (if any) AND the generated image URL to the frontend
    return NextResponse.json({
      job: job,
      imageUrl: imageUrl,
      generatedText: aiData
    });

  } catch (error: any) {
    console.error('Error in meta-ai route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
