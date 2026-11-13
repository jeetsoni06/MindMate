import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = (process.env.GEMINI_API_KEY || process.env.gemini_api || process.env.GEMINI_API || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash'];

export async function POST(request: Request) {
  try {
    const { journalText, hasImage } = await request.json();

    if (!journalText) {
      return NextResponse.json({ error: 'Journal text is required' }, { status: 400 });
    }

    const visualPreamble = hasImage
      ? '\nThe user has also uploaded a photo. Based on their text and the context of a visual memory, provide a more vivid Wellness Tip.'
      : '';

    const prompt = `You are a mental health analysis assistant. Analyze the following journal entry and extract a primary 'Mindfulness Theme' (e.g., 'Grounded', 'Reflective', 'Self-Care', 'Joyful') and a personalized wellness tip.
The wellness tip should be a single, supportive sentence based on the theme.${visualPreamble}

Respond ONLY with a JSON object in this exact format, with no other text or explanation:
{
  "mindfulness_theme": "string",
  "wellness_tip": "string"
}

Journal entry: "${journalText}"`;

    let responseText = '';
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        responseText = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        if (responseText) {
          lastError = null;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        return NextResponse.json({
          mindfulness_theme: parsed.mindfulness_theme || 'Mindful',
          wellness_tip: parsed.wellness_tip || 'Take a deep breath and stay present.',
        });
      } catch (e) {
        console.warn('Could not cleanly parse Gemini JSON:', responseText);
      }
    }

    if (lastError) {
      console.warn('Gemini mood API fallback:', lastError.message || lastError);
    }

    return NextResponse.json({
      mindfulness_theme: 'Mindful',
      wellness_tip: 'Take a deep breath and stay present.',
    }, { status: 200 });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
