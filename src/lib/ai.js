// OpenAI helpers. Keys are supplied by the user at runtime and only sent to
// OpenAI when the hosted server proxy is not configured.

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI (GPT)', keyPlaceholder: 'sk-...' },
  { id: 'gemini', label: 'Google Gemini', keyPlaceholder: 'AIza...' },
  { id: 'groq', label: 'Groq (Llama)', keyPlaceholder: 'gsk_...' },
];

// Each provider's chat-completions endpoint is OpenAI-compatible, so one
// request builder (below) serves all of them — only the base URL/model differ.
// Gemini uses Google's OpenAI-compatibility layer (generativelanguage.googleapis.com/v1beta/openai)
// rather than its native API, so it can share the same request shape.
const PROVIDER_CONFIG = {
  openai: { baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile' },
};

/* ---------------- Hosted proxy (/api/ai) ---------------- */
// When the app is deployed with a server-side key, judges/visitors get
// real AI without pasting their own. Probed once at startup.

let hostedReady = null;

export async function probeHosted() {
  if (hostedReady !== null) return hostedReady;
  try {
    const response = await fetch('/api/ai');
    const data = await response.json();
    hostedReady = Boolean(data?.hosted);
  } catch {
    hostedReady = false;
  }
  return hostedReady;
}

export function isHostedReady() {
  return hostedReady === true;
}

async function hostedChat({ system, prompt, json = false }) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, prompt, json }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Hosted AI request failed (${response.status})`);
  }
  if (!data?.text) throw new Error('Hosted AI returned an empty response');
  return data.text;
}

// True when any AI path (personal key or hosted proxy) can serve requests.
export function aiAvailable(ai) {
  return hasUsableKey(ai?.provider, ai?.apiKey) || isHostedReady();
}

export function hasUsableKey(provider, key) {
  if (!key) return false;
  if (provider === 'openai') return key.startsWith('sk-');
  if (provider === 'gemini') return key.startsWith('AIza');
  if (provider === 'groq') return key.startsWith('gsk_');
  return false;
}

function schedulePrompt({ energy, goals, tasks }) {
  const taskContext = tasks?.length
    ? `\nThe user's current open tasks (use them to make the plan concrete):\n${tasks
        .map((t) => `- ${t.text}${t.priority ? ` [${t.priority} priority]` : ''}`)
        .join('\n')}`
    : '';
  return `You are an AI Focus Coach. Generate a customized 4-hour high-productivity work schedule based on:
- Energy Level: ${energy}/10 (1 = exhausted, 10 = peak capacity)
- User Focus Goals: "${goals || 'General work/study'}"${taskContext}

Produce 5-8 schedule slots starting at 09:00 AM. Each slot has:
1. "time": string (e.g., "09:00 AM")
2. "title": string (e.g., "Deep Work: Coding Interface")
3. "type": "focus" | "break" | "admin"

Lower energy means shorter focus blocks and more frequent breaks.`;
}

export function extractJSON(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

/* ---------------- Direct provider call (personal key) ---------------- */

async function directChat({ provider, apiKey, system, prompt, json = false }) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown AI provider: ${provider}`);

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

/* ---------------- Public API ---------------- */

// Returns an array of {time, title, type} slots.
export async function generateScheduleWithAI({ provider, apiKey, energy, goals, tasks }) {
  const prompt = schedulePrompt({ energy, goals, tasks });

  if (!hasUsableKey(provider, apiKey)) {
    const text = await hostedChat({
      prompt: `${prompt}\n\nRespond ONLY with a JSON object of the form {"schedule": [...]} — no markdown, no backticks.`,
      json: true,
    });
    return extractJSON(text).schedule;
  }

  const content = await directChat({
    provider,
    apiKey,
    prompt: `${prompt}\n\nRespond ONLY with a JSON object of the form {"schedule": [...]} — no markdown, no backticks.`,
    json: true,
  });
  return extractJSON(content).schedule;
}

// Simple one-shot text chat, used by the BTW side-chat.
export async function chatWithAI({ provider, apiKey, system, prompt }) {
  if (!hasUsableKey(provider, apiKey)) {
    return hostedChat({ system, prompt });
  }

  return directChat({ provider, apiKey, system, prompt });
}
