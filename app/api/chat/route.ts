import { NextResponse } from 'next/server';
import { getChatContext, saveChatMessage, getChatHistory } from '../../../lib/supabase';
import { CohereClient } from 'cohere-ai';

// The "Mini-Brain" smart template generator (Fallbacks if AI fails)
function generateSmartFallback(message: string): { reply: string, suggestions: string[] } {
  const GENERIC_RESPONSES = [
    "I'm here for you. Take your time.",
    "That sounds challenging. Do you want to unpack that?",
    "I appreciate you sharing this."
  ];
  return {
    reply: GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)],
    suggestions: ["Grounding exercise", "Let's talk more"]
  };
}

export async function POST(req: Request) {
  try {
    const { message, history, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const recentContext = await getChatContext(userId);

    // Save User Msg
    try {
      await saveChatMessage(message, 'user', userId);
    } catch (insertUserError) {
      console.error("Error inserting user message:", insertUserError);
    }

    let aiResponseText = "";
    let suggestions: string[] = ["Grounding exercise", "Let's talk more"]; // Defaults

    try {
      const cohere = new CohereClient({
        token: process.env.COHERE_API_KEY || "",
      });

      if (!process.env.COHERE_API_KEY) throw new Error("Missing Cohere API Key");

      const systemPrompt = `You are MindMate. If context is provided, do not forget the user's name or their recent struggles. For example, if they mentioned work/life balance, bring it up later. Always provide 2 short, distinct "next step" suggestions at the end of your message.

You MUST format your output strictly as a JSON object with NO markdown formatting, NO backticks, just raw JSON. Do not include any other text.
Format:
{
  "reply": "Your conversational response here",
  "suggestions": ["Short suggestion 1", "Short suggestion 2"]
}

Recent Context: ${recentContext || "None"}`;

      const previousMessages = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: msg.content
      }));

      const response = await cohere.chat({
        message: message,
        chatHistory: previousMessages,
        preamble: systemPrompt
      });

      if (response.text) {
        try {
          // Attempt to parse JSON from the text
          const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          aiResponseText = parsed.reply || "I'm listening.";
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length >= 2) {
            suggestions = [parsed.suggestions[0], parsed.suggestions[1]];
          }
        } catch (e) {
          // Fallback parsing if model ignores json instruction
          console.warn("Could not parse JSON from Cohere, using fallback parsing.", response.text);
          aiResponseText = response.text;
          // Could attempt to extract pills but we'll use defaults if JSON fails.
        }
      } else {
        throw new Error("Unexpected Cohere response format");
      }
    } catch (err: any) {
      console.error("Cohere API Error:", err);
      const fallback = generateSmartFallback(message);
      aiResponseText = fallback.reply;
      suggestions = fallback.suggestions;
    }

    // Save AI Msg
    try {
      await saveChatMessage(aiResponseText, 'assistant', userId);
    } catch (insertAiError) {
      console.error("Error inserting AI message:", insertAiError);
    }

    return NextResponse.json({ reply: aiResponseText, suggestions });
  } catch (error) {
    console.error("Chat API Unexpected Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
