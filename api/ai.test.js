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

  it('maps upstream failures to 502', async () => {
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
});
