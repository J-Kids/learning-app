# Testing Plan — Kids Learning App

**App**: Kids Learning PWA (vanilla JS, ES modules, no build step, no test framework)  
**Branch**: `03/feature/OCR-improvement`  
**Date**: 2026-08-12  
**Scope**: Manual + browser-based testing. No automated test runner currently exists.

---

## App Architecture Overview (for testers)

| Layer | Key Files | What it does |
|---|---|---|
| Storage | `learning-db.js` | IndexedDB — subjects, chapters, pages |
| Gemini AI | `gemini-engine.js`, `model-discovery.js`, `response-parser.js`, `image-utils.js` | Vision OCR via Google AI Studio |
| Local OCR | `ocr-engine.js`, `image-preprocessor.js`, `text-cleaner.js` | Offline Tesseract OCR fallback |
| Translation | `translator.js` | MyMemory API → Hindi |
| TTS | `tts-engine.js`, `voice-manager.js`, `speech-formatter.js` | Web Speech API playback |
| Views | `scan-view.js`, `reader-view.js`, `home-view.js` | UI controllers |
| PWA | `sw.js`, `manifest.json` | Offline caching & install |

---

## Test Areas

### T1 — App Startup & Home Screen

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T1.1 | Open `index.html` fresh (no prior data) | App loads, shows 4 default subjects (English, Hindi, Math, EVS) | |
| T1.2 | Open DevTools → Application → IndexedDB → `KidsLearningDB` | `subjects`, `chapters`, `pages` object stores exist | |
| T1.3 | Check "Recent Chapters" section on home | Shows empty state / placeholder if no chapters scanned yet | |
| T1.4 | Tap a subject card | Navigates to subject detail view, shows chapter list | |
| T1.5 | Press browser Back button | Returns to Home screen | |

---

### T2 — AI Settings (Gemini API Key)

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T2.1 | Tap Settings icon with no API key | AI Status badge shows "Not Configured (Using Local OCR)" | |
| T2.2 | Enter a valid Gemini API key → Save | Status badge turns green, "Active & Connected" | |
| T2.3 | Tap "Test Connection" with a valid key | Shows ✅ "Connection Successful!" | |
| T2.4 | Tap "Test Connection" with an invalid/garbage key | Shows ❌ "Connection Failed" with error message | |
| T2.5 | Tap "Clear Key" | Key removed, status reverts to "Not Configured" | |
| T2.6 | Reload page after saving key | Key is still present (persisted via `localStorage`) | |
| T2.7 | Enter a key shorter than 10 characters → Save → check `isConfigured()` | `geminiEngine.isConfigured()` returns `false` in console | |

---

### T3 — Scan View: Mode Switching

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T3.1 | Tap "Scan Book" from header | Opens Scan view, "Full Chapter" mode is default | |
| T3.2 | Switch to "1 Page Temp" mode | Subject/chapter fields hide, temp notice appears | |
| T3.3 | Switch back to "Full Chapter" | Fields reappear | |
| T3.4 | In Temp mode, add 2 images → only 1 should be kept | Second image replaces first, only 1 preview shown | |
| T3.5 | In Full Chapter mode, add 3 images | All 3 previews visible; scan button shows "(3 Pages)" | |
| T3.6 | Remove an image by tapping ✕ on its preview | Image removed, scan button count updates | |

---

### T4 — Scan View: File Upload & Camera

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T4.1 | Tap dropzone (not a button) → file picker opens | System file picker appears | |
| T4.2 | Tap "Choose Photos" button | File picker appears (multi-select) | |
| T4.3 | Tap "Snap Photo" (camera file input) | Camera/photo picker appears | |
| T4.4 | Tap "Live Scanner" | Camera modal opens, shows live video feed | |
| T4.5 | In camera modal, tap Snap (📸) | Frame captured, added to previews, camera modal closes | |
| T4.6 | In camera modal, tap ✕ | Camera stream stops, modal closes | |
| T4.7 | On mobile: tap back button while camera is open | Camera closes (does NOT exit the app) | |
| T4.8 | Drag & drop an image onto the dropzone | Image added to previews | |

---

### T5 — OCR Scanning: Gemini AI Path

> Prerequisite: Valid Gemini API key is set

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T5.1 | Upload a clear textbook page → Start Scanning | Progress bar appears, shows "Scanning with AI Vision Studio..." | |
| T5.2 | Scan completes successfully | Reader view opens with English text and Hindi translation | |
| T5.3 | Check engine badge in reader | Shows "✨ AI Vision (gemini-1.5-flash)" or similar model name | |
| T5.4 | In Full Chapter mode, set Subject & Chapter name → scan | Chapter saved to DB; appears in subject's chapter list | |
| T5.5 | Scan with a blurry/dark image | AI returns best-effort text, not a crash | |
| T5.6 | Scan a multi-page set (3 images) | All 3 pages processed; reader shows Page 1 of 3 | |
| T5.7 | Open Network tab → scan again | Model discovery (`v1beta/models`) called once; content call uses discovered model | |
| T5.8 | Revoke API key mid-session → scan | Falls back to Local OCR, no crash | |

---

### T6 — OCR Scanning: Local Tesseract Fallback

> Prerequisite: No Gemini API key set (or cleared)

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T6.1 | Upload a clear textbook page → Start Scanning | Progress shows "Initializing Offline OCR Engine..." then "Extracting Text..." | |
| T6.2 | Scan completes | English text extracted; Hindi translation fetched from MyMemory API | |
| T6.3 | Engine badge in reader | Shows "⚡ Local Offline OCR" | |
| T6.4 | Go offline (DevTools → Network → Offline) → scan again | Local OCR still works (Tesseract WASM loaded from cache) | |
| T6.5 | Scan a very dark/coloured image offline | Preprocessor applies binarization; some text extracted | |

---

### T7 — Retry / Error Scenarios

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T7.1 | Start scan → fail (disconnect network mid-scan with Gemini) | Error toast/alert shown; Scan button re-enabled | |
| T7.2 | Retry scan after error | **Progress bar resets to 0%** before starting (regression check for bug #8) | |
| T7.3 | All Gemini models return 404 | Thrown error says "All Gemini models failed…"; app doesn't freeze | |

---

### T8 — Reader View

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T8.1 | Open a scanned chapter from home | Reader shows page text, page indicator "Page 1 of N" | |
| T8.2 | Tap a word | Word highlighted, spoken aloud (Web Speech API) | |
| T8.3 | Tap a sentence (not a word) | Playback starts from that sentence | |
| T8.4 | Switch to Hindi tab | Hindi text displayed; TTS language switches to Hindi | |
| T8.5 | Switch back to English | English text shown; TTS stops | |
| T8.6 | Tap Edit ✏️ → edit text → Save | Text updated in reader and in DB | |
| T8.7 | Temp scan: "Save to Chapter" banner visible | Banner shown; tapping it opens Save modal | |
| T8.8 | Save temp scan to a subject/chapter | Chapter appears in subject; temp banner disappears | |

---

### T9 — Audio Player

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T9.1 | Tap ▶ Play | Reads page aloud sentence by sentence; sentences highlight | |
| T9.2 | Tap ⏸ Pause | Reading stops; current sentence index preserved | |
| T9.3 | Tap ▶ Play after pause | Resumes from same sentence | |
| T9.4 | Tap ⏹ Stop | Reading stops; highlight cleared; index resets | |
| T9.5 | Tap − Speed | Speed decreases by 0.1; shown in display | |
| T9.6 | Tap + Speed | Speed increases; max 2.0 | |
| T9.7 | Speed goes below 0.1 | − button stops decreasing (min guard) | |
| T9.8 | Tap ▶ while on Hindi tab | Uses Hindi TTS voice | |

---

### T10 — Subject Management

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T10.1 | Tap "+" Add Subject | Modal opens with name, icon, theme fields | |
| T10.2 | Save a new subject | Subject card appears on home screen | |
| T10.3 | Try to save subject with empty name | Alert or validation shown | |
| T10.4 | Reload page | Custom subject still appears (persisted in IndexedDB) | |

---

### T11 — PWA / Offline Behaviour

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T11.1 | Open DevTools → Application → Service Workers | SW registered as `kids-learning-v1.0.30` | |
| T11.2 | Check SW install status | Should show "Activated and running" | |
| T11.3 | DevTools → Application → Cache Storage | `kids-learning-v1.0.30` cache exists with app assets | |
| T11.4 | ⚠️ Check if `src/styles/views.css` is in cache | **Expected to fail** — this file doesn't exist (see known bug below) | |
| T11.5 | Go fully offline → reload app | App loads from cache | |
| T11.6 | Go offline → navigate views | Home, subject, reader work; scan fails gracefully | |
| T11.7 | Gemini API call while offline | Falls back to Local OCR; no "HTML served as JSON" error | |

> **⚠️ Known SW Bug (from Claude code review):** `sw.js` line 22 caches `./src/styles/views.css` which **does not exist**. `cache.addAll()` is all-or-nothing — this may silently break the entire offline install. Verify in T11.2 and T11.3.

---

### T12 — Logger / Debug Drawer

| ID | Test | Expected Result | Pass? |
|----|------|-----------------|-------|
| T12.1 | Tap the build version tag (bottom of app) | Debug log drawer slides up | |
| T12.2 | Perform a scan | Logs appear in drawer with timestamps | |
| T12.3 | Tap "Copy" in drawer | Logs copied to clipboard | |
| T12.4 | Tap "Clear" | Log list empties | |
| T12.5 | Tap outside drawer or ✕ | Drawer closes | |

---

## Known Bugs to Verify (from Code Reviews)

| # | Source | Bug | Test |
|---|--------|-----|------|
| B1 | Claude review | `sw.js` caches non-existent `views.css` — breaks offline install | T11.3, T11.4 |
| B2 | Claude review | SW fetch handler intercepts Gemini POST calls — may serve HTML as API response on failure | T11.7 |
| B3 | Gemini review | Blob URLs never revoked in `image-utils.js` and `scan-view.js` | Check Memory in DevTools after 5 scans |
| B4 | Gemini review | Duplicate camera event listeners (double-fire on snap/close) | T4.5, T4.6 |
| B5 | Gemini review | Progress bar not reset on retry | T7.2 |

---

## How to Run Tests

### Browser Setup
1. Serve the app via a local HTTP server (not `file://`):
   ```
   npx serve . -p 3000
   ```
   or use VS Code Live Server.
2. Open in **Chrome** (best DevTools for PWA + IndexedDB + Speech).
3. For camera tests, use **HTTPS** or `localhost`.

### Useful DevTools Panels
- **Application → IndexedDB** — inspect saved subjects/chapters/pages
- **Application → Service Workers** — check SW registration & cache
- **Application → Cache Storage** — verify cached assets
- **Memory → Heap Snapshot** — check for Blob URL leaks (B3)
- **Network → Offline checkbox** — simulate offline

### Resetting App State
To start fresh between test runs:
1. DevTools → Application → Storage → **Clear Site Data**
2. Or: DevTools → Application → IndexedDB → Right-click `KidsLearningDB` → Delete

---

## Test Devices / Environments

| Priority | Device | Browser | Notes |
|---|---|---|---|
| High | Android phone | Chrome | Primary target; camera + touch |
| High | Windows PC | Chrome | Dev environment |
| Medium | iPhone | Safari | Web Speech API behaviour differs |
| Low | Windows PC | Firefox | No Web Speech API — TTS silent |
