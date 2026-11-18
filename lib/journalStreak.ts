export interface RollingDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayLetter: string; // 'M', 'T', 'W', 'T', 'F', 'S', 'S'
  shortName: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  isToday: boolean;
  isActive: boolean;
}

export interface StreakInfo {
  rollingDays: RollingDay[];
  completedCount: number;
  totalDays: number;
  isFullWeekCompleted: boolean;
  startDateStr: string;
  endDateStr: string;
}

/**
 * Calculates a rolling 7-day journaling streak ending today.
 * If today is Sunday, the window is Monday to Sunday.
 * If today is Monday, the window is Tuesday to Monday.
 * If today is Wednesday, the window is Thursday to Wednesday.
 */
export function calculateRollingStreak(journals: Array<{ created_at?: string }>): StreakInfo {
  const now = new Date();
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map of active calendar dates (YYYY-MM-DD) based on user's journal entries
  const activeDates = new Set<string>();
  (journals || []).forEach(j => {
    if (!j?.created_at) return;
    const d = new Date(j.created_at);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    activeDates.add(key);
  });

  const rollingDays: RollingDay[] = [];

  // Generate 7 consecutive days ending on current day (6 days ago to today)
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const dayOfWeek = targetDate.getDay();

    rollingDays.push({
      date: targetDate,
      dateKey: key,
      dayLetter: dayLetters[dayOfWeek],
      shortName: dayNames[dayOfWeek],
      isToday: i === 0,
      isActive: activeDates.has(key)
    });
  }

  const completedCount = rollingDays.filter(d => d.isActive).length;
  const isFullWeekCompleted = completedCount >= 7;

  return {
    rollingDays,
    completedCount,
    totalDays: 7,
    isFullWeekCompleted,
    startDateStr: rollingDays[0]?.shortName || '',
    endDateStr: rollingDays[6]?.shortName || ''
  };
}
