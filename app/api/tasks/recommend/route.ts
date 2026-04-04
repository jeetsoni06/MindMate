import { NextResponse } from 'next/server';
import { getChatContext, getChatHistory } from '../../../../lib/supabase';

const FALLBACK_RECS = [
  {
    title: "Take a walk in the park",
    subtitle: "15 mins • Nature grounding",
    tag: "OUTDOOR RELIEF",
    imageKeyword: "nature",
    icon: "Clock"
  },
  {
    title: "Gentle Body Stretching",
    subtitle: "10 mins • Tension release",
    tag: "PHYSICAL FLOW",
    imageKeyword: "stretch",
    icon: "Clock"
  }
];

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    // 1. Gather Context
    const journalContext = await getChatContext(userId);
    const chatHistoryRaw = await getChatHistory(userId);
    const chatHistoryStr = chatHistoryRaw.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    const promptText = `
    You are MindMate AI. The user needs 2 gentle recommended tasks/rituals based on their emotional state.
    
    Recent Journal Context: ${journalContext}
    Recent Chat Context: ${chatHistoryStr}
    
    Based ONLY on this context, suggest exactly 2 small, achievable personal rituals.
    Return ONLY a JSON array, no extra text. Format MUST match exactly:
    [
      {
        "title": "Short title",
        "subtitle": "Time/Duration • Goal",
        "tag": "SHORT CATEGORY TAG (e.g., OUTDOOR RELIEF, MIND FLOW, FOCUS)",
        "imageKeyword": "Choose exactly one: nature, stretch, focus, water, journal, coffee, rest",
        "icon": "Choose exactly one: Clock, Edit, Check"
      }
    ]
    `;

    const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";
    
    if (!anthropicKey) {
       // Graceful fallback if no key is present
       return NextResponse.json({ recommendations: FALLBACK_RECS });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [{ role: "user", content: promptText }]
      })
    });

    if (!aiRes.ok) {
       console.warn(`Anthropic error ${aiRes.status}, using default recs.`);
       return NextResponse.json({ recommendations: FALLBACK_RECS });
    }

    const aiData = await aiRes.json();
    let textResponse = "";
    if (aiData.content && aiData.content[0]?.type === 'text') {
       textResponse = aiData.content[0].text;
    }

    // Try to parse JSON from response
    try {
      // Find JSON array bracket
      const startIdx = textResponse.indexOf('[');
      const endIdx = textResponse.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
         const jsonStr = textResponse.substring(startIdx, endIdx + 1);
         const parsed = JSON.parse(jsonStr);
         if (Array.isArray(parsed) && parsed.length === 2) {
            return NextResponse.json({ recommendations: parsed });
         }
      }
    } catch(err) {
       console.warn("Failed to parse AI JSON, using fallback.");
    }

    return NextResponse.json({ recommendations: FALLBACK_RECS });

  } catch (err: any) {
    console.error("AI Recommendation Error:", err);
    return NextResponse.json({ recommendations: FALLBACK_RECS });
  }
}
