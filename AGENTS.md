# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes (via github.com/multica-ai/andrej-karpathy-skills), merged with project notes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan with a verify step per item.

---

## Project notes — Zenflow OS

- **Commands:** `npm run dev` (Vite), `npm test` (Vitest, jsdom), `npm run lint` (oxlint), `npm run build`. Run tests + lint + build before declaring work done.
- **Architecture:** React 19 SPA. `src/lib/` holds framework-free engines (`audioEngine`, `stats`, `storage`, `ai`, `timerLogic`) — pure logic goes here, with unit tests next to the module. `src/context/TimerContext.jsx` is the Pomodoro state machine (timestamp-based; `remaining` ticks through a separate TimerTickContext so the app tree doesn't re-render per second). `api/ai.js` is a Vercel serverless OpenAI proxy using `OPENAI_API_KEY`.
- **Persistence:** always via `src/lib/storage.js` helpers — never raw `localStorage.getItem`/`JSON.parse`.
- **Cross-app data flow** (schedule→tasks, timer→pomodoro counts) is threaded through App.jsx callbacks; it won't show up in imports.
- **Style:** CSS in `src/index.css` with design tokens in `:root`. No bounce/elastic easings; animate only `transform`/`opacity`; keep reduced-motion and reduced-transparency media queries intact. Press feedback on `:active` stays instant (100ms).
- **Known debt (don't "fix" in passing):** App.jsx is a 630-line god component.
