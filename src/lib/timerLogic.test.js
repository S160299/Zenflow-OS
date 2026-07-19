import { describe, it, expect } from 'vitest';
import { nextPhaseAfter, shouldRecordFocus } from './timerLogic';

describe('nextPhaseAfter', () => {
  it('focus -> short break, incrementing the round', () => {
    expect(nextPhaseAfter({ mode: 'focus', round: 0 })).toEqual({
      nextMode: 'short', nextRound: 1, wasFocus: true,
    });
  });

  it('every 4th focus round earns a long break', () => {
    expect(nextPhaseAfter({ mode: 'focus', round: 3 })).toEqual({
      nextMode: 'long', nextRound: 4, wasFocus: true,
    });
  });

  it('breaks return to focus without changing the round', () => {
    expect(nextPhaseAfter({ mode: 'short', round: 2 })).toEqual({
      nextMode: 'focus', nextRound: 2, wasFocus: false,
    });
    expect(nextPhaseAfter({ mode: 'long', round: 4 })).toEqual({
      nextMode: 'focus', nextRound: 4, wasFocus: false,
    });
  });
});

describe('shouldRecordFocus', () => {
  it('records a naturally completed focus phase', () => {
    expect(shouldRecordFocus({ mode: 'focus', skipped: false })).toBe(true);
  });

  it('does NOT record a skipped focus phase (no stat farming)', () => {
    expect(shouldRecordFocus({ mode: 'focus', skipped: true })).toBe(false);
  });

  it('never records breaks', () => {
    expect(shouldRecordFocus({ mode: 'short', skipped: false })).toBe(false);
    expect(shouldRecordFocus({ mode: 'long', skipped: true })).toBe(false);
  });
});
