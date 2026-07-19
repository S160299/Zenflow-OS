import { describe, it, expect, beforeEach } from 'vitest';
import {
  dateKey,
  recordFocusSession,
  recordTaskCompleted,
  getLastDays,
  getStreak,
  getTotals,
  subscribeStats,
} from './stats';

const KEY = 'zenflow_stats_v1';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function seedDays(entries) {
  // entries: { daysAgoNumber: partialDayEntry }
  const days = {};
  for (const [ago, entry] of Object.entries(entries)) {
    days[dateKey(daysAgo(Number(ago)))] = {
      focusMinutes: 0,
      sessions: 0,
      tasksCompleted: 0,
      ...entry,
    };
  }
  localStorage.setItem(KEY, JSON.stringify({ days }));
}

beforeEach(() => localStorage.clear());

describe('dateKey', () => {
  it('formats as YYYY-MM-DD with zero padding', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('recording', () => {
  it('accumulates focus sessions for today', () => {
    recordFocusSession(25);
    recordFocusSession(25);
    const today = getLastDays(1)[0];
    expect(today.focusMinutes).toBe(50);
    expect(today.sessions).toBe(2);
  });

  it('counts completed tasks for today', () => {
    recordTaskCompleted();
    recordTaskCompleted();
    recordTaskCompleted();
    expect(getLastDays(1)[0].tasksCompleted).toBe(3);
  });
});

describe('getLastDays', () => {
  it('returns n days oldest-first with zero-filled gaps', () => {
    seedDays({ 2: { focusMinutes: 50, sessions: 2 } });
    const days = getLastDays(7);
    expect(days).toHaveLength(7);
    expect(days[4].focusMinutes).toBe(50);
    expect(days[6].isToday).toBe(true);
    expect(days[6].focusMinutes).toBe(0);
    expect(days[0].key < days[6].key).toBe(true);
  });
});

describe('getStreak', () => {
  it('is 0 with no sessions', () => {
    expect(getStreak()).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    seedDays({ 0: { sessions: 1 }, 1: { sessions: 2 }, 2: { sessions: 1 } });
    expect(getStreak()).toBe(3);
  });

  it('survives when today has no session yet but yesterday did', () => {
    seedDays({ 1: { sessions: 1 }, 2: { sessions: 1 } });
    expect(getStreak()).toBe(2);
  });

  it('breaks on a gap day', () => {
    seedDays({ 0: { sessions: 1 }, 2: { sessions: 5 } });
    expect(getStreak()).toBe(1);
  });

  it('ignores days with tasks but no sessions', () => {
    seedDays({ 0: { sessions: 1 }, 1: { tasksCompleted: 4 } });
    expect(getStreak()).toBe(1);
  });
});

describe('getTotals', () => {
  it('sums across all days and tolerates missing fields', () => {
    seedDays({ 0: { focusMinutes: 25, sessions: 1 }, 3: { focusMinutes: 50, sessions: 2, tasksCompleted: 4 } });
    expect(getTotals()).toEqual({ focusMinutes: 75, sessions: 3, tasksCompleted: 4 });
  });
});

describe('subscribeStats', () => {
  it('notifies on writes and stops after unsubscribe', () => {
    const seen = [];
    const unsubscribe = subscribeStats((data) => seen.push(data));
    recordFocusSession(25);
    expect(seen).toHaveLength(1);
    unsubscribe();
    recordFocusSession(25);
    expect(seen).toHaveLength(1);
  });
});
