# Test Plan — Read & Learn (Kids English & Hindi App)

Scope: manual functional test plan for the current build (PWA, no build step, no automated tests today).
App areas covered: Home/Subjects, Scan & Upload (camera + file + live stream), OCR (Gemini AI + offline Tesseract fallback), Reader (bilingual, word-tap TTS, sentence playback), AI Settings, Offline/PWA behavior, navigation & hardware back button.

Use this as the pre-release regression checklist whenever `sw.js`'s `CACHE_NAME` version is bumped, and after any change touching `src/`.

---

## 1. Test environments

| Environment | Why it matters |
|---|---|
| Android Chrome (installed as PWA, "Add to Home Screen") | Primary target — hardware back button, camera, offline install all behave differently than desktop. |
| Android Chrome (tab, not installed) | Confirms install banner / manifest still work and app degrades sensibly without being "installed". |
| Desktop Chrome/Edge | Fastest iteration loop for most functional checks; DevTools for SW/IndexedDB inspection. |
| Airplane mode / DevTools "Offline" throttling | Required for every offline-caching test (see §7). |

Test on at least one **low-end Android device or throttled CPU** — Tesseract OCR and Web Speech synthesis are both CPU-heavy and this is a kids' app likely used on hand-me-down phones.

---

## 2. Subjects & Chapters (Home)

| # | Steps | Expected |
|---|---|---|
| 2.1 | Fresh install, open app | 4 default subjects seeded (English Marigold, Hindi Rimjhim, Joyful Mathematics, Our Environment), "no chapters yet" message shown |
| 2.2 | Tap "+ Add Subject", enter name + pick icon/theme, Save | New subject card appears immediately in grid without reload |
| 2.3 | Add Subject with empty name, tap Save | Blocked with `alert()` — "Please enter a subject name." *(note: uses blocking alert, not toast — see improvement doc)* |
| 2.4 | Tap a subject card | Navigates to subject detail, shows only that subject's chapters |
| 2.5 | Tap a recent chapter card on Home | Opens directly into Reader at page 1 |
| 2.6 | Kill and reopen app (or refresh) | Subjects/chapters persist (IndexedDB) |
| 2.7 | Create subject, then immediately background/close the app before any other action | Subject still present on relaunch — confirms `saveSubject` write completed before navigation |

**Known gap:** there is currently no way to delete a subject, chapter, or page from the UI. Confirm this is expected for this release, not a missed test case.

---

## 3. Scan & Upload

### 3.1 Mode switching
| # | Steps | Expected |
|---|---|---|
| 3.1.1 | Open Scan view, toggle "Full Chapter" ↔ "1 Page Temporary Scan" | Field visibility, dropzone copy, and pill selection state all update instantly |
| 3.1.2 | Select 3 photos in Full Chapter mode, then switch to Temp Page mode | Only the **first** selected image remains; grid re-renders to show 1 thumbnail |

### 3.2 File upload path
| # | Steps | Expected |
|---|---|---|
| 3.2.1 | Tap dropzone / "Choose Photos", pick multiple images | Thumbnails render for each; "Start Scanning (N Pages)" button enables with correct count |
| 3.2.2 | Remove a thumbnail via ✕ | Thumbnail removed, count/button label updates |
| 3.2.3 | Add images, remove all of them one by one | Button reverts to disabled "🔍 Start Scanning" with 0 count |
| 3.2.4 | Select a non-image file (if file picker allows) | Confirm app doesn't crash; OCR should fail gracefully with an error, not a silent hang |

### 3.3 Camera capture (direct snap)
| # | Steps | Expected |
|---|---|---|
| 3.3.1 | Tap camera snap button, grant permission, take photo | Captured photo appears as a preview thumbnail |
| 3.3.2 | Deny camera permission | `alert()` shown with the error message, app doesn't hang |

### 3.4 Live camera stream modal
| # | Steps | Expected |
|---|---|---|
| 3.4.1 | Open Live Scanner, confirm video feed renders | Stream visible in modal |
| 3.4.2 | Tap snap button in stream modal | Frame captured as a `File`, modal closes, thumbnail added |
| 3.4.3 | Tap ✕ close button in stream modal | Camera stream stops (check OS camera indicator turns off), modal closes |
| 3.4.4 | Open Live Scanner, then press **Android hardware back button** (not the ✕) | Modal closes and camera stream stops — same as tapping ✕ (tests the `popstate` history intercept) |
| 3.4.5 | Open Live Scanner, background the whole app (home button), return | Verify stream isn't left dangling / camera isn't still active in background |
| 3.4.6 | Rapidly tap the stream-modal close button twice | No duplicate `history.back()` calls / no navigation getting stuck one level off (guards against double-invoking the pop listener) |

### 3.5 Batch OCR run
| # | Steps | Expected |
|---|---|---|
| 3.5.1 | Full Chapter mode, 3–5 pages, no Gemini key configured, tap Start Scanning | Progress bar advances per page with "Local OCR" status text; each page tagged "⚡ Local Offline OCR" in the Reader afterward |
| 3.5.2 | Same, with a valid Gemini API key configured | Status shows "Scanning with AI Vision Studio"; pages tagged "✨ AI Vision (model-name)" |
| 3.5.3 | Valid-looking but wrong/revoked Gemini key configured | Falls back to Local OCR per page (confirm in console logs) rather than failing the whole batch |
| 3.5.4 | Temp Page mode, 1 image, Start Scanning | Opens Reader directly with `isTemporary` banner shown, **nothing written to IndexedDB** (verify via DevTools → Application → IndexedDB) |
| 3.5.5 | Full Chapter mode, Start Scanning, leave Chapter Title blank | Falls back to OCR-detected title, or "New Chapter" if that's also empty |
| 3.5.6 | Cancel/navigate away mid-OCR-batch (if possible) | No JS errors in console; no orphaned progress bar left visible on return |
| 3.5.7 | Scan a blank/blurry page | Local OCR path returns "No clear text recognized..." placeholder rather than crashing |
| 3.5.8 | Scan 10+ pages in one batch | Confirm no UI freeze (sequential `await` per image is expected — verify it's tolerable, not that it's parallel) |

---

## 4. Reader — bilingual text, TTS, word tap

| # | Steps | Expected |
|---|---|---|
| 4.1 | Open a scanned chapter | English shown by default, line structure from the original image preserved (each image line = its own line in the reader) |
| 4.2 | Tap "हिं" (Hindi) tab | Text switches to Hindi translation; any in-progress audio stops |
| 4.3 | Tap a single word | That word highlights and is spoken alone, at a slower rate (0.75x), in the correct language voice |
| 4.4 | Tap a sentence (not a specific word) | Playback starts from that sentence, main play button reflects "playing" state |
| 4.5 | Tap ▶ Play | Sentences highlight sequentially in sync with speech, auto-scrolls into view |
| 4.6 | Tap ⏸ mid-playback | Pauses; tapping ▶ again resumes from the same sentence (not from the start) |
| 4.7 | Let playback run to the end of the page | Play button reverts to ▶, highlight clears |
| 4.8 | Adjust speed with +/− while paused, then resume | New rate applies to playback |
| 4.9 | Adjust speed with +/− **during active playback** | Confirm the current sentence restarts cleanly at the new rate — no stuck audio or double-speech overlap (rapid clicking is a known risk area) |
| 4.10 | Tap "Edit Text", change the English text, Save | Hindi retranslates automatically, Reader re-renders, and (for a saved, non-temporary chapter) the change persists after reopening the chapter |
| 4.11 | Edit text on a **temporary** (unsaved) page | Confirm behavior is sane — no `learningDB.savePage` call should occur since `page.id` won't exist yet (check no console error) |
| 4.12 | Numbers 0–20 in English text (e.g., "I have 3 apples") | Spoken in English ("three"), not Hindi, per the fix noted in `todo.txt` |
| 4.13 | Multi-page chapter, navigate between pages (if UI exposes this) | Page indicator updates ("Page X of N"), correct page content loads |
| 4.14 | View a temporary scan's header banner | "Save to Chapter" affordance visible and functional, saving moves it into a real subject/chapter |

---

## 5. AI Settings (Gemini API key)

| # | Steps | Expected |
|---|---|---|
| 5.1 | Open AI Settings with no key set | Status shows "Not Configured (Using Local OCR)", grey dot |
| 5.2 | Enter a valid key, Save | Status flips to "Active & Connected", green dot; key persisted (`localStorage`) |
| 5.3 | Reopen AI Settings after saving | Previously saved key pre-fills the input |
| 5.4 | Tap "Test Connection" with a valid key | "✅ Connection Successful!" and identifies a working model |
| 5.5 | Tap "Test Connection" with an invalid/garbage key | "❌ Connection Failed: <message>" shown, doesn't crash the modal |
| 5.6 | Tap "Test Connection" with the field empty | Inline warning shown, no network call made |
| 5.7 | Tap "Clear Key" | Reverts to "Not Configured", input cleared, `localStorage` key removed |
| 5.8 | Save an empty key via the Save button (not Clear) | Blocked with `alert()` — "Please enter a valid Gemini API Key." |
| 5.9 | Inspect Network tab while testing/scanning | **Security check**: confirm whether the API key appears in the request URL (`?key=...`) — flag if still present per the improvement doc §3 |

---

## 6. Navigation & hardware back button

| # | Steps | Expected |
|---|---|---|
| 6.1 | Home → Subject Detail → Scan → back arrow (in-app) three times | Returns through the same path back to Home, breadcrumb text correct at each step |
| 6.2 | Same path, using **Android hardware back button** instead of the in-app arrow | Should behave consistently — verify this doesn't exit the app prematurely |
| 6.3 | Open any modal (Add Subject, AI Settings, Edit Text, Save Temp), press hardware back | Modal closes instead of navigating the underlying view or exiting the app |
| 6.4 | Open two modals in sequence without closing the first (if reachable) | No broken/stacked history state — closing should behave predictably, not skip a back-stack level |
| 6.5 | From Home (top of stack), press hardware back | Exits app (expected — no further back-stack) |
| 6.6 | Deep link/reload while a modal is open (if applicable) | No leftover `active` class or orphaned popstate listeners after reload |

---

## 7. Offline / PWA install

**This section currently has a known blocker — see improvement doc's Critical #1.** `sw.js` references `src/styles/views.css`, which doesn't exist post-refactor, so `cache.addAll()` likely fails and offline caching is broken. Test 7.1 is expected to **fail** until that's fixed; re-run this whole section after the fix lands.

| # | Steps | Expected |
|---|---|---|
| 7.1 | Fresh install, open DevTools → Application → Service Workers | Worker registers and reaches "activated" state with no errors in the console |
| 7.2 | DevTools → Application → Cache Storage | `kids-learning-vX.Y.Z` cache exists and contains all files listed in `ASSETS_TO_CACHE` (cross-check the list against actual `src/` contents) |
| 7.3 | Go fully offline (airplane mode), relaunch app | App shell loads, previously scanned chapters are readable, TTS still works (Web Speech is local) |
| 7.4 | While offline, attempt a Gemini AI scan | Fails gracefully and falls back to Local OCR (or a clear error) — not a hang or a confusing HTML-as-JSON parse error |
| 7.5 | Bump `CACHE_NAME` in `sw.js` (simulating a release), reload | Old cache is deleted (`activate` handler), new cache populated, app updates without a stale UI |
| 7.6 | Install as PWA ("Add to Home Screen") on Android, launch from home screen icon | Opens in standalone mode (no browser chrome), matches `display: standalone` in manifest |
| 7.7 | Scan a page while online, then go offline and reopen that chapter | Text/content still available (IndexedDB is local, unaffected by SW cache state) |

---

## 8. Cross-cutting / stress checks

| # | Steps | Expected |
|---|---|---|
| 8.1 | Open the debug log drawer (tap the build tag) after a full session of use | Confirm no unexpected `error`-level entries logged during normal happy-path usage |
| 8.2 | Trigger multiple toasts quickly (e.g., rapid speed changes) | Messages don't get cut off early or overlap confusingly (known minor risk — timer stacking) |
| 8.3 | Scan 15–20 pages across a session without reloading the app | Watch memory via DevTools (Performance/Memory tab) for a steady climb from un-revoked `URL.createObjectURL` thumbnails |
| 8.4 | Rotate device orientation mid-scan or mid-camera-stream | No layout break, camera stream survives or restarts cleanly |
| 8.5 | Very long textbook page (dense paragraph) | Reader renders without freezing; TTS sentence-splitting handles it without runaway loops |
| 8.6 | Hindi text with mixed English words/numbers | TTS and word-tap pronounce each token in the appropriate language |

---

## 9. Suggested automated test coverage (future work)

No test runner exists yet. These modules are pure functions with no DOM dependency and are the highest-value first targets if/when `vitest` is introduced (see improvement doc §10):

- `src/services/ocr/text-cleaner.js` — OCR garbage-token stripping
- `src/services/tts/speech-formatter.js` — sentence splitting, number-to-word formatting
- `src/services/gemini/response-parser.js` — JSON extraction from Gemini's raw text response (including malformed/partial responses)
- `src/services/ocr/image-preprocessor.js` — canvas preprocessing logic (the parts that don't touch `document`)

Everything else (views, controllers, DB) is DOM/IndexedDB-coupled and is better covered by this manual plan until there's appetite for `jsdom`-based integration tests.

---

## Pre-release checklist (condensed)

- [ ] §7 offline/PWA suite passes (blocked on SW asset-list fix)
- [ ] §3.4 camera modal + hardware back button
- [ ] §6.2/6.3 hardware back button across views and modals
- [ ] §4.9 speed-change-during-playback doesn't glitch audio
- [ ] §5.9 API key not exposed in network logs
- [ ] §8.3 no object-URL memory growth over a long scan session
