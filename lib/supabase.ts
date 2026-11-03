import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase URL or Anon Key is missing from environment variables.");
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getVaultId(passedId?: string): string {
  if (passedId && passedId !== 'null' && passedId !== 'undefined' && passedId.trim() !== '') {
    return passedId.trim();
  }
  if (typeof window !== 'undefined') {
    const sessionToken = sessionStorage.getItem('soul_link_id');
    if (sessionToken && sessionToken.trim() !== '') return sessionToken.trim();
    const localToken = localStorage.getItem('soul_link_id');
    if (localToken && localToken.trim() !== '') return localToken.trim();
  }
  return '';
}

/**
 * Saves a new journal entry to the Supabase 'journals' table.
 */
export async function saveJournalEntry(text: string, userId?: string, imageUrl?: string) {
  const activeUserId = getVaultId(userId);

  if (!activeUserId) {
    throw new Error("Unauthorized: You must unlock your vault to save journal entries.");
  }

  const payload: any = {
    user_id: activeUserId,
    content_text: text,
  };

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

  // Call the AI analysis API route
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const aiResponse = await fetch(`${baseUrl}/api/analyze-mood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ journalText: text, hasImage: !!imageUrl }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();

      if (aiData.mindfulness_theme !== undefined) {
        const { error: updateError } = await supabase
          .from('journals')
          .update({
            ai_mood_label: aiData.mindfulness_theme,
            wellness_tip: aiData.wellness_tip
          })
          .eq('id', newId)
          .eq('user_id', activeUserId);

        if (updateError) {
          console.error("Error updating journal with AI data:", updateError);
        } else {
          newEntry.ai_mood_label = aiData.mindfulness_theme;
          newEntry.wellness_tip = aiData.wellness_tip;
        }
      }
    }
  } catch (err) {
    console.error("Error during AI analysis fetch:", err);
  }

  return [newEntry];
}

/**
 * Fetches all journal entries strictly for the current user.
 */
export async function getJournals(userId?: string) {
  const activeUserId = getVaultId(userId);

  if (!activeUserId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select('id, created_at, content_text, ai_mood_label, wellness_tip, image_url')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching journals:", error);
      return [];
    }

    if (!data) return [];

    return data.map((entry) => ({
      id: entry.id,
      created_at: entry.created_at,
      content_text: entry.content_text,
      ai_mood_label: entry.ai_mood_label || "Mindful",
      wellness_tip: entry.wellness_tip || "Take a deep breath and stay present.",
      image_url: entry.image_url
    }));
  } catch (err) {
    console.error("Network error fetching journals:", err);
    return [];
  }
}

/**
 * Fetches the last 3 entries from the journals table for user context.
 */
export async function getRecentContext(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return "";

  const { data, error } = await supabase
    .from('journals')
    .select('content_text')
    .eq('user_id', activeUserId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    return "";
  }

  return data.map((entry) => entry.content_text).join('\n---\n');
}

/**
 * Sends a chat message for the authenticated user.
 */
export async function sendMessage(message: string, userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) throw new Error("User not authenticated");

  // 1. Insert user message
  const { error: insertUserError } = await supabase
    .from('chat_messages')
    .insert([{
      user_id: activeUserId,
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

  const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  const aiResponseText = FALLBACK_RESPONSES[randomIndex];

  const { data: aiMessageData, error: aiInsertErr } = await supabase
    .from('chat_messages')
    .insert([{
      user_id: activeUserId,
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
 * Fetches latest 3 journal entries for AI Friend context.
 */
export async function getChatContext(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return "";

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
 * Fetches last 2 chat messages for current user.
 */
export async function getChatHistory(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return [];

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
 * Calculates weekly mood summary.
 */
export async function getWeeklyMoodSummary(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return "Stable";

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('journals')
    .select('ai_mood_score')
    .eq('user_id', activeUserId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (error || !data || data.length === 0) {
    return "Stable";
  }

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

  if (average > 8) return "Thriving";
  if (average >= 5) return "Stable";
  return "Needs Self-Care";
}

/**
 * Inserts a chat message.
 */
export async function saveChatMessage(content: string, role: 'user' | 'assistant', userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return null;

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
    return { success: false, error: "Invalid Vault Name or PIN." };
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
    return { success: false, error: "Vault Name already exists. Please choose a different name." };
  }
  return { success: true, user: data };
}

export async function getChatMessages(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return [];

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, created_at, role, content')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching chat messages:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Network error fetching chat messages:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// TASKS (DAILY RITUALS) ABSTRACTION LAYER
// ---------------------------------------------------------------------------

export async function getTasks(userId?: string) {
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return [];

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
  if (!activeUserId) throw new Error("Unauthorized: Cannot add task without user ID");

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
  const activeUserId = getVaultId(userId);
  if (!activeUserId) return null;

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
