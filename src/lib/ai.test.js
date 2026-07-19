import { describe, it, expect, vi, beforeEach } from 'vitest';

// ai.js keeps module-level hosted-probe state, so each test gets a fresh copy.
async function freshAI() {
  vi.resetModules();
  return import('./ai');
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('hasUsableKey', () => {
  it('validates key prefixes per provider', async () => {
    const { hasUsableKey } = await freshAI();
    expect(hasUsableKey('openai', 'sk-abc')).toBe(true);
    expect(hasUsableKey('openai', '')).toBe(false);
    expect(hasUsableKey('gemini', 'AIzaSyAbc')).toBe(true);
    expect(hasUsableKey('gemini', 'sk-abc')).toBe(false);
    expect(hasUsableKey('groq', 'gsk_abc')).toBe(true);
    expect(hasUsableKey('groq', 'sk-abc')).toBe(false);
    expect(hasUsableKey('unknown', 'sk-abc')).toBe(false);
  });
});

describe('extractJSON', () => {
  it('parses plain JSON', async () => {
    const { extractJSON } = await freshAI();
    expect(extractJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', async () => {
    const { extractJSON } = await freshAI();
    expect(extractJSON('```json\n{"schedule":[]}\n```')).toEqual({ schedule: [] });
    expect(extractJSON('```\n[1,2]\n```')).toEqual([1, 2]);
  });

  it('throws on garbage', async () => {
    const { extractJSON } = await freshAI();
    expect(() => extractJSON('not json')).toThrow();
  });
});

describe('hosted proxy routing (no personal key)', () => {
  it('probeHosted reports availability and caches the result', async () => {
    const ai = await freshAI();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, hosted: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await ai.probeHosted()).toBe(true);
    expect(ai.isHostedReady()).toBe(true);
    await ai.probeHosted();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('probeHosted is false when the endpoint is unreachable', async () => {
    const ai = await freshAI();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await ai.probeHosted()).toBe(false);
    expect(ai.isHostedReady()).toBe(false);
  });

  it('generateScheduleWithAI routes through /api/ai and parses the schedule', async () => {
    const ai = await freshAI();
    const schedule = [{ time: '09:00 AM', title: 'Deep Work', type: 'focus' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: JSON.stringify({ schedule }) }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await ai.generateScheduleWithAI({
      provider: 'openai',
      apiKey: '',
      energy: 7,
      goals: 'ship the hackathon project',
      tasks: [{ text: 'Record demo', priority: 'high' }],
    });

    expect(result).toEqual(schedule);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai');
    const body = JSON.parse(options.body);
    expect(body.json).toBe(true);
    expect(body.prompt).toContain('Energy Level: 7/10');
    expect(body.prompt).toContain('Record demo');
  });

  it('chatWithAI routes through /api/ai and returns the text', async () => {
    const ai = await freshAI();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'hello from hosted' }),
    }));
    const answer = await ai.chatWithAI({ provider: 'openai', apiKey: '', system: 's', prompt: 'q' });
    expect(answer).toBe('hello from hosted');
  });

  it('surfaces server errors from the proxy', async () => {
    const ai = await freshAI();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Hosted AI is not configured' }),
    }));
    await expect(ai.chatWithAI({ provider: 'openai', apiKey: '', prompt: 'q' }))
      .rejects.toThrow('Hosted AI is not configured');
  });
});

describe('aiAvailable', () => {
  it('is true with a usable personal key even without hosted', async () => {
    const ai = await freshAI();
    expect(ai.aiAvailable({ provider: 'openai', apiKey: 'sk-abc' })).toBe(true);
    expect(ai.aiAvailable({ provider: 'openai', apiKey: '' })).toBe(false);
  });
});
