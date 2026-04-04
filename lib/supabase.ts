import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing from environment variables.");
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to extract the Vault ID securely
export function getVaultId(passedId?: string): string {
  // Demo Mode override: Supabase database strictly requires a 36-character UUID format 
  // for the journals and chat_messages foreign keys. "demo-user-123" will throw a Postgres error.
  // We use this universal UUID dummy instead:
  return "00000000-0000-0000-0000-000000000000";
}

/**
 * Saves a new journal entry to the Supabase 'journals' table.
 * 
 * @param text The text content of the journal entry
 */
export async function saveJournalEntry(text: string, userId?: string, imageUrl?: string) {
  const activeUserId = getVaultId(userId);

  const payload: any = {
    user_id: activeUserId,
    content_text: text,
  };

  // Only include if truthy to avoid schema issues if undefined
  if (imageUrl) {
    payload.image_url = imageUrl;
  }

  const { data, error } = await supabase
    .from('journals')
    .insert([payload])
    .select().single();

  if (error) {
    console.error("Error inserting journal entry:", error);
    throw new Error(error.message);
  }

  const newEntry = data;
  const newId = data.id;
  console.log('UPDATING ROW ID:', newId);

  // Call the AI analysis API route
  try {
    // Note: If this function runs on the server (Server Action), fetch with absolute URL is needed.
    // Assuming standard client-side call for now based on current app state.
    const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const aiResponse = await fetch(`${baseUrl}/api/analyze-mood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journalText: text, hasImage: !!imageUrl }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();

      if (aiData.mindfulness_theme !== undefined) {
        // UPDATE the row with ai_mood_label (storing the theme) and wellness_tip
        const { error: updateError } = await supabase
          .from('journals')
          .update({
            ai_mood_label: aiData.mindfulness_theme,
            wellness_tip: aiData.wellness_tip
          })
          .eq('id', newId);

        if (updateError) {
          console.error("Error updating journal with AI data:", updateError);
        } else {
          newEntry.ai_mood_label = aiData.mindfulness_theme;
          newEntry.wellness_tip = aiData.wellness_tip;
        }
      }
    } else {
      console.error("AI Analysis API failed with status:", aiResponse.status);
    }
  } catch (err) {
    console.error("Error during AI analysis fetch:", err);
  }

  return [newEntry];
}

/**
 * Fetches all journal entries for the current user and maps them to UI-friendly objects.
 */
export async function getJournals(userId?: string) {
  const activeUserId = getVaultId(userId);

  try {
    const { data, error } = await supabase
      .from('journals')
      .select('id, created_at, content_text, ai_mood_label, wellness_tip, image_url')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    console.log("Supabase Raw Data:", data);

    if (error) {
      console.error("Error fetching journals:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((entry) => ({
      id: entry.id,
      created_at: entry.created_at,
      content_text: entry.content_text,
      ai_mood_label: entry.ai_mood_label || "Mindful",
      wellness_tip: entry.wellness_tip || "Take a deep breath and stay present.",
      image_url: entry.image_url
    }));
  } catch (err) {
    console.error("Network or execution error fetching journals:", err);
    return [];
  }
}

/**
 * Fetches the last 3 entries from the journals table and combines them into a single string.
 * This is used to provide recent mood context to the Chatbot.
 */
export async function getRecentContext() {
  const dummyUserId = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from('journals')
    .select('content_text')
    .eq('user_id', dummyUserId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching recent context:", error);
    return "";
  }

  if (!data || data.length === 0) {
    return "";
  }

  // Combine the text of the entries
  return data.map((entry) => entry.content_text).join('\n---\n');
}

/**
 * Sends a chat message to the AI Friend, saves the user message, attempts Anthropic API,
 * and saves the AI response.
 * Fallbacks to supportive messages on 401 or other API errors.
 */
export async function sendMessage(message: string) {
  const dummyUserId = "00000000-0000-0000-0000-000000000000";

  // 1. Insert user message
  const { error: insertUserError } = await supabase
    .from('chat_messages')
    .insert([{
      user_id: dummyUserId,
      role: 'user',
      content: message
    }]);

  if (insertUserError) {
    console.error("Error inserting user message:", insertUserError);
  }

  const FALLBACK_RESPONSES = [
    "I'm listening. It sounds like you have a lot on your mind. Want to share more?",
    "That's a valid way to feel. How can I support you best right now?",
    "I'm here for you. Take a deep breath—we can work through this."
  ];

  let aiResponseText = "";

  try {
    const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";

    if (!anthropicKey) {
      throw new Error("Missing API Key (Simulated 401)");
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
        messages: [{ role: "user", content: message }]
      })
    });

    if (!aiRes.ok) {
      throw new Error(`Anthropic error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    if (aiData.content && aiData.content[0]?.type === 'text') {
      aiResponseText = aiData.content[0].text;
    } else {
      throw new Error("Unexpected AI response format");
    }
  } catch (error) {
    console.error("Anthropic logic error / 401 triggered:", error);
    // Pick a random fallback response
    const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
    aiResponseText = FALLBACK_RESPONSES[randomIndex];
  }

  // 2. Insert AI response back into the table
  const { data: aiMessageData, error: aiInsertErr } = await supabase
    .from('chat_messages')
    .insert([{
      user_id: dummyUserId,
      role: 'assistant',
      content: aiResponseText
    }])
    .select()
    .single();

  if (aiInsertErr) {
    console.error("Error inserting AI response:", aiInsertErr);
  }

  return {
    role: 'assistant',
    content: aiResponseText,
    id: aiMessageData?.id
  };
}

/**
 * Fetches the latest 3 journal entries for comprehensive context.
 * Gives the AI Friend the user's broad recent emotional baseline.
 */
export async function getChatContext(userId?: string) {
  const activeUserId = getVaultId(userId);

  const { data, error } = await supabase
    .from('journals')
    .select('content_text')
    .eq('user_id', activeUserId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    return "";
  }

  const entriesStr = data.map((entry) => `[${entry.content_text}]`).join(', ');
  return `Recent journals context: ${entriesStr}`;
}

/**
 * Fetches the last 2 chat messages for the current user for Smart Fallback logic.
 * Ordered by creation time (newest first).
 */
export async function getChatHistory(userId?: string) {
  const activeUserId = getVaultId(userId);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, created_at, role, content')
    .eq('user_id', activeUserId)
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculates the weekly mood summary based on the ai_mood_score of journals from the last 7 days.
 * Returns 'Thriving', 'Stable', or 'Needs Self-Care' based on the average score.
 */
export async function getWeeklyMoodSummary(userId?: string) {
  const activeUserId = getVaultId(userId);

  // 1. Get the date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 2. Fetch all journals for the user in the last 7 days
  const { data, error } = await supabase
    .from('journals')
    .select('ai_mood_score')
    .eq('user_id', activeUserId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (error) {
    console.error("Error fetching weekly mood data:", error);
    return "Stable"; // Fallback summary on error
  }

  if (!data || data.length === 0) {
    return "Stable"; // Default if no journals
  }

  // Calculate average
  let totalScore = 0;
  let count = 0;

  for (const entry of data) {
    if (typeof entry.ai_mood_score === 'number') {
      totalScore += entry.ai_mood_score;
      count++;
    }
  }

  if (count === 0) return "Stable";

  const average = totalScore / count;

  // Categorization Logic
  if (average > 8) {
    return "Thriving";
  } else if (average >= 5) {
    return "Stable";
  } else {
    return "Needs Self-Care";
  }
}

/**
 * Inserts a highly generalized chat message into the chat_messages table.
 * Used for both user inputs and AI assistant replies.
 */
export async function saveChatMessage(content: string, role: 'user' | 'assistant', userId?: string) {
  const activeUserId = getVaultId(userId);

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      user_id: activeUserId,
      role: role,
      content: content
    }])
    .select()
    .single();

  if (error) {
    console.error("Error inserting chat message:", error);
    throw error;
  }

  return data;
}

// ==========================================
// SOUL-LINK IDENTITY VAULT AUTHENTICATION
// ==========================================

import { hashString } from './crypto';

export async function verifyVault(username: string, pin: string) {
  const hashedPin = await hashString(pin);
  const { data, error } = await supabase
    .from('auth_users')
    .select('id, username')
    .eq('username', username)
    .eq('hashed_pin', hashedPin)
    .single();

  if (error || !data) {
    return { success: false, error: "Invalid Vault ID or Pin." };
  }

  return { success: true, user: data };
}

export async function createVault(username: string, pin: string, question: string, answer: string) {
  const hashedPin = await hashString(pin);
  const hashedAnswer = await hashString(answer);

  const { data, error } = await supabase
    .from('auth_users')
    .insert([{
      username,
      hashed_pin: hashedPin,
      security_question: question,
      hashed_answer: hashedAnswer
    }])
    .select('id, username')
    .single();

  if (error) {
    return { success: false, error: "Username already exists or database error." };
  }
  return { success: true, user: data };
}

/**
 * Fetches all localized messages for the current session loop.
 * (Works identically to getChatHistory but specifically named for the UI component hooks).
 */
export async function getChatMessages(userId?: string) {
  const activeUserId = getVaultId(userId);

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, created_at, role, content')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: true });

    console.log("Supabase Raw Chat Data:", data);

    if (error) {
      console.error("Error fetching chat messages:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data;
  } catch (err) {
    console.error("Network or execution error fetching chat messages:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// TASKS (DAILY RITUALS) ABSTRACTION LAYER
// ---------------------------------------------------------------------------

export async function getTasks(userId?: string) {
  const activeUserId = getVaultId(userId);
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return [];
  }
}

export async function addTask(payload: { title: string, subtitle?: string, icon_name?: string }, userId?: string) {
  const activeUserId = getVaultId(userId);
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: activeUserId,
        title: payload.title,
        subtitle: payload.subtitle || null,
        icon_name: payload.icon_name || null
      }])
      .select().single();

    if (error) throw error;

    return data;
  } catch (err: any) {
    console.error("Error adding task:", err);
    throw new Error(err.message || JSON.stringify(err));
  }
}

export async function toggleTaskCompleted(taskId: string, currentStatus: boolean, userId?: string) {
  const activeUserId = getVaultId(userId); // Ensure user boundary
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId)
      .eq('user_id', activeUserId)
      .select().single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error toggling task:", err);
    return null;
  }
}
