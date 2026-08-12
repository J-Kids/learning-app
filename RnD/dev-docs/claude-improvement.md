# Code Improvement Suggestions

Reviewed: `src/`, `sw.js`, `manifest.json`, `dev-docs/` on branch `02/feature/code-modularization` (2026-08-11).
Scope: vanilla-JS ES-modules PWA, no build step, no tests, no lint config.

---

## Critical

### 1. Service worker install is broken — offline caching is silently dead
`sw.js` lists `./src/styles/views.css` in `ASSETS_TO_CACHE`, but that file doesn't exist — it was split into `home-view.css` and `scan-view.css` during the modularization refactor (commit `70f9797`) and `sw.js` was never updated. `cache.addAll()` is all-or-nothing: one 404 fails the whole `install` event, so the app has effectively had **no offline install/update caching** since that commit despite `todo.txt` claiming "100% Offline" support.

**Fix**
- Replace the stale `views.css` entry with `home-view.css` + `scan-view.css`.
- Swap `cache.addAll()` for a loop of individual `cache.add()` calls wrapped in `Promise.allSettled`, so one missing/renamed asset in the future degrades gracefully instead of killing the whole cache.
- Bump `CACHE_NAME` when you fix this so existing installs actually pick up the corrected asset list.

**Effort:** 15 min.

### 2. Service worker caches/intercepts the Gemini API calls too
The `fetch` handler in `sw.js` has no origin/method filtering — it intercepts the cross-origin `POST` requests to `generativelanguage.googleapis.com` made by `gemini-engine.js`. Two problems:
- `cache.put()` on a POST request throws ("method unsupported"), producing an unhandled rejection on every AI scan.
- On network failure, the handler falls back to `caches.match(event.request) || caches.match('./index.html')` — a failed Gemini call can resolve with the **app's HTML shell** as the "response," which then fails obscurely inside `response.json()` in `gemini-engine.js` instead of giving a clear network-error message.

**Fix:** Skip the SW's cache-and-fallback logic for cross-origin or non-GET requests — let those pass straight through to `fetch` with no interception.

**Effort:** 15 min.

---

## High Priority

### 3. Gemini API key travels as a URL query parameter
`gemini-engine.js` builds every request as `${baseUrl}/${model}:generateContent?key=${apiKey}`. The key ends up in browser history, devtools network logs, and (until #2 is fixed) potentially as a Cache Storage key. The Gemini API accepts the key via the `x-goog-api-key` header instead.

**Fix:** Move the key to a header in both `scanTextbookImage` and `testConnection`; drop it from the URL.

**Effort:** 20 min.

### 4. No delete operations in the database layer
`learning-db.js` supports create/read for subjects, chapters, and pages, but there is no `deleteSubject` / `deleteChapter` / `deletePage`. Once a user scans a chapter, it's permanent — data only grows. This is also a real feature gap, not just a hygiene issue.

**Fix:** Add delete methods (with cascade: deleting a subject removes its chapters and pages; deleting a chapter removes its pages) plus corresponding UI affordances in `home-view.js`/`reader-view.js`.

**Effort:** ~1–2 hrs including UI hookup.

### 5. Massive boilerplate duplication in `learning-db.js`
All 9 CRUD methods repeat the identical `new Promise((resolve, reject) => { const tx = ...; request.onsuccess = ...; request.onerror = ... })` pattern. This is copy-paste risk (a typo in one `onerror` won't surface until it's hit) and makes adding #4 tedious.

**Fix:** Extract a private helper:
```js
_run(storeName, mode, executor) {
  return new Promise((resolve, reject) => {
    const tx = this.db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = executor(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```
Rewrite each method as a one-liner calling `_run`. Cuts the file roughly in half.

**Effort:** 30–45 min.

### 6. Gemini's 400 responses are mishandled in the model fallback loop
In `scanTextbookImage`, both HTTP 404 and 400 are treated as "this model isn't available, try the next one." But 400 usually means a malformed request (bad image payload, oversized body) — a cause unrelated to model choice. Treating it as "try next model" silently retries the *same broken payload* against every discovered model, burning quota/time and hiding the real error from the user.

**Fix:** Only continue the fallback loop on 404 (or a 400 whose error body explicitly mentions the model name). Surface other 400s immediately with the API's actual message.

**Effort:** 20 min.

---

## Medium Priority

### 7. Object URL leak in scan previews
`scan-view.js#renderImagePreviews` calls `URL.createObjectURL(file)` for every thumbnail but never calls `URL.revokeObjectURL()` when a thumbnail is removed or the batch is cleared after a successful scan. Over a long session with many scans, this leaks memory.

**Fix:** Track created URLs and revoke them in the remove-thumbnail handler and after `handleStartBatchOcr` clears `uploadedImages`.

**Effort:** 15 min.

### 8. Inconsistent error UX: `alert()` vs. toast
`scan-view.js` uses native `alert()` for camera and OCR failures (`openCameraView`, `snapFrameFromCamera`, `handleStartBatchOcr`) while the rest of the app has a toast system passed in as `showToastCallback`. Blocking browser `alert()` dialogs are jarring in a kids' app and inconsistent with the rest of the UI.

**Fix:** Route these through `showToastCallback` (or a small non-blocking error banner for longer messages) instead of `alert()`.

**Effort:** 20 min.

### 9. Dead fallback code in camera modal wiring
Six+ call sites in `scan-view.js` do `this.dom.videoCameraFeed || document.getElementById('videoCameraFeed')` (and similarly for `modalCameraStream`, `btnSnapCameraStream`, `btnCloseCameraModal`). All four elements are already returned by `getDomElements()` in `dom.js`, so the `document.getElementById` fallback is dead code that just adds noise.

**Fix:** Drop the `|| document.getElementById(...)` fallbacks, use `this.dom.x` directly.

**Effort:** 10 min.

### 10. No tests, no lint config, no `package.json`
The codebase is already 25+ ES modules with real logic (text cleaning, sentence splitting, response parsing, image preprocessing) that has zero DOM dependency and is trivially unit-testable, but there is currently no way to run a test or a linter.

**Fix (incremental, doesn't require a bundler):**
- Add a minimal `package.json` + `vitest` (jsdom not even required for the pure modules: `text-cleaner.js`, `speech-formatter.js`, `response-parser.js`, `image-preprocessor.js`'s pure parts).
- Add ESLint flat config with `eslint:recommended` to catch the unhandled-rejection/undefined-var class of bug before it ships (would have caught #2's shape, if not the SW-specific API).

**Effort:** ~1 hr to scaffold, tests grow incrementally after.

---

## Low Priority / Polish

- **DB schema versioning**: `dbVersion` is hardcoded to `1` with no migration path. Fine today, but worth deciding the upgrade pattern (`onupgradeneeded` branching by `event.oldVersion`) *before* the schema needs to change on real user data, not after.
- **Toast timer stacking**: `app.js#showToast` sets a fresh `setTimeout` per call without clearing the previous one; rapid consecutive toasts can have a newer message removed early by an older timer. Track the timeout id and `clearTimeout` before re-setting.
- **Global namespace pollution**: every singleton does `window.x = x` (`learningDB`, `geminiEngine`, `ocrEngine`, `ttsPlayer`, `app`). Presumably for console debugging — fine for a personal project, but worth gating behind a debug flag if this ever gets shared/deployed more broadly.
- **Speed button debounce**: rapid clicks on `btnSpeedDec`/`btnSpeedInc` each cancel and restart the current TTS utterance from the sentence boundary; a small debounce would smooth this out.

---

## Suggested order of attack

1. Fix #1 and #2 (service worker) — currently the app silently has no working offline mode, which contradicts the "100% Offline" claim in `todo.txt`.
2. Fix #3 (API key in URL) — quick, meaningful security hygiene improvement.
3. Do #5 (DB helper) *before* #4 (delete methods) — refactor first so the new delete methods don't add to the duplication.
4. #6 through #9 as a single cleanup pass — all small, same-day.
5. #10 (tests/lint) whenever there's appetite to invest in regression safety net; not blocking anything else above.
