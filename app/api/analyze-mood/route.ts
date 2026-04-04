import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { journalText, hasImage } = await request.json();

    if (!journalText) {
      return NextResponse.json({ error: 'Journal text is required' }, { status: 400 });
    }

    const visualPreamble = hasImage 
      ? "\\nThe user has also uploaded a photo. Based on their text and the context of a visual memory, provide a more vivid Wellness Tip."
      : "";

    const prompt = `You are a mental health analysis assistant. Analyze the following journal entry and extract a primary 'Mindfulness Theme' (e.g., 'Grounded', 'Reflective', 'Self-Care') and a personalized wellness tip.
The wellness tip should be a single, supportive sentence based on the theme.${visualPreamble}

Respond ONLY with a JSON object in this exact format, with no other text or explanation:
{
  "mindfulness_theme": "string",
  "wellness_tip": "string"
}

Journal entry: "${journalText}"`;

    let result = { mindfulness_theme: "Mindful", wellness_tip: "Take a deep breath and stay present." };

    try {
      const message = await anthropic.messages.create({
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-haiku-20240307',
      });

      const responseContent = message.content.find(block => block.type === 'text')?.text || "{}";
      
      try {
        result = JSON.parse(responseContent);
      } catch(e) {
        console.warn("Could not cleanly parse AI JSON:", responseContent);
      }
    } catch (apiError: any) {
      console.warn("Anthropic API failed, using fallback:", apiError.message);
      return NextResponse.json({
        mindfulness_theme: "Mindful",
        wellness_tip: "Take a deep breath and stay present."
      }, { status: 200 });
    }

    return NextResponse.json({
      mindfulness_theme: result.mindfulness_theme,
      wellness_tip: result.wellness_tip
    });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
