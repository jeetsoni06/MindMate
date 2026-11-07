import { NextResponse } from 'next/server';
import { saveJournalEntry } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { title, journalText, userId, imageUrl } = await req.json();

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ error: "Unauthorized: Active Vault session required" }, { status: 401 });
    }

    const cleanTitle = (typeof title === 'string') ? title.trim() : "";
    const cleanBody = (typeof journalText === 'string') ? journalText.trim() : "";

    if (!cleanTitle && !cleanBody && !imageUrl) {
      return NextResponse.json({ error: "A title, reflection text, or a photo is required" }, { status: 400 });
    }

    let finalJournalText = "";
    if (cleanTitle && cleanBody) {
      finalJournalText = `# ${cleanTitle}\n\n${cleanBody}`;
    } else if (cleanTitle) {
      finalJournalText = `# ${cleanTitle}`;
    } else if (cleanBody) {
      finalJournalText = cleanBody;
    } else {
      finalJournalText = "Uploaded a visual memory";
    }

    // Call saveJournalEntry with the specific user's ID
    const newEntryArray = await saveJournalEntry(finalJournalText, userId.trim(), imageUrl);
    
    const newEntry = newEntryArray ? newEntryArray[0] : null;

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error("Journal POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
