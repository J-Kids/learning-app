# Settings Side Panel

## Context

Todo item 4 asks to move Settings out of the centered modal dialog into a side panel. In scoping this out, the user expanded it into a real feature: a left slide-in Settings drawer with five sections — **AI Vision** (existing), **Translation & Target Language** (new: Hindi/Kannada/Marathi/Tamil/Telugu/Bengali/Gujarati/Spanish/French instead of hardcoded Hindi-only), **Voice Accents** (new: manual voice picker instead of only auto-detection), **Offline Engine** (new: force local OCR over Gemini AI), and **Debug Logs** (surface the existing log drawer from inside Settings too).

This touches the translation pipeline (both the Gemini AI Vision path and the local-OCR + MyMemory-API path), the TTS voice-matching logic, and the reader's language tabs — not just the settings screen itself.

## Approach

### 1. Panel shell (mechanical, do first — this alone satisfies the literal todo item)

Reuse `openModal`/`closeModal` from `src/views/navigation.js` completely unchanged — they only toggle an `.active` class and manage the hardware-back-button `history.pushState`/`popstate` pair, and don't care about visual style. Give the settings overlay a new look via CSS only:

- `index.html`: rename `#modalAiSettings` → `#modalSettingsPanel`. Replace its `.modal-card` wrapper with `.drawer-panel`, and add a `drawer-left` class to the `.modal-overlay`.
- `src/styles/modals.css` (or a new `src/styles/settings-panel.css`, added to `main.css`'s `@import` list like the other style partials): add `.modal-overlay.drawer-left` (`justify-content: flex-start; padding: 0;`) and `.drawer-panel` (`width: 85%; max-width: 340px; height: 100%; transform: translateX(-100%); transition: transform .3s cubic-bezier(.16,1,.3,1); overflow-y: auto;`), with `.modal-overlay.drawer-left.active .drawer-panel { transform: translateX(0); }`. Match existing kid-friendly styling (`--bg-gradient`, `--radius-md`, `--font-heading`, emoji section headers) — no plain/minimalist settings-panel look.
- `src/app.js`: `btnHeaderAiSettings` click handler stays wired the same way, just renamed conceptually to "open settings panel."

### 2. Controller split (follow the project's file-size-modularization norm)

Split the current single `settings-controller.js` into an orchestrator + focused sub-controllers, mirroring the `src/services/camera/` split done earlier:

- `src/controllers/settings-controller.js` — orchestrator: opens/closes the panel, constructs and wires the four sub-controllers below.
- `src/controllers/settings/ai-vision-settings.js` — move the existing Gemini key logic here as-is (`updateAiStatusBadge`, `handleSaveAiKey`, `handleClearAiKey`, `handleTestAiKey`).
- `src/controllers/settings/language-settings.js` — target-language dropdown, reads/writes via `translationEngine` (see below).
- `src/controllers/settings/voice-settings.js` — voice/accent picker, populates from `speechSynthesis.getVoices()` (handle the async `onvoiceschanged` event — the list is often empty on first read), calls `voiceManager.setSelectedVoiceByName()`.
- Debug Logs and the Offline Engine toggle are small enough to stay in the orchestrator (one button calling `logger.show()`; one checkbox writing a localStorage flag) — no dedicated files needed for those two.

### 3. Translation & Target Language

- `src/services/translator.js`: export `SUPPORTED_LANGUAGES = [{code:'hi', name:'Hindi', nativeLabel:'हिं'}, {code:'kn', name:'Kannada', nativeLabel:'ಕನ್ನಡ'}, {code:'mr', ...}, {code:'ta', ...}, {code:'te', ...}, {code:'bn', ...}, {code:'gu', ...}, {code:'es', name:'Spanish', nativeLabel:'ES'}, {code:'fr', name:'French', nativeLabel:'FR'}]`. Rename `translateToHindi(text)` → `translateText(text, targetLangCode = 'hi')`, changing the MyMemory `langpair` to `en|${targetLangCode}`. Keep the hardcoded fallback dictionary as a Hindi-only fallback (only applies when `targetLangCode === 'hi'`; otherwise fall back to the original English text on API failure). Add `getTargetLanguage()`/`setTargetLanguage(code)` reading/writing `localStorage['target_language']` (default `'hi'`) — same self-owned-persistence pattern `gemini-engine.js` already uses for its API key.
- `src/services/gemini/gemini-engine.js`: `scanTextbookImage(imageSource, targetLangCode = 'hi')` — look up the language's display name from `SUPPORTED_LANGUAGES` and interpolate it into the prompt (replacing the hardcoded "Hindi"), and change the requested JSON field from `"textHi"` to `"textTranslated"` in both the prompt text and the example JSON block.
- `src/services/gemini/response-parser.js`: extract `textTranslated: json.textTranslated || json.translation || json.textHi || json.hindiText || ''` (keep old aliases for robustness), update both the empty-input and JSON-parse-failure fallback returns to use `textTranslated` instead of `textHi`.
- `src/services/ocr/ocr-engine.js`: `processSingleImage(imageSrc, progressCallback, { targetLangCode = 'hi', preferOffline = false } = {})`. If `preferOffline`, skip the Gemini branch entirely. Otherwise pass `targetLangCode` into `geminiEngine.scanTextbookImage()` and read `aiResult.textTranslated`. Local-OCR path calls `translationEngine.translateText(text, targetLangCode)`. **Storage-facing field-name decision:** keep returning the object's field as `textHi` (not `textTranslated`) even though it may now hold Kannada/Tamil/etc. text, and add a new `translatedLangCode: targetLangCode` field alongside it. This is deliberate: it avoids renaming the IndexedDB field (`learning-db.js` has no schema-migration system — `dbVersion` is hardcoded at 1) while still recording which language is actually in that field. New AI/translation-boundary code (gemini-engine, response-parser) uses the honestly-named `textTranslated`; the storage boundary (`ocr-engine.js`'s return value, `learning-db.js`'s `pages` store) keeps the legacy `textHi` name for backward compatibility with already-scanned chapters. Old rows without `translatedLangCode` are treated as `'hi'` wherever read.
- `src/views/scan-view.js`: `handleStartBatchOcr()` reads `translationEngine.getTargetLanguage()` and the offline-preference flag (see §5) and passes them into `ocrEngine.processSingleImage(file, cb, { targetLangCode, preferOffline })`; include `translatedLangCode: p.translatedLangCode` when calling `learningDB.savePage(...)`.
- `src/services/storage/learning-db.js`: no structural change — IndexedDB records are schemaless per-field, so `translatedLangCode` is just a new optional property on new records. No `dbVersion` bump needed.
- `src/views/reader-view.js`: the second language tab (`#btnLangHi`) currently has a static "हिं" label — update `openReaderForPages()`/`renderCurrentReaderPage()` to set that button's text from `SUPPORTED_LANGUAGES` using `page.translatedLangCode || 'hi'`. `switchReaderLanguage(lang)` and the `page.textHi` read in `renderCurrentReaderPage()` need no change (field name is unchanged per the decision above).

### 4. Voice Accents

- `src/services/tts/voice-manager.js`: keep the existing rich Indian-accent heuristics for `'hi'`/`'en'` untouched. Add a generic branch for any other language code: `voices.find(v => v.lang.toLowerCase().startsWith(langCode))`, returning `null` if nothing matches (caller already has a fallback path). Add an exported `LANGUAGE_LOCALES` lookup (code → BCP-47 tag, e.g. `kn → 'kn-IN'`, `es → 'es-ES'`, `fr → 'fr-FR'`) for use when no specific voice object is found. Add `getAvailableVoicesForLanguage(langCode)` for the picker UI to list choices.
- `src/services/tts/tts-engine.js`: the two inline `utterance.lang = (speechLang === 'hi') ? 'hi-IN' : 'en-IN'` fallbacks (in `speakSingleWord` and `playNextSentence`) are themselves hardcoded to only hi/en — replace both with a lookup into `voice-manager.js`'s new `LANGUAGE_LOCALES`. On construction, read `localStorage['tts_voice_name']` and call `voiceManager.setSelectedVoiceByName()` if present (this wires up the already-existing-but-unused `setSelectedVoiceByName` method and the already-cached-but-unused `dom.audioAccentLabel` element — populate that label with the active voice/accent name once selected).
- New localStorage key `tts_voice_name`, written by the new `voice-settings.js` controller when the user picks a voice.
- **Caveat to flag to the user directly (not silently handled):** `speechSynthesis.getVoices()` is frequently empty until the async `onvoiceschanged` fires, and most devices won't have all 9 regional language voice packs installed — the picker must re-populate on that event and gracefully show "no voices found for this language" rather than an empty broken dropdown.

### 5. Offline Engine toggle

Simplest possible implementation — no new service file. A single boolean localStorage key `prefer_offline_ocr` (`'true'`/`'false'`, default `'false'`), written directly by a checkbox in the settings orchestrator, read directly by `scan-view.js` when building the `processSingleImage` options object (§3).

### 6. Debug Logs

One button in the panel calling the already-fully-built `logger.show()` (`src/utils/logger.js`, singleton `logger`). No new code needed beyond the button and its click handler. Keep the existing build-tag-tap entry point too (non-destructive, both can coexist).

## New localStorage keys

| Key | Owner | Default |
|---|---|---|
| `target_language` | `translator.js` | `'hi'` |
| `tts_voice_name` | `tts-engine.js` / `voice-manager.js` | unset (auto-detect) |
| `prefer_offline_ocr` | read/written directly where needed | `'false'` |

(`gemini_api_key` and `tts_speed` already exist and are unaffected.)

## Suggested delivery order

1. Panel shell + AI Vision section moved in (visual-only, zero behavior change — satisfies the literal todo item on its own).
2. Translation & Target Language (biggest ripple: translator, gemini prompt, response parser, ocr-engine, scan-view, reader-view).
3. Voice Accents (wires up existing dead code: `setSelectedVoiceByName`, `dom.audioAccentLabel`).
4. Offline Engine toggle (small).
5. Debug Logs entry (trivial).

Each phase is independently functional and testable — recommend landing/reviewing in that order rather than one giant change.

## Verification

- Reuse the Playwright-against-a-local-static-server approach already used earlier in this project (cached Chromium at `chromium-1181`, no build step needed): open the panel, confirm all 5 sections render, confirm the language `<select>` is populated from `SUPPORTED_LANGUAGES`, toggle "prefer offline" and reload to confirm the localStorage flag persists, click the Debug Logs button and confirm the log drawer opens, check `console --errors` throughout.
- Flag as **manual/on-device only** (can't be verified headlessly): actual translated text quality for the newer target languages (depends on the live MyMemory API), actual voice list contents and playback accent (depends on real OS-installed voice packs, which a headless/sandboxed Chromium won't have).
- Re-open a chapter that was scanned *before* this change (old `textHi`-only record, no `translatedLangCode`) and confirm it still displays correctly under the reader's second tab, defaulting to Hindi.
