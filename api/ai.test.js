import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from './ai';

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
});

afterEach(() => vi.unstubAllGlobals());

describe('/api/ai handler', () => {
  it('GET reports hosted: false without keys', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, hosted: false });
  });

  it('GET reports hosted: true when a key is configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.body.hosted).toBe(true);
  });

  it('rejects non-GET/POST methods', async () => {
    const res = mockRes();
    await handler({ method: 'DELETE' }, res);
    expect(res.statusCode).toBe(405);
  });

  it('POST without configured keys returns 503', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'hi' } }, res);
    expect(res.statusCode).toBe(503);
  });

  it('POST without a prompt returns 400', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const res = mockRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it('POST with an oversized prompt returns 413', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'x'.repeat(9000) } }, res);
    expect(res.statusCode).toBe(413);
  });

  it('POST proxies to OpenAI and returns the text', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'proxied answer' } }] }),
    }));
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'hello' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: 'proxied answer' });
  });

  it('prefers Gemini over OpenAI when both keys are configured', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'gemini answer' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'hello' } }, res);
    expect(res.body).toEqual({ text: 'gemini answer' });
    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  it('maps upstream failures to 502 when no provider succeeds', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }));
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'hello' } }, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toContain('429');
  });

  it('falls through to the next provider when the first one fails', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test';
    process.env.GROQ_API_KEY = 'gsk_test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'high demand' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'groq answer' } }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler({ method: 'POST', body: { prompt: 'hello' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: 'groq answer' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(fetchMock.mock.calls[1][0]).toContain('api.groq.com');
  });
});
