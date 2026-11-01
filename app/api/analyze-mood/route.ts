import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { journalText, hasImage } = await request.json();

    if (!journalText) {
      return NextResponse.json({ error: 'Journal text is required' }, { status: 400 });
    }

    const visualPreamble = hasImage
      ? '\nThe user has also uploaded a photo. Based on their text and the context of a visual memory, provide a more vivid Wellness Tip.'
      : '';

    const prompt = `You are a mental health analysis assistant. Analyze the following journal entry and extract a primary 'Mindfulness Theme' (e.g., 'Grounded', 'Reflective', 'Self-Care') and a personalized wellness tip.
The wellness tip should be a single, supportive sentence based on the theme.${visualPreamble}

Respond ONLY with a JSON object in this exact format, with no other text or explanation:
{
  "mindfulness_theme": "string",
  "wellness_tip": "string"
}

Journal entry: "${journalText}"`;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

      let parsed = { mindfulness_theme: 'Mindful', wellness_tip: 'Take a deep breath and stay present.' };
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.warn('Could not cleanly parse Gemini JSON:', responseText);
      }

      return NextResponse.json({
        mindfulness_theme: parsed.mindfulness_theme,
        wellness_tip: parsed.wellness_tip,
      });
    } catch (apiError: any) {
      console.warn('Gemini API failed, using fallback:', apiError.message);
      return NextResponse.json({
        mindfulness_theme: 'Mindful',
        wellness_tip: 'Take a deep breath and stay present.',
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
