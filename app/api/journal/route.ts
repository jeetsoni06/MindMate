import { NextResponse } from 'next/server';
import { saveJournalEntry } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { journalText, userId, imageUrl } = await req.json();

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ error: "Unauthorized: Active Vault session required" }, { status: 401 });
    }

    if ((!journalText || typeof journalText !== 'string' || !journalText.trim()) && !imageUrl) {
      return NextResponse.json({ error: "Valid journal text or a photo is required" }, { status: 400 });
    }

    const finalJournalText = (!journalText || !journalText.trim()) ? "Uploaded a visual memory" : journalText.trim();

    // Call saveJournalEntry with the specific user's ID
    const newEntryArray = await saveJournalEntry(finalJournalText, userId.trim(), imageUrl);
    
    const newEntry = newEntryArray ? newEntryArray[0] : null;

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error("Journal POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
