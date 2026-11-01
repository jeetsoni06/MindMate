import { NextResponse } from 'next/server';
import { getChatContext, saveChatMessage } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function generateSmartFallback(message: string): { reply: string; suggestions: string[] } {
  const GENERIC_RESPONSES = [
    "I'm here for you. Take your time.",
    "That sounds challenging. Do you want to unpack that?",
    "I appreciate you sharing this.",
  ];
  return {
    reply: GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)],
    suggestions: ['Grounding exercise', "Let's talk more"],
  };
}

export async function POST(req: Request) {
  try {
    const { message, history, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const recentContext = await getChatContext(userId);

    // Save User Message
    try {
      await saveChatMessage(message, 'user', userId);
    } catch (insertUserError) {
      console.error('Error inserting user message:', insertUserError);
    }

    let aiResponseText = '';
    let suggestions: string[] = ['Grounding exercise', "Let's talk more"];

    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('Missing Gemini API Key');

      const systemInstruction = `You are MindMate, the user's best friend who truly knows them. 
If context is provided, remember the user's name and their recent struggles — bring them up naturally. 
Always provide 2 short, distinct "next step" suggestions at the end of your message.

You MUST format your output strictly as a JSON object with NO markdown formatting, NO backticks, just raw JSON:
{
  "reply": "Your warm, conversational response here",
  "suggestions": ["Short suggestion 1", "Short suggestion 2"]
}

Recent Context about this user: ${recentContext || 'None'}`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction,
      });

      // Build chat history for Gemini
      const geminiHistory = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history: geminiHistory });
      const result = await chat.sendMessage(message);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(responseText);
        aiResponseText = parsed.reply || "I'm listening.";
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length >= 2) {
          suggestions = [parsed.suggestions[0], parsed.suggestions[1]];
        }
      } catch (e) {
        console.warn('Could not parse JSON from Gemini, using raw text.', responseText);
        aiResponseText = responseText;
      }
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      const fallback = generateSmartFallback(message);
      aiResponseText = fallback.reply;
      suggestions = fallback.suggestions;
    }

    // Save AI Message
    try {
      await saveChatMessage(aiResponseText, 'assistant', userId);
    } catch (insertAiError) {
      console.error('Error inserting AI message:', insertAiError);
    }

    return NextResponse.json({ reply: aiResponseText, suggestions });
  } catch (error) {
    console.error('Chat API Unexpected Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
