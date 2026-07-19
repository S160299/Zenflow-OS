// Hosted AI proxy. The API key(s) live in server-side environment variables,
// so visitors get real AI responses without supplying their own key.
//
// Tries each configured provider in priority order (Gemini, then Groq, then
// OpenAI) and falls through to the next on failure — a transient 503 from
// one provider shouldn't surface as a hard error when another is available.
//
// GET  /api/ai            -> { ok: true, hosted: boolean }
// POST /api/ai            -> { text } for body { system?, prompt, json? }

const MAX_PROMPT_CHARS = 8000;

// Both endpoints are OpenAI-compatible chat-completions APIs, so one request
// builder (below) serves all of them — only the base URL/model differ.
const PROVIDER_CONFIG = {
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash', envVar: 'GEMINI_API_KEY' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', envVar: 'GROQ_API_KEY' },
  openai: { baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', envVar: 'OPENAI_API_KEY' },
};

// Priority order: cheapest/free-tier-friendly first.
const PROVIDER_PRIORITY = ['gemini', 'groq', 'openai'];

function configuredProviders() {
  return PROVIDER_PRIORITY
    .map((provider) => ({ provider, apiKey: process.env[PROVIDER_CONFIG[provider].envVar] }))
    .filter((entry) => Boolean(entry.apiKey));
}

export default async function handler(req, res) {
  const providers = configuredProviders();
  const hosted = providers.length > 0;

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hosted });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!hosted) {
    return res.status(503).json({ error: 'Hosted AI is not configured' });
  }

  const { system, prompt, json } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (prompt.length > MAX_PROMPT_CHARS || (system && system.length > MAX_PROMPT_CHARS)) {
    return res.status(413).json({ error: 'Prompt too long' });
  }

  let lastError = null;
  for (const { provider, apiKey } of providers) {
    try {
      const text = await providerChat({ provider, apiKey, system, prompt, json });
      return res.status(200).json({ text });
    } catch (err) {
      lastError = err;
      console.error(`Hosted AI request failed via ${provider}:`, err);
    }
  }

  return res.status(502).json({ error: `${lastError?.message || lastError}`.slice(0, 200) });
}

async function providerChat({ provider, apiKey, system, prompt, json }) {
  const config = PROVIDER_CONFIG[provider];
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${provider} request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider} returned an empty response`);
  return content;
}
