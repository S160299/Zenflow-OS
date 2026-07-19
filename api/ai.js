// Hosted OpenAI proxy. The API key lives in a server-side environment variable,
// so visitors get real AI responses without supplying their own key.
//
// GET  /api/ai            -> { ok: true, hosted: boolean }
// POST /api/ai            -> { text } for body { system?, prompt, json? }

const MAX_PROMPT_CHARS = 8000;

export default async function handler(req, res) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const hosted = Boolean(openaiKey);

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

  try {
    const text = await openaiChat({ apiKey: openaiKey, system, prompt, json });
    return res.status(200).json({ text });
  } catch (err) {
    console.error('Hosted AI request failed:', err);
    return res.status(502).json({ error: `${err.message || err}`.slice(0, 200) });
  }
}

async function openaiChat({ apiKey, system, prompt, json }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response');
  return content;
}
