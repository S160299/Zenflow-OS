// Daily focus statistics: sessions, focus minutes, and completed tasks per day.
// Stored as { days: { 'YYYY-MM-DD': { focusMinutes, sessions, tasksCompleted } } }

import { loadJSON, saveJSON } from './storage';

const KEY = 'zenflow_stats_v1';

let listeners = [];

function read() {
  const data = loadJSON(KEY, { days: {} });
  if (!data.days) data.days = {};
  return data;
}

function write(data) {
  saveJSON(KEY, data);
  listeners.forEach((cb) => cb(data));
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ensureDay(data, key) {
  if (!data.days[key]) {
    data.days[key] = { focusMinutes: 0, sessions: 0, tasksCompleted: 0 };
  }
  return data.days[key];
}

export function recordFocusSession(minutes) {
  const data = read();
  const day = ensureDay(data, dateKey());
  day.focusMinutes += minutes;
  day.sessions += 1;
  write(data);
}

export function recordTaskCompleted() {
  const data = read();
  const day = ensureDay(data, dateKey());
  day.tasksCompleted += 1;
  write(data);
}

// Last N days as an array (oldest first): { key, label, focusMinutes, sessions, tasksCompleted }
export function getLastDays(n = 7) {
  const data = read();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = data.days[key] || { focusMinutes: 0, sessions: 0, tasksCompleted: 0 };
    out.push({
      key,
      label: d.toLocaleDateString([], { weekday: 'short' }),
      isToday: i === 0,
      ...entry,
    });
  }
  return out;
}

// Consecutive days (ending today or yesterday) with at least one focus session
export function getStreak() {
  const data = read();
  let streak = 0;
  const probe = new Date();
  // A streak survives if today has no session *yet* but yesterday did
  if (!data.days[dateKey(probe)]?.sessions) {
    probe.setDate(probe.getDate() - 1);
  }
  while (data.days[dateKey(probe)]?.sessions > 0) {
    streak += 1;
    probe.setDate(probe.getDate() - 1);
  }
  return streak;
}

export function getTotals() {
  const data = read();
  return Object.values(data.days).reduce(
    (acc, d) => ({
      focusMinutes: acc.focusMinutes + (d.focusMinutes || 0),
      sessions: acc.sessions + (d.sessions || 0),
      tasksCompleted: acc.tasksCompleted + (d.tasksCompleted || 0),
    }),
    { focusMinutes: 0, sessions: 0, tasksCompleted: 0 }
  );
}

export function subscribeStats(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
