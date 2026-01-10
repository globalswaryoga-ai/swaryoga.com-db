import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Mock AI Assistant endpoint.
 * Features:
 * 1. Spelling/Grammar Correction
 * 2. Smart Reply Generation
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const decoded = verifyToken(token || undefined);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, mode, context } = await req.json();

    // Mode: 'fix' (Spelling/Grammar)
    if (mode === 'fix') {
      if (!text) {
         return NextResponse.json({ error: 'Text required' }, { status: 400 });
      }

      // MOCK LOGIC: Simulate fixing text
      // In real prod, call OpenAI / Grammarly API
      let fixed = text;
      
      // Simple mock corrections
      if (fixed.includes('teh')) fixed = fixed.replace(/teh/g, 'the');
      if (fixed.includes('i ')) fixed = fixed.replace(/i /g, 'I ');
      if (fixed.includes('dont')) fixed = fixed.replace(/dont/g, "don't");
      if (fixed.includes('cant')) fixed = fixed.replace(/cant/g, "can't");
      if (fixed.includes('im ')) fixed = fixed.replace(/im /g, "I'm ");
      if (fixed.includes('wanat')) fixed = fixed.replace(/wanat/g, "want");
      
      // Capitalize first letter if needed
      if (fixed.length > 0 && /^[a-z]/.test(fixed)) {
          fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
      }
      // Add period if missing
      if (fixed.length > 0 && !/[.!?]$/.test(fixed)) {
          fixed += '.';
      }

      // Make it slightly more formal/polite mock
      if (!fixed.includes('Please') && !fixed.includes('Thank')) {
         // Just a mock heuristic
      }

      return NextResponse.json({ 
        success: true, 
        result: fixed,
        original: text
      });
    }

    // Mode: 'reply' (Generate Response)
    if (mode === 'reply') {
         // Mock generic replies based on basic analysis
         // context could be the last received message
         const lastMsg = (context || '').toLowerCase();
         let reply = "Hello! How can I assist you with Yoga today?";

         if (lastMsg.includes('price') || lastMsg.includes('cost')) {
             reply = "Our classes start from ₹999/month. Would you like to see the full plan details?";
         } else if (lastMsg.includes('time') || lastMsg.includes('schedule')) {
             reply = "We have batches at 6 AM, 7 AM, and 6 PM. Which time works best for you?";
         } else if (lastMsg.includes('online')) {
            reply = "Yes, we offer online sessions via Zoom. You can join from anywhere!";
         }
         
         return NextResponse.json({
             success: true,
             result: reply 
         });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error: any) {
    console.error('AI Assist error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
