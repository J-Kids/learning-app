# Testing Strategy: Manual vs Automation

**App**: Kids Learning PWA (vanilla JS, ES modules, no build step)  
**Date**: 2026-08-12

---

## Recommendation: Hybrid Approach

> **Manual testing for browser-API-heavy flows. Light automation for pure logic modules.**

Neither pure manual nor pure automation is the right answer for this app. Here's why, and exactly what goes where.

---

## Why Pure Automation Won't Work Here

This app is deeply tied to browser APIs that are difficult or impossible to automate reliably:

| Browser API | Used In | Automation Problem |
|---|---|---|
| `getUserMedia` (Camera) | `scan-view.js` | Requires real hardware or complex browser flags |
| `Web Speech API` (TTS) | `tts-engine.js` | Not available in headless browsers (Playwright/Puppeteer) |
| `IndexedDB` | `learning-db.js` | Works in automation but needs careful teardown |
| `Service Worker` | `sw.js` | Tricky to test lifecycle events in automation |
| `Tesseract WASM` | `ocr-engine.js` | Large WASM binary; slow to load in test environment |
| External APIs | `gemini-engine.js`, `translator.js` | Need API keys + mocking to avoid cost/flakiness |

Running a full Playwright/Puppeteer suite would require mocking 6+ browser APIs, dealing with async WASM loading, and managing real API keys in CI — a large investment for a small team / solo project.

---

## Why Pure Manual Won't Scale

Manual-only testing breaks down as the codebase grows:

- **Regression risk**: Every new feature requires re-testing all prior flows manually
- **Logic bugs slip through**: Edge cases in `response-parser.js`, `text-cleaner.js`, `speech-formatter.js` are hard to catch visually
- **No repeatability**: Can't run the same exact test twice with the same inputs
- **Slow feedback loop**: Finding out a JSON parser broke requires a full scan cycle

---

## The Hybrid Plan

### Zone A — Automate (Pure Logic, No Browser APIs)

These modules are plain functions with no DOM/browser dependency. They are perfect candidates for a lightweight test runner like **Vitest** (runs in Node, no browser needed, works with ES modules).

| Module | File | What to test |
|---|---|---|
| Response Parser | `response-parser.js` | Valid JSON, JSON with literal newlines, raw text fallback, missing fields |
| Text Cleaner | `text-cleaner.js` | Badge garbage stripping, number/word preservation |
| Speech Formatter | `speech-formatter.js` | Sentence splitting, edge cases (empty string, numbers only) |
| Model Discovery filter | `model-discovery.js` | Filter logic (flash-only, excludes tts/audio/bison) |
| Translator cache | `translator.js` | Cache hit/miss, cache eviction at 100 entries |

**Estimated effort**: ~1 day to set up Vitest + write ~20–30 unit tests.  
**Value**: Catches regressions on every git push. No API calls needed.

---

### Zone B — Manual (Browser API Flows)

These flows must be tested manually in a real browser because they depend on hardware or browser-native APIs that can't be cleanly mocked without significant effort.

| Flow | Why Manual |
|---|---|
| Camera capture (live + snap) | Needs real camera hardware |
| TTS playback & sentence highlighting | Web Speech API absent in headless Chrome |
| Gemini AI scan (full cycle) | Needs real API key + network |
| Local Tesseract OCR | WASM too slow/large for unit test environment |
| PWA install & offline mode | Service Worker lifecycle requires real browser |
| IndexedDB persistence across reloads | Easier to verify by eye in DevTools |

**Use the [testing-plan.md](./testing-plan.md)** checklists for all Zone B flows. Run these:
- Before every release / build version bump
- When a PR touches `scan-view.js`, `ocr-engine.js`, `tts-engine.js`, or `sw.js`

---

### Zone C — Consider Later (E2E Automation)

If the team grows or release frequency increases, add **Playwright** E2E tests for the critical happy path:

1. Load app → verify 4 subjects appear
2. Upload a test image → verify scan completes
3. Verify reader opens with text content

This is **not a priority now** but good to keep in mind. Playwright can mock `getUserMedia` and intercept network calls to fake Gemini responses, making the happy path automatable without real API keys.

---

## Setup Recommendation (Zone A)

Add Vitest with minimal configuration — no bundler change needed since Vitest handles ES modules natively:

```bash
npm init -y
npm install --save-dev vitest
```

`vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',  // pure logic tests, no DOM needed
    include: ['tests/**/*.test.js']
  }
});
```

`package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Test files live in a new `tests/` folder at the project root:
```
tests/
  response-parser.test.js
  text-cleaner.test.js
  speech-formatter.test.js
  model-discovery.test.js
  translator-cache.test.js
```

---

## Decision Summary

| | Manual | Automation (Vitest) | E2E (Playwright) |
|---|---|---|---|
| Camera / TTS / WASM | ✅ Yes | ❌ Not practical | ⚠️ Possible with mocks |
| JSON parsing / text logic | ❌ Error-prone | ✅ Best fit | — |
| API key flows | ✅ Yes | ❌ Needs real key | ⚠️ Can be faked |
| PWA / offline / SW | ✅ Yes | ❌ Not practical | ⚠️ Complex |
| Setup cost | None | Low (1 day) | High (3–5 days) |
| Ongoing maintenance | High | Low | Medium |

**Start with**: Manual (Zone B) + Vitest unit tests (Zone A).  
**Add later**: Playwright for the critical happy path (Zone C), if release pace demands it.
