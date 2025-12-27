import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/crm/ai-suggest
 * Get AI-powered suggestions for message composition using Claude API
 * 
 * Body: { message: string }
 * Response: { suggestions: string[] }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if Claude API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Return fallback suggestions if API key is not configured
      return NextResponse.json({
        success: true,
        suggestions: generateFallbackSuggestions(message),
      });
    }

    try {
      // Call Claude API for suggestions
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You are a professional WhatsApp message writing assistant for Swar Yoga (an online yoga platform offering workshops, courses, and yoga training).

The user has started writing this message: "${message}"

Provide 3 alternative ways to improve, complete, or rephrase this message while maintaining a professional and friendly tone for yoga customers. Each suggestion should be concise and suitable for WhatsApp.

Format your response as a JSON array of 3 strings, like: ["suggestion1", "suggestion2", "suggestion3"]

Only respond with the JSON array, no other text.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error('Claude API error:', response.status, response.statusText);
        return NextResponse.json({
          success: true,
          suggestions: generateFallbackSuggestions(message),
        });
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      try {
        // Try to parse the response as JSON
        const suggestions = JSON.parse(content);
        if (Array.isArray(suggestions) && suggestions.every((s) => typeof s === 'string')) {
          return NextResponse.json({
            success: true,
            suggestions: suggestions.slice(0, 3), // Return max 3 suggestions
          });
        }
      } catch {
        console.error('Failed to parse Claude response:', content);
      }

      // Fallback if response parsing fails
      return NextResponse.json({
        success: true,
        suggestions: generateFallbackSuggestions(message),
      });
    } catch (error) {
      console.error('Claude API call error:', error);
      // Return fallback suggestions on error
      return NextResponse.json({
        success: true,
        suggestions: generateFallbackSuggestions(message),
      });
    }
  } catch (error) {
    console.error('AI suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

/**
 * Fallback suggestions when Claude API is unavailable
 */
function generateFallbackSuggestions(message: string): string[] {
  const trimmed = message.trim();
  const suggestions: string[] = [];

  // Suggestion 1: Add greeting
  if (!trimmed.toLowerCase().startsWith('hi') && !trimmed.toLowerCase().startsWith('hello')) {
    suggestions.push(`Hi there! ${trimmed}`);
  } else {
    suggestions.push(trimmed);
  }

  // Suggestion 2: Add question
  suggestions.push(
    `${trimmed}${trimmed.endsWith('?') ? '' : '?'}\n\nCould you tell me more about your requirements?`
  );

  // Suggestion 3: Professional close
  suggestions.push(
    `${trimmed}\n\nPlease let me know if you have any questions. Looking forward to helping you with Swar Yoga! 🧘`
  );

  return suggestions.slice(0, 3);
}
