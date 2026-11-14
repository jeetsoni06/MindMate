import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  supabaseAdmin, 
  moderationState, 
  savePersistedState, 
  formatDuration, 
  isUserActiveRealtime 
} from '@/lib/adminStore';

// Generate 7-day daily usage history for the share-market style graph
function get7DayUsage(userId: string): Array<{ date: string; label: string; minutes: number; seconds: number }> {
  const userDaily = moderationState.userDailyTime.get(userId) || {};
  const result: Array<{ date: string; label: string; minutes: number; seconds: number }> = [];

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    const sec = userDaily[dateKey] || 0;

    result.push({
      date: dateKey,
      label,
      seconds: sec,
      minutes: Math.round((sec / 60) * 10) / 10
    });
  }

  return result;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching auth_users for admin:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const blockedUsers = moderationState.blockedUsers || new Set<string>();
    const deletedUsers = moderationState.deletedUsers || new Set<string>();
    const userTimeSpent = moderationState.userTimeSpent || new Map<string, number>();
    const userLastActiveAt = moderationState.userLastActiveAt || new Map<string, number>();

    const formattedUsers = (data || [])
      .filter((u) => !deletedUsers.has(u.id))
      .map((u) => {
        // True time spent (starts at 0; counting starts strictly at 8:30 PM today)
        const timeSpentSec = userTimeSpent.get(u.id) || 0;
        const isBlocked = blockedUsers.has(u.id);

        // Realtime active status: is user currently active right now?
        const isRealtimeActive = !isBlocked && isUserActiveRealtime(u.id);
        const lastActiveMs = userLastActiveAt.get(u.id) || 0;

        let lastActiveText = 'Offline';
        if (isRealtimeActive) {
          lastActiveText = 'Active Now';
        } else if (lastActiveMs > 0) {
          const diffMins = Math.floor((Date.now() - lastActiveMs) / 60000);
          if (diffMins < 1) lastActiveText = 'Just now';
          else if (diffMins < 60) lastActiveText = `${diffMins}m ago`;
          else lastActiveText = `${Math.floor(diffMins / 60)}h ago`;
        }

        const joinedDate = u.created_at ? new Date(u.created_at) : new Date();
        const dateJoinedFormatted = joinedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        // 7-day usage breakdown for line graph
        const dailyUsage = get7DayUsage(u.id);

        return {
          id: u.id,
          username: u.username || 'Anonymous',
          createdAt: u.created_at,
          dateJoinedFormatted,
          isBlocked,
          isRealtimeActive,
          lastActiveText,
          timeSpentSeconds: timeSpentSec,
          formattedTimeSpent: formatDuration(timeSpentSec),
          dailyUsage
        };
      });

    const activeNowCount = formattedUsers.filter(u => u.isRealtimeActive).length;
    const blockedCount = formattedUsers.filter(u => u.isBlocked).length;

    return NextResponse.json({
      users: formattedUsers,
      counts: {
        total: formattedUsers.length,
        activeNow: activeNowCount,
        blocked: blockedCount
      }
    });

  } catch (err) {
    console.error("Admin users GET error:", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'block') {
      moderationState.blockedUsers.add(userId);
      savePersistedState();
      return NextResponse.json({ success: true, message: 'User blocked successfully' });
    }

    if (action === 'unblock') {
      moderationState.blockedUsers.delete(userId);
      savePersistedState();
      return NextResponse.json({ success: true, message: 'User unblocked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error("Admin users PATCH error:", err);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    moderationState.deletedUsers.add(userId);
    moderationState.blockedUsers.delete(userId);
    moderationState.userTimeSpent.delete(userId);
    moderationState.userLastActiveAt.delete(userId);
    moderationState.userDailyTime.delete(userId);
    savePersistedState();

    try {
      await supabaseAdmin
        .from('auth_users')
        .delete()
        .eq('id', userId);
    } catch (dbErr) {
      console.warn("Supabase auth_users delete notice:", dbErr);
    }

    return NextResponse.json({ success: true, message: 'User permanently deleted' });

  } catch (err) {
    console.error("Admin users DELETE error:", err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
