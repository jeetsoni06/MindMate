import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { moderationState, savePersistedState } from '@/lib/adminStore';
import { calculateRollingStreak } from '@/lib/journalStreak';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is already unlocked in moderation store
    const isAlreadyUnlocked = moderationState.unlockedChatUsers.has(userId);

    // Fetch user's journal entries
    const { data: journals, error: journalError } = await supabase
      .from('journals')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (journalError) {
      console.error("Error fetching journals for chat status:", journalError);
    }

    const streakInfo = calculateRollingStreak(journals || []);

    let unlocked = isAlreadyUnlocked || streakInfo.isFullWeekCompleted;

    // Grandfather existing users who already engaged in chat
    if (!unlocked) {
      const { data: chatHistory } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (chatHistory && chatHistory.length > 0) {
        unlocked = true;
        moderationState.unlockedChatUsers.add(userId);
        savePersistedState();
      }
    }

    // If streak is completed now, permanently unlock
    if (streakInfo.isFullWeekCompleted && !isAlreadyUnlocked) {
      moderationState.unlockedChatUsers.add(userId);
      savePersistedState();
      unlocked = true;
    }

    const hasSeenCelebration = moderationState.celebratedChatUsers.has(userId);

    return NextResponse.json({
      unlocked,
      completedCount: streakInfo.completedCount,
      totalDays: streakInfo.totalDays,
      isFullWeekCompleted: streakInfo.isFullWeekCompleted,
      rollingDays: streakInfo.rollingDays,
      hasSeenCelebration,
      startDateStr: streakInfo.startDateStr,
      endDateStr: streakInfo.endDateStr
    });
  } catch (error: any) {
    console.error("Error in /api/user/chat-status:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'acknowledge_celebration') {
      moderationState.celebratedChatUsers.add(userId);
      savePersistedState();
      return NextResponse.json({ success: true, acknowledged: true });
    }

    if (action === 'unlock') {
      moderationState.unlockedChatUsers.add(userId);
      savePersistedState();
      return NextResponse.json({ success: true, unlocked: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error("Error in POST /api/user/chat-status:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
