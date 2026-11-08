import { NextResponse } from 'next/server';
import { getChatContext, saveChatMessage } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash'];

export async function POST(req: Request) {
  try {
    const { message, history, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Active Vault session required' }, { status: 401 });
    }

    const recentContext = await getChatContext(userId);

    // Save User Message
    try {
      await saveChatMessage(message, 'user', userId);
    } catch (insertUserError) {
      console.error('Error inserting user message:', insertUserError);
    }

    let aiResponseText = '';
    let suggestions: string[] = [];

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing from environment variables.');
      return NextResponse.json({
        reply: "My API connection is not configured yet. Please check GEMINI_API_KEY in your settings.",
        suggestions: ["Check API Key"]
      });
    }

    const systemInstruction = `You are MindMate, a warm, caring, empathetic, and authentic best friend.

Guidelines:
1. **Multilingual & Natural Conversation**: Understand and speak naturally in whatever language the user talks to you in — whether Gujarati (ગુજરાતી), Hindi (हिंदी), Hinglish, English, or any other language. Respond with the natural flow and idioms of a true friend.
2. **Deep Emotional Empathy**: Understand the user's emotion and feelings beneath their words. If they are happy or excited, share their excitement and celebrate with them. If they are tired, frustrated, or down, offer genuine comfort and a listening ear without sounding like a robotic form.
3. **Safety & Crisis Boundaries**:
   - Like a true caring companion, never validate or feed into dangerous dark spirals (self-harm, suicide, severe crisis).
   - If a user expresses hopelessness or crisis, respond with gentle care, tenderness, safety, and warmly encourage connecting with someone who loves them or reaching out to a support line (such as 988 or a local helpline).

Formatting Rules:
You MUST respond strictly with a valid JSON object, with NO markdown formatting, NO backticks:
{
  "reply": "Your natural, emotional friend response in the user's language",
  "suggestions": ["Short suggestion 1 in conversation language", "Short suggestion 2 in conversation language"]
}

Context about this user from their journal & previous reflections: ${recentContext || 'None'}`;

    // Gemini API requires chat history to start with a 'user' message and strictly alternate: user -> model -> user -> model
    const validHistory: any[] = [];
    let expectedRole = 'user';

    for (const msg of history || []) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      if (role === expectedRole && msg.content && typeof msg.content === 'string' && msg.content.trim()) {
        validHistory.push({
          role,
          parts: [{ text: msg.content.trim() }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // Ensure history ends with a 'model' turn so the next sendMessage(message) is an expected 'user' turn
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
      validHistory.pop();
    }

    let responseText = '';
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const chat = model.startChat({ history: validHistory });
        const result = await chat.sendMessage(message);
        const raw = result.response.text();
        responseText = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        if (responseText) {
          lastError = null;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} error:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      console.error('All Gemini models failed:', lastError);
      return NextResponse.json({
        reply: "I'm having a little trouble connecting to my thoughts right now. Could you say that again?",
        suggestions: ["Try again"]
      });
    }

    try {
      const parsed = JSON.parse(responseText);
      aiResponseText = parsed.reply || responseText;
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length >= 2) {
        suggestions = [parsed.suggestions[0], parsed.suggestions[1]];
      }
    } catch (parseErr) {
      aiResponseText = responseText;
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
