import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase client with service role key if available for server-side moderation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Lifetime counting starts officially from 8:30 PM IST today (Nov 14, 2026)
export const COUNTING_START_EPOCH = new Date('2026-11-14T20:30:00+05:30').getTime();

interface StoryEdit {
  title?: string;
  content?: string;
  category?: string;
}

interface ModerationState {
  approvedIds: Set<string>;
  deletedIds: Set<string>;
  edits: Map<string, StoryEdit>;
  blockedUsers: Set<string>;
  deletedUsers: Set<string>;
  userTimeSpent: Map<string, number>; // seconds (lifetime starting from 8:30 PM today)
  userLastActiveAt: Map<string, number>; // epoch ms timestamp of latest heartbeat
  userDailyTime: Map<string, Record<string, number>>; // userId -> { '2026-11-14': seconds }
}

// Dummy/test IDs to permanently exclude
const DUMMY_TEST_IDS = [
  '3cc19b62-ec6a-4ddc-9501-fd18eb8996db',
  'e05ab1c7-95c9-4d54-a9a6-ba789adce892',
  '02d1572a-ad12-4064-9d0e-48745144a245',
  '48b733b7-17b6-41da-a337-cebaff415835',
  '9e64a3be-dbcf-492b-bebb-4f21c34bab1d',
  '87736e27-530d-472e-a504-33867f66feeb',
  '35c60ac0-ee15-4e7a-8f65-db6897649db7',
  '110c7f1d-3516-48b1-84a6-1c88ffefcfad',
  '681e7104-0151-43b1-aa76-50e56cf368d4'
];

const DATA_FILE = path.join(process.cwd(), 'lib', 'moderation_state.json');

function loadPersistedState(): ModerationState {
  const state: ModerationState = {
    approvedIds: new Set<string>(),
    deletedIds: new Set<string>(DUMMY_TEST_IDS),
    edits: new Map<string, StoryEdit>(),
    blockedUsers: new Set<string>(),
    deletedUsers: new Set<string>(),
    userTimeSpent: new Map<string, number>(), // reset to 0
    userLastActiveAt: new Map<string, number>(),
    userDailyTime: new Map<string, Record<string, number>>()
  };

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.approvedIds)) {
        parsed.approvedIds.forEach((id: string) => state.approvedIds.add(id));
      }
      if (Array.isArray(parsed.deletedIds)) {
        parsed.deletedIds.forEach((id: string) => state.deletedIds.add(id));
      }
      if (parsed.edits && typeof parsed.edits === 'object') {
        Object.entries(parsed.edits).forEach(([id, edit]) => {
          state.edits.set(id, edit as StoryEdit);
        });
      }
      if (Array.isArray(parsed.blockedUsers)) {
        parsed.blockedUsers.forEach((id: string) => state.blockedUsers.add(id));
      }
      if (Array.isArray(parsed.deletedUsers)) {
        parsed.deletedUsers.forEach((id: string) => state.deletedUsers.add(id));
      }
      if (parsed.userTimeSpent && typeof parsed.userTimeSpent === 'object') {
        Object.entries(parsed.userTimeSpent).forEach(([id, sec]) => {
          state.userTimeSpent.set(id, Number(sec) || 0);
        });
      }
      if (parsed.userLastActiveAt && typeof parsed.userLastActiveAt === 'object') {
        Object.entries(parsed.userLastActiveAt).forEach(([id, ts]) => {
          state.userLastActiveAt.set(id, Number(ts) || 0);
        });
      }
      if (parsed.userDailyTime && typeof parsed.userDailyTime === 'object') {
        Object.entries(parsed.userDailyTime).forEach(([id, daily]) => {
          state.userDailyTime.set(id, daily as Record<string, number>);
        });
      }
    }
  } catch (err) {
    console.warn("Notice: could not load moderation_state.json:", err);
  }

  // Ensure all dummy test IDs are purged
  DUMMY_TEST_IDS.forEach(id => state.deletedIds.add(id));

  return state;
}

export function savePersistedState() {
  try {
    const payload = {
      approvedIds: Array.from(moderationState.approvedIds),
      deletedIds: Array.from(moderationState.deletedIds),
      edits: Object.fromEntries(moderationState.edits.entries()),
      blockedUsers: Array.from(moderationState.blockedUsers),
      deletedUsers: Array.from(moderationState.deletedUsers),
      userTimeSpent: Object.fromEntries(moderationState.userTimeSpent.entries()),
      userLastActiveAt: Object.fromEntries(moderationState.userLastActiveAt.entries()),
      userDailyTime: Object.fromEntries(moderationState.userDailyTime.entries())
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Notice: could not write moderation_state.json:", err);
  }
}

// Global moderation store attached to globalThis so it persists across hot-reloads
const globalForAdmin = globalThis as unknown as {
  _mindmateModerationState?: ModerationState;
};

export const moderationState: ModerationState = globalForAdmin._mindmateModerationState || loadPersistedState();

// Reset all existing time spent to 0 if before counting start epoch (8:30 PM today)
if (Date.now() < COUNTING_START_EPOCH) {
  moderationState.userTimeSpent = new Map<string, number>();
}

// Ensure all collections exist
if (!moderationState.deletedUsers) moderationState.deletedUsers = new Set<string>();
if (!moderationState.blockedUsers) moderationState.blockedUsers = new Set<string>();
if (!moderationState.userTimeSpent) moderationState.userTimeSpent = new Map<string, number>();
if (!moderationState.userLastActiveAt) moderationState.userLastActiveAt = new Map<string, number>();
if (!moderationState.userDailyTime) moderationState.userDailyTime = new Map<string, Record<string, number>>();
if (!moderationState.approvedIds) moderationState.approvedIds = new Set<string>();
if (!moderationState.deletedIds) moderationState.deletedIds = new Set<string>(DUMMY_TEST_IDS);
if (!moderationState.edits) moderationState.edits = new Map<string, StoryEdit>();

if (!globalForAdmin._mindmateModerationState) {
  globalForAdmin._mindmateModerationState = moderationState;
}

// Check if user is active in realtime (heartbeat received within last 65 seconds)
export function isUserActiveRealtime(userId: string): boolean {
  const lastActive = moderationState.userLastActiveAt.get(userId) || 0;
  return (Date.now() - lastActive) <= 65000;
}

// Record heartbeat activity and accumulate time if >= 8:30 PM today
export function recordHeartbeat(userId: string): { ok: boolean; blocked: boolean } {
  if (moderationState.blockedUsers.has(userId)) {
    return { ok: true, blocked: true };
  }

  const now = Date.now();
  moderationState.userLastActiveAt.set(userId, now);

  // Start accumulating lifetime time spent strictly from 8:30 PM today (Nov 14, 2026)
  if (now >= COUNTING_START_EPOCH) {
    const current = moderationState.userTimeSpent.get(userId) || 0;
    const updated = current + 30;
    moderationState.userTimeSpent.set(userId, updated);

    // Record daily usage for time graph
    const todayStr = new Date().toISOString().slice(0, 10);
    const userDaily = moderationState.userDailyTime.get(userId) || {};
    userDaily[todayStr] = (userDaily[todayStr] || 0) + 30;
    moderationState.userDailyTime.set(userId, userDaily);
  }

  savePersistedState();
  return { ok: true, blocked: false };
}

// Format duration: 0s if 0, or minutes and hours
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}
