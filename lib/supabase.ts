import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing from environment variables.");
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Saves a new journal entry to the Supabase 'journals' table.
 * 
 * @param text The text content of the journal entry
 */
export async function saveJournalEntry(text: string) {
  // Hardcoded dummy UUID for testing to bypass authentication
  const dummyUserId = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from('journals')
    .insert([
      { 
        user_id: dummyUserId, 
        content_text: text,
      }
    ])
    .select(); // Added .select() to return the newly created row if needed

  if (error) {
    console.error("Error inserting journal entry:", error);
    throw new Error(error.message);
  }

  return data;
}
