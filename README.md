# Zenflow OS

When you sit down to work, the hardest part isn't the work — it's deciding what deserves your next hour and staying on it. **Zenflow OS is an AI focus coach living inside its own desktop OS**: it reads your energy level and your open tasks, plans your next focus blocks, starts the timer, sets the soundscape, and proves at the end of the day that the hours went somewhere.

Built with OpenAI Codex, React 19, and Vite: five connected focus tools inside a macOS-inspired shell with a Stage Manager view, a widget grid, a dock, and a command palette. Works instantly — no signup, no API key, everything persists in your browser. (Pitch strategy: [PITCH.md](PITCH.md).)

## Apps

| App | What it does |
| --- | --- |
| 🧠 **AI Focus Coach** | Generates an energy-aware focus schedule. Works fully offline with a local planner, or uses OpenAI GPT with your own API key. Plans can be pushed straight to the task board. |
| ⏱ **Wave Focus Timer** | Real Pomodoro engine: focus → short break → focus, with a long break every 4th round, drift-free timestamp countdown, browser notifications, live countdown in the tab title, and a liquid-wave canvas. Keeps running while you use other apps. |
| 🎛 **Procedural Synthesizer** | Six real-time Web Audio soundscapes (rain, binaural drone, cosmic pad, ambient chords, ocean, wind) with per-track volume, master volume, live visualizers, and savable mix presets. Audio keeps playing across app switches. |
| ✅ **Holographic Task Board** | Tasks with priorities, due dates, inline editing, drag-to-reorder, filters, clear-completed — and a "focus" pin that counts completed Pomodoros per task. |
| 📊 **Focus Statistics** | Streaks, focus minutes, sessions, and cleared tasks with a 7-day chart (chart/table toggle). |

## Shell features

- **Stage Manager** (focused window + thumbnails) and **Widget Grid** layouts
- **⌘K command palette** — open apps, control the timer, toggle sounds
- **Keyboard shortcuts**: `1–5` switch apps, `G` toggle layout, `Space` start/pause timer, `⌘K` palette
- **Draggable window** via the title bar; working traffic lights (close → dashboard, green → full screen)
- **Settings drawer**: accent themes, wallpapers, reduce-motion, notifications, auto-cycle, AI provider + keys
- **Persistence**: tasks, timer state, sound mix, layout, and settings survive reloads (localStorage)
- Responsive down to phone widths

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run lint     # oxlint
npm test         # vitest — unit tests for the stats, storage, and AI layers + the /api/ai proxy
```

## Hosted AI (zero-setup for visitors)

When deployed (e.g. Vercel) with a server-side key, the AI Focus Coach works out of the box — no visitor key needed. The serverless proxy at `api/ai.js` holds the key:

1. Deploy the repo to Vercel (the `api/` directory becomes a serverless function automatically).
2. In the Vercel project settings, add an `OPENAI_API_KEY` environment variable (uses `gpt-4o-mini`).
3. Done — the client probes `/api/ai` at startup and routes AI calls through it whenever the visitor hasn't set a personal key.

## AI configuration (optional)

Open the settings drawer (gear icon, top right) → pick a provider → paste a key:

- **OpenAI** — key starting `sk-` (uses `gpt-4o-mini`)

Keys are stored in your browser's localStorage and sent only to the selected provider. Without a key, the coach falls back to a local planner.

## Hackathon submission checklist

Before submitting, make the repository public, deploy a publicly accessible build, and verify the AI Focus Coach works without a visitor API key. Include the deployment URL, repository URL, and a three-minute public demo video. A five-to-seven-slide deck is recommended.

The ready-to-record demo script and final submission checklist are in [SUBMISSION.md](SUBMISSION.md).

## Architecture notes

- `src/lib/audioEngine.js` — module-level Web Audio engine (one shared `AudioContext`; sounds survive component unmounts)
- `src/context/TimerContext.jsx` — app-wide Pomodoro state machine, timestamp-based so background tabs stay accurate
- `src/lib/stats.js` — daily focus/session/task aggregates behind the Stats app
- `src/lib/ai.js` — OpenAI integration and hosted proxy client
- `src/components/ui/` — small glassmorphism UI primitives (Card, Button, Slider, Switch, Toast…)
