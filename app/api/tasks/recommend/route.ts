import { NextResponse } from 'next/server';
import { getChatContext, getChatHistory } from '../../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = (process.env.GEMINI_API_KEY || process.env.gemini_api || process.env.GEMINI_API || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash'];

const FALLBACK_RECS = [
  {
    title: 'Take a walk in the park',
    subtitle: '15 mins • Nature grounding',
    tag: 'OUTDOOR RELIEF',
    imageKeyword: 'nature',
    icon: 'Clock',
  },
  {
    title: 'Gentle Body Stretching',
    subtitle: '10 mins • Tension release',
    tag: 'PHYSICAL FLOW',
    imageKeyword: 'stretch',
    icon: 'Clock',
  },
];

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    const journalContext = await getChatContext(userId);
    const chatHistoryRaw = await getChatHistory(userId);
    const chatHistoryStr = chatHistoryRaw.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    if (!apiKey) {
      return NextResponse.json({ recommendations: FALLBACK_RECS });
    }

    const promptText = `You are MindMate AI. The user needs 2 gentle recommended tasks/rituals based on their emotional state.

Recent Journal Context: ${journalContext}
Recent Chat Context: ${chatHistoryStr}

Based ONLY on this context, suggest exactly 2 small, achievable personal rituals.
Return ONLY a JSON array, no extra text, no markdown. Format MUST match exactly:
[
  {
    "title": "Short title",
    "subtitle": "Time/Duration • Goal",
    "tag": "SHORT CATEGORY TAG (e.g., OUTDOOR RELIEF, MIND FLOW, FOCUS)",
    "imageKeyword": "Choose exactly one: nature, stretch, focus, water, journal, coffee, rest",
    "icon": "Choose exactly one: Clock, Edit, Check"
  }
]`;

    let textResponse = '';
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(promptText);
        const raw = result.response.text();
        textResponse = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        if (textResponse) break;
      } catch (err) {
        // try next model
      }
    }

    if (textResponse) {
      const startIdx = textResponse.indexOf('[');
      const endIdx = textResponse.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = textResponse.substring(startIdx, endIdx + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return NextResponse.json({ recommendations: parsed });
        }
      }
    }

    return NextResponse.json({ recommendations: FALLBACK_RECS });
  } catch (err: any) {
    console.error('AI Recommendation Error:', err);
    return NextResponse.json({ recommendations: FALLBACK_RECS });
  }
}
