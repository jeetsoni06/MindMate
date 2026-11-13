import { NextResponse } from 'next/server';
import { getChatContext, saveChatMessage } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = (process.env.GEMINI_API_KEY || process.env.gemini_api || process.env.GEMINI_API || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

export async function POST(req: Request) {
  try {
    const { message, image, history, userId } = await req.json();

    if (!message && !image) {
      return NextResponse.json({ error: 'Message or photo is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Active Vault session required' }, { status: 401 });
    }

    const recentContext = await getChatContext(userId);

    // Prepare message content for database
    const textToStore = image ? `[IMAGE:${image}] ${message || ''}`.trim() : (message || '');

    // Save User Message
    try {
      await saveChatMessage(textToStore, 'user', userId);
    } catch (insertUserError) {
      console.error('Error inserting user message:', insertUserError);
    }

    let aiResponseText = '';
    let suggestions: string[] = [];

    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing from environment variables.');
      return NextResponse.json({
        reply: "My API connection is not configured yet. Please check GEMINI_API_KEY in your settings.",
        suggestions: ["Check API Key"]
      });
    }

    const systemInstruction = `You are MindMate, a warm, caring, empathetic, and authentic best friend.

Guidelines:
1. **Multimodal Friend**: If the user shares a photo or picture (taken from camera or gallery), observe what is in the photo like a true friend! React with enthusiasm, curiosity, or comfort depending on what they are showing you (food, nature, pet, work, selfie, meme, problem).
2. **Multilingual & Natural Conversation**: Understand and speak naturally in whatever language the user talks to you in — whether Gujarati (ગુજરાતી), Hindi (हिंदी), Hinglish, English, or any other language.
3. **Deep Emotional Empathy**: Mirror the user's emotion. Celebrate joy, listen during tough days, and accompany them without sounding clinical.
4. **Safety & Crisis Boundaries**:
   - Never validate or feed into self-harm, suicide, or dangerous spirals.
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
      let cleanContent = msg.content;
      // Strip base64 image data from older history turns to keep history payload light
      if (typeof cleanContent === 'string' && cleanContent.startsWith('[IMAGE:')) {
        const endBracket = cleanContent.indexOf(']');
        cleanContent = endBracket !== -1 ? `[Shared a photo] ${cleanContent.substring(endBracket + 1)}`.trim() : cleanContent;
      }

      if (role === expectedRole && cleanContent && typeof cleanContent === 'string' && cleanContent.trim()) {
        validHistory.push({
          role,
          parts: [{ text: cleanContent.trim() }]
        });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    // Ensure history ends with a 'model' turn so the next sendMessage is an expected 'user' turn
    if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
      validHistory.pop();
    }

    // Prepare current message parts (supporting multimodal inline image)
    let currentMessageParts: any = message || "Here is a photo I wanted to share with you!";
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        currentMessageParts = [
          { inlineData: { mimeType, data: base64Data } },
          { text: message || "Here is a picture I wanted to share with you! What do you think?" }
        ];
      }
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
        const result = await chat.sendMessage(currentMessageParts);
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
