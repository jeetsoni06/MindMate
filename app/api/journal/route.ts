import { NextResponse } from 'next/server';
import { saveJournalEntry } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    // We expect journalText, imageUrl and optionally a userId
    const { journalText, userId, imageUrl } = await req.json();

    if ((!journalText || typeof journalText !== 'string' || !journalText.trim()) && !imageUrl) {
      return NextResponse.json({ error: "Valid journal text or a photo is required" }, { status: 400 });
    }

    const finalJournalText = (!journalText || !journalText.trim()) ? "Uploaded a visual memory" : journalText.trim();

    // Call the abstracted logic which handles the DB insertion AND the AI mood tagging pipeline
    const newEntryArray = await saveJournalEntry(finalJournalText, userId, imageUrl);
    
    // saveJournalEntry currently returns an array of the newly inserted rows
    const newEntry = newEntryArray ? newEntryArray[0] : null;

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error("Journal POST Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
