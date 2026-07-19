// Pure Pomodoro phase-transition rules, extracted from TimerContext so the
// cycle logic is testable without rendering React.

// focus -> short break (long break after every 4th focus round); breaks -> focus
export function nextPhaseAfter({ mode, round }) {
  const wasFocus = mode === 'focus';
  const nextRound = wasFocus ? round + 1 : round;
  const nextMode = wasFocus ? (nextRound % 4 === 0 ? 'long' : 'short') : 'focus';
  return { nextMode, nextRound, wasFocus };
}

// Stats are only credited for focus phases that ran to natural completion —
// skipping a phase must not farm focus minutes, sessions, or pomodoros.
export function shouldRecordFocus({ mode, skipped }) {
  return mode === 'focus' && !skipped;
}
