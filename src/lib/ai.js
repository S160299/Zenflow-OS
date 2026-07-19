// OpenAI helpers. Keys are supplied by the user at runtime and only sent to
// OpenAI when the hosted server proxy is not configured.

export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI (GPT)', keyPlaceholder: 'sk-...' },
];

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
  return provider === 'openai' && Boolean(key) && key.startsWith('sk-');
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

/* ---------------- OpenAI ---------------- */

async function openaiChat({ apiKey, system, prompt, json = false }) {
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

  const content = await openaiChat({
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

  return openaiChat({ apiKey, system, prompt });
}
