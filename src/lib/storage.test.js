import { describe, it, expect, beforeEach } from 'vitest';
import { loadJSON, saveJSON, loadString, saveString } from './storage';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('round-trips JSON values', () => {
    saveJSON('k', { a: 1, list: [1, 2] });
    expect(loadJSON('k', null)).toEqual({ a: 1, list: [1, 2] });
  });

  it('returns the fallback for missing keys', () => {
    expect(loadJSON('missing', { d: true })).toEqual({ d: true });
    expect(loadString('missing', 'x')).toBe('x');
  });

  it('returns the fallback for corrupt JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(loadJSON('bad', 'fallback')).toBe('fallback');
  });

  it('round-trips strings and defaults to empty string', () => {
    saveString('s', 'hello');
    expect(loadString('s')).toBe('hello');
    expect(loadString('nope')).toBe('');
  });

  it('preserves falsy stored values instead of using the fallback', () => {
    saveJSON('zero', 0);
    saveJSON('false', false);
    expect(loadJSON('zero', 99)).toBe(0);
    expect(loadJSON('false', true)).toBe(false);
  });
});
