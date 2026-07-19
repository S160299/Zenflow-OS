import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { loadJSON, saveJSON } from '../lib/storage';
import { nextPhaseAfter, shouldRecordFocus } from '../lib/timerLogic';
import { recordFocusSession } from '../lib/stats';
import { playCompletionAlert } from '../lib/audioEngine';
import { toast } from '../components/ui/toast';

// Timer state lives at the app root so the countdown keeps running while the
// user works in other apps (the old per-component timer died on unmount).
// The countdown is computed from a target timestamp (endAt), so it never
// drifts and stays correct in throttled background tabs.

const PREFS_KEY = 'zenflow_timer_prefs_v1';
const SESSION_KEY = 'zenflow_timer_state_v1';
const BASE_TITLE = 'Zenflow AI | Premium Cognitive Focus Workspace';

export const MODE_LABELS = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
};

const TimerContext = createContext(null);
// The once-per-second countdown lives in its own context so only components
// that display it (timer face, status chip) re-render on every tick.
const TimerTickContext = createContext(0);

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}

export function useTimerRemaining() {
  return useContext(TimerTickContext);
}

export function TimerProvider({ onFocusSessionComplete, children }) {
  const [prefs, setPrefs] = useState(() =>
    loadJSON(PREFS_KEY, {
      durations: { focus: 25, short: 5, long: 15 }, // minutes
      autoCycle: true,
      notify: false,
    })
  );

  const [session, setSession] = useState(() => {
    const saved = loadJSON(SESSION_KEY, null);
    const durations = loadJSON(PREFS_KEY, null)?.durations || { focus: 25, short: 5, long: 15 };
    if (saved) {
      // Resume a timer that was still running when the page was closed
      if (saved.running && saved.endAt > Date.now()) return saved;
      const mode = saved.mode && durations[saved.mode] ? saved.mode : 'focus';
      return {
        mode,
        round: saved.round || 0,
        running: false,
        endAt: null,
        remaining: saved.running ? durations[mode] * 60 : (saved.remaining ?? durations[mode] * 60),
      };
    }
    return { mode: 'focus', round: 0, running: false, endAt: null, remaining: durations.focus * 60 };
  });

  const [remaining, setRemaining] = useState(() =>
    session.running ? Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000)) : session.remaining
  );
  const [focusTask, setFocusTaskState] = useState(() => loadJSON('zenflow_focus_task', null));

  const completingRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const focusTaskRef = useRef(focusTask);
  focusTaskRef.current = focusTask;
  const onCompleteRef = useRef(onFocusSessionComplete);
  onCompleteRef.current = onFocusSessionComplete;

  useEffect(() => saveJSON(PREFS_KEY, prefs), [prefs]);
  useEffect(() => saveJSON(SESSION_KEY, session), [session]);
  useEffect(() => saveJSON('zenflow_focus_task', focusTask), [focusTask]);

  const sendNotification = useCallback((title, body) => {
    if (!prefsRef.current.notify) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/favicon.svg' });
    } catch {
      /* notifications unavailable */
    }
  }, []);

  const completePhase = useCallback(({ skipped = false } = {}) => {
    if (completingRef.current) return;
    completingRef.current = true;

    const { mode, round } = sessionRef.current;
    const { durations, autoCycle } = prefsRef.current;

    playCompletionAlert();

    if (shouldRecordFocus({ mode, skipped })) {
      recordFocusSession(durations.focus);
      onCompleteRef.current?.(focusTaskRef.current);
    }

    const { nextMode, nextRound, wasFocus } = nextPhaseAfter({ mode, round });
    const nextSeconds = durations[nextMode] * 60;

    const title = wasFocus ? 'Focus session complete!' : 'Break finished!';
    const body = wasFocus
      ? `Great work. ${MODE_LABELS[nextMode]} is up next.`
      : 'Recharged — time to focus again.';
    toast({ title, description: body, variant: 'success', duration: 5000 });
    sendNotification(title, body);

    setSession({
      mode: nextMode,
      round: nextRound,
      running: autoCycle,
      endAt: autoCycle ? Date.now() + nextSeconds * 1000 : null,
      remaining: nextSeconds,
    });
    setRemaining(nextSeconds);
    // Allow the next phase to complete once its own endAt is set
    setTimeout(() => { completingRef.current = false; }, 50);
  }, [sendNotification]);

  // Ticker — computes remaining from the wall clock
  useEffect(() => {
    if (!session.running || !session.endAt) return undefined;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((sessionRef.current.endAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) completePhase();
    };
    tick();
    const iv = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session.running, session.endAt, completePhase]);

  // Live countdown in the browser tab title
  useEffect(() => {
    if (session.running) {
      const mins = Math.floor(remaining / 60);
      const secs = String(remaining % 60).padStart(2, '0');
      document.title = `⏱ ${mins}:${secs} · ${MODE_LABELS[session.mode]} — Zenflow`;
    } else {
      document.title = BASE_TITLE;
    }
    return () => { document.title = BASE_TITLE; };
  }, [remaining, session.running, session.mode]);

  const start = useCallback(() => {
    if (prefsRef.current.notify && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setSession((s) => {
      const secs = s.remaining > 0 ? s.remaining : prefsRef.current.durations[s.mode] * 60;
      return { ...s, running: true, endAt: Date.now() + secs * 1000, remaining: secs };
    });
  }, []);

  const pause = useCallback(() => {
    setSession((s) => {
      if (!s.running) return s;
      const rem = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
      setRemaining(rem);
      return { ...s, running: false, endAt: null, remaining: rem };
    });
  }, []);

  const reset = useCallback(() => {
    setSession((s) => {
      const secs = prefsRef.current.durations[s.mode] * 60;
      setRemaining(secs);
      return { ...s, running: false, endAt: null, remaining: secs };
    });
  }, []);

  const selectMode = useCallback((mode) => {
    const secs = prefsRef.current.durations[mode] * 60;
    setRemaining(secs);
    setSession((s) => ({ ...s, mode, running: false, endAt: null, remaining: secs }));
  }, []);

  // Jump to the next phase without waiting for the clock.
  // Skipped focus phases are not credited to stats (see timerLogic).
  const skip = useCallback(() => {
    completePhase({ skipped: true });
  }, [completePhase]);

  const setDuration = useCallback((mode, minutes) => {
    const mins = Math.min(180, Math.max(1, Math.round(minutes) || 1));
    setPrefs((p) => ({ ...p, durations: { ...p.durations, [mode]: mins } }));
    setSession((s) => {
      if (s.mode !== mode || s.running) return s;
      setRemaining(mins * 60);
      return { ...s, remaining: mins * 60 };
    });
  }, []);

  const setAutoCycle = useCallback((v) => setPrefs((p) => ({ ...p, autoCycle: v })), []);

  const setNotify = useCallback((v) => {
    if (v && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setPrefs((p) => ({ ...p, notify: v }));
  }, []);

  const setFocusTask = useCallback((task) => {
    setFocusTaskState(task ? { id: task.id, text: task.text } : null);
  }, []);

  const duration = prefs.durations[session.mode] * 60;

  // Memoized so consumers only re-render on real state changes — the
  // per-second countdown flows through TimerTickContext instead.
  const value = useMemo(() => ({
    mode: session.mode,
    round: session.round,
    running: session.running,
    duration,
    durations: prefs.durations,
    autoCycle: prefs.autoCycle,
    notify: prefs.notify,
    focusTask,
    start,
    pause,
    reset,
    skip,
    selectMode,
    setDuration,
    setAutoCycle,
    setNotify,
    setFocusTask,
  }), [
    session.mode, session.round, session.running, duration,
    prefs.durations, prefs.autoCycle, prefs.notify, focusTask,
    start, pause, reset, skip, selectMode, setDuration, setAutoCycle, setNotify, setFocusTask,
  ]);

  return (
    <TimerContext.Provider value={value}>
      <TimerTickContext.Provider value={remaining}>
        {children}
      </TimerTickContext.Provider>
    </TimerContext.Provider>
  );
}
